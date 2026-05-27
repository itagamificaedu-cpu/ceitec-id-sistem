/**
 * comunicacao.js — Comunicação com Pais/Responsáveis
 * Envia e-mails via nodemailer e gera links wa.me para WhatsApp.
 */
const express    = require('express');
const nodemailer = require('nodemailer');
const db         = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const EMAIL_USER = 'itagamificaedu@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ikzfihmnwluhbijo';

// Transporter reutilizável
function criarTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

// Formata número de telefone para wa.me (remove tudo que não é dígito, adiciona 55 se necessário)
function formatarTelWhatsApp(tel) {
  if (!tel) return null;
  const apenas = tel.replace(/\D/g, '');
  if (apenas.length === 0) return null;
  return apenas.startsWith('55') ? apenas : '55' + apenas;
}

/**
 * GET /api/comunicacao/historico
 * Lista comunicados enviados pela escola do professor logado
 */
router.get('/historico', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const lista = await db.all(
      `SELECT * FROM comunicados WHERE escola_id = $1 ORDER BY criado_em DESC LIMIT 50`,
      [eid]
    );
    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/comunicacao/:id/detalhes
 * Detalhes de um comunicado com lista de envios
 */
router.get('/:id/detalhes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const comunicado = await db.get(
      `SELECT * FROM comunicados WHERE id = $1 AND escola_id = $2`,
      [req.params.id, eid]
    );
    if (!comunicado) return res.status(404).json({ erro: 'Comunicado não encontrado.' });
    const envios = await db.all(
      `SELECT * FROM comunicado_envios WHERE comunicado_id = $1 ORDER BY aluno_nome`,
      [req.params.id]
    );
    res.json({ comunicado, envios });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/comunicacao/enviar
 * Body: { titulo, mensagem, canal, turma_id? }
 * - canal: 'email' | 'whatsapp' | 'ambos'
 * - Se turma_id não informado → todos os alunos da escola
 */
router.post('/enviar', async (req, res) => {
  try {
    const { titulo, mensagem, canal, turma_id } = req.body;
    const eid  = req.usuario.escola_id;
    const uid  = req.usuario.id;
    const unome = req.usuario.nome || req.usuario.email;

    if (!titulo?.trim()) return res.status(400).json({ erro: 'Título obrigatório.' });
    if (!mensagem?.trim()) return res.status(400).json({ erro: 'Mensagem obrigatória.' });
    if (!['email', 'whatsapp', 'ambos'].includes(canal))
      return res.status(400).json({ erro: 'Canal inválido.' });

    // Busca alunos da turma (ou escola toda)
    let alunos;
    let turmaNome = null;
    if (turma_id) {
      const turma = await db.get(`SELECT nome FROM turmas WHERE id = $1 AND escola_id = $2`, [turma_id, eid]);
      turmaNome = turma?.nome || null;
      alunos = await db.all(
        `SELECT id, nome, email_responsavel, telefone_responsavel FROM alunos
         WHERE turma_id = $1 AND escola_id = $2 AND ativo = 1 ORDER BY nome`,
        [turma_id, eid]
      );
    } else {
      alunos = await db.all(
        `SELECT id, nome, email_responsavel, telefone_responsavel FROM alunos
         WHERE escola_id = $1 AND ativo = 1 ORDER BY nome`,
        [eid]
      );
    }

    if (alunos.length === 0)
      return res.status(400).json({ erro: 'Nenhum aluno encontrado para envio.' });

    // Grava o comunicado
    const result = await db.get(
      `INSERT INTO comunicados
        (escola_id, criado_por_id, criado_por_nome, titulo, mensagem, canal, turma_id, turma_nome, total_destinatarios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [eid, uid, unome, titulo, mensagem, canal, turma_id || null, turmaNome, alunos.length]
    );
    const comunicadoId = result.id;

    // Monta envios e links WhatsApp
    const linksWhatsApp = [];
    let enviados = 0;
    const erros  = [];

    // Grava registros individuais
    for (const aluno of alunos) {
      await db.run(
        `INSERT INTO comunicado_envios (comunicado_id, aluno_id, aluno_nome, email, telefone)
         VALUES ($1,$2,$3,$4,$5)`,
        [comunicadoId, aluno.id, aluno.nome,
         aluno.email_responsavel || null,
         aluno.telefone_responsavel || null]
      );
      const tel = formatarTelWhatsApp(aluno.telefone_responsavel);
      if (tel) {
        const texto = encodeURIComponent(
          `*${titulo}*\n\nOlá! Mensagem da escola referente ao aluno(a) *${aluno.nome}*:\n\n${mensagem}\n\n— Equipe ITA Tecnologia Educacional`
        );
        linksWhatsApp.push({ aluno: aluno.nome, tel, link: `https://wa.me/${tel}?text=${texto}` });
      }
    }

    // Envia e-mails se canal for 'email' ou 'ambos'
    if (canal === 'email' || canal === 'ambos') {
      const transporter = criarTransporter();
      const destinatarios = alunos
        .filter(a => a.email_responsavel?.includes('@'))
        .map(a => a.email_responsavel);

      if (destinatarios.length > 0) {
        // Envia em lotes de 10 para não sobrecarregar o SMTP
        for (let i = 0; i < destinatarios.length; i += 10) {
          const lote = destinatarios.slice(i, i + 10);
          try {
            await transporter.sendMail({
              from: `ITA Tecnologia Educacional <${EMAIL_USER}>`,
              bcc: lote.join(','),
              subject: `📢 ${titulo}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
                  <div style="background:#0d1b2e;padding:16px 24px;border-radius:8px 8px 0 0">
                    <h1 style="color:#f5a623;margin:0;font-size:20px">📢 ${titulo}</h1>
                  </div>
                  <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                    <p style="white-space:pre-line;line-height:1.7;font-size:15px">${mensagem}</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
                    <p style="color:#888;font-size:12px">
                      Mensagem enviada pela escola via <strong>ITA Tecnologia Educacional</strong>.<br/>
                      Não responda este e-mail.
                    </p>
                  </div>
                </div>`,
            });
            enviados += lote.length;
          } catch (e) {
            erros.push(`Erro no lote ${i / 10 + 1}: ${e.message}`);
          }
        }

        // Atualiza status dos envios
        await db.run(
          `UPDATE comunicados SET enviados = $1 WHERE id = $2`,
          [enviados, comunicadoId]
        );
      }
    }

    res.json({
      ok: true,
      comunicado_id: comunicadoId,
      total: alunos.length,
      enviados_email: enviados,
      links_whatsapp: linksWhatsApp,
      erros,
    });
  } catch (err) {
    console.error('[comunicacao/enviar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
