const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const db = getDb();
  const { turma_id, disciplina } = req.query;
  let alunosQuery = 'SELECT * FROM alunos WHERE ativo = 1';
  const params = [];
  if (turma_id) { alunosQuery += ' AND turma_id = ?'; params.push(turma_id); }
  alunosQuery += ' ORDER BY nome';
  const alunos = db.prepare(alunosQuery).all(...params);

  const result = alunos.map(aluno => {
    let notasQuery = 'SELECT * FROM notas WHERE aluno_id = ?';
    const nParams = [aluno.id];
    if (disciplina) { notasQuery += ' AND disciplina = ?'; nParams.push(disciplina); }
    const notas = db.prepare(notasQuery).all(...nParams);
    const media = notas.length > 0 ? notas.reduce((s, n) => s + n.nota_final, 0) / notas.length : null;
    const emRisco = media !== null && media < 5;
    return { ...aluno, notas, media_geral: media ? Math.round(media * 10) / 10 : null, em_risco: emRisco };
  });

  res.json(result);
});

router.get('/turma/:turma_id', (req, res) => {
  const db = getDb();
  const { disciplina } = req.query;
  const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.turma_id);
  if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });

  const alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome').all(req.params.turma_id);

  const result = alunos.map(aluno => {
    let notasQuery = 'SELECT n.*, av.titulo FROM notas n JOIN avaliacoes av ON n.avaliacao_id = av.id WHERE n.aluno_id = ? AND n.turma_id = ?';
    const params = [aluno.id, req.params.turma_id];
    if (disciplina) { notasQuery += ' AND n.disciplina = ?'; params.push(disciplina); }
    const notas = db.prepare(notasQuery).all(...params);

    const disciplinas = {};
    notas.forEach(n => {
      if (!disciplinas[n.disciplina]) disciplinas[n.disciplina] = [];
      disciplinas[n.disciplina].push(n.nota_final);
    });
    const mediasPorDisc = Object.entries(disciplinas).map(([disc, ns]) => ({
      disciplina: disc, media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10
    }));
    const media_geral = notas.length > 0 ? Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10 : null;

    return { ...aluno, notas, mediasPorDisc, media_geral, em_risco: media_geral !== null && media_geral < 5 };
  });

  res.json({ turma, alunos: result });
});

router.get('/aluno/:id', (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

  const notas = db.prepare('SELECT n.*, av.titulo, av.tipo, av.data_aplicacao FROM notas n JOIN avaliacoes av ON n.avaliacao_id = av.id WHERE n.aluno_id = ? ORDER BY av.data_aplicacao DESC').all(req.params.id);

  const disciplinas = {};
  notas.forEach(n => {
    if (!disciplinas[n.disciplina]) disciplinas[n.disciplina] = [];
    disciplinas[n.disciplina].push(n.nota_final);
  });
  const mediasPorDisc = Object.entries(disciplinas).map(([disc, ns]) => ({
    disciplina: disc,
    media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10,
    total_avaliacoes: ns.length
  }));
  const media_geral = notas.length > 0 ? Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10 : null;
  const melhor = mediasPorDisc.reduce((m, d) => d.media > (m?.media || 0) ? d : m, null);
  const critica = mediasPorDisc.reduce((m, d) => d.media < (m?.media || 99) ? d : m, null);

  const xp = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(req.params.id);
  const ocorrencias = db.prepare('SELECT * FROM ocorrencias WHERE aluno_id = ? ORDER BY criado_em DESC').all(req.params.id);

  res.json({ aluno, notas, mediasPorDisc, media_geral, melhor_disciplina: melhor, disciplina_critica: critica, itagame: xp, ocorrencias });
});

