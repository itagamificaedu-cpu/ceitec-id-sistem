const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const { turma_id, disciplina } = req.query;
    const eid = req.usuario.escola_id;
    let sql = `SELECT av.*, t.nome as turma_nome, p.nome as professor_nome
      FROM avaliacoes av
      LEFT JOIN turmas t ON av.turma_id = t.id
      LEFT JOIN professores p ON av.professor_id = p.id
      WHERE av.escola_id = ?`;
    const params = [eid];
    if (turma_id) { sql += ' AND av.turma_id = ?'; params.push(turma_id); }
    if (disciplina) { sql += ' AND av.disciplina = ?'; params.push(disciplina); }
    sql += ' ORDER BY av.criado_em DESC';
    res.json(await db.all(sql, params));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const av = await db.get(`SELECT av.*, t.nome as turma_nome, p.nome as professor_nome
      FROM avaliacoes av
      LEFT JOIN turmas t ON av.turma_id = t.id
      LEFT JOIN professores p ON av.professor_id = p.id
      WHERE av.id = ? AND av.escola_id = ?`, [req.params.id, eid]);
    if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const questoesRaw = await db.all('SELECT * FROM questoes WHERE avaliacao_id = ? ORDER BY id', [req.params.id]);
    const letras = ['a', 'b', 'c', 'd']
    const questoes = questoesRaw.map(q => ({
      ...q,
      alternativas: [q.alternativa_a || '', q.alternativa_b || '', q.alternativa_c || '', q.alternativa_d || ''],
      resposta_correta: letras.indexOf((q.gabarito || 'A').toLowerCase()),
    }))
    res.json({ ...av, questoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao, questoes } = req.body;
    if (!titulo || !disciplina) return res.status(400).json({ erro: 'Título e disciplina são obrigatórios' });
    const eid = req.usuario.escola_id;
    const result = await db.run(
      'INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, disciplina, turma_id || null, professor_id || null, tipo || 'prova', questoes?.length || 0, total_pontos || 10, data_aplicacao || null, eid]
    );
    const avId = result.lastInsertRowid;

    if (questoes && questoes.length > 0) {
      for (const q of questoes) {
        const letras = ['a', 'b', 'c', 'd']
        const alt_a = q.alternativa_a ?? q.alternativas?.[0] ?? null
        const alt_b = q.alternativa_b ?? q.alternativas?.[1] ?? null
        const alt_c = q.alternativa_c ?? q.alternativas?.[2] ?? null
        const alt_d = q.alternativa_d ?? q.alternativas?.[3] ?? null
        const gabarito = q.gabarito || (letras[q.resposta_correta ?? 0]?.toUpperCase()) || 'A'
        await db.run('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [avId, q.enunciado, alt_a, alt_b, alt_c, alt_d, gabarito, q.pontos || 1, q.dificuldade || 'medio', disciplina, q.explicacao || null]);
      }
      await db.run('UPDATE avaliacoes SET total_questoes = ? WHERE id = ?', [questoes.length, avId]);
    }

    res.status(201).json(await db.get('SELECT * FROM avaliacoes WHERE id = ?', [avId]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao, questoes } = req.body;
    const eid = req.usuario.escola_id;
    await db.run(
      'UPDATE avaliacoes SET titulo=?, disciplina=?, turma_id=?, professor_id=?, tipo=?, total_pontos=?, data_aplicacao=? WHERE id=? AND escola_id=?',
      [titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao, req.params.id, eid]
    );
    if (questoes && questoes.length > 0) {
      await db.run('DELETE FROM questoes WHERE avaliacao_id = ?', [req.params.id]);
      const letras = ['a', 'b', 'c', 'd']
      for (const q of questoes) {
        const alt_a = q.alternativa_a ?? q.alternativas?.[0] ?? null
        const alt_b = q.alternativa_b ?? q.alternativas?.[1] ?? null
        const alt_c = q.alternativa_c ?? q.alternativas?.[2] ?? null
        const alt_d = q.alternativa_d ?? q.alternativas?.[3] ?? null
        const gabarito = q.gabarito || (letras[q.resposta_correta ?? 0]?.toUpperCase()) || 'A'
        await db.run('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [req.params.id, q.enunciado, alt_a, alt_b, alt_c, alt_d, gabarito, q.pontos || 1, q.dificuldade || 'medio', disciplina, q.explicacao || null]);
      }
      await db.run('UPDATE avaliacoes SET total_questoes = ? WHERE id = ?', [questoes.length, req.params.id]);
    }
    res.json(await db.get('SELECT * FROM avaliacoes WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/:id/questoes', async (req, res) => {
  try {
    const { enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, explicacao } = req.body;
    const av = await db.get('SELECT * FROM avaliacoes WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const result = await db.run('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.params.id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos || 1, dificuldade || 'medio', av.disciplina, explicacao || null]);
    await db.run('UPDATE avaliacoes SET total_questoes = total_questoes + 1 WHERE id = ?', [req.params.id]);
    res.status(201).json(await db.get('SELECT * FROM questoes WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/:id/notas', async (req, res) => {
  try {
    const { notas } = req.body;
    if (!notas || !Array.isArray(notas)) return res.status(400).json({ erro: 'Array de notas é obrigatório' });
    const av = await db.get('SELECT * FROM avaliacoes WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });

    const lancados = [];
    for (const item of notas) {
      const pct = (item.nota_final / av.total_pontos) * 100;
      await db.run(
        'INSERT INTO notas (aluno_id, avaliacao_id, turma_id, disciplina, nota_final, percentual_acerto, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (aluno_id, avaliacao_id) DO UPDATE SET nota_final = EXCLUDED.nota_final, percentual_acerto = EXCLUDED.percentual_acerto',
        [item.aluno_id, req.params.id, av.turma_id, av.disciplina, item.nota_final, Math.round(pct), req.usuario.escola_id]
      );
      lancados.push({ aluno_id: item.aluno_id, nota: item.nota_final, percentual: pct });
    }

    res.json({ mensagem: 'Notas lançadas com sucesso', total: lancados.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/resultados', async (req, res) => {
  try {
    const av = await db.get('SELECT * FROM avaliacoes WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const questoes = await db.all('SELECT * FROM questoes WHERE avaliacao_id = ? ORDER BY id', [req.params.id]);
    const notas = await db.all('SELECT n.*, a.nome, a.codigo, a.foto_path FROM notas n JOIN alunos a ON n.aluno_id = a.id WHERE n.avaliacao_id = ? ORDER BY n.nota_final DESC', [req.params.id]);
    const respostas = await db.all('SELECT aluno_id, questao_id, resposta_marcada, correta FROM respostas_alunos WHERE avaliacao_id = ?', [req.params.id]);
    const resPorAluno = {};
    respostas.forEach(r => {
      if (!resPorAluno[r.aluno_id]) resPorAluno[r.aluno_id] = {};
      resPorAluno[r.aluno_id][r.questao_id] = { resposta: r.resposta_marcada, acertou: r.correta == 1 };
    });
    const notasComDetalhe = notas.map((n, qi) => ({
      ...n,
      questoes_detalhe: questoes.map((q, idx) => ({
        numero: idx + 1,
        enunciado: q.enunciado,
        gabarito: q.gabarito,
        alternativas: { a: q.alternativa_a, b: q.alternativa_b, c: q.alternativa_c, d: q.alternativa_d },
        resposta_aluno: resPorAluno[n.aluno_id]?.[q.id]?.resposta || null,
        acertou: resPorAluno[n.aluno_id]?.[q.id]?.acertou ?? false,
      }))
    }));
    const media = notas.length > 0 ? notas.reduce((s, n) => s + n.nota_final, 0) / notas.length : 0;
    res.json({ avaliacao: av, notas: notasComDetalhe, questoes, media: Math.round(media * 10) / 10 });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
