/**
 * Rotas de Agenda e Avisos — CEITEC ID System
 * Permite criar avisos gerais e eventos com data para toda a escola.
 * Professores, coordenadores e ita_admin podem criar.
 * Rota pública para alunos acessarem via portal (sem login).
 */

const express = require('express')
const db = require('../db')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

// ─── Pública: alunos acessam pelo portal sem login ─────────────────────────
// Recebe escola_id como parâmetro (usado no portal do aluno)
router.get('/publico/:escola_id', async (req, res) => {
  try {
    const { escola_id } = req.params
    const avisos = await db.all(
      `SELECT id, titulo, conteudo, tipo, data_evento, fixado, criado_por_nome, criado_em
       FROM avisos
       WHERE escola_id = ?
         AND (data_evento IS NULL OR date(data_evento) >= date('now', '-1 day'))
       ORDER BY fixado DESC, data_evento ASC NULLS LAST, criado_em DESC
       LIMIT 30`,
      [escola_id]
    )
    res.json(avisos)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// ─── A partir daqui exige autenticação ─────────────────────────────────────
router.use(autenticar)

// Lista todos os avisos da escola
router.get('/', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const uid = req.usuario.id
    const avisos = await db.all(
      `SELECT a.id, a.titulo, a.conteudo, a.tipo, a.data_evento, a.fixado,
              a.criado_por_nome, a.criado_por_id, a.criado_em,
              CASE WHEN al.aviso_id IS NOT NULL THEN 1 ELSE 0 END as lido
       FROM avisos a
       LEFT JOIN avisos_lidos al ON al.aviso_id = a.id AND al.usuario_id = ?
       WHERE a.escola_id = ?
       ORDER BY a.fixado DESC, a.data_evento ASC NULLS LAST, a.criado_em DESC`,
      [uid, eid]
    )
    res.json(avisos)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// Conta avisos não lidos (para o sino de notificações)
router.get('/nao-lidos', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const uid = req.usuario.id
    const row = await db.get(
      `SELECT COUNT(*) as total FROM avisos
       WHERE escola_id = ? AND id NOT IN (
         SELECT aviso_id FROM avisos_lidos WHERE usuario_id = ?
       )`,
      [eid, uid]
    )
    res.json({ total: row ? row.total : 0 })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// Cria novo aviso ou evento
router.post('/', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const { titulo, conteudo, tipo = 'aviso', data_evento = null, fixado = 0 } = req.body

    if (!titulo || !conteudo) {
      return res.status(400).json({ erro: 'Título e conteúdo são obrigatórios.' })
    }

    const tipos_validos = ['aviso', 'evento', 'urgente']
    if (!tipos_validos.includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido.' })
    }

    const result = await db.run(
      `INSERT INTO avisos (escola_id, titulo, conteudo, tipo, data_evento, fixado, criado_por_nome, criado_por_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eid, titulo.trim(), conteudo.trim(), tipo, data_evento || null, fixado ? 1 : 0,
       req.usuario.nome, req.usuario.id]
    )

    res.json({ ok: true, id: result.lastID })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// Marca aviso como lido
router.post('/:id/lido', async (req, res) => {
  try {
    const uid = req.usuario.id
    const { id } = req.params
    await db.run(
      `INSERT OR IGNORE INTO avisos_lidos (aviso_id, usuario_id) VALUES (?, ?)`,
      [id, uid]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// Marca todos como lidos
router.post('/marcar-todos-lidos', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const uid = req.usuario.id
    const avisos = await db.all('SELECT id FROM avisos WHERE escola_id = ?', [eid])
    for (const a of avisos) {
      await db.run(
        'INSERT OR IGNORE INTO avisos_lidos (aviso_id, usuario_id) VALUES (?, ?)',
        [a.id, uid]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// Exclui aviso (admin/school: qualquer um; professor: só o próprio)
router.delete('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const uid = req.usuario.id
    const perfil = req.usuario.perfil
    const { id } = req.params

    const aviso = await db.get(
      'SELECT * FROM avisos WHERE id = ? AND escola_id = ?',
      [id, eid]
    )
    if (!aviso) return res.status(404).json({ erro: 'Aviso não encontrado.' })

    // Professor só pode excluir o que criou
    if (perfil === 'professor' && aviso.criado_por_id !== uid) {
      return res.status(403).json({ erro: 'Você só pode excluir seus próprios avisos.' })
    }

    await db.run('DELETE FROM avisos WHERE id = ?', [id])
    await db.run('DELETE FROM avisos_lidos WHERE aviso_id = ?', [id])

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
