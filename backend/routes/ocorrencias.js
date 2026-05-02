const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const { tipo, gravidade, turma_id, aluno_id } = req.query;
    const eid = req.usuario.escola_id;
    let sql = `SELECT o.*, a.nome as aluno_nome, a.foto_path as aluno_foto, a.codigo,
      p.nome as professor_nome, t.nome as turma_nome
      FROM ocorrencias o
      JOIN alunos a ON o.aluno_id = a.id
      LEFT JOIN professores p ON o.professor_id = p.id
      LEFT JOIN turmas t ON o.turma_id = t.id
      WHERE o.escola_id = ?`;
    const params = [eid];
    if (tipo) { sql += ' AND o.tipo = ?'; params.push(tipo); }
    if (gravidade) { sql += ' AND o.gravidade = ?'; params.push(gravidade); }
    if (turma_id) { sql += ' AND o.turma_id = ?'; params.push(turma_id); }
    if (aluno_id) { sql += ' AND o.aluno_id = ?'; params.push(aluno_id); }
    sql += ' ORDER BY o.criado_em DESC';
    res.json(await db.all(sql, params));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const porTipo = await db.all('SELECT tipo, COUNT(*) as total FROM ocorrencias WHERE escola_id = ? GROUP BY tipo', [eid]);
    const porGravidade = await db.all('SELECT gravidade, COUNT(*) as total FROM ocorrencias WHERE escola_id = ? GROUP BY gravidade', [eid]);
    const semana = await db.get('SELECT COUNT(*) as total FROM ocorrencias WHERE escola_id = ? AND DATE(criado_em) >= ?', [eid, umaSemanaAtras]);
    const ranking = await db.all(`
      SELECT a.nome, a.foto_path, a.codigo, COUNT(o.id) as total
      FROM ocorrencias o JOIN alunos a ON o.aluno_id = a.id
      WHERE o.escola_id = ? AND o.tipo != 'elogio'
      GROUP BY o.aluno_id, a.nome, a.foto_path, a.codigo ORDER BY total DESC LIMIT 5
    `, [eid]);
    res.json({ porTipo, porGravidade, semana: semana.total, ranking });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { aluno_id, professor_id, turma_id, tipo, descricao, gravidade, notificar_responsavel } = req.body;
    if (!aluno_id || !descricao || !tipo) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    const result = await db.run(
      'INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade, notificou_responsavel, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [aluno_id, professor_id || null, turma_id || null, tipo, descricao, gravidade || 'baixa', notificar_responsavel ? 1 : 0, req.usuario.escola_id]
    );
    res.status(201).json(await db.get('SELECT * FROM ocorrencias WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const o = await db.get(`SELECT o.*, a.nome as aluno_nome, p.nome as professor_nome, t.nome as turma_nome
      FROM ocorrencias o JOIN alunos a ON o.aluno_id = a.id
      LEFT JOIN professores p ON o.professor_id = p.id
      LEFT JOIN turmas t ON o.turma_id = t.id
      WHERE o.id = ? AND o.escola_id = ?`, [req.params.id, eid]);
    if (!o) return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    res.json(o);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tipo, descricao, gravidade } = req.body;
    await db.run(
      'UPDATE ocorrencias SET tipo=?, descricao=?, gravidade=? WHERE id=? AND escola_id=?',
      [tipo, descricao, gravidade, req.params.id, req.usuario.escola_id]
    );
    res.json(await db.get('SELECT * FROM ocorrencias WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
