const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/dashboard', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const eid = req.usuario.escola_id;

    const totalAlunos = await db.get('SELECT COUNT(*) as total FROM alunos WHERE ativo = 1 AND escola_id = ?', [eid]);
    const presentesHoje = await db.get(
      "SELECT COUNT(*) as total FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE p.data = ? AND p.status = 'presente' AND a.escola_id = ?",
      [hoje, eid]
    );
    const ausentesHoje = await db.get(
      "SELECT COUNT(*) as total FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE p.data = ? AND p.status = 'ausente' AND a.escola_id = ?",
      [hoje, eid]
    );
    const alunosSemRegistro = totalAlunos.total - presentesHoje.total - ausentesHoje.total;
    const frequencia = totalAlunos.total > 0 ? Math.round((presentesHoje.total / totalAlunos.total) * 100) : 0;

    const ultimos5 = await db.all(`
      SELECT p.*, a.nome, a.turma, a.foto_path, a.codigo
      FROM presencas p JOIN alunos a ON p.aluno_id = a.id
      WHERE a.escola_id = ?
      ORDER BY p.id DESC LIMIT 5
    `, [eid]);

    const turmas = (await db.all('SELECT DISTINCT turma FROM alunos WHERE ativo = 1 AND escola_id = ?', [eid])).map(t => t.turma);
    const freqPorTurma = await Promise.all(turmas.map(async turma => {
      const alunosTurma = await db.get('SELECT COUNT(*) as total FROM alunos WHERE turma = ? AND ativo = 1 AND escola_id = ?', [turma, eid]);
      const presentesTurma = await db.get(
        "SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'presente' AND aluno_id IN (SELECT id FROM alunos WHERE turma = ? AND escola_id = ?)",
        [hoje, turma, eid]
      );
      const pct = alunosTurma.total > 0 ? Math.round((presentesTurma.total / alunosTurma.total) * 100) : 0;
      return { turma, total: alunosTurma.total, presentes: presentesTurma.total, percentual: pct };
    }));

    res.json({ totalAlunos: totalAlunos.total, presentesHoje: presentesHoje.total, ausentesHoje: ausentesHoje.total + alunosSemRegistro, frequencia, ultimos5, freqPorTurma });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/turma', async (req, res) => {
  try {
    const { turma, data } = req.query;
    if (!turma) return res.status(400).json({ erro: 'Turma obrigatória' });

    const eid = req.usuario.escola_id;
    const dataConsulta = data || new Date().toISOString().split('T')[0];
    const alunos = await db.all('SELECT * FROM alunos WHERE turma = ? AND ativo = 1 AND escola_id = ? ORDER BY nome', [turma, eid]);
    const resultado = await Promise.all(alunos.map(async aluno => {
      const presenca = await db.get('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?', [aluno.id, dataConsulta]);
      const justificativa = presenca ? await db.get('SELECT * FROM justificativas WHERE presenca_id = ?', [presenca.id]) : null;
      return { ...aluno, presenca: presenca || null, justificativa: justificativa || null, status: presenca ? (justificativa ? 'justificado' : presenca.status) : 'ausente' };
    }));

    const presentes = resultado.filter(a => a.status === 'presente').length;
    const ausentes = resultado.filter(a => a.status === 'ausente').length;
    const justificados = resultado.filter(a => a.status === 'justificado').length;
    const percentual = resultado.length > 0 ? Math.round((presentes / resultado.length) * 100) : 0;

    res.json({ data: dataConsulta, turma, alunos: resultado, totais: { presentes, ausentes, justificados, total: resultado.length, percentual } });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/aluno/:id', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const anoAtual = ano || new Date().getFullYear();
    const mesAtual = mes || (new Date().getMonth() + 1);
    const mesStr = String(mesAtual).padStart(2, '0');

    const presencas = await db.all(
      "SELECT p.*, j.tipo as tipo_justificativa FROM presencas p LEFT JOIN justificativas j ON j.presenca_id = p.id WHERE p.aluno_id = ? AND TO_CHAR(p.data, 'YYYY-MM') = ?",
      [aluno.id, `${anoAtual}-${mesStr}`]
    );

    const presentes = presencas.filter(p => p.status === 'presente').length;
    const total = presencas.length;
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

    res.json({ aluno, presencas, totais: { presentes, ausentes: total - presentes, total, percentual } });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/frequencia-semanal', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dias.push(d.toISOString().split('T')[0]);
    }

    const resultado = await Promise.all(dias.map(async data => {
      const presentes = await db.get(
        "SELECT COUNT(*) as total FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE p.data = ? AND p.status = 'presente' AND a.escola_id = ?",
        [data, eid]
      );
      const ausentes = await db.get(
        "SELECT COUNT(*) as total FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE p.data = ? AND p.status = 'ausente' AND a.escola_id = ?",
        [data, eid]
      );
      return { data, presentes: presentes.total, ausentes: ausentes.total };
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Atividade de usuários: logins e ações na plataforma
router.get('/atividade-usuarios', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;

    // Todos os usuários da escola
    const usuarios = await db.all(
      "SELECT id, nome, email, perfil, criado_em FROM usuarios WHERE escola_id = ? ORDER BY nome",
      [eid]
    );

    // Último login de cada usuário
    const ultimosLogins = await db.all(
      "SELECT DISTINCT ON (usuario_id) usuario_id, logado_em, ip FROM log_acessos WHERE escola_id = ? ORDER BY usuario_id, logado_em DESC",
      [eid]
    );
    const loginMap = {};
    ultimosLogins.forEach(l => { loginMap[l.usuario_id] = l; });

    // Histórico de logins recentes (últimos 50)
    const loginsRecentes = await db.all(
      "SELECT la.nome, la.email, la.perfil, la.logado_em, la.ip FROM log_acessos la WHERE la.escola_id = ? ORDER BY la.logado_em DESC LIMIT 50",
      [eid]
    );

    // Contagem de ações por usuário_id (via email)
    const presencasRegistradas = await db.all(
      "SELECT registrado_por, COUNT(*) as total FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE a.escola_id = ? GROUP BY registrado_por",
      [eid]
    );
    const presencaMap = {};
    presencasRegistradas.forEach(p => { presencaMap[p.registrado_por] = p.total; });

    const ocorrenciasCriadas = await db.all(
      "SELECT u.id, COUNT(o.id) as total FROM usuarios u LEFT JOIN professores pr ON pr.email = u.email LEFT JOIN ocorrencias o ON o.professor_id = pr.id AND o.escola_id = ? WHERE u.escola_id = ? GROUP BY u.id",
      [eid, eid]
    );
    const ocorrenciaMap = {};
    ocorrenciasCriadas.forEach(o => { ocorrenciaMap[o.id] = parseInt(o.total) || 0; });

    const quizzesCriados = await db.all(
      "SELECT criado_por, COUNT(*) as total FROM quizzes WHERE escola_id = ? GROUP BY criado_por",
      [eid]
    );
    const quizMap = {};
    quizzesCriados.forEach(q => { quizMap[q.criado_por] = q.total; });

    // Monta resultado por usuário
    const resultado = usuarios.map(u => ({
      ...u,
      ultimo_login: loginMap[u.id]?.logado_em || null,
      ultimo_ip: loginMap[u.id]?.ip || null,
      presencas_registradas: parseInt(presencaMap[u.email]) || 0,
      ocorrencias_criadas: ocorrenciaMap[u.id] || 0,
      quizzes_criados: parseInt(quizMap[u.id]) || 0,
    }));

    res.json({ usuarios: resultado, logins_recentes: loginsRecentes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
