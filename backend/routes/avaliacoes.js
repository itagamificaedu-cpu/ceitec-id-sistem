const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');
const { enviarNotificacaoBaixoDesempenho } = require('../whatsapp');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const db = getDb();
  const { turma_id, disciplina } = req.query;
  let sql = `SELECT av.*, t.nome as turma_nome, p.nome as professor_nome
    FROM avaliacoes av
    LEFT JOIN turmas t ON av.turma_id = t.id
    LEFT JOIN professores p ON av.professor_id = p.id
    WHERE 1=1`;
  const params = [];
  if (turma_id) { sql += ' AND av.turma_id = ?'; params.push(turma_id); }
  if (disciplina) { sql += ' AND av.disciplina = ?'; params.push(disciplina); }
  sql += ' ORDER BY av.criado_em DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const av = db.prepare(`SELECT av.*, t.nome as turma_nome, p.nome as professor_nome
    FROM avaliacoes av
    LEFT JOIN turmas t ON av.turma_id = t.id
    LEFT JOIN professores p ON av.professor_id = p.id
    WHERE av.id = ?`).get(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  const questoes = db.prepare('SELECT * FROM questoes WHERE avaliacao_id = ? ORDER BY id').all(req.params.id);
  res.json({ ...av, questoes });
});

router.post('/', (req, res) => {
  const { titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao, questoes } = req.body;
  if (!titulo || !disciplina) return res.status(400).json({ erro: 'Título e disciplina são obrigatórios' });
  const db = getDb();
  const result = db.prepare('INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(titulo, disciplina, turma_id || null, professor_id || null, tipo || 'prova', questoes?.length || 0, total_pontos || 10, data_aplicacao || null);
  const avId = result.lastInsertRowid;

  if (questoes && questoes.length > 0) {
    const insertQ = db.prepare('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    questoes.forEach(q => insertQ.run(avId, q.enunciado, q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d, q.gabarito, q.pontos || 1, q.dificuldade || 'medio', disciplina, q.explicacao || null));
    db.prepare('UPDATE avaliacoes SET total_questoes = ? WHERE id = ?').run(questoes.length, avId);
  }

  res.status(201).json(db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(avId));
});

router.put('/:id', (req, res) => {
  const { titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao } = req.body;
  const db = getDb();
  db.prepare('UPDATE avaliacoes SET titulo=?, disciplina=?, turma_id=?, professor_id=?, tipo=?, total_pontos=?, data_aplicacao=? WHERE id=?').run(titulo, disciplina, turma_id, professor_id, tipo, total_pontos, data_aplicacao, req.params.id);
  res.json(db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(req.params.id));
});

router.post('/:id/questoes', (req, res) => {
  const { enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, explicacao } = req.body;
  const db = getDb();
  const av = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  const result = db.prepare('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.params.id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos || 1, dificuldade || 'medio', av.disciplina, explicacao || null);
  db.prepare('UPDATE avaliacoes SET total_questoes = total_questoes + 1 WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM questoes WHERE id = ?').get(result.lastInsertRowid));
});

router.post('/:id/notas', async (req, res) => {
  const { notas } = req.body;
  if (!notas || !Array.isArray(notas)) return res.status(400).json({ erro: 'Array de notas é obrigatório' });
  const db = getDb();
  const av = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });

  const insertNota = db.prepare('INSERT OR REPLACE INTO notas (aluno_id, avaliacao_id, turma_id, disciplina, nota_final, percentual_acerto) VALUES (?, ?, ?, ?, ?, ?)');
  const lancados = [];

  for (const item of notas) {
    const pct = (item.nota_final / av.total_pontos) * 100;
    insertNota.run(item.aluno_id, req.params.id, av.turma_id, av.disciplina, item.nota_final, Math.round(pct));
    lancados.push({ aluno_id: item.aluno_id, nota: item.nota_final, percentual: pct });

    if (pct < 50) {
      const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(item.aluno_id);
      if (aluno?.telefone_responsavel) {
        enviarNotificacaoBaixoDesempenho(aluno.telefone_responsavel, aluno.nome, av.disciplina, item.nota_final).catch(() => {});
      }
    }
  }

  res.json({ mensagem: 'Notas lançadas com sucesso', total: lancados.length });
});

router.get('/:id/resultados', (req, res) => {
  const db = getDb();
  const av = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  const notas = db.prepare('SELECT n.*, a.nome, a.codigo, a.foto_path FROM notas n JOIN alunos a ON n.aluno_id = a.id WHERE n.avaliacao_id = ? ORDER BY n.nota_final DESC').all(req.params.id);
  const questoes = db.prepare('SELECT * FROM questoes WHERE avaliacao_id = ?').all(req.params.id);
  const media = notas.length > 0 ? notas.reduce((s, n) => s + n.nota_final, 0) / notas.length : 0;
  res.json({ avaliacao: av, notas, questoes, media: Math.round(media * 10) / 10 });
});

module.exports = router;
