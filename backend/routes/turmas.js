const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const db = getDb();
  const turmas = db.prepare(`
    SELECT t.*, p.nome as professor_nome,
      (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.ativo = 1) as total_alunos
    FROM turmas t
    LEFT JOIN professores p ON t.professor_id = p.id
    ORDER BY t.nome
  `).all();

  const hoje = new Date().toISOString().split('T')[0];
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const result = turmas.map(t => {
    const totalAlunos = t.total_alunos;
    const presencas = db.prepare(`
      SELECT COUNT(*) as total FROM presencas p
      JOIN alunos a ON p.aluno_id = a.id
      WHERE a.turma_id = ? AND p.data BETWEEN ? AND ? AND p.status = 'presente'
    `).get(t.id, trintaDiasAtras, hoje);
    const totalRegistros = db.prepare(`
      SELECT COUNT(*) as total FROM presencas p
      JOIN alunos a ON p.aluno_id = a.id
      WHERE a.turma_id = ? AND p.data BETWEEN ? AND ?
    `).get(t.id, trintaDiasAtras, hoje);
    const freq = totalRegistros.total > 0 ? Math.round((presencas.total / totalRegistros.total) * 100) : 0;

    const mediaNotas = db.prepare(`
      SELECT AVG(nota_final) as media FROM notas WHERE turma_id = ?
    `).get(t.id);

    return { ...t, frequencia_media: freq, media_desempenho: mediaNotas.media ? Math.round(mediaNotas.media * 10) / 10 : null };
  });

  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const turma = db.prepare(`
    SELECT t.*, p.nome as professor_nome, p.especialidade as professor_especialidade
    FROM turmas t LEFT JOIN professores p ON t.professor_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });

  const alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome').all(req.params.id);
  const disciplinas = db.prepare('SELECT DISTINCT disciplina FROM professor_turma_disciplina WHERE turma_id = ?').all(req.params.id).map(d => d.disciplina);
  const avaliacoes = db.prepare('SELECT av.*, p.nome as professor_nome FROM avaliacoes av LEFT JOIN professores p ON av.professor_id = p.id WHERE av.turma_id = ? ORDER BY av.data_aplicacao DESC').all(req.params.id);

  res.json({ ...turma, alunos, disciplinas, avaliacoes });
});

router.post('/', (req, res) => {
  const { nome, curso, ano_letivo, turno, professor_id, max_alunos } = req.body;
  if (!nome || !curso) return res.status(400).json({ erro: 'Nome e curso são obrigatórios' });
  const db = getDb();
  const result = db.prepare('INSERT INTO turmas (nome, curso, ano_letivo, turno, professor_id, max_alunos) VALUES (?, ?, ?, ?, ?, ?)').run(nome, curso, ano_letivo || '2024', turno || 'manhã', professor_id || null, max_alunos || 30);
  res.status(201).json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { nome, curso, ano_letivo, turno, professor_id, max_alunos } = req.body;
  const db = getDb();
  db.prepare('UPDATE turmas SET nome=?, curso=?, ano_letivo=?, turno=?, professor_id=?, max_alunos=? WHERE id=?').run(nome, curso, ano_letivo, turno, professor_id, max_alunos, req.params.id);
  res.json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id));
});

router.get('/:id/frequencia', (req, res) => {
  const db = getDb();
  const alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome').all(req.params.id);
  const result = alunos.map(aluno => {
    const total = db.prepare('SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ?').get(aluno.id);
    const presentes = db.prepare("SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ? AND status = 'presente'").get(aluno.id);
    const faltas = db.prepare("SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ? AND status = 'ausente'").get(aluno.id);
    const justificadas = db.prepare("SELECT COUNT(*) as t FROM justificativas WHERE aluno_id = ?").get(aluno.id);
    const pct = total.t > 0 ? Math.round((presentes.t / total.t) * 100) : 0;
    return { ...aluno, total_aulas: total.t, presentes: presentes.t, faltas: faltas.t, justificadas: justificadas.t, percentual: pct };
  });
  res.json(result);
});

router.get('/:id/desempenho', (req, res) => {
  const db = getDb();
  const alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome').all(req.params.id);
  const result = alunos.map(aluno => {
    const notas = db.prepare('SELECT * FROM notas WHERE aluno_id = ? AND turma_id = ?').all(aluno.id, req.params.id);
    const media = notas.length > 0 ? notas.reduce((s, n) => s + n.nota_final, 0) / notas.length : null;
    return { ...aluno, notas, media_geral: media ? Math.round(media * 10) / 10 : null };
  });
  result.sort((a, b) => (b.media_geral || 0) - (a.media_geral || 0));
  res.json(result);
});

module.exports = router;
