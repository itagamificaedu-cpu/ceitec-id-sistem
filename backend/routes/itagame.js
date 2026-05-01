const express = require('express');
const { getDb } = require('../database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

function calcularNivel(xp) {
  if (xp >= 2000) return { nivel: 5, nome: 'Lenda', proximo: null, xp_proximo: 0 };
  if (xp >= 1000) return { nivel: 4, nome: 'Campeão', proximo: 2000, xp_proximo: 2000 - xp };
  if (xp >= 500) return { nivel: 3, nome: 'Guerreiro', proximo: 1000, xp_proximo: 1000 - xp };
  if (xp >= 200) return { nivel: 2, nome: 'Explorador', proximo: 500, xp_proximo: 500 - xp };
  return { nivel: 1, nome: 'Aprendiz', proximo: 200, xp_proximo: 200 - xp };
}

router.get('/ranking', (req, res) => {
  const db = getDb();
  const { turma_id } = req.query;
  let sql = `SELECT ip.*, a.nome, a.foto_path, a.codigo, t.nome as turma_nome
    FROM itagame_pontos ip
    JOIN alunos a ON ip.aluno_id = a.id
    LEFT JOIN turmas t ON ip.turma_id = t.id
    WHERE a.ativo = 1`;
  const params = [];
  if (turma_id) { sql += ' AND ip.turma_id = ?'; params.push(turma_id); }
  sql += ' ORDER BY ip.xp_total DESC';
  const ranking = db.prepare(sql).all(...params).map(r => ({ ...r, nivel_info: calcularNivel(r.xp_total) }));
  res.json(ranking);
});

router.get('/aluno/:id', (req, res) => {
  const db = getDb();
  let xp = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(req.params.id);
  if (!xp) {
    const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    db.prepare('INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, "[]")').run(req.params.id, aluno.turma_id);
    xp = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(req.params.id);
  }
  const historico = db.prepare('SELECT * FROM itagame_historico WHERE aluno_id = ? ORDER BY criado_em DESC LIMIT 20').all(req.params.id);
  const nivel_info = calcularNivel(xp.xp_total);
  res.json({ ...xp, nivel_info, historico, badges: JSON.parse(xp.badges_json || '[]') });
});

router.post('/xp', (req, res) => {
  const { aluno_id, xp_ganho, descricao, tipo } = req.body;
  if (!aluno_id || !xp_ganho) return res.status(400).json({ erro: 'aluno_id e xp_ganho são obrigatórios' });
  const db = getDb();

  let registro = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(aluno_id);
  if (!registro) {
    const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(aluno_id);
    db.prepare('INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, "[]")').run(aluno_id, aluno?.turma_id);
    registro = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(aluno_id);
  }

  const novoXP = registro.xp_total + xp_ganho;
  const novoNivel = calcularNivel(novoXP).nivel;
  db.prepare('UPDATE itagame_pontos SET xp_total = ?, nivel = ?, atualizado_em = CURRENT_TIMESTAMP WHERE aluno_id = ?').run(novoXP, novoNivel, aluno_id);
  db.prepare('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)').run(aluno_id, tipo || 'manual', descricao || 'XP atribuído manualmente', xp_ganho);

  res.json({ xp_total: novoXP, nivel: novoNivel, nivel_info: calcularNivel(novoXP) });
});

router.post('/badge', (req, res) => {
  const { aluno_id, badge_nome } = req.body;
  if (!aluno_id || !badge_nome) return res.status(400).json({ erro: 'aluno_id e badge_nome são obrigatórios' });
  const db = getDb();
  const registro = db.prepare('SELECT * FROM itagame_pontos WHERE aluno_id = ?').get(aluno_id);
  if (!registro) return res.status(404).json({ erro: 'Registro de pontos não encontrado' });
  const badges = JSON.parse(registro.badges_json || '[]');
  if (!badges.includes(badge_nome)) {
    badges.push(badge_nome);
    db.prepare('UPDATE itagame_pontos SET badges_json = ? WHERE aluno_id = ?').run(JSON.stringify(badges), aluno_id);
    db.prepare('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)').run(aluno_id, 'badge', `Badge conquistada: ${badge_nome}`, 0);
  }
  res.json({ badges });
});

router.get('/turmas', (req, res) => {
  const db = getDb();
  const turmas = db.prepare('SELECT * FROM turmas ORDER BY nome').all();
  const result = turmas.map(t => {
    const ranking = db.prepare(`
      SELECT ip.xp_total, ip.nivel, a.nome, a.foto_path
      FROM itagame_pontos ip JOIN alunos a ON ip.aluno_id = a.id
      WHERE ip.turma_id = ? AND a.ativo = 1
      ORDER BY ip.xp_total DESC
    `).all(t.id);
    const totalXP = ranking.reduce((s, r) => s + r.xp_total, 0);
    return { ...t, ranking: ranking.slice(0, 3), total_alunos: ranking.length, total_xp: totalXP };
  });
  result.sort((a, b) => b.total_xp - a.total_xp);
  res.json(result);
});

module.exports = router;
