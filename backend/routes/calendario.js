/**
 * calendario.js — Calendário Escolar
 * CRUD de eventos (feriado, prova, reuniao, evento, recesso)
 */
const express = require('express');
const db      = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

/**
 * GET /api/calendario?mes=M&ano=A
 * Retorna eventos do mês (e eventos de meses adjacentes que caem no grid do calendário)
 */
router.get('/', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();

    // Pega desde o dia 1 do mês anterior até o dia 31 do próximo para cobrir o grid
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fimDate = new Date(ano, mes, 0); // último dia do mês
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimDate.getDate()).padStart(2, '0')}`;

    const eventos = await db.all(
      `SELECT * FROM eventos_calendario
       WHERE escola_id = $1
         AND (
           (data_inicio <= $3 AND (data_fim IS NULL OR data_fim >= $2))
           OR (data_inicio >= $2 AND data_inicio <= $3)
         )
       ORDER BY data_inicio, titulo`,
      [eid, inicio, fim]
    );
    res.json(eventos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/calendario/proximos
 * Próximos 8 eventos a partir de hoje
 */
router.get('/proximos', async (req, res) => {
  try {
    const eid  = req.usuario.escola_id;
    const hoje = new Date().toISOString().split('T')[0];
    const eventos = await db.all(
      `SELECT * FROM eventos_calendario
       WHERE escola_id = $1 AND data_inicio >= $2
       ORDER BY data_inicio LIMIT 8`,
      [eid, hoje]
    );
    res.json(eventos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/calendario
 * Body: { titulo, descricao, data_inicio, data_fim?, tipo, turma_id? }
 */
router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, data_inicio, data_fim, tipo, turma_id } = req.body;
    const eid  = req.usuario.escola_id;
    const uid  = req.usuario.id;

    if (!titulo?.trim())    return res.status(400).json({ erro: 'Título obrigatório.' });
    if (!data_inicio)       return res.status(400).json({ erro: 'Data obrigatória.' });

    let turmaNome = null;
    if (turma_id) {
      const t = await db.get(`SELECT nome FROM turmas WHERE id = $1 AND escola_id = $2`, [turma_id, eid]);
      turmaNome = t?.nome || null;
    }

    const r = await db.get(
      `INSERT INTO eventos_calendario
        (escola_id, titulo, descricao, data_inicio, data_fim, tipo, turma_id, turma_nome, criado_por_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [eid, titulo.trim(), descricao || '', data_inicio, data_fim || null,
       tipo || 'evento', turma_id || null, turmaNome, uid]
    );
    const evento = await db.get(`SELECT * FROM eventos_calendario WHERE id = $1`, [r.id]);
    res.status(201).json(evento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PUT /api/calendario/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { titulo, descricao, data_inicio, data_fim, tipo, turma_id } = req.body;
    const eid = req.usuario.escola_id;

    const existe = await db.get(
      `SELECT id FROM eventos_calendario WHERE id = $1 AND escola_id = $2`,
      [req.params.id, eid]
    );
    if (!existe) return res.status(404).json({ erro: 'Evento não encontrado.' });

    let turmaNome = null;
    if (turma_id) {
      const t = await db.get(`SELECT nome FROM turmas WHERE id = $1 AND escola_id = $2`, [turma_id, eid]);
      turmaNome = t?.nome || null;
    }

    await db.run(
      `UPDATE eventos_calendario
       SET titulo=$1, descricao=$2, data_inicio=$3, data_fim=$4, tipo=$5, turma_id=$6, turma_nome=$7
       WHERE id=$8 AND escola_id=$9`,
      [titulo.trim(), descricao || '', data_inicio, data_fim || null,
       tipo || 'evento', turma_id || null, turmaNome, req.params.id, eid]
    );
    const evento = await db.get(`SELECT * FROM eventos_calendario WHERE id = $1`, [req.params.id]);
    res.json(evento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * DELETE /api/calendario/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const r = await db.run(
      `DELETE FROM eventos_calendario WHERE id = $1 AND escola_id = $2`,
      [req.params.id, eid]
    );
    if (r.rowCount === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
