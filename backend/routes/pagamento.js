const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-97948385900636-031422-b459084aa93d30f79e89518602866f87-835607568';
const BASE_URL = process.env.BASE_URL || 'https://ceitec-id-sistem.vercel.app';
const EMAIL_USER = 'itagamificaedu@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ikzfihmnwluhbijo';

const PLANOS = [
  {
    id: 'basico',
    nome: 'Plano Básico',
    preco: 39.00,
    periodo: 'mês',
    periodo_dias: 30,
    descricao: 'Ideal para professores individuais',
    recursos: ['Até 150 alunos', 'Controle de presença', 'Avaliações', 'Relatórios', 'IA Educacional'],
    destaque: false,
  },
  {
    id: 'escola',
    nome: 'Plano Escola',
    preco: 79.00,
    periodo: 'mês',
    periodo_dias: 30,
    descricao: 'Para escolas e instituições',
    recursos: ['Alunos ilimitados', 'Múltiplos professores', 'ItagGame', 'Corretor de Provas', 'Repositório', 'IA Educacional', 'Suporte prioritário'],
    destaque: true,
  }
];

function emailHtml(nome, plano_nome, email, senha) {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a5f;padding:30px;text-align:center">
        <h1 style="color:#f5a623;margin:0;font-size:22px">🎓 ITA TECNOLOGIA EDUCACIONAL</h1>
      </div>
      <div style="padding:30px">
        <h2 style="color:#1e3a5f">Pagamento confirmado! 🎉</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu <strong>${plano_nome}</strong> está ativo. Use as credenciais abaixo para acessar a plataforma:</p>
        <div style="background:#fff;border:2px solid #f5a623;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:5px 0"><strong>🌐 Link:</strong> <a href="${BASE_URL}/login" style="color:#1e3a5f">${BASE_URL}/login</a></p>
          <p style="margin:5px 0"><strong>📧 Email:</strong> ${email}</p>
          <p style="margin:5px 0"><strong>🔑 Senha:</strong> <span style="font-size:20px;font-weight:bold;color:#1e3a5f;letter-spacing:2px">${senha}</span></p>
        </div>
        <p style="color:#666;font-size:13px">Recomendamos alterar a senha após o primeiro acesso.</p>
        <a href="${BASE_URL}/login" style="display:inline-block;background:#f5a623;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;margin-top:10px">Acessar Plataforma →</a>
      </div>
      <div style="background:#eee;padding:15px;text-align:center;font-size:12px;color:#999">
        ITA Tecnologia Educacional © 2025
      </div>
    </div>
  `;
}

async function calcularExpiry(email, plano) {
  const dias = plano?.periodo_dias || 30;
  // Se já tem licença ativa, estende a partir dela (renovação)
  const atual = await db.get('SELECT licenca_expira FROM usuarios WHERE email = ?', [email]);
  const base = atual?.licenca_expira && new Date(atual.licenca_expira) > new Date()
    ? new Date(atual.licenca_expira)
    : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString();
}

async function criarOuAtualizarUsuario(nome, email, senha_hash, plano_id, payment_id, licenca_expira) {
  const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) {
    await db.run('UPDATE usuarios SET senha_hash = ? WHERE email = ?', [senha_hash, email]);
  } else {
    await db.run(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, 'admin']
    );
  }
  if (plano_id) {
    try { await db.run('UPDATE usuarios SET plano = ? WHERE email = ?', [plano_id, email]); } catch (_) {}
  }
  if (payment_id) {
    try { await db.run('UPDATE usuarios SET pagamento_mp_id = ? WHERE email = ?', [String(payment_id), email]); } catch (_) {}
  }
  if (licenca_expira) {
    try { await db.run('UPDATE usuarios SET licenca_expira = ?, plano_ativo = 1 WHERE email = ?', [licenca_expira, email]); } catch (_) {}
  }
}

async function enviarEmail(to, nome, plano_nome, senha) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `ITA Tecnologia Educacional <${EMAIL_USER}>`,
    to,
    subject: '✅ Acesso liberado — ITA Tecnologia Educacional',
    html: emailHtml(nome, plano_nome, to, senha),
  });
}

router.get('/planos', (req, res) => {
  res.json({ planos: PLANOS });
});

router.post('/criar', async (req, res) => {
  const { plano_id, nome, email } = req.body;
  if (!plano_id || !email || !nome) return res.status(400).json({ erro: 'Nome, email e plano são obrigatórios' });

  const plano = PLANOS.find(p => p.id === plano_id);
  if (!plano) return res.status(400).json({ erro: 'Plano inválido' });

  try {
    const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [{ title: `ITA Tecnologia — ${plano.nome}`, quantity: 1, unit_price: plano.preco, currency_id: 'BRL' }],
        payer: { email },
        back_urls: {
          success: `${BASE_URL}/dashboard`,
          failure: `${BASE_URL}/planos`,
          pending: `${BASE_URL}/planos`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ nome, email, plano_id }),
        notification_url: `${BASE_URL}/api/pagamento/webhook`,
      }
    });

    res.json({ link_pagamento: response.init_point });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/webhook', async (req, res) => {
  // Process everything BEFORE sending 200 (Vercel terminates after res.send)
  try {
    const payment_id = req.query['data.id'] || req.query.id || req.body?.data?.id;
    if (!payment_id) return res.sendStatus(200);

    console.log(`[webhook-pix] recebido payment_id=${payment_id}`);

    const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    const paymentClient = new Payment(client);
    const info = await paymentClient.get({ id: payment_id });

    console.log(`[webhook-pix] status=${info.status} ref=${info.external_reference}`);

    if (info.status !== 'approved') return res.sendStatus(200);

    const ref = JSON.parse(info.external_reference || '{}');
    const { nome, email, plano_id } = ref;
    if (!email) return res.sendStatus(200);

    const plano = PLANOS.find(p => p.id === plano_id);
    const plano_nome = plano?.nome || plano_id || 'Plano Escola';

    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);
    const licenca_expira = await calcularExpiry(email, plano);

    await criarOuAtualizarUsuario(nome, email, senha_hash, plano_id, payment_id, licenca_expira);
    await enviarEmail(email, nome, plano_nome, senha);

    console.log(`[webhook-pix] acesso liberado: ${email} | plano: ${plano_id} | expira: ${licenca_expira}`);
  } catch (err) {
    console.error('[webhook-pix] erro:', err.message);
  }

  res.sendStatus(200);
});

// Admin: reprocessar pagamento pelo ID do Mercado Pago
// POST /api/pagamento/reprocessar  body: { payment_id, admin_key }
router.post('/reprocessar', async (req, res) => {
  const { payment_id, admin_key } = req.body;
  if (admin_key !== (process.env.ADMIN_KEY || 'ita-admin-2025')) {
    return res.status(403).json({ erro: 'Não autorizado' });
  }
  if (!payment_id) return res.status(400).json({ erro: 'payment_id obrigatório' });

  try {
    const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    const paymentClient = new Payment(client);
    const info = await paymentClient.get({ id: payment_id });

    if (info.status !== 'approved') {
      return res.status(400).json({ erro: `Pagamento não aprovado: status=${info.status}` });
    }

    const ref = JSON.parse(info.external_reference || '{}');
    const { nome, email, plano_id } = ref;
    if (!email) return res.status(400).json({ erro: 'external_reference sem email' });

    const plano = PLANOS.find(p => p.id === plano_id);
    const plano_nome = plano?.nome || plano_id || 'Plano Escola';

    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);
    const licenca_expira = await calcularExpiry(email, plano);

    await criarOuAtualizarUsuario(nome, email, senha_hash, plano_id, payment_id, licenca_expira);
    await enviarEmail(email, nome, plano_nome, senha);

    res.json({ ok: true, mensagem: `Acesso liberado e email enviado para ${email}`, plano: plano_nome, expira: licenca_expira });
  } catch (err) {
    console.error('[reprocessar] erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Admin: reenviar credenciais direto por email (sem payment_id)
// POST /api/pagamento/reenviar  body: { email, nome, plano_id, admin_key }
router.post('/reenviar', async (req, res) => {
  const { email, nome, plano_id, admin_key } = req.body;
  if (admin_key !== (process.env.ADMIN_KEY || 'ita-admin-2025')) {
    return res.status(403).json({ erro: 'Não autorizado' });
  }
  if (!email) return res.status(400).json({ erro: 'email obrigatório' });

  try {
    const plano = PLANOS.find(p => p.id === plano_id);
    const plano_nome = plano?.nome || plano_id || 'Plano Escola';
    const nomeUsar = nome || email.split('@')[0];
    const licenca_expira = await calcularExpiry(email, plano);

    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);

    await criarOuAtualizarUsuario(nomeUsar, email, senha_hash, plano_id, null, licenca_expira);
    await enviarEmail(email, nomeUsar, plano_nome, senha);

    res.json({ ok: true, mensagem: `Credenciais enviadas para ${email}`, plano: plano_nome, expira: licenca_expira });
  } catch (err) {
    console.error('[reenviar] erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Área do cliente: status da licença
// GET /api/pagamento/minha-licenca  (requer login)
router.get('/minha-licenca', autenticar, async (req, res) => {
  try {
    const escola_id = req.usuario.escola_id;
    const admin = await db.get(
      'SELECT nome, email, plano, licenca_expira, plano_ativo FROM usuarios WHERE id = ?',
      [escola_id]
    );
    if (!admin) return res.status(404).json({ erro: 'Escola não encontrada' });

    const planoInfo = PLANOS.find(p => p.id === admin.plano);
    const expira = admin.licenca_expira ? new Date(admin.licenca_expira) : null;
    const agora = new Date();
    const dias_restantes = expira
      ? Math.max(0, Math.ceil((expira - agora) / (1000 * 60 * 60 * 24)))
      : null;

    let status = 'ativo_demo';
    if (expira) status = expira > agora ? 'ativo' : 'expirado';

    res.json({
      escola: admin.nome,
      email: admin.email,
      plano: admin.plano || 'escola',
      plano_nome: planoInfo?.nome || 'Plano Escola',
      plano_preco: planoInfo?.preco,
      plano_periodo: planoInfo?.periodo,
      licenca_expira: admin.licenca_expira,
      plano_ativo: admin.plano_ativo !== 0,
      dias_restantes,
      status,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
