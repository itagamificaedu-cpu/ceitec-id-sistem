const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const hoje = new Date().toISOString().split('T')[0];

  const totalAlunos = db.prepare('SELECT COUNT(*) as total FROM alunos WHERE ativo = 1').get();
  const presentesHoje = db.prepare("SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'presente'").get(hoje);
  const ausentesHoje = db.prepare("SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'ausente'").get(hoje);
  const alunosSemRegistro = totalAlunos.total - presentesHoje.total - ausentesHoje.total;
  const totalAusentesReal = ausentesHoje.total + alunosSemRegistro;

  const frequencia = totalAlunos.total > 0 ? Math.round((presentesHoje.total / totalAlunos.total) * 100) : 0;

  const ultimos5 = db.prepare(`
    SELECT p.*, a.nome, a.turma, a.foto_path, a.codigo
    FROM presencas p
    JOIN alunos a ON p.aluno_id = a.id
    ORDER BY p.id DESC LIMIT 5
  `).all();

  const turmas = db.prepare('SELECT DISTINCT turma FROM alunos WHERE ativo = 1').all().map(t => t.turma);
  const freqPorTurma = turmas.map(turma => {
    const alunosTurma = db.prepare('SELECT COUNT(*) as total FROM alunos WHERE turma = ? AND ativo = 1').get(turma);
    const presentesTurma = db.prepare("SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'presente' AND aluno_id IN (SELECT id FROM alunos WHERE turma = ?)").get(hoje, turma);
    const pct = alunosTurma.total > 0 ? Math.round((presentesTurma.total / alunosTurma.total) * 100) : 0;
    return { turma, total: alunosTurma.total, presentes: presentesTurma.total, percentual: pct };
  });

  res.json({
    totalAlunos: totalAlunos.total,
    presentesHoje: presentesHoje.total,
    ausentesHoje: totalAusentesReal,
    frequencia,
    ultimos5,
    freqPorTurma
  });
});

router.get('/turma', (req, res) => {
  const { turma, data } = req.query;
  if (!turma) return res.status(400).json({ erro: 'Turma obrigatória' });

  const db = getDb();
  const dataConsulta = data || new Date().toISOString().split('T')[0];

  const alunos = db.prepare('SELECT * FROM alunos WHERE turma = ? AND ativo = 1 ORDER BY nome').all(turma);
  const resultado = alunos.map(aluno => {
    const presenca = db.prepare('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?').get(aluno.id, dataConsulta);
    const justificativa = presenca ? db.prepare('SELECT * FROM justificativas WHERE presenca_id = ?').get(presenca.id) : null;
    return {
      ...aluno,
      presenca: presenca || null,
      justificativa: justificativa || null,
      status: presenca ? (justificativa ? 'justificado' : presenca.status) : 'ausente'
    };
  });

  const presentes = resultado.filter(a => a.status === 'presente').length;
  const ausentes = resultado.filter(a => a.status === 'ausente').length;
  const justificados = resultado.filter(a => a.status === 'justificado').length;
  const percentual = resultado.length > 0 ? Math.round((presentes / resultado.length) * 100) : 0;

  res.json({ data: dataConsulta, turma, alunos: resultado, totais: { presentes, ausentes, justificados, total: resultado.length, percentual } });
});

router.get('/aluno/:id', (req, res) => {
  const { mes, ano } = req.query;
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

  const anoAtual = ano || new Date().getFullYear();
  const mesAtual = mes || (new Date().getMonth() + 1);
  const mesStr = String(mesAtual).padStart(2, '0');

  const presencas = db.prepare(
    "SELECT p.*, j.tipo as tipo_justificativa FROM presencas p LEFT JOIN justificativas j ON j.presenca_id = p.id WHERE p.aluno_id = ? AND strftime('%Y-%m', p.data) = ?"
  ).all(aluno.id, `${anoAtual}-${mesStr}`);

  const presentes = presencas.filter(p => p.status === 'presente').length;
  const total = presencas.length;
  const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

  res.json({ aluno, presencas, totais: { presentes, ausentes: total - presentes, total, percentual } });
});

router.get('/frequencia-semanal', (req, res) => {
  const db = getDb();
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().split('T')[0]);
  }

  const resultado = dias.map(data => {
    const presentes = db.prepare("SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'presente'").get(data);
    const ausentes = db.prepare("SELECT COUNT(*) as total FROM presencas WHERE data = ? AND status = 'ausente'").get(data);
    return { data, presentes: presentes.total, ausentes: ausentes.total };
  });

  res.json(resultado);
});

module.exports = router;
