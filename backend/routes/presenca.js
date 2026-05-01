const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');
const { enviarNotificacaoFalta } = require('../whatsapp');

const router = express.Router();
router.use(autenticar);

router.post('/scanner', (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ erro: 'Código QR obrigatório' });

  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1').get(codigo);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado', tipo: 'nao_encontrado' });

  const hoje = new Date().toISOString().split('T')[0];
  const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const presencaExistente = db.prepare('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?').get(aluno.id, hoje);
  if (presencaExistente) {
    return res.json({ mensagem: 'Presença já registrada hoje', tipo: 'duplicado', aluno, presenca: presencaExistente });
  }

  const result = db.prepare(
    'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por) VALUES (?, ?, ?, ?, ?)'
  ).run(aluno.id, hoje, horaAgora, 'presente', 'scanner');

  const presenca = db.prepare('SELECT * FROM presencas WHERE id = ?').get(result.lastInsertRowid);
  res.json({ mensagem: 'Presença registrada com sucesso', tipo: 'sucesso', aluno, presenca });
});

router.post('/falta', async (req, res) => {
  const { aluno_id, data } = req.body;
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(aluno_id);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

  const dataFalta = data || new Date().toISOString().split('T')[0];
  const existente = db.prepare('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?').get(aluno_id, dataFalta);

  let presenca;
  if (existente) {
    db.prepare('UPDATE presencas SET status = ? WHERE id = ?').run('ausente', existente.id);
    presenca = db.prepare('SELECT * FROM presencas WHERE id = ?').get(existente.id);
  } else {
    const result = db.prepare(
      'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por) VALUES (?, ?, ?, ?, ?)'
    ).run(aluno_id, dataFalta, null, 'ausente', 'manual');
    presenca = db.prepare('SELECT * FROM presencas WHERE id = ?').get(result.lastInsertRowid);
  }

  if (aluno.telefone_responsavel) {
    enviarNotificacaoFalta(aluno.telefone_responsavel, aluno.nome, aluno.turma, dataFalta).catch(() => {});
  }

  res.json({ mensagem: 'Falta registrada', aluno, presenca });
});

router.get('/hoje/:turma', (req, res) => {
  const db = getDb();
  const hoje = new Date().toISOString().split('T')[0];
  const turma = decodeURIComponent(req.params.turma);

  const alunos = db.prepare('SELECT * FROM alunos WHERE turma = ? AND ativo = 1').all(turma);
  const resultado = alunos.map(aluno => {
    const presenca = db.prepare('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?').get(aluno.id, hoje);
    const justificativa = presenca ? db.prepare('SELECT * FROM justificativas WHERE presenca_id = ?').get(presenca.id) : null;
    return {
      ...aluno,
      presenca: presenca || null,
      status: presenca ? (justificativa ? 'justificado' : presenca.status) : 'ausente'
    };
  });

  res.json(resultado);
});

router.post('/manual', (req, res) => {
  const { aluno_id, data, status, registrado_por } = req.body;
  if (!aluno_id || !data || !status) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });

  const db = getDb();
  const existente = db.prepare('SELECT * FROM presencas WHERE aluno_id = ? AND data = ?').get(aluno_id, data);

  let presenca;
  if (existente) {
    db.prepare('UPDATE presencas SET status = ?, registrado_por = ? WHERE id = ?').run(status, registrado_por || 'manual', existente.id);
    presenca = db.prepare('SELECT * FROM presencas WHERE id = ?').get(existente.id);
  } else {
    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const result = db.prepare(
      'INSERT INTO presencas (aluno_id, data, hora_entrada, status, registrado_por) VALUES (?, ?, ?, ?, ?)'
    ).run(aluno_id, data, horaAgora, status, registrado_por || 'manual');
    presenca = db.prepare('SELECT * FROM presencas WHERE id = ?').get(result.lastInsertRowid);
  }

  res.json({ mensagem: 'Presença atualizada', presenca });
});

module.exports = router;
