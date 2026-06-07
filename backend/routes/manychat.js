/**
 * Webhook ManyChat → CeitecGame
 * Rota: POST /api/webhooks/manychat
 *
 * O ManyChat envia uma requisição HTTP (External Request) sempre que
 * um aluno interage numa automação do Instagram. Este endpoint recebe,
 * valida, salva o contato e registra o evento no banco.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─── Segurança: valida o cabeçalho secreto antes de processar ───────────────
function validarSegredo(req, res, next) {
  const segredoEsperado = process.env.MANYCHAT_WEBHOOK_SECRET;

  // Se o segredo não estiver configurado no .env, bloqueia por segurança
  if (!segredoEsperado) {
    console.error('[ManyChat] MANYCHAT_WEBHOOK_SECRET não configurado no .env!');
    return res.status(500).json({ erro: 'Webhook não configurado no servidor.' });
  }

  const segredoRecebido = req.headers['x-webhook-secret'];

  if (!segredoRecebido || segredoRecebido !== segredoEsperado) {
    console.warn('[ManyChat] Tentativa com segredo inválido. IP:', req.ip);
    return res.status(401).json({ erro: 'Não autorizado.' });
  }

  next();
}

// ─── POST /api/webhooks/manychat ─────────────────────────────────────────────
router.post('/', validarSegredo, async (req, res) => {
  const agora = new Date().toISOString();

  // Campos esperados (todos opcionais — ManyChat pode variar o payload)
  const {
    contact_id = null,
    name       = null,
    username   = null,
    channel    = 'instagram',
    event      = 'desconhecido',
    payload    = {},
  } = req.body || {};

  // Log resumido para auditoria
  console.log(`[ManyChat] ${agora} | event=${event} | contact_id=${contact_id} | username=${username}`);

  try {
    // ── 1. Salvar/atualizar contato ──────────────────────────────────────────
    if (contact_id || username) {
      await db.run(
        `INSERT INTO manychat_contatos
           (contact_id, nome, username, canal, ultima_interacao, criado_em)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON CONFLICT (contact_id)
         DO UPDATE SET
           nome              = EXCLUDED.nome,
           username          = EXCLUDED.username,
           canal             = EXCLUDED.canal,
           ultima_interacao  = NOW()`,
        [contact_id, name, username, channel]
      );
    }

    // ── 2. Registrar log do evento ───────────────────────────────────────────
    await db.run(
      `INSERT INTO manychat_logs
         (contact_id, username, event, payload_json, ip, criado_em)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        contact_id,
        username,
        event,
        JSON.stringify(payload),
        req.ip,
      ]
    );

    // ── 3. Lógica por tipo de evento ─────────────────────────────────────────
    await processarEvento({ contact_id, name, username, channel, event, payload });

    // ── 4. Responder ao ManyChat ─────────────────────────────────────────────
    return res.status(200).json({ status: 'ok' });

  } catch (err) {
    console.error('[ManyChat] Erro ao processar webhook:', err.message);
    // Mesmo com erro interno, respondemos 200 para o ManyChat não retentar
    return res.status(200).json({ status: 'ok', aviso: 'Erro interno registrado.' });
  }
});

// ─── Processa cada tipo de evento ─────────────────────────────────────────
async function processarEvento({ contact_id, name, username, channel, event, payload }) {
  switch (event) {

    case 'nova_mensagem':
      // Aluno mandou mensagem no Instagram → registra interação
      console.log(`[ManyChat] Nova mensagem de ${username || contact_id}: "${payload.mensagem || ''}"`);
      // Aqui você pode: pontuar no ItagGame, liberar conteúdo, etc.
      // Exemplo futuro: await pontuar(contact_id, 10, 'Interação via Instagram');
      break;

    case 'inscricao_curso':
      // Aluno se inscreveu no curso de férias via Instagram
      console.log(`[ManyChat] Inscrição no curso: ${name || username}`);
      // Exemplo futuro: criar pré-cadastro no banco de alunos, enviar e-mail de boas-vindas
      break;

    case 'desafio_concluido':
      // Aluno completou um desafio enviado pelo ManyChat
      console.log(`[ManyChat] Desafio concluído por ${username}, tags: ${JSON.stringify(payload.tags || [])}`);
      // Exemplo futuro: conceder XP no ItagGame
      break;

    default:
      // Evento desconhecido — apenas logamos, não fazemos nada
      console.log(`[ManyChat] Evento não mapeado: ${event}`);
      break;
  }
}

// ─── GET /api/webhooks/manychat/logs ────────────────────────────────────────
// Rota auxiliar para o Genezio conferir os registros que chegaram
// (protegida pelo mesmo segredo no cabeçalho)
router.get('/logs', validarSegredo, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 50;
    const logs = await db.all(
      `SELECT id, contact_id, username, event, ip, criado_em
       FROM manychat_logs
       ORDER BY criado_em DESC
       LIMIT ?`,
      [limite]
    );
    return res.json({ total: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
