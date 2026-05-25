/**
 * Professor Game — Gamificação dos professores
 * XP por ações: login, criar quiz/avaliação/plano/ocorrência, presença, etc.
 * Ranking, perfil e histórico de XP
 */
const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');
const router = express.Router();
router.use(autenticar);

// ── XP por tipo de ação ────────────────────────────────────────────────────
const XP_TABELA = {
  login:           { xp: 5,  label: 'Login diário' },
  quiz_criado:     { xp: 15, label: 'Quiz criado' },
  avaliacao_criada:{ xp: 20, label: 'Avaliação criada' },
  plano_ia:        { xp: 20, label: 'Plano de aula com IA' },
  plano_manual:    { xp: 25, label: 'Plano de aula manual' },
  presenca_turma:  { xp: 10, label: 'Presença registrada' },
  ocorrencia:      { xp: 5,  label: 'Ocorrência registrada' },
  corretor_prova:  { xp: 25, label: 'Prova corrigida' },
  scanner_portal:  { xp: 2,  label: 'Scanner Game Aluno' },
  quiz_ao_vivo:    { xp: 10, label: 'Quiz ao Vivo realizado' },
};

// Fórmula de nível: 1 nível a cada 200 XP (igual ao GamificaEdu)
function calcularNivel(xp) {
  return Math.floor(xp / 200) + 1;
}

const NIVEL_NOMES = [
  '', // index 0 não usado
  '🌱 Iniciante',   // 1
  '📚 Aprendiz',    // 2
  '⚡ Ativo',       // 3
  '🎯 Dedicado',    // 4
  '🔥 Engajado',    // 5
  '🏆 Expert',      // 6
  '🌟 Mestre',      // 7
  '💎 Elite',       // 8
  '👑 Lenda',       // 9 (200 XP por nível = 1800 XP para lenda)
];

function nomeDNivel(nivel) {
  return NIVEL_NOMES[Math.min(nivel, NIVEL_NOMES.length - 1)] || `Nível ${nivel}`;
}

/**
 * Função principal: adiciona XP ao professor logado
 * Chamada de outros routes com req.usuario disponível
 */
async function addProfXP(usuarioId, escolaId, tipo, descricaoExtra) {
  const config = XP_TABELA[tipo];
  if (!config) return;
  const xp = config.xp;
  const descricao = descricaoExtra ? `${config.label}: ${descricaoExtra}` : config.label;

  try {
    // Upsert no perfil de gamificação
    await db.run(
      `INSERT INTO prof_gamificacao (usuario_id, escola_id, xp_total, nivel, streak, ultimo_login)
       VALUES ($1, $2, $3, $4, 0, CURRENT_DATE)
       ON CONFLICT (usuario_id) DO UPDATE SET
         xp_total = prof_gamificacao.xp_total + $3,
         nivel = FLOOR((prof_gamificacao.xp_total + $3) / 200) + 1`,
      [usuarioId, escolaId, xp, calcularNivel(xp)]
    );
    // Histórico
    await db.run(
      `INSERT INTO prof_xp_historico (usuario_id, escola_id, tipo, descricao, xp_ganho)
       VALUES ($1, $2, $3, $4, $5)`,
      [usuarioId, escolaId, tipo, descricao, xp]
    );
  } catch (e) {
    console.error('[ProfGame] Erro ao adicionar XP:', e.message);
  }
}
module.exports.addProfXP = addProfXP;

