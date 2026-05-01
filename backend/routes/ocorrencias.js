const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');
const { enviarNotificacaoOcorrencia } = require('../whatsapp');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const db = getDb();
  const { tipo, gravidade, turma_id, aluno_id } = req.query;
  let sql = `SELECT o.*, a.nome as aluno_nome, a.foto_path as aluno_foto, a.codigo,
    p.nome as professor_nome, t.nome as turma_nome
    FROM ocorrencias o
    JOIN alunos a ON o.aluno_id = a.id
    LEFT JOIN professores p ON o.professor_id = p.id
    LEFT JOIN turmas t ON o.turma_id = t.id
    WHERE 1=1`;
  const params = [];
  if (tipo) { sql += ' AND o.tipo = ?'; params.push(tipo); }
  if (gravidade) { sql += ' AND o.gravidade = ?'; params.push(gravidade); }
  if (turma_id) { sql += ' AND o.turma_id = ?'; params.push(turma_id); }
  if (aluno_id) { sql += ' AND o.aluno_id = ?'; params.push(aluno_id); }
  sql += ' ORDER BY o.criado_em DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const porTipo = db.prepare("SELECT tipo, COUNT(*) as total FROM ocorrencias GROUP BY tipo").all();
  const porGravidade = db.prepare("SELECT gravidade, COUNT(*) as total FROM ocorrencias GROUP BY gravidade").all();
  const semana = db.prepare("SELECT COUNT(*) as total FROM ocorrencias WHERE date(criado_em) >= ?").get(umaSemanaAtras);
  const ranking = db.prepare(`
    SELECT a.nome, a.foto_path, a.codigo, COUNT(o.id) as total
    FROM ocorrencias o JOIN alunos a ON o.aluno_id = a.id
    WHERE o.tipo != 'elogio'
    GROUP BY o.aluno_id ORDER BY total DESC LIMIT 5
  `).all();
  res.json({ porTipo, porGravidade, semana: semana.total, ranking });
});

router.post('/', async (req, res) => {
  const { aluno_id, professor_id, turma_id, tipo, descricao, gravidade, notificar_responsavel } = req.body;
  if (!aluno_id || !descricao || !tipo) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
  const db = getDb();
  const result = db.prepare('INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade, notificou_responsavel) VALUES (?, ?, ?, ?, ?, ?, ?)').run(aluno_id, professor_id || null, turma_id || null, tipo, descricao, gravidade || 'baixa', notificar_responsavel ? 1 : 0);

  if (notificar_responsavel) {
    const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(aluno_id);
    if (aluno?.telefone_responsavel) {
      enviarNotificacaoOcorrencia(aluno.telefone_responsavel, aluno.nome, tipo, descricao, gravidade).catch(() => {});
    }
  }

  res.status(201).json(db.prepare('SELECT * FROM ocorrencias WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const o = db.prepare(`SELECT o.*, a.nome as aluno_nome, p.nome as professor_nome, t.nome as turma_nome
    FROM ocorrencias o JOIN alunos a ON o.aluno_id = a.id
    LEFT JOIN professores p ON o.professor_id = p.id
    LEFT JOIN turmas t ON o.turma_id = t.id
    WHERE o.id = ?`).get(req.params.id);
  if (!o) return res.status(404).json({ erro: 'Ocorrência não encontrada' });
  res.json(o);
});

router.put('/:id', (req, res) => {
  const { tipo, descricao, gravidade } = req.body;
  const db = getDb();
  db.prepare('UPDATE ocorrencias SET tipo=?, descricao=?, gravidade=? WHERE id=?').run(tipo, descricao, gravidade, req.params.id);
  res.json(db.prepare('SELECT * FROM ocorrencias WHERE id = ?').get(req.params.id));
});

module.exports = router;
