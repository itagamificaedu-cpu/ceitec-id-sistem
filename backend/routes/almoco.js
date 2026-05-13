const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// POST /api/almoco/scanner — escaneia QR Code e registra almoço
router.post('/scanner', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Código QR obrigatório' });

    const aluno = await db.get(
      'SELECT * FROM alunos WHERE codigo = ? AND ativo = 1 AND escola_id = ?',
      [codigo, req.usuario.escola_id]
    );
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado', tipo: 'nao_encontrado' });

    const hoje = new Date().toISOString().split('T')[0];
    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const jaRegistrado = await db.get(
      'SELECT * FROM almoco_registros WHERE aluno_id = ? AND data = ? AND escola_id = ?',
      [aluno.id, hoje, req.usuario.escola_id]
    );

    if (jaRegistrado) {
      return res.json({
        mensagem: 'Almoço já registrado hoje',
        tipo: 'duplicado',
        aluno,
        registro: jaRegistrado,
      });
    }

    const result = await db.run(
      'INSERT INTO almoco_registros (aluno_id, data, hora_registro, escola_id, registrado_por) VALUES (?, ?, ?, ?, ?)',
      [aluno.id, hoje, horaAgora, req.usuario.escola_id, 'scanner']
    );
    const registro = await db.get('SELECT * FROM almoco_registros WHERE id = ?', [result.lastInsertRowid]);

    res.json({ mensagem: 'Almoço registrado com sucesso', tipo: 'sucesso', aluno, registro });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/almoco/hoje — registros de almoço do dia atual
router.get('/hoje', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const eid = req.usuario.escola_id;

    const registros = await db.all(
      `SELECT ar.*, a.nome, a.turma, a.codigo, a.foto_path
       FROM almoco_registros ar
       JOIN alunos a ON a.id = ar.aluno_id
       WHERE ar.data = ? AND ar.escola_id = ?
       ORDER BY ar.hora_registro DESC`,
      [hoje, eid]
    );

    const totalAlunos = await db.get(
      'SELECT COUNT(*) as total FROM alunos WHERE ativo = 1 AND escola_id = ?',
      [eid]
    );

    res.json({
      registros,
      total_almocos: registros.length,
      total_alunos: parseInt(totalAlunos.total || 0),
      data: hoje,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/almoco/relatorio?data=2026-05-13&turma=Robotica%209A
router.get('/relatorio', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const data = req.query.data || new Date().toISOString().split('T')[0];
    const turmaFiltro = req.query.turma;

    let query = `
      SELECT ar.*, a.nome, a.turma, a.codigo, a.foto_path
      FROM almoco_registros ar
      JOIN alunos a ON a.id = ar.aluno_id
      WHERE ar.data = ? AND ar.escola_id = ?
    `;
    const params = [data, eid];

    if (turmaFiltro) {
      query += ' AND a.turma = ?';
      params.push(turmaFiltro);
    }

    query += ' ORDER BY a.turma, a.nome';

    const registros = await db.all(query, params);

    const turmas = await db.all(
      'SELECT DISTINCT turma FROM alunos WHERE ativo = 1 AND escola_id = ? ORDER BY turma',
      [eid]
    );

    res.json({ registros, turmas: turmas.map(t => t.turma), data });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/almoco/:id — remove um registro (correção manual)
router.delete('/:id', async (req, res) => {
  try {
    const registro = await db.get(
      'SELECT * FROM almoco_registros WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!registro) return res.status(404).json({ erro: 'Registro não encontrado' });

    await db.run('DELETE FROM almoco_registros WHERE id = ?', [req.params.id]);
    res.json({ mensagem: 'Registro removido' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
