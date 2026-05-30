// ============================================================
// ÁLBUM DOS CRAQUES DO CONHECIMENTO — CEITEC GAME
// Figurinhas colecionáveis gamificadas
// ============================================================
const express = require('express')
const db      = require('../db')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

// ── Pesos de raridade por tipo de pacote ──────────────────────
const PESOS = {
  comum:   { comum: 60, rara: 25, epica: 12, lendaria: 3 },
  premium: { comum: 30, rara: 38, epica: 24, lendaria: 8 },
  especial:{ comum: 10, rara: 30, epica: 40, lendaria: 20 },
}
const CUSTO_XP = { comum: 50, premium: 120, especial: 0 }
const QTD_FIGS = { comum: 3, premium: 5, especial: 5 }

function sortearRaridade(pesos) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const [rar, peso] of Object.entries(pesos)) {
    r -= peso
    if (r <= 0) return rar
  }
  return 'comum'
}

// Resolve o escola_id real para figurinhas:
// Se a escola do usuário não tem figurinhas próprias, usa a escola 1 (plataforma ITA)
async function resolverEscolaFigs(escola_id) {
  const tem = await db.get(
    'SELECT id FROM album_figurinhas WHERE escola_id = ? AND ativo = 1 LIMIT 1',
    [escola_id]
  )
  return tem ? escola_id : 1
}

