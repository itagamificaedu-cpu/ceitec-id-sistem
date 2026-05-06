const express = require('express');
const router = express.Router();
const db = require('../db');

function calcularNivel(xp) {
  const niveis = [
    { min: 0,    nome: 'Iniciante',   cor: '#6b7280', emoji: '🔩' },
    { min: 100,  nome: 'Construtor',  cor: '#3b82f6', emoji: '⚙️' },
    { min: 250,  nome: 'Inventor',    cor: '#10b981', emoji: '💡' },
    { min: 500,  nome: 'Engenheiro',  cor: '#f59e0b', emoji: '🚀' },
    { min: 1000, nome: 'Hacker',      cor: '#ef4444', emoji: '🤖' },
    { min: 2000, nome: 'Mestre Tech', cor: '#8b5cf6', emoji: '👑' },
  ];
  let atual = niveis[0];
  let proximo = niveis[1];
  for (let i = niveis.length - 1; i >= 0; i--) {
    if (xp >= niveis[i].min) { atual = niveis[i]; proximo = niveis[i + 1] || null; break; }
  }
  const progresso = proximo ? Math.round(((xp - atual.min) / (proximo.min - atual.min)) * 100) : 100;
  return { ...atual, proximo_min: proximo?.min || null, progresso };
}

// GET /api/portal/:codigo — público, sem autenticação
router.get('/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.toUpperCase().trim();
    const aluno = await db.get(
      'SELECT * FROM alunos WHERE codigo = ? AND ativo = 1',
      [codigo]
    );
    if (!aluno) return res.status(404).json({ erro: 'Código não encontrado. Verifique sua carteirinha.' });

    // Garante registro de pontos
    await db.run(
      "INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING",
      [aluno.id, aluno.turma_id]
    );

    const eid = aluno.escola_id;

    const [xp, historico_xp, notas, presencas, ocorrencias, missoes, recados, repositorio] = await Promise.all([
      db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]),
      db.all('SELECT * FROM itagame_historico WHERE aluno_id = ? ORDER BY criado_em DESC LIMIT 30', [aluno.id]),
      db.all(
        `SELECT n.*, av.titulo AS avaliacao_titulo, av.tipo AS avaliacao_tipo, av.disciplina, av.data_aplicacao
         FROM notas n
         JOIN avaliacoes av ON n.avaliacao_id = av.id
         WHERE n.aluno_id = ?
         ORDER BY av.data_aplicacao DESC`,
        [aluno.id]
      ),
      db.all('SELECT data, hora_entrada, status FROM presencas WHERE aluno_id = ? ORDER BY data DESC LIMIT 60', [aluno.id]),
      db.all(
        `SELECT o.tipo, o.descricao, o.gravidade, o.criado_em, p.nome AS professor_nome
         FROM ocorrencias o
         LEFT JOIN professores p ON o.professor_id = p.id
         WHERE o.aluno_id = ?
         ORDER BY o.criado_em DESC`,
        [aluno.id]
      ),
      db.all(
        'SELECT id, titulo, descricao, xp_recompensa, criado_em FROM itagame_missoes WHERE escola_id = ? AND ativa = 1 ORDER BY criado_em DESC',
        [eid]
      ),
      db.all('SELECT titulo, mensagem, criado_em FROM itagame_recados WHERE escola_id = ? ORDER BY criado_em DESC LIMIT 10', [eid]),
      db.all('SELECT titulo, descricao, link_url, tipo, criado_em FROM itagame_repositorio WHERE escola_id = ? ORDER BY criado_em DESC', [eid]),
    ]);

    const xpTotal = xp?.xp_total || 0;

    res.json({
      aluno: { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo, turma: aluno.turma, foto_path: aluno.foto_path },
      itagame: {
        xp_total: xpTotal,
        nivel: calcularNivel(xpTotal),
        badges: JSON.parse(xp?.badges_json || '[]'),
        historico: historico_xp,
        missoes,
        recados,
      },
      notas,
      presencas,
      ocorrencias,
      repositorio,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
