const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
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
  filename: (req, file, cb) => cb(null, `prof_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const db = getDb();
  const profs = db.prepare('SELECT * FROM professores WHERE ativo = 1 ORDER BY nome').all();
  const result = profs.map(p => {
    const turmas = db.prepare(`
      SELECT ptd.disciplina, t.nome as turma_nome, t.id as turma_id
      FROM professor_turma_disciplina ptd
      JOIN turmas t ON ptd.turma_id = t.id
      WHERE ptd.professor_id = ?
    `).all(p.id);
    return { ...p, turmas };
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const prof = db.prepare('SELECT * FROM professores WHERE id = ?').get(req.params.id);
  if (!prof) return res.status(404).json({ erro: 'Professor não encontrado' });
  const turmas = db.prepare(`
    SELECT ptd.*, t.nome as turma_nome
    FROM professor_turma_disciplina ptd
    JOIN turmas t ON ptd.turma_id = t.id
    WHERE ptd.professor_id = ?
  `).all(req.params.id);
  const planos = db.prepare('SELECT * FROM planos_aula WHERE professor_id = ? ORDER BY criado_em DESC LIMIT 10').all(req.params.id);
  const avaliacoes = db.prepare('SELECT av.*, t.nome as turma_nome FROM avaliacoes av LEFT JOIN turmas t ON av.turma_id = t.id WHERE av.professor_id = ? ORDER BY av.data_aplicacao DESC LIMIT 10').all(req.params.id);
  const totalAlunos = db.prepare('SELECT COUNT(DISTINCT a.id) as total FROM alunos a JOIN turmas t ON a.turma_id = t.id WHERE t.professor_id = ? AND a.ativo = 1').get(req.params.id);
  res.json({ ...prof, turmas, planos, avaliacoes, total_alunos: totalAlunos.total });
});

router.post('/', upload.single('foto'), (req, res) => {
  const { nome, email, telefone, especialidade, formacao, turmas_disciplinas } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: 'Nome e email são obrigatórios' });
  const db = getDb();
  const foto_path = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare('INSERT INTO professores (nome, email, telefone, foto_path, especialidade, formacao) VALUES (?, ?, ?, ?, ?, ?)').run(nome, email, telefone || null, foto_path, especialidade || null, formacao || null);
  const profId = result.lastInsertRowid;

  if (telefone && telefone.length >= 6) {
    const senhaHash = bcrypt.hashSync(telefone.slice(0, 6), 10);
    try { db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run(nome, email, senhaHash, 'professor'); } catch {}
  }

  if (turmas_disciplinas) {
    const td = typeof turmas_disciplinas === 'string' ? JSON.parse(turmas_disciplinas) : turmas_disciplinas;
    const insertTD = db.prepare('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)');
    td.forEach(item => {
      if (item.turma_id && item.disciplina) insertTD.run(profId, item.turma_id, item.disciplina);
    });
  }

  res.status(201).json(db.prepare('SELECT * FROM professores WHERE id = ?').get(profId));
});

router.put('/:id', upload.single('foto'), (req, res) => {
  const { nome, email, telefone, especialidade, formacao, turmas_disciplinas } = req.body;
  const db = getDb();
  const foto_path = req.file ? `/uploads/${req.file.filename}` : undefined;
  if (foto_path) {
    db.prepare('UPDATE professores SET nome=?, email=?, telefone=?, foto_path=?, especialidade=?, formacao=? WHERE id=?').run(nome, email, telefone, foto_path, especialidade, formacao, req.params.id);
  } else {
    db.prepare('UPDATE professores SET nome=?, email=?, telefone=?, especialidade=?, formacao=? WHERE id=?').run(nome, email, telefone, especialidade, formacao, req.params.id);
  }

  if (turmas_disciplinas) {
    db.prepare('DELETE FROM professor_turma_disciplina WHERE professor_id = ?').run(req.params.id);
    const td = typeof turmas_disciplinas === 'string' ? JSON.parse(turmas_disciplinas) : turmas_disciplinas;
    const insertTD = db.prepare('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)');
    td.forEach(item => { if (item.turma_id && item.disciplina) insertTD.run(req.params.id, item.turma_id, item.disciplina); });
  }

  res.json(db.prepare('SELECT * FROM professores WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE professores SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Professor desativado' });
});

router.post('/:id/turma-disciplina', (req, res) => {
  const { turma_id, disciplina } = req.body;
  const db = getDb();
  const result = db.prepare('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)').run(req.params.id, turma_id, disciplina);
  res.status(201).json(db.prepare('SELECT * FROM professor_turma_disciplina WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id/turma-disciplina/:tdId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM professor_turma_disciplina WHERE id = ? AND professor_id = ?').run(req.params.tdId, req.params.id);
  res.json({ mensagem: 'Associação removida' });
});

module.exports = router;