// ── GET /node-api/album/figurinhas — lista todas da escola ────
router.get('/figurinhas', autenticar, async (req, res) => {
  try {
    const eid = await resolverEscolaFigs(req.usuario.escola_id)
    const figs = await db.all(
      `SELECT f.*, c.nome AS colecao_nome, c.icone AS colecao_icone, c.cor AS colecao_cor
       FROM album_figurinhas f
       LEFT JOIN album_colecoes c ON c.id = f.colecao_id
       WHERE f.escola_id = ? AND f.ativo = 1
       ORDER BY f.numero ASC`,
      [eid]
    )
    res.json(figs)
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── GET /node-api/album/meu-album/:aluno_id ───────────────────
router.get('/meu-album/:aluno_id', autenticar, async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id
    const eid       = await resolverEscolaFigs(escola_id)
    const alunoId   = parseInt(req.params.aluno_id)

    const todas = await db.all(
      `SELECT f.*, c.nome AS colecao_nome, c.icone AS colecao_icone, c.cor AS colecao_cor
       FROM album_figurinhas f
       LEFT JOIN album_colecoes c ON c.id = f.colecao_id
       WHERE f.escola_id = ? AND f.ativo = 1
       ORDER BY f.numero ASC`,
      [eid]
    )
    const minhas = await db.all(
      'SELECT figurinha_id, quantidade, obtida_em FROM album_aluno WHERE aluno_id = ? AND escola_id = ?',
      [alunoId, escola_id]
    )

    const map = {}
    for (const m of minhas) map[m.figurinha_id] = m

    const figurinhas = todas.map(f => ({
      ...f,
      desbloqueada: !!map[f.id],
      quantidade:   map[f.id]?.quantidade || 0,
      obtida_em:    map[f.id]?.obtida_em  || null,
    }))

    // Estatísticas por raridade
    const stats = {}
    for (const f of todas) {
      if (!stats[f.raridade]) stats[f.raridade] = { total: 0, desbloqueadas: 0 }
      stats[f.raridade].total++
      if (map[f.id]) stats[f.raridade].desbloqueadas++
    }

    // XP disponível do aluno
    const pontos = await db.get('SELECT xp_total FROM itagame_pontos WHERE aluno_id = ?', [alunoId])

    res.json({
      figurinhas,
      total:         todas.length,
      desbloqueadas: minhas.length,
      percentual:    todas.length ? Math.round((minhas.length / todas.length) * 100) : 0,
      xp_disponivel: pontos?.xp_total || 0,
      stats,
    })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── POST /node-api/album/abrir-pacote ────────────────────────
router.post('/abrir-pacote', autenticar, async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id
    const { aluno_id, tipo = 'comum' } = req.body
    const eid = await resolverEscolaFigs(escola_id)

    const custo = CUSTO_XP[tipo] || 50
    const qtd   = QTD_FIGS[tipo] || 3
    const pesos = PESOS[tipo]    || PESOS.comum

    // Verificar XP do aluno
    if (custo > 0) {
      const pontos = await db.get('SELECT xp_total FROM itagame_pontos WHERE aluno_id = ?', [aluno_id])
      if (!pontos || pontos.xp_total < custo) {
        return res.status(400).json({ erro: 'XP insuficiente para abrir este pacote', xp_atual: pontos?.xp_total || 0, custo })
      }
    }

    // Todas as figurinhas disponíveis (usa eid = escola resolvida)
    const todasFigs = await db.all(
      'SELECT * FROM album_figurinhas WHERE escola_id = ? AND ativo = 1',
      [eid]
    )
    if (!todasFigs.length) return res.status(400).json({ erro: 'Nenhuma figurinha cadastrada ainda.' })

    // Figurinhas que o aluno já possui
    const jatem = await db.all(
      'SELECT figurinha_id FROM album_aluno WHERE aluno_id = ? AND escola_id = ?',
      [aluno_id, eid]
    )
    const jaTemSet = new Set(jatem.map(j => j.figurinha_id))

    const resultado = []

    for (let i = 0; i < qtd; i++) {
      const rar  = sortearRaridade(pesos)
      const pool = todasFigs.filter(f => f.raridade === rar)
      if (!pool.length) { i--; continue }

      const fig      = pool[Math.floor(Math.random() * pool.length)]
      const duplicata = jaTemSet.has(fig.id)

      if (!duplicata) jaTemSet.add(fig.id)

      // Inserir/atualizar no album do aluno
      await db.run(
        `INSERT INTO album_aluno (aluno_id, escola_id, figurinha_id, quantidade)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (aluno_id, figurinha_id)
         DO UPDATE SET quantidade = album_aluno.quantidade + 1`,
        [aluno_id, eid, fig.id]
      )

      resultado.push({ ...fig, duplicata })
    }

    // Debitar XP
    if (custo > 0) {
      await db.run(
        'UPDATE itagame_pontos SET xp_total = xp_total - ? WHERE aluno_id = ?',
        [custo, aluno_id]
      )
    }

    // Log do pacote
    await db.run(
      `INSERT INTO album_pacotes_log (aluno_id, escola_id, tipo, figurinhas_ids, custo_xp)
       VALUES (?, ?, ?, ?, ?)`,
      [aluno_id, eid, tipo, JSON.stringify(resultado.map(f => f.id)), custo]
    )

    res.json({
      pacote:     resultado,
      custo_xp:   custo,
      novas:      resultado.filter(f => !f.duplicata).length,
      duplicatas: resultado.filter(f =>  f.duplicata).length,
    })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── GET /node-api/album/ranking ──────────────────────────────
router.get('/ranking', autenticar, async (req, res) => {
  try {
    const eid = await resolverEscolaFigs(req.usuario.escola_id)
    const total = await db.get(
      'SELECT COUNT(*) AS n FROM album_figurinhas WHERE escola_id = ? AND ativo = 1',
      [eid]
    )
    const ranking = await db.all(
      `SELECT a.nome, al.aluno_id, a.turma,
              COUNT(al.figurinha_id) AS desbloqueadas
       FROM album_aluno al
       JOIN alunos a ON a.id = al.aluno_id
       WHERE al.escola_id = ?
       GROUP BY al.aluno_id, a.nome, a.turma
       ORDER BY desbloqueadas DESC
       LIMIT 30`,
      [eid]
    )
    res.json({
      ranking: ranking.map((r, i) => ({
        ...r,
        posicao:    i + 1,
        total:      total.n,
        percentual: Math.round((r.desbloqueadas / total.n) * 100),
      })),
    })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── POST /node-api/album/figurinhas — cria figurinha (admin) ─
router.post('/figurinhas', autenticar, async (req, res) => {
  try {
    const { escola_id } = req.usuario
    const { numero, nome, classe, raridade, poder, historia, curiosidade,
            xp_bonus, icone_emoji, cor_primaria, cor_secundaria, colecao_id } = req.body

    const { lastInsertRowid } = await db.run(
      `INSERT INTO album_figurinhas
        (numero, nome, classe, raridade, poder, historia, curiosidade,
         xp_bonus, icone_emoji, cor_primaria, cor_secundaria, colecao_id, escola_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [numero, nome, classe, raridade || 'comum', poder, historia, curiosidade,
       xp_bonus || 0, icone_emoji || '🤖',
       cor_primaria || '#6366f1', cor_secundaria || '#8b5cf6',
       colecao_id || null, escola_id]
    )
    res.json({ id: lastInsertRowid })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── POST /node-api/album/distribuir — professor dá pacote ────
router.post('/distribuir', autenticar, async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id
    const { aluno_id, tipo = 'especial' } = req.body
    const eid = await resolverEscolaFigs(escola_id)

    // Sorteia figurinhas especiais sem custo XP
    const pesos = PESOS.especial
    const qtd   = 5
    const todasFigs = await db.all(
      'SELECT * FROM album_figurinhas WHERE escola_id = ? AND ativo = 1',
      [eid]
    )
    if (!todasFigs.length) return res.status(400).json({ erro: 'Sem figurinhas cadastradas.' })

    const jatem = await db.all(
      'SELECT figurinha_id FROM album_aluno WHERE aluno_id = ? AND escola_id = ?',
      [aluno_id, eid]
    )
    const jaTemSet = new Set(jatem.map(j => j.figurinha_id))

    const resultado = []
    for (let i = 0; i < qtd; i++) {
      const rar      = sortearRaridade(pesos)
      const pool     = todasFigs.filter(f => f.raridade === rar)
      if (!pool.length) { i--; continue }
      const fig      = pool[Math.floor(Math.random() * pool.length)]
      const duplicata = jaTemSet.has(fig.id)
      if (!duplicata) jaTemSet.add(fig.id)
      await db.run(
        `INSERT INTO album_aluno (aluno_id, escola_id, figurinha_id, quantidade)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (aluno_id, figurinha_id)
         DO UPDATE SET quantidade = album_aluno.quantidade + 1`,
        [aluno_id, eid, fig.id]
      )
      resultado.push({ ...fig, duplicata })
    }

    await db.run(
      `INSERT INTO album_pacotes_log (aluno_id, escola_id, tipo, figurinhas_ids, custo_xp)
       VALUES (?, ?, 'especial', ?, 0)`,
      [aluno_id, eid, JSON.stringify(resultado.map(f => f.id))]
    )

    res.json({
      ok:         true,
      pacote:     resultado,
      custo_xp:   0,
      novas:      resultado.filter(f => !f.duplicata).length,
      duplicatas: resultado.filter(f =>  f.duplicata).length,
    })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── GET /node-api/album/colecoes — categorias ─────────────────
router.get('/colecoes', autenticar, async (req, res) => {
  try {
    const { escola_id } = req.usuario
    const cols = await db.all(
      'SELECT * FROM album_colecoes WHERE escola_id = ? ORDER BY ordem ASC',
      [escola_id]
    )
    res.json(cols)
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ══════════════════════════════════════════════════════════════
// FUNÇÃO AUXILIAR — Premia aluno com pacote (sem autenticação)
// Chamada internamente por outros módulos (quiz, missão, nota)
// ══════════════════════════════════════════════════════════════
async function premiacao(aluno_id, escola_id, tipo = 'comum', motivo = '') {
  try {
    const eid   = await resolverEscolaFigs(escola_id)
    const pesos = PESOS[tipo] || PESOS.comum
    const qtd   = QTD_FIGS[tipo] || 3

    const todasFigs = await db.all('SELECT * FROM album_figurinhas WHERE escola_id = ? AND ativo = 1', [eid])
    if (!todasFigs.length) return { ok: false, motivo: 'sem figurinhas' }

    const jatem = await db.all('SELECT figurinha_id FROM album_aluno WHERE aluno_id = ? AND escola_id = ?', [aluno_id, eid])
    const jaTemSet = new Set(jatem.map(j => j.figurinha_id))

    const resultado = []
    for (let i = 0; i < qtd; i++) {
      const rar  = sortearRaridade(pesos)
      const pool = todasFigs.filter(f => f.raridade === rar)
      if (!pool.length) { i--; continue }
      const fig      = pool[Math.floor(Math.random() * pool.length)]
      const duplicata = jaTemSet.has(fig.id)
      if (!duplicata) jaTemSet.add(fig.id)
      await db.run(
        `INSERT INTO album_aluno (aluno_id, escola_id, figurinha_id, quantidade)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (aluno_id, figurinha_id)
         DO UPDATE SET quantidade = album_aluno.quantidade + 1`,
        [aluno_id, eid, fig.id]
      )
      resultado.push({ ...fig, duplicata })
    }
    await db.run(
      `INSERT INTO album_pacotes_log (aluno_id, escola_id, tipo, figurinhas_ids, custo_xp)
       VALUES (?, ?, ?, ?, 0)`,
      [aluno_id, eid, tipo, JSON.stringify(resultado.map(f => f.id))]
    )
    return { ok: true, pacote: resultado, novas: resultado.filter(f => !f.duplicata).length }
  } catch (err) { return { ok: false, erro: err.message } }
}
module.exports.premiacao = premiacao

// ── POST /node-api/album/premiar-missao — professor aprova missão ──
router.post('/premiar-missao', autenticar, async (req, res) => {
  try {
    const { escola_id } = req.usuario
    const { aluno_id, missao_titulo = 'Missão concluída' } = req.body
    const r = await premiacao(aluno_id, escola_id, 'especial', `Missão: ${missao_titulo}`)
    res.json(r)
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── POST /node-api/album/premiar-por-nota — professor premia por nota ──
router.post('/premiar-por-nota', autenticar, async (req, res) => {
  try {
    const { escola_id } = req.usuario
    const { avaliacao_id, nota_minima = 7, tipo = 'comum' } = req.body

    // Busca alunos com nota >= nota_minima nessa avaliação
    const premiados = await db.all(
      `SELECT n.aluno_id, a.nome, n.nota_final
       FROM notas n
       JOIN alunos a ON a.id = n.aluno_id
       WHERE n.avaliacao_id = ? AND n.nota_final >= ?
       ORDER BY n.nota_final DESC`,
      [avaliacao_id, nota_minima]
    )
    if (!premiados.length) return res.json({ ok: true, premiados: 0, msg: 'Nenhum aluno atingiu a nota mínima.' })

    const resultados = []
    for (const aluno of premiados) {
      const r = await premiacao(aluno.aluno_id, escola_id, tipo, `Nota ${aluno.nota_final} na avaliação`)
      resultados.push({ aluno: aluno.nome, nota: aluno.nota_final, cartas: r.novas || 0 })
    }
    res.json({ ok: true, premiados: premiados.length, resultados })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

// ── GET /node-api/album/portal/:codigo — público, sem JWT ─────
// Usado pelo portal do aluno (carteirinha / QR Code)
router.get('/portal/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.toUpperCase().trim()

    // Busca aluno pelo código
    const aluno = await db.get(
      'SELECT id, nome, turma, escola_id FROM alunos WHERE codigo = ? AND ativo = 1',
      [codigo]
    )
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' })

    const aluno_id = aluno.id
    const eid      = await resolverEscolaFigs(aluno.escola_id)

    // Todas as figurinhas (usa eid com fallback para escola 1)
    const todas = await db.all(
      `SELECT f.*, c.nome AS colecao_nome, c.icone AS colecao_icone, c.cor AS colecao_cor
       FROM album_figurinhas f
       LEFT JOIN album_colecoes c ON c.id = f.colecao_id
       WHERE f.escola_id = ? AND f.ativo = 1
       ORDER BY f.numero ASC`,
      [eid]
    )

    // Figurinhas que o aluno já ganhou
    const minhas = await db.all(
      'SELECT figurinha_id, quantidade, obtida_em FROM album_aluno WHERE aluno_id = ? AND escola_id = ?',
      [aluno_id, eid]
    )
    const map = {}
    for (const m of minhas) map[m.figurinha_id] = m

    const figurinhas = todas.map(f => ({
      ...f,
      desbloqueada: !!map[f.id],
      quantidade:   map[f.id]?.quantidade || 0,
      obtida_em:    map[f.id]?.obtida_em  || null,
    }))

    res.json({
      figurinhas,
      total:         todas.length,
      desbloqueadas: minhas.length,
      percentual:    todas.length ? Math.round((minhas.length / todas.length) * 100) : 0,
    })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

module.exports = router
