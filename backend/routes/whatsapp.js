/**
 * routes/whatsapp.js — API WhatsApp Business Cloud (Meta oficial)
 */
const express = require('express');
const { autenticar } = require('../middleware/auth');
const waMeta = require('../whatsapp-meta');

const router = express.Router();
const WEBHOOK_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN || 'ceitec_webhook_2026';

// Verificação do webhook pela Meta
router.get('/webhook', (req, res) => {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WEBHOOK_TOKEN) {
    console.log('✅ Webhook WhatsApp verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Recebe mensagens/eventos da Meta
router.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        change.value?.messages?.forEach(msg => {
          if (msg.type === 'text') {
            console.log(`📨 WhatsApp de ${msg.from}: ${msg.text.body}`);
          }
        });
      });
    });
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

// Envia mensagem de texto (autenticado)
router.post('/enviar', autenticar, async (req, res) => {
  const { telefone, mensagem } = req.body;
  if (!telefone || !mensagem) return res.status(400).json({ erro: 'telefone e mensagem obrigatórios' });
  try {
    const resultado = await waMeta.enviarTexto(telefone, mensagem);
    res.json({ ok: true, resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Campanha para lista de contatos (ex: inscritos no Curso de Férias)
router.post('/campanha', autenticar, async (req, res) => {
  const { telefones, mensagem } = req.body;
  if (!Array.isArray(telefones) || !mensagem) return res.status(400).json({ erro: 'telefones (array) e mensagem obrigatórios' });

  const resultados = [];
  for (const tel of telefones) {
    try {
      await waMeta.enviarTexto(tel, mensagem);
      resultados.push({ tel, ok: true });
      await new Promise(r => setTimeout(r, 1000)); // 1s entre mensagens
    } catch (err) {
      resultados.push({ tel, ok: false, erro: err.message });
    }
  }
  res.json({ enviados: resultados.filter(r => r.ok).length, total: telefones.length, resultados });
});

module.exports = router;