// ── XP de login diário (chama 1x por dia) ─────────────────────────────────
router.post('/login-diario', async (req, res) => {
  try {
    const { id: uid, escola_id: eid } = req.usuario;
    const hoje = new Date().toISOString().split('T')[0];

    // Busca último login registrado
    const perfil = await db.get(
      'SELECT ultimo_login, streak FROM prof_gamificacao WHERE usuario_id = $1',
      [uid]
    );

    const ultimoLogin = perfil?.ultimo_login?.toString().split('T')[0];
    if (ultimoLogin === hoje) return res.json({ ok: true, ja_registrado: true });

    // Calcula streak
    const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const novoStreak = (ultimoLogin === ontem) ? (perfil.streak || 0) + 1 : 1;

    // XP base + bônus de streak (a cada 7 dias +20 XP extra)
    const xpBase = XP_TABELA.login.xp;
    const bonusStreak = novoStreak % 7 === 0 ? 20 : 0;
    const xpTotal = xpBase + bonusStreak;
    const descricao = bonusStreak > 0
      ? `Login diário 🔥 ${novoStreak} dias seguidos! (+${bonusStreak} bônus)`
      : `Login diário (${novoStreak} ${novoStreak > 1 ? 'dias seguidos' : 'dia'})`;

    await db.run(
      `INSERT INTO prof_gamificacao (usuario_id, escola_id, xp_total, nivel, streak, ultimo_login)
       VALUES ($1, $2, $3, 1, $4, $5)
       ON CONFLICT (usuario_id) DO UPDATE SET
         xp_total  = prof_gamificacao.xp_total + $3,
         nivel     = FLOOR((prof_gamificacao.xp_total + $3) / 200) + 1,
         streak    = $4,
         ultimo_login = $5`,
      [uid, eid, xpTotal, novoStreak, hoje]
    );
    await db.run(
      `INSERT INTO prof_xp_historico (usuario_id, escola_id, tipo, descricao, xp_ganho)
       VALUES ($1, $2, 'login', $3, $4)`,
      [uid, eid, descricao, xpTotal]
    );

    res.json({ ok: true, xp_ganho: xpTotal, streak: novoStreak, bonus: bonusStreak });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── Meu perfil de gamificação ──────────────────────────────────────────────
router.get('/meu-perfil', async (req, res) => {
  try {
    const { id: uid, escola_id: eid } = req.usuario;
    const perfil = await db.get(
      `SELECT pg.*, u.nome, u.email
       FROM prof_gamificacao pg
       JOIN usuarios u ON u.id = pg.usuario_id
       WHERE pg.usuario_id = $1`,
      [uid]
    );
    if (!perfil) return res.json({ xp_total: 0, nivel: 1, streak: 0, nome_nivel: nomeDNivel(1), historico: [] });

    const historico = await db.all(
      `SELECT tipo, descricao, xp_ganho, criado_em
       FROM prof_xp_historico WHERE usuario_id = $1
       ORDER BY criado_em DESC LIMIT 20`,
      [uid]
    );

    // Posição no ranking da escola
    const ranking = await db.get(
      `SELECT COUNT(*) + 1 as posicao
       FROM prof_gamificacao
       WHERE escola_id = $1 AND xp_total > $2`,
      [eid, perfil.xp_total]
    );

    res.json({
      ...perfil,
      nome_nivel: nomeDNivel(perfil.nivel),
      xp_proximo_nivel: (perfil.nivel * 200) - perfil.xp_total,
      posicao_ranking: ranking?.posicao || 1,
      historico,
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── Ranking da escola ──────────────────────────────────────────────────────
router.get('/ranking', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const ranking = await db.all(
      `SELECT pg.usuario_id, pg.xp_total, pg.nivel, pg.streak, pg.ultimo_login,
              u.nome, u.email,
              ROW_NUMBER() OVER (ORDER BY pg.xp_total DESC) as posicao
       FROM prof_gamificacao pg
       JOIN usuarios u ON u.id = pg.usuario_id
       WHERE pg.escola_id = $1
       ORDER BY pg.xp_total DESC
       LIMIT 30`,
      [eid]
    );

    res.json(ranking.map(r => ({
      ...r,
      nome_nivel: nomeDNivel(r.nivel),
    })));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── Histórico público de um professor (para admin ver) ─────────────────────
router.get('/historico/:usuarioId', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const historico = await db.all(
      `SELECT h.*, u.nome
       FROM prof_xp_historico h JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.usuario_id = $1 AND h.escola_id = $2
       ORDER BY h.criado_em DESC LIMIT 50`,
      [req.params.usuarioId, eid]
    );
    res.json(historico);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports.router = router;
