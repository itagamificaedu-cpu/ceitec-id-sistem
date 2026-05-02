const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

async function ensureColunas() {
  try { await db.exec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'escola'`); } catch (_) {}
  try { await db.exec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pagamento_mp_id TEXT`); } catch (_) {}
}

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-97948385900636-031422-b459084aa93d30f79e89518602866f87-835607568';
const BASE_URL = process.env.BASE_URL || 'https://ceitec-id-sistem.vercel.app';
const EMAIL_USER = 'itagamificaedu@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'thyfeaqgawulrwkk';

const PLANOS = [
  {
    id: 'basico',
    nome: 'Plano Básico',
    preco: 39.00,
    periodo: 'mês',
    descricao: 'Ideal para professores individuais',
    recursos: ['Até 150 alunos', 'Controle de presença', 'Avaliações', 'Relatórios', 'IA Educacional'],
    destaque: false,
  },
  {
    id: 'escola',
    nome: 'Plano Escola',
    preco: 79.00,
    periodo: 'mês',
    descricao: 'Para escolas e instituições',
    recursos: ['Alunos ilimitados', 'Múltiplos professores', 'ItagGame', 'Corretor de Provas', 'Repositório', 'IA Educacional', 'Suporte prioritário'],
    destaque: true,
  }
];

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
  try {
    await ensureColunas();
  } catch (_) {}
  // Always respond 200 at the end — process everything first
  // (Vercel/serverless: res.send() before async work kills execution)
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
    const plano_nome = plano?.nome || plano_id || 'Escola';

    // Generate new password (always — handles both new users and retry after failure)
    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      // User already exists (webhook retry or previous test): update password and resend
      await db.run(
        'UPDATE usuarios SET senha_hash = ?, plano = ?, pagamento_mp_id = ? WHERE email = ?',
        [senha_hash, plano_id || 'escola', String(payment_id), email]
      );
    } else {
      await db.run(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil, plano, pagamento_mp_id) VALUES (?, ?, ?, ?, ?, ?)',
        [nome, email, senha_hash, 'admin', plano_id || 'escola', String(payment_id)]
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `ITA Tecnologia Educacional <${EMAIL_USER}>`,
      to: email,
      subject: '✅ Acesso liberado — ITA Tecnologia Educacional',
      html: `
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
      `,
    });

    console.log(`[webhook-pix] acesso liberado: ${email} | plano: ${plano_id}`);
  } catch (err) {
    console.error('[webhook-pix] erro:', err.message);
  }

  res.sendStatus(200);
});

// Admin: reprocessar pagamento por ID (ex: PIX aprovado mas email falhou)
// Uso: POST /api/pagamento/reprocessar  body: { payment_id, admin_key }
router.post('/reprocessar', async (req, res) => {
  await ensureColunas().catch(() => {});
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
    const plano_nome = plano?.nome || plano_id || 'Escola';

    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      await db.run(
        'UPDATE usuarios SET senha_hash = ?, plano = ?, pagamento_mp_id = ? WHERE email = ?',
        [senha_hash, plano_id || 'escola', String(payment_id), email]
      );
    } else {
      await db.run(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil, plano, pagamento_mp_id) VALUES (?, ?, ?, ?, ?, ?)',
        [nome, email, senha_hash, 'admin', plano_id || 'escola', String(payment_id)]
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `ITA Tecnologia Educacional <${EMAIL_USER}>`,
      to: email,
      subject: '✅ Acesso liberado — ITA Tecnologia Educacional',
      html: `
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
      `,
    });

    res.json({ ok: true, mensagem: `Acesso liberado e email enviado para ${email}`, plano: plano_nome });
  } catch (err) {
    console.error('[reprocessar] erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Admin: reenviar credenciais por email (sem precisar do payment_id)
// Uso: POST /api/pagamento/reenviar  body: { email, nome, plano_id, admin_key }
router.post('/reenviar', async (req, res) => {
  await ensureColunas().catch(() => {});
  const { email, nome, plano_id, admin_key } = req.body;
  if (admin_key !== (process.env.ADMIN_KEY || 'ita-admin-2025')) {
    return res.status(403).json({ erro: 'Não autorizado' });
  }
  if (!email) return res.status(400).json({ erro: 'email obrigatório' });

  try {
    const plano = PLANOS.find(p => p.id === plano_id);
    const plano_nome = plano?.nome || plano_id || 'Escola';

    const senha = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 100);
    const senha_hash = bcrypt.hashSync(senha, 10);
    const nomeUsar = nome || email.split('@')[0];

    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      await db.run('UPDATE usuarios SET senha_hash = ?, plano = ? WHERE email = ?', [senha_hash, plano_id || 'escola', email]);
    } else {
      await db.run(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil, plano) VALUES (?, ?, ?, ?, ?)',
        [nomeUsar, email, senha_hash, 'admin', plano_id || 'escola']
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `ITA Tecnologia Educacional <${EMAIL_USER}>`,
      to: email,
      subject: '✅ Acesso liberado — ITA Tecnologia Educacional',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
          <div style="background:#1e3a5f;padding:30px;text-align:center">
            <h1 style="color:#f5a623;margin:0;font-size:22px">🎓 ITA TECNOLOGIA EDUCACIONAL</h1>
          </div>
          <div style="padding:30px">
            <h2 style="color:#1e3a5f">Pagamento confirmado! 🎉</h2>
            <p>Olá, <strong>${nomeUsar}</strong>!</p>
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
      `,
    });

    res.json({ ok: true, mensagem: `Credenciais enviadas para ${email}`, plano: plano_nome });
  } catch (err) {
    console.error('[reenviar] erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
