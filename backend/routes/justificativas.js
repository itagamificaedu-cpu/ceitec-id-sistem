const express = require('express');
const multer = require('multer');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/', upload.single('arquivo'), async (req, res) => {
  try {
    const { presenca_id, aluno_id, data_falta, descricao, tipo } = req.body;
    if (!aluno_id || !data_falta) return res.status(400).json({ erro: 'aluno_id e data_falta são obrigatórios' });

    const result = await db.run(
      'INSERT INTO justificativas (presenca_id, aluno_id, data_falta, descricao, tipo) VALUES (?, ?, ?, ?, ?)',
      [presenca_id || null, aluno_id, data_falta, descricao || null, tipo || 'justificada']
    );

    if (presenca_id) {
      await db.run("UPDATE presencas SET status = 'justificado' WHERE id = ?", [presenca_id]);
    }

    res.status(201).json(await db.get('SELECT * FROM justificativas WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/aluno/:id', async (req, res) => {
  try {
    const justificativas = await db.all(
      'SELECT j.*, p.data as data_presenca, p.status FROM justificativas j LEFT JOIN presencas p ON j.presenca_id = p.id WHERE j.aluno_id = ? ORDER BY j.criado_em DESC',
      [req.params.id]
    );
    res.json(justificativas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/pendentes', async (req, res) => {
  try {
    const pendentes = await db.all(`
      SELECT p.*, a.nome, a.turma, a.foto_path, a.codigo
      FROM presencas p
      JOIN alunos a ON p.aluno_id = a.id
      LEFT JOIN justificativas j ON j.presenca_id = p.id
      WHERE p.status = 'ausente' AND j.id IS NULL
      ORDER BY p.data DESC
    `);
    res.json(pendentes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', upload.single('arquivo'), async (req, res) => {
  try {
    const { descricao, tipo } = req.body;
    await db.run('UPDATE justificativas SET descricao=?, tipo=? WHERE id=?', [descricao, tipo, req.params.id]);
    res.json(await db.get('SELECT * FROM justificativas WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
