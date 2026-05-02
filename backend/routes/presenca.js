const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.post('/scanner', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Código QR obrigatório' });

    // Valida que o aluno pertence a esta escola
    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1 AND escola_id = ?', [codigo, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado', tipo: 'nao_encontrado' });

    const hoje = new Date().toISOString().split('T')[0];
    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const presencaExistente = await db.get('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?', [aluno.id, hoje]);
    if (presencaExistente) {
      return res.json({ mensagem: 'Presença já registrada hoje', tipo: 'duplicado', aluno, presenca: presencaExistente });
    }

    const result = await db.run(
      'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por, escola_id) VALUES (?, ?, ?, ?, ?, ?)',
      [aluno.id, hoje, horaAgora, 'presente', 'scanner', req.usuario.escola_id]
    );
    const presenca = await db.get('SELECT * FROM presencas WHERE id = ?', [result.lastInsertRowid]);
    res.json({ mensagem: 'Presença registrada com sucesso', tipo: 'sucesso', aluno, presenca });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/falta', async (req, res) => {
  try {
    const { aluno_id, data } = req.body;
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const dataFalta = data || new Date().toISOString().split('T')[0];
    const existente = await db.get('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?', [aluno_id, dataFalta]);

    let presenca;
    if (existente) {
      await db.run('UPDATE presencas SET status = ? WHERE id = ?', ['ausente', existente.id]);
      presenca = await db.get('SELECT * FROM presencas WHERE id = ?', [existente.id]);
    } else {
      const result = await db.run(
        'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por, escola_id) VALUES (?, ?, ?, ?, ?, ?)',
        [aluno_id, dataFalta, null, 'ausente', 'manual', req.usuario.escola_id]
      );
      presenca = await db.get('SELECT * FROM presencas WHERE id = ?', [result.lastInsertRowid]);
    }

    res.json({ mensagem: 'Falta registrada', aluno, presenca });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/hoje/:turma', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const turma = decodeURIComponent(req.params.turma);
    const eid = req.usuario.escola_id;

    const alunos = await db.all('SELECT * FROM alunos WHERE turma = ? AND ativo = 1 AND escola_id = ?', [turma, eid]);
    const resultado = await Promise.all(alunos.map(async aluno => {
      const presenca = await db.get('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?', [aluno.id, hoje]);
      const justificativa = presenca ? await db.get('SELECT * FROM justificativas WHERE presenca_id = ?', [presenca.id]) : null;
      return { ...aluno, presenca: presenca || null, status: presenca ? (justificativa ? 'justificado' : presenca.status) : 'ausente' };
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/manual', async (req, res) => {
  try {
    const { aluno_id, data, status, registrado_por } = req.body;
    if (!aluno_id || !data || !status) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });

    const aluno = await db.get('SELECT id FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, req.usuario.escola_id]);
    if (!aluno) return res.status(403).json({ erro: 'Aluno não pertence a esta escola' });

    const existente = await db.get('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?', [aluno_id, data]);

    let presenca;
    if (existente) {
      await db.run('UPDATE presencas SET status = ?, registrado_por = ? WHERE id = ?', [status, registrado_por || 'manual', existente.id]);
      presenca = await db.get('SELECT * FROM presencas WHERE id = ?', [existente.id]);
    } else {
      const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const result = await db.run(
        'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por, escola_id) VALUES (?, ?, ?, ?, ?, ?)',
        [aluno_id, data, horaAgora, status, registrado_por || 'manual', req.usuario.escola_id]
      );
      presenca = await db.get('SELECT * FROM presencas WHERE id = ?', [result.lastInsertRowid]);
    }

    res.json({ mensagem: 'Presença atualizada', presenca });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
