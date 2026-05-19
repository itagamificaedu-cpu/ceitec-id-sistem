/**
 * Mestre da Escola — Rotas da API
 * ─────────────────────────────────
 * Endpoints usados pelo app Next.js do Mestre da Escola.
 * Sem autenticação JWT — o app gerencia acesso via códigos (ADMIN-MASTER / PROF-XXX).
 */

const express = require('express');
const db      = require('../db');

const router = express.Router();

// ══════════════════════════════════════════════════════════
// PROFESSORES — cadastro e validação de código de acesso
// ══════════════════════════════════════════════════════════

/** Valida código de professor (ex: PROF-AB12) e retorna nome */
router.get('/professores/:codigo', async (req, res) => {
  try {
    const prof = await db.get(
      'SELECT id, nome, codigo_acesso FROM mestre_professores WHERE codigo_acesso = $1',
      [req.params.codigo.toUpperCase()]
    );
    if (!prof) return res.status(404).json({ erro: 'Código de acesso não encontrado' });
    return res.json(prof);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Lista todos os professores cadastrados (para tela de admin) */
router.get('/professores', async (req, res) => {
  try {
    const profs = await db.all('SELECT * FROM mestre_professores ORDER BY nome');
    res.json(profs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Cadastra novo professor com código de acesso */
router.post('/professores', async (req, res) => {
  try {
    const { nome, codigo_acesso } = req.body;
    if (!nome || !codigo_acesso)
      return res.status(400).json({ erro: 'nome e codigo_acesso são obrigatórios' });

    await db.run(
      'INSERT INTO mestre_professores (nome, codigo_acesso) VALUES ($1, $2)',
      [nome.trim(), codigo_acesso.toUpperCase().trim()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    // Violação de unique → código já existe
    if (err.message?.includes('unique') || err.code === '23505')
      return res.status(409).json({ erro: 'Código de acesso já cadastrado' });
    res.status(500).json({ erro: err.message });
  }
});

/** Remove professor pelo id */
router.delete('/professores/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM mestre_professores WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// HORÁRIOS — grade horária dos professores
// ══════════════════════════════════════════════════════════

/** Lista todos os horários ordenados por número de aula */
router.get('/horarios', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM mestre_horarios ORDER BY aula_numero, dia_semana');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Cria novo horário e retorna o registro completo (com UUID gerado) */
router.post('/horarios', async (req, res) => {
  try {
    const { professor_nome, dia_semana, aula_numero, horario_inicio, horario_fim, disciplina, turma, sala } = req.body;

    if (!professor_nome || !dia_semana || !disciplina || !turma)
      return res.status(400).json({ erro: 'Campos obrigatórios: professor_nome, dia_semana, disciplina, turma' });

    const rows = await db.all(
      `INSERT INTO mestre_horarios
         (professor_nome, dia_semana, aula_numero, horario_inicio, horario_fim, disciplina, turma, sala)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [professor_nome, dia_semana, Number(aula_numero), horario_inicio, horario_fim, disciplina, turma, sala || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Atualiza horário pelo id (UUID) */
router.put('/horarios/:id', async (req, res) => {
  try {
    const { professor_nome, dia_semana, aula_numero, horario_inicio, horario_fim, disciplina, turma, sala } = req.body;

    const rows = await db.all(
      `UPDATE mestre_horarios
       SET professor_nome=$1, dia_semana=$2, aula_numero=$3,
           horario_inicio=$4, horario_fim=$5, disciplina=$6, turma=$7, sala=$8
       WHERE id=$9
       RETURNING *`,
      [professor_nome, dia_semana, Number(aula_numero), horario_inicio, horario_fim, disciplina, turma, sala || '', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Horário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Remove horário pelo id (UUID) */
router.delete('/horarios/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM mestre_horarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// POSTS — atividades e recados por turma
// ══════════════════════════════════════════════════════════

/** Retorna posts (atividades + recados) e ações rastreadas */
router.get('/posts', async (req, res) => {
  try {
    const posts   = await db.all('SELECT * FROM mestre_posts ORDER BY criado_em DESC');
    const actions = await db.all('SELECT * FROM mestre_tracked_actions ORDER BY criado_em DESC');
    res.json({ posts, actions });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Upsert de atividade — uma por turma (substitui a anterior) */
router.put('/posts/atividade', async (req, res) => {
  try {
    const { turma, content } = req.body;
    await db.run("DELETE FROM mestre_posts WHERE turma = $1 AND type = 'atividade'", [turma]);
    await db.run(
      "INSERT INTO mestre_posts (turma, type, content) VALUES ($1, 'atividade', $2)",
      [turma, content]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Insere recado ou qualquer post */
router.post('/posts', async (req, res) => {
  try {
    const { turma, type, content } = req.body;
    await db.run(
      'INSERT INTO mestre_posts (turma, type, content) VALUES ($1, $2, $3)',
      [turma, type, content]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/** Apaga todos os posts e ações (limpar tudo) */
router.delete('/posts', async (req, res) => {
  try {
    await db.run('DELETE FROM mestre_posts');
    await db.run('DELETE FROM mestre_tracked_actions');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// TRACKED ACTIONS — rastreio de leituras e conclusões
// ══════════════════════════════════════════════════════════

router.post('/tracked-actions', async (req, res) => {
  try {
    const { student_name, action_type, post_id } = req.body;
    await db.run(
      'INSERT INTO mestre_tracked_actions (student_name, action_type, post_id) VALUES ($1, $2, $3)',
      [student_name, action_type, post_id || null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
