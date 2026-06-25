const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const VAGAS_TOTAL = 30;
const CHAVE_ADMIN = 'gamificaedu_secreto_2026';

function chaveValida(req) {
  return req.query.chave === CHAVE_ADMIN || req.headers['x-chave'] === CHAVE_ADMIN;
}

async function vagasUsadas() {
  const r = await db.get(
    `SELECT COUNT(*) as total FROM inscricoes_inscricao WHERE status IN ('pago','certificado_emitido')`
  );
  return Number(r?.total || 0);
}

// GET /api/inscricao/vagas — público
router.get('/vagas', async (req, res) => {
  try {
    const usadas = await vagasUsadas();
    res.json({ vagas_total: VAGAS_TOTAL, vagas_usadas: usadas, vagas_disponiveis: VAGAS_TOTAL - usadas, lotado: usadas >= VAGAS_TOTAL });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/inscricao — cria inscrição (público)
router.post('/', async (req, res) => {
  try {
    const usadas = await vagasUsadas();
    if (usadas >= VAGAS_TOTAL) return res.status(400).json({ erro: 'Vagas esgotadas.' });

    const {
      nome_completo, data_nascimento, escola, serie, nivel_experiencia, turno,
      nome_responsavel, telefone, email, cpf_responsavel, autoriza_imagem, aceita_termos,
    } = req.body;

    if (!nome_completo || !data_nascimento || !escola || !serie || !nivel_experiencia || !turno ||
        !nome_responsavel || !telefone || !email || !cpf_responsavel) {
      return res.status(400).json({ erro: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    const codigo = uuidv4();
    await db.pool.query(
      `INSERT INTO inscricoes_inscricao
       (nome_completo, data_nascimento, escola, serie, nivel_experiencia, turno,
        nome_responsavel, telefone, email, cpf_responsavel,
        status, codigo_inscricao, data_inscricao, valor_pago,
        id_transacao_pag, referencia_pag, certificado_gerado,
        autoriza_imagem, aceita_termos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'aguardando_pagamento',$11,NOW(),199.00,'','',false,$12,$13)`,
      [nome_completo, data_nascimento, escola, serie, nivel_experiencia, turno,
       nome_responsavel, telefone, email, cpf_responsavel, codigo,
       autoriza_imagem || false, aceita_termos || false]
    );

    res.json({ status: 'ok', codigo });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/inscricao/lista — admin
router.get('/lista', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    const rows = await db.all(`SELECT * FROM inscricoes_inscricao ORDER BY data_inscricao DESC`);
    const dados = rows.map(i => ({
      id: i.codigo_inscricao,
      codigo: i.codigo_inscricao?.toString().slice(0, 8).toUpperCase(),
      nome: i.nome_completo,
      escola: i.escola,
      serie: i.serie,
      turno: i.turno === 'manha' ? 'Manhã (8h–12h)' : 'Tarde (13h–17h)',
      turno_val: i.turno,
      responsavel: i.nome_responsavel,
      telefone: i.telefone,
      email: i.email,
      status: i.status,
      status_display: { pendente: 'Pendente', aguardando_pagamento: 'Aguardando Pagamento', pago: 'Pago', cancelado: 'Cancelado', certificado_emitido: 'Certificado Emitido' }[i.status] || i.status,
      data_inscricao: i.data_inscricao ? new Date(i.data_inscricao).toLocaleString('pt-BR') : '',
      valor: parseFloat(i.valor_pago || 0),
      certificado_gerado: i.certificado_gerado,
    }));
    const pagas = dados.filter(i => ['pago', 'certificado_emitido'].includes(i.status)).length;
    res.json({
      inscricoes: dados,
      stats: {
        total: dados.length,
        pagas,
        pendentes: dados.filter(i => i.status === 'aguardando_pagamento').length,
        vagas_restantes: VAGAS_TOTAL - pagas,
        receita: dados.filter(i => ['pago', 'certificado_emitido'].includes(i.status)).reduce((s, i) => s + i.valor, 0),
      }
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/inscricao/:codigo/pagar — admin marca como pago
router.post('/:codigo/pagar', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    await db.pool.query(
      `UPDATE inscricoes_inscricao SET status='pago', data_pagamento=NOW(), referencia_pag='MANUAL-PAINEL'
       WHERE codigo_inscricao=$1 AND status NOT IN ('pago','certificado_emitido')`,
      [req.params.codigo]
    );
    const row = await db.get(`SELECT nome_completo FROM inscricoes_inscricao WHERE codigo_inscricao=$1`, [req.params.codigo]);
    res.json({ status: 'ok', nome: row?.nome_completo });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/inscricao/:codigo/editar — admin edita
router.post('/:codigo/editar', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    const campos = ['nome_completo', 'escola', 'serie', 'turno', 'nome_responsavel', 'telefone', 'email', 'status'];
    const sets = [];
    const vals = [];
    for (const c of campos) {
      if (req.body[c] !== undefined) { sets.push(`${c}=$${sets.length + 1}`); vals.push(req.body[c]); }
    }
    if (req.body.status === 'pago') { sets.push(`data_pagamento=NOW()`); }
    if (!sets.length) return res.json({ status: 'ok' });
    vals.push(req.params.codigo);
    await db.pool.query(`UPDATE inscricoes_inscricao SET ${sets.join(',')} WHERE codigo_inscricao=$${vals.length}`, vals);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE /api/inscricao/:codigo — admin exclui
router.delete('/:codigo', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    await db.pool.query(`DELETE FROM inscricoes_inscricao WHERE codigo_inscricao=$1`, [req.params.codigo]);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// GET /api/inscricao/presencas — admin lista presenças por dia
router.get('/presencas', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    const dia = parseInt(req.query.dia || 1);
    const turno = req.query.turno || '';

    let sql = `SELECT * FROM inscricoes_inscricao WHERE status IN ('pago','certificado_emitido')`;
    const vals = [];
    if (turno) { sql += ` AND turno=$1`; vals.push(turno); }
    sql += ` ORDER BY nome_completo`;
    const inscs = await db.all(sql, vals);

    const presRows = await db.all(`SELECT * FROM inscricoes_presencacursoferias WHERE dia=$1`, [dia]);
    const presMap = {};
    for (const p of presRows) presMap[p.inscricao_id] = p;

    const dados = inscs.map(i => {
      const p = presMap[i.id];
      return {
        id: i.codigo_inscricao, codigo: i.codigo_inscricao?.toString().slice(0, 8).toUpperCase(),
        nome: i.nome_completo, escola: i.escola, serie: i.serie,
        turno: i.turno === 'manha' ? 'Manhã (8h–12h)' : 'Tarde (13h–17h)',
        turno_val: i.turno,
        presente: p ? p.presente : null,
        hora_chegada: p?.hora_chegada || null,
        observacao: p?.observacao || '',
        registrado: !!p,
      };
    });

    const presentes = dados.filter(d => d.presente === true).length;
    const ausentes = dados.filter(d => d.presente === false).length;
    res.json({ dia, alunos: dados, resumo: { total: dados.length, presentes, ausentes, nao_registrados: dados.length - presentes - ausentes } });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/inscricao/presencas/registrar — admin registra presença
router.post('/presencas/registrar', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    const { codigo_inscricao, dia, presente, observacao, hora_chegada, registrado_por } = req.body;
    if (!codigo_inscricao || !dia || presente === undefined) {
      return res.status(400).json({ erro: 'codigo_inscricao, dia e presente são obrigatórios' });
    }
    const insc = await db.get(`SELECT id FROM inscricoes_inscricao WHERE codigo_inscricao=$1`, [codigo_inscricao]);
    if (!insc) return res.status(404).json({ erro: 'inscrição não encontrada' });

    await db.pool.query(
      `INSERT INTO inscricoes_presencacursoferias (inscricao_id, dia, presente, hora_chegada, observacao, registrado_em, registrado_por)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6)
       ON CONFLICT (inscricao_id, dia) DO UPDATE SET presente=$3, hora_chegada=$4, observacao=$5, registrado_por=$6`,
      [insc.id, dia, presente, hora_chegada || null, observacao || '', registrado_por || 'painel']
    );
    res.json({ status: 'ok', presente });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/inscricao/presencas/scan — scanner QR
router.post('/presencas/scan', async (req, res) => {
  if (!chaveValida(req)) return res.status(403).json({ erro: 'não autorizado' });
  try {
    const { codigo, dia } = req.body;
    if (!codigo || !dia) return res.status(400).json({ tipo: 'erro', erro: 'codigo e dia obrigatórios' });

    let insc = await db.get(`SELECT * FROM inscricoes_inscricao WHERE codigo_inscricao=$1`, [codigo]);
    if (!insc) {
      const todos = await db.all(`SELECT * FROM inscricoes_inscricao`);
      insc = todos.find(i => i.codigo_inscricao?.toString().toUpperCase().startsWith(codigo.toUpperCase())) || null;
    }
    if (!insc) return res.status(404).json({ tipo: 'erro', mensagem: '❌ QR Code inválido — aluno não encontrado' });

    if (!['pago', 'certificado_emitido'].includes(insc.status)) {
      return res.status(400).json({ tipo: 'nao_confirmado', nome: insc.nome_completo, mensagem: `⚠️ Inscrição não confirmada` });
    }

    const jaExiste = await db.get(
      `SELECT * FROM inscricoes_presencacursoferias WHERE inscricao_id=$1 AND dia=$2`, [insc.id, dia]
    );
    if (jaExiste && jaExiste.presente) {
      return res.json({ tipo: 'ja_presente', nome: insc.nome_completo, escola: insc.escola, mensagem: '🔄 Aluno já registrado hoje!' });
    }

    if (jaExiste) {
      await db.pool.query(`UPDATE inscricoes_presencacursoferias SET presente=true, registrado_por='scanner-qr' WHERE inscricao_id=$1 AND dia=$2`, [insc.id, dia]);
    } else {
      await db.pool.query(
        `INSERT INTO inscricoes_presencacursoferias (inscricao_id, dia, presente, registrado_em, registrado_por, observacao) VALUES ($1,$2,true,NOW(),'scanner-qr','')`,
        [insc.id, dia]
      );
    }

    res.json({
      tipo: 'presente', nome: insc.nome_completo, escola: insc.escola, serie: insc.serie,
      turno: insc.turno === 'manha' ? 'Manhã' : 'Tarde', turno_val: insc.turno,
      codigo: insc.codigo_inscricao?.toString().slice(0, 8).toUpperCase(),
      mensagem: `✅ Presente! Bem-vindo, ${insc.nome_completo.split(' ')[0]}!`,
    });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
