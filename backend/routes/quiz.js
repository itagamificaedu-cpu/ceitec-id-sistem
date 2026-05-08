const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// ─── Rotas públicas (sem autenticação) ───────────────────────────────────────

router.get('/jogar/:codigo', async (req, res) => {
  try {
    const quiz = await db.get(
      'SELECT id, titulo, descricao, tempo_por_questao FROM quizzes WHERE codigo_acesso = ? AND ativo = 1',
      [req.params.codigo]
    );
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado ou inativo' });
    const questoes = await db.all(
      'SELECT id, enunciado, alt_a, alt_b, alt_c, alt_d, resposta_correta, ordem FROM quiz_questoes WHERE quiz_id = ? ORDER BY ordem',
      [quiz.id]
    );
    res.json({ ...quiz, questoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/jogar/:codigo/responder', async (req, res) => {
  try {
    const { aluno_nome, aluno_codigo, respostas, tempo_total } = req.body;
    const quiz = await db.get('SELECT * FROM quizzes WHERE codigo_acesso = ?', [req.params.codigo]);
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado' });

    const questoes = await db.all(
      'SELECT id, resposta_correta FROM quiz_questoes WHERE quiz_id = ? ORDER BY ordem',
      [quiz.id]
    );

    let acertos = 0;
    for (const r of (respostas || [])) {
      const q = questoes.find(q => q.id === r.questao_id);
      if (q && q.resposta_correta === r.resposta) acertos++;
    }

    const total = questoes.length;
    const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;

    await db.run(
      'INSERT INTO quiz_resultados (quiz_id, aluno_nome, aluno_codigo, acertos, total, percentual, tempo_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [quiz.id, aluno_nome || 'Participante', aluno_codigo || null, acertos, total, percentual, tempo_total || 0]
    );

    // Dar XP ao aluno se código da carteirinha foi informado
    let xp_ganho = 0;
    if (aluno_codigo) {
      const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [aluno_codigo.toUpperCase()]);
      if (aluno) {
        xp_ganho = acertos * 10;
        if (xp_ganho > 0) {
          await db.run(
            'INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, ?, 1, \'[]\') ON CONFLICT (aluno_id) DO UPDATE SET xp_total = itagame_pontos.xp_total + ?',
            [aluno.id, aluno.turma_id, xp_ganho, xp_ganho]
          );
          await db.run(
            'INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)',
            [aluno.id, 'quiz', `Quiz: ${quiz.titulo} — ${acertos}/${total} acertos`, xp_ganho]
          );
        }
      }
    }

    res.json({ acertos, total, percentual, xp_ganho });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── Rotas autenticadas ───────────────────────────────────────────────────────

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const quizzes = await db.all(
      `SELECT q.*,
         (SELECT COUNT(*) FROM quiz_questoes WHERE quiz_id = q.id) AS total_questoes,
         (SELECT COUNT(*) FROM quiz_resultados WHERE quiz_id = q.id) AS total_jogadas
       FROM quizzes q
       WHERE q.escola_id = ?
       ORDER BY q.criado_em DESC`,
      [eid]
    );
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado' });
    const questoes = await db.all(
      'SELECT * FROM quiz_questoes WHERE quiz_id = ? ORDER BY ordem',
      [req.params.id]
    );
    res.json({ ...quiz, questoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, tempo_por_questao, questoes } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório' });
    const eid = req.usuario.escola_id;
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.run(
      'INSERT INTO quizzes (titulo, descricao, tempo_por_questao, escola_id, criado_por, codigo_acesso, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [titulo, descricao || '', tempo_por_questao || 30, eid, req.usuario.id, codigo]
    );
    const quizId = result.lastInsertRowid;

    if (questoes && questoes.length > 0) {
      for (let i = 0; i < questoes.length; i++) {
        const q = questoes[i];
        await db.run(
          'INSERT INTO quiz_questoes (quiz_id, enunciado, alt_a, alt_b, alt_c, alt_d, resposta_correta, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [quizId, q.enunciado, q.alt_a, q.alt_b, q.alt_c || null, q.alt_d || null, q.resposta_correta ?? 0, i]
        );
      }
    }

    res.status(201).json(await db.get('SELECT * FROM quizzes WHERE id = ?', [quizId]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { titulo, descricao, tempo_por_questao, ativo, questoes } = req.body;
    const eid = req.usuario.escola_id;

    const quiz = await db.get('SELECT id FROM quizzes WHERE id = ? AND escola_id = ?', [req.params.id, eid]);
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado' });

    await db.run(
      'UPDATE quizzes SET titulo=?, descricao=?, tempo_por_questao=?, ativo=? WHERE id=? AND escola_id=?',
      [titulo, descricao || '', tempo_por_questao || 30, ativo !== undefined ? (ativo ? 1 : 0) : 1, req.params.id, eid]
    );

    if (questoes !== undefined) {
      await db.run('DELETE FROM quiz_questoes WHERE quiz_id = ?', [req.params.id]);
      for (let i = 0; i < questoes.length; i++) {
        const q = questoes[i];
        await db.run(
          'INSERT INTO quiz_questoes (quiz_id, enunciado, alt_a, alt_b, alt_c, alt_d, resposta_correta, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [req.params.id, q.enunciado, q.alt_a, q.alt_b, q.alt_c || null, q.alt_d || null, q.resposta_correta ?? 0, i]
        );
      }
    }

    const quizAtual = await db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    const questoesAtual = await db.all('SELECT * FROM quiz_questoes WHERE quiz_id = ? ORDER BY ordem', [req.params.id]);
    res.json({ ...quizAtual, questoes: questoesAtual });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const quiz = await db.get('SELECT id FROM quizzes WHERE id = ? AND escola_id = ?', [req.params.id, eid]);
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado' });
    await db.run('DELETE FROM quiz_questoes WHERE quiz_id = ?', [req.params.id]);
    await db.run('DELETE FROM quiz_resultados WHERE quiz_id = ?', [req.params.id]);
    await db.run('DELETE FROM quizzes WHERE id = ? AND escola_id = ?', [req.params.id, eid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/ranking', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const quiz = await db.get('SELECT * FROM quizzes WHERE id = ? AND escola_id = ?', [req.params.id, eid]);
    if (!quiz) return res.status(404).json({ erro: 'Quiz não encontrado' });
    const resultados = await db.all(
      `SELECT * FROM quiz_resultados WHERE quiz_id = ? ORDER BY acertos DESC, tempo_total ASC`,
      [req.params.id]
    );
    const questoes = await db.all('SELECT COUNT(*) as total FROM quiz_questoes WHERE quiz_id = ?', [req.params.id]);
    res.json({ quiz, resultados, total_questoes: parseInt(questoes[0]?.total || 0) });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
