const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOADS_PATH || './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `foto_${req.params.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function gerarCodigo(db) {
  const ultimo = db.prepare("SELECT codigo FROM alunos ORDER BY id DESC LIMIT 1").get();
  if (!ultimo) return 'CEITEC-0001';
  const num = parseInt(ultimo.codigo.split('-')[1]) + 1;
  return `CEITEC-${String(num).padStart(4, '0')}`;
}

router.use(autenticar);

router.post('/', (req, res) => {
  const { nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula } = req.body;
  if (!nome || !turma || !curso) return res.status(400).json({ erro: 'Nome, turma e curso são obrigatórios' });

  const db = getDb();
  const codigo = gerarCodigo(db);
  const matricula = data_matricula || new Date().toISOString().split('T')[0];

  const result = db.prepare(
    'INSERT INTO alunos (codigo, nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(codigo, nome, turma, curso, email_responsavel || null, telefone_responsavel || null, matricula);

  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(aluno);
});

router.get('/', (req, res) => {
  const db = getDb();
  const alunos = db.prepare("SELECT * FROM alunos WHERE ativo = 1 ORDER BY nome").all();
  res.json(alunos);
});

router.get('/qr/:codigo', (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1').get(req.params.codigo);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
  res.json(aluno);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
  res.json(aluno);
});

router.put('/:id', (req, res) => {
  const { nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE alunos SET nome=?, turma=?, curso=?, email_responsavel=?, telefone_responsavel=?, data_matricula=? WHERE id=?'
  ).run(nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula, req.params.id);
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  res.json(aluno);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE alunos SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Aluno desativado' });
});

router.post('/:id/foto', upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  const db = getDb();
  const fotoPath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE alunos SET foto_path = ? WHERE id = ?').run(fotoPath, req.params.id);
  res.json({ foto_path: fotoPath });
});

router.post('/importar', (req, res) => {
  const { alunos, turma_id } = req.body;
  if (!Array.isArray(alunos) || alunos.length === 0) return res.status(400).json({ erro: 'Nenhum aluno para importar' });
  const db = getDb();
  let turma_nome = '', curso_nome = '';
  if (turma_id) {
    const t = db.prepare('SELECT * FROM turmas WHERE id = ?').get(turma_id);
    if (t) { turma_nome = t.nome; curso_nome = t.curso; }
  }
  const importados = [], erros = [];
  const tx = db.transaction(() => {
    for (const a of alunos) {
      try {
        if (!a.nome || !a.nome.trim()) { erros.push({ nome: a.nome || '?', erro: 'Nome obrigatório' }); continue; }
        const codigo = gerarCodigo(db);
        const matricula = a.data_matricula || new Date().toISOString().split('T')[0];
        const result = db.prepare(
          'INSERT INTO alunos (codigo, nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula, turma_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(codigo, a.nome.trim(), a.turma || turma_nome, a.curso || curso_nome, a.email_responsavel || null, a.telefone_responsavel || null, matricula, turma_id || null);
        importados.push({ id: result.lastInsertRowid, codigo, nome: a.nome.trim() });
      } catch (err) { erros.push({ nome: a.nome, erro: err.message }); }
    }
  });
  tx();
  res.json({ importados: importados.length, erros, lista: importados });
});

router.get('/:id/qrcode', async (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
  const qrDataUrl = await QRCode.toDataURL(aluno.codigo, { width: 200, margin: 1 });
  res.json({ qrcode: qrDataUrl, codigo: aluno.codigo });
});

module.exports = router;
