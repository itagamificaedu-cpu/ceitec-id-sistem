const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOADS_PATH || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `justif_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/', upload.single('arquivo'), (req, res) => {
  const { presenca_id, aluno_id, data_falta, descricao, tipo } = req.body;
  if (!aluno_id || !data_falta) return res.status(400).json({ erro: 'aluno_id e data_falta são obrigatórios' });

  const db = getDb();
  const arquivo_path = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(
    'INSERT INTO justificativas (presenca_id, aluno_id, data_falta, descricao, tipo, arquivo_path) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(presenca_id || null, aluno_id, data_falta, descricao || null, tipo || 'justificada', arquivo_path);

  if (presenca_id) {
    db.prepare("UPDATE presencas SET status = 'justificado' WHERE id = ?").run(presenca_id);
  }

  const justificativa = db.prepare('SELECT * FROM justificativas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(justificativa);
});

router.get('/aluno/:id', (req, res) => {
  const db = getDb();
  const justificativas = db.prepare(
    'SELECT j.*, p.data as data_presenca, p.status FROM justificativas j LEFT JOIN presencas p ON j.presenca_id = p.id WHERE j.aluno_id = ? ORDER BY j.criado_em DESC'
  ).all(req.params.id);
  res.json(justificativas);
});

router.get('/pendentes', (req, res) => {
  const db = getDb();
  const pendentes = db.prepare(`
    SELECT p.*, a.nome, a.turma, a.foto_path, a.codigo
    FROM presencas p
    JOIN alunos a ON p.aluno_id = a.id
    LEFT JOIN justificativas j ON j.presenca_id = p.id
    WHERE p.status = 'ausente' AND j.id IS NULL
    ORDER BY p.data DESC
  `).all();
  res.json(pendentes);
});

router.put('/:id', upload.single('arquivo'), (req, res) => {
  const { descricao, tipo } = req.body;
  const db = getDb();
  const arquivo_path = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (arquivo_path !== undefined) {
    db.prepare('UPDATE justificativas SET descricao=?, tipo=?, arquivo_path=? WHERE id=?').run(descricao, tipo, arquivo_path, req.params.id);
  } else {
    db.prepare('UPDATE justificativas SET descricao=?, tipo=? WHERE id=?').run(descricao, tipo, req.params.id);
  }

  const justificativa = db.prepare('SELECT * FROM justificativas WHERE id = ?').get(req.params.id);
  res.json(justificativa);
});

module.exports = router;
