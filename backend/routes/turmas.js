const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const turmas = await db.all(`
      SELECT t.*, p.nome as professor_nome,
        (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.ativo = 1) as total_alunos
      FROM turmas t
      LEFT JOIN professores p ON t.professor_id = p.id
      ORDER BY t.nome
    `);

    const hoje = new Date().toISOString().split('T')[0];
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await Promise.all(turmas.map(async t => {
      const presencas = await db.get(`
        SELECT COUNT(*) as total FROM presencas p
        JOIN alunos a ON p.aluno_id = a.id
        WHERE a.turma_id = ? AND p.data BETWEEN ? AND ? AND p.status = 'presente'
      `, [t.id, trintaDiasAtras, hoje]);
      const totalRegistros = await db.get(`
        SELECT COUNT(*) as total FROM presencas p
        JOIN alunos a ON p.aluno_id = a.id
        WHERE a.turma_id = ? AND p.data BETWEEN ? AND ?
      `, [t.id, trintaDiasAtras, hoje]);
      const freq = totalRegistros.total > 0 ? Math.round((presencas.total / totalRegistros.total) * 100) : 0;
      const mediaNotas = await db.get('SELECT AVG(nota_final) as media FROM notas WHERE turma_id = ?', [t.id]);
      return { ...t, frequencia_media: freq, media_desempenho: mediaNotas.media ? Math.round(mediaNotas.media * 10) / 10 : null };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const turma = await db.get(`
      SELECT t.*, p.nome as professor_nome, p.especialidade as professor_especialidade
      FROM turmas t LEFT JOIN professores p ON t.professor_id = p.id
      WHERE t.id = ?
    `, [req.params.id]);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });

    const alunos = await db.all('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome', [req.params.id]);
    const disciplinas = (await db.all('SELECT DISTINCT disciplina FROM professor_turma_disciplina WHERE turma_id = ?', [req.params.id])).map(d => d.disciplina);
    const avaliacoes = await db.all('SELECT av.*, p.nome as professor_nome FROM avaliacoes av LEFT JOIN professores p ON av.professor_id = p.id WHERE av.turma_id = ? ORDER BY av.data_aplicacao DESC', [req.params.id]);

    res.json({ ...turma, alunos, disciplinas, avaliacoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, curso, ano_letivo, turno, professor_id, max_alunos } = req.body;
    if (!nome || !curso) return res.status(400).json({ erro: 'Nome e curso são obrigatórios' });
    const result = await db.run('INSERT INTO turmas (nome, curso, ano_letivo, turno, professor_id, max_alunos) VALUES (?, ?, ?, ?, ?, ?)', [nome, curso, ano_letivo || '2024', turno || 'manhã', professor_id || null, max_alunos || 30]);
    res.status(201).json(await db.get('SELECT * FROM turmas WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, curso, ano_letivo, turno, professor_id, max_alunos } = req.body;
    await db.run('UPDATE turmas SET nome=?, curso=?, ano_letivo=?, turno=?, professor_id=?, max_alunos=? WHERE id=?', [nome, curso, ano_letivo, turno, professor_id, max_alunos, req.params.id]);
    res.json(await db.get('SELECT * FROM turmas WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM presencas WHERE aluno_id IN (SELECT id FROM alunos WHERE turma_id = ?)', [req.params.id]);
    await db.run('DELETE FROM alunos WHERE turma_id = ?', [req.params.id]);
    await db.run('DELETE FROM professor_turma_disciplina WHERE turma_id = ?', [req.params.id]);
    await db.run('DELETE FROM turmas WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/frequencia', async (req, res) => {
  try {
    const alunos = await db.all('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome', [req.params.id]);
    const result = await Promise.all(alunos.map(async aluno => {
      const total = await db.get('SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ?', [aluno.id]);
      const presentes = await db.get("SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ? AND status = 'presente'", [aluno.id]);
      const faltas = await db.get("SELECT COUNT(*) as t FROM presencas WHERE aluno_id = ? AND status = 'ausente'", [aluno.id]);
      const justificadas = await db.get('SELECT COUNT(*) as t FROM justificativas WHERE aluno_id = ?', [aluno.id]);
      const pct = total.t > 0 ? Math.round((presentes.t / total.t) * 100) : 0;
      return { ...aluno, total_aulas: total.t, presentes: presentes.t, faltas: faltas.t, justificadas: justificadas.t, percentual: pct };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/desempenho', async (req, res) => {
  try {
    const alunos = await db.all('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1 ORDER BY nome', [req.params.id]);
    const result = await Promise.all(alunos.map(async aluno => {
      const notas = await db.all('SELECT * FROM notas WHERE aluno_id = ? AND turma_id = ?', [aluno.id, req.params.id]);
      const media = notas.length > 0 ? notas.reduce((s, n) => s + n.nota_final, 0) / notas.length : null;
      return { ...aluno, notas, media_geral: media ? Math.round(media * 10) / 10 : null };
    }));
    result.sort((a, b) => (b.media_geral || 0) - (a.media_geral || 0));
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