router.get('/geral', (req, res) => {
  const db = getDb();
  const alunos = db.prepare('SELECT * FROM alunos WHERE ativo = 1').all();
  const notas = db.prepare('SELECT n.*, a.turma_id, t.nome as turma_nome FROM notas n JOIN alunos a ON n.aluno_id = a.id LEFT JOIN turmas t ON a.turma_id = t.id').all();

  const total_alunos = alunos.length;
  const media_geral = notas.length > 0 ? Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10 : null;

  const alunoMedias = {};
  notas.forEach(n => {
    if (!alunoMedias[n.aluno_id]) alunoMedias[n.aluno_id] = [];
    alunoMedias[n.aluno_id].push(n.nota_final);
  });
  const mediasAlunos = Object.entries(alunoMedias).map(([id, ns]) => ({
    id: Number(id), media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10
  }));
  const aprovados = mediasAlunos.filter(a => a.media >= 7).length;
  const em_risco = mediasAlunos.filter(a => a.media < 5).length;

  const turmaMap = {};
  notas.forEach(n => {
    const chave = n.turma_nome || 'Sem turma';
    if (!turmaMap[chave]) turmaMap[chave] = [];
    turmaMap[chave].push(n.nota_final);
  });
  const por_turma = Object.entries(turmaMap).map(([turma, ns]) => ({
    turma, media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10
  })).sort((a, b) => b.media - a.media);

  const discMap = {};
  notas.forEach(n => {
    if (!discMap[n.disciplina]) discMap[n.disciplina] = [];
    discMap[n.disciplina].push(n.nota_final);
  });
  const por_disciplina = Object.entries(discMap).map(([disciplina, ns]) => ({
    disciplina, media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10
  })).sort((a, b) => a.media - b.media);

  const alunos_risco = mediasAlunos
    .filter(a => a.media < 5)
    .map(a => {
      const al = alunos.find(x => x.id === a.id);
      if (!al) return null;
      const turma = db.prepare('SELECT nome FROM turmas WHERE id = ?').get(al.turma_id);
      return { ...al, media_geral: a.media, turma_nome: turma?.nome || al.turma };
    })
    .filter(Boolean)
    .slice(0, 10);

  res.json({ total_alunos, media_geral, aprovados, em_risco, por_turma, por_disciplina, alunos_risco });
});

router.get('/diagnostico', (req, res) => {
  const db = getDb();
  const { turma_id, disciplina } = req.query;
  if (!turma_id || !disciplina) return res.status(400).json({ erro: 'turma_id e disciplina são obrigatórios' });

  const notas = db.prepare('SELECT n.*, a.nome FROM notas n JOIN alunos a ON n.aluno_id = a.id WHERE n.turma_id = ? AND n.disciplina = ? ORDER BY n.nota_final DESC').all(turma_id, disciplina);
  const total = notas.length;
  const aprovados = notas.filter(n => n.nota_final >= 5).length;
  const percentualAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;

  const questoes = db.prepare(`
    SELECT q.enunciado, q.gabarito, q.dificuldade,
      COUNT(r.id) as total_respostas,
      SUM(CASE WHEN r.correta = 1 THEN 1 ELSE 0 END) as acertos
    FROM questoes q
    JOIN avaliacoes av ON q.avaliacao_id = av.id
    LEFT JOIN respostas_alunos r ON r.questao_id = q.id
    WHERE av.turma_id = ? AND av.disciplina = ?
    GROUP BY q.id
  `).all(turma_id, disciplina);

  const topicosComErro = questoes
    .filter(q => q.total_respostas > 0)
    .map(q => ({ ...q, pct_erro: Math.round(((q.total_respostas - q.acertos) / q.total_respostas) * 100) }))
    .filter(q => q.pct_erro > 40)
    .sort((a, b) => b.pct_erro - a.pct_erro);

  const emReforco = notas.filter(n => n.nota_final < 5);
  const destaque = notas.filter(n => n.nota_final >= 8);

  res.json({ disciplina, total, aprovados, percentualAprovacao, notas, topicosComErro, emReforco, destaque });
});

module.exports = router;
