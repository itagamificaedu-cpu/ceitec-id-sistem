// Controle de Saída de Sala — registra saída/retorno via QR Code do crachá
const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// ─── HELPERS ────────────────────────────────────────────────────────────────

function horaLocal() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Fortaleza',
  });
}

function dataLocal() {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Fortaleza',
  }).split('/').reverse().join('-'); // YYYY-MM-DD
}

function minutosDecorridos(horaSaida) {
  if (!horaSaida) return 0;
  const saida = new Date(horaSaida);
  const agora = new Date();
  return Math.floor((agora - saida) / 60000);
}

// ─── SCAN QR CODE ────────────────────────────────────────────────────────────
// POST /api/saida-sala/scanner
// Primeiro scan → registra saída | Segundo scan → registra retorno
router.post('/scanner', async (req, res) => {
  try {
    const { codigo, motivo = 'banheiro' } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Código QR obrigatório' });

    const eid = req.usuario.escola_id;

    // Verifica se o aluno é desta escola
    const aluno = await db.get(
      'SELECT * FROM alunos WHERE codigo = $1 AND ativo = 1 AND escola_id = $2',
      [codigo, eid]
    );
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado', tipo: 'nao_encontrado' });

    // Verifica se já tem uma saída em aberto (status = 'fora')
    const saidaAberta = await db.get(
      `SELECT * FROM saida_sala
       WHERE aluno_id = $1 AND escola_id = $2 AND status = 'fora'
       ORDER BY hora_saida DESC LIMIT 1`,
      [aluno.id, eid]
    );

    if (saidaAberta) {
      // ── RETORNO ───────────────────────────────────────────────────────────
      const horaRetorno = new Date();
      const minutos = minutosDecorridos(saidaAberta.hora_saida);

      await db.pool.query(
        `UPDATE saida_sala
         SET status = 'voltou', hora_retorno = $1, duracao_minutos = $2
         WHERE id = $3`,
        [horaRetorno, minutos, saidaAberta.id]
      );

      const registro = await db.get('SELECT * FROM saida_sala WHERE id = $1', [saidaAberta.id]);
      return res.json({
        tipo: 'retorno',
        mensagem: `${aluno.nome} voltou após ${minutos} min`,
        aluno,
        registro,
        minutos,
      });
    }

    // ── SAÍDA ───────────────────────────────────────────────────────────────
    const result = await db.run(
      `INSERT INTO saida_sala
         (aluno_id, escola_id, professor_id, motivo, hora_saida, status)
       VALUES ($1, $2, $3, $4, $5, 'fora')`,
      [aluno.id, eid, req.usuario.id || null, motivo, new Date()]
    );

    const registro = await db.get('SELECT * FROM saida_sala WHERE id = $1', [result.lastInsertRowid]);
    return res.json({
      tipo: 'saida',
      mensagem: `Saída registrada para ${aluno.nome}`,
      aluno,
      registro,
    });
  } catch (err) {
    console.error('[SAIDA-SALA] Erro scanner:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ─── ALUNOS FORA DA SALA AGORA ───────────────────────────────────────────────
// GET /api/saida-sala/fora
router.get('/fora', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const registros = await db.all(
      `SELECT ss.*, a.nome, a.turma, a.codigo, a.foto_path
       FROM saida_sala ss
       JOIN alunos a ON a.id = ss.aluno_id
       WHERE ss.escola_id = $1 AND ss.status = 'fora'
       ORDER BY ss.hora_saida ASC`,
      [eid]
    );

    const resultado = registros.map(r => ({
      ...r,
      minutos: minutosDecorridos(r.hora_saida),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── HISTÓRICO DO DIA ────────────────────────────────────────────────────────
// GET /api/saida-sala/hoje?turma_id=X
router.get('/hoje', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { turma_id } = req.query;

    // Janela de 24h atrás até agora (cobre todos os fusos do Brasil)
    const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let sql = `
      SELECT ss.*, a.nome, a.turma, a.codigo, a.foto_path, t.nome as turma_nome
      FROM saida_sala ss
      JOIN alunos a ON a.id = ss.aluno_id
      LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE ss.escola_id = $1 AND ss.hora_saida >= $2
    `;
    const params = [eid, limite];

    if (turma_id) {
      sql += ` AND a.turma_id = $${params.length + 1}`;
      params.push(turma_id);
    }

    sql += ' ORDER BY ss.hora_saida DESC';

    const registros = await db.all(sql, params);
    const resultado = registros.map(r => ({
      ...r,
      minutos: r.status === 'fora'
        ? minutosDecorridos(r.hora_saida)
        : (r.duracao_minutos || 0),
    }));

    res.json({
      registros: resultado,
      total_saidas:  resultado.length,
      fora_agora:    resultado.filter(r => r.status === 'fora').length,
      voltaram:      resultado.filter(r => r.status === 'voltou').length,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── RETORNAR MANUALMENTE (sem scan) ─────────────────────────────────────────
// POST /api/saida-sala/:id/retornar
router.post('/:id/retornar', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const registro = await db.get(
      'SELECT * FROM saida_sala WHERE id = $1 AND escola_id = $2',
      [req.params.id, eid]
    );
    if (!registro) return res.status(404).json({ erro: 'Registro não encontrado' });

    const horaRetorno = new Date();
    const minutos = minutosDecorridos(registro.hora_saida);

    await db.pool.query(
      `UPDATE saida_sala SET status = 'voltou', hora_retorno = $1, duracao_minutos = $2 WHERE id = $3`,
      [horaRetorno, minutos, registro.id]
    );

    res.json({ ok: true, minutos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── EXCLUIR REGISTRO ────────────────────────────────────────────────────────
// DELETE /api/saida-sala/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.pool.query(
      'DELETE FROM saida_sala WHERE id = $1 AND escola_id = $2',
      [req.params.id, req.usuario.escola_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
