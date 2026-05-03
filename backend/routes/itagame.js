const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Rota pública — acesso do aluno pelo código (sem login)
router.get('/publico/:codigo', async (req, res) => {
  try {
    const aluno = await db.get(
      'SELECT * FROM alunos WHERE codigo = ? AND ativo = 1',
      [req.params.codigo.toUpperCase()]
    );
    if (!aluno) return res.status(404).json({ erro: 'Código não encontrado' });

    await db.run(
      "INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING",
      [aluno.id, aluno.turma_id]
    );
    const xp = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]);
    const historico = await db.all(
      'SELECT * FROM itagame_historico WHERE aluno_id = ? ORDER BY criado_em DESC LIMIT 20',
      [aluno.id]
    );
    const turma = aluno.turma_id
      ? await db.get('SELECT nome FROM turmas WHERE id = ?', [aluno.turma_id])
      : null;

    res.json({
      aluno: { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo, foto_path: aluno.foto_path, turma: aluno.turma, turma_nome: turma?.nome },
      xp_total: xp.xp_total,
      nivel: xp.nivel,
      nivel_info: calcularNivel(xp.xp_total),
      badges: JSON.parse(xp.badges_json || '[]'),
      historico,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.use(autenticar);

function calcularNivel(xp) {
  if (xp >= 2000) return { nivel: 5, nome: 'Lenda', proximo: null, xp_proximo: 0 };
  if (xp >= 1000) return { nivel: 4, nome: 'Campeão', proximo: 2000, xp_proximo: 2000 - xp };
  if (xp >= 500) return { nivel: 3, nome: 'Guerreiro', proximo: 1000, xp_proximo: 1000 - xp };
  if (xp >= 200) return { nivel: 2, nome: 'Explorador', proximo: 500, xp_proximo: 500 - xp };
  return { nivel: 1, nome: 'Aprendiz', proximo: 200, xp_proximo: 200 - xp };
}

router.get('/ranking', async (req, res) => {
  try {
    const { turma_id } = req.query;
    let sql = `SELECT ip.*, a.nome, a.foto_path, a.codigo, t.nome as turma_nome
      FROM itagame_pontos ip
      JOIN alunos a ON ip.aluno_id = a.id
      LEFT JOIN turmas t ON ip.turma_id = t.id
      WHERE a.ativo = 1`;
    const params = [];
    if (turma_id) { sql += ' AND ip.turma_id = ?'; params.push(turma_id); }
    sql += ' ORDER BY ip.xp_total DESC';
    const ranking = (await db.all(sql, params)).map(r => ({ ...r, nivel_info: calcularNivel(r.xp_total) }));
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/aluno/:id', async (req, res) => {
  try {
    let xp = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [req.params.id]);
    if (!xp) {
      const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
      if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
      await db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING", [req.params.id, aluno.turma_id]);
      xp = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [req.params.id]);
    }
    const historico = await db.all('SELECT * FROM itagame_historico WHERE aluno_id = ? ORDER BY criado_em DESC LIMIT 20', [req.params.id]);
    res.json({ ...xp, nivel_info: calcularNivel(xp.xp_total), historico, badges: JSON.parse(xp.badges_json || '[]') });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/atribuir', async (req, res) => {
  try {
    const { aluno_id, xp, motivo, tipo } = req.body;
    if (!aluno_id || !xp) return res.status(400).json({ erro: 'aluno_id e xp são obrigatórios' });

    let registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    if (!registro) {
      const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [aluno_id]);
      await db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING", [aluno_id, aluno?.turma_id]);
      registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    }
    const novoXP = registro.xp_total + Number(xp);
    const novoNivel = calcularNivel(novoXP).nivel;
    await db.run('UPDATE itagame_pontos SET xp_total = ?, nivel = ? WHERE aluno_id = ?', [novoXP, novoNivel, aluno_id]);
    await db.run('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)',
      [aluno_id, tipo || 'bonus', motivo || 'XP atribuído', Number(xp)]);

    res.json({ xp_total: novoXP, nivel: novoNivel, nivel_info: calcularNivel(novoXP) });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/xp', async (req, res) => {
  try {
    const { aluno_id, xp_ganho, descricao, tipo } = req.body;
    if (!aluno_id || !xp_ganho) return res.status(400).json({ erro: 'aluno_id e xp_ganho são obrigatórios' });

    let registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    if (!registro) {
      const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [aluno_id]);
      await db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING", [aluno_id, aluno?.turma_id]);
      registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    }

    const novoXP = registro.xp_total + xp_ganho;
    const novoNivel = calcularNivel(novoXP).nivel;
    await db.run('UPDATE itagame_pontos SET xp_total = ?, nivel = ?, atualizado_em = NOW() WHERE aluno_id = ?', [novoXP, novoNivel, aluno_id]);
    await db.run('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)', [aluno_id, tipo || 'manual', descricao || 'XP atribuído manualmente', xp_ganho]);

    res.json({ xp_total: novoXP, nivel: novoNivel, nivel_info: calcularNivel(novoXP) });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/badge', async (req, res) => {
  try {
    const { aluno_id, badge_nome } = req.body;
    if (!aluno_id || !badge_nome) return res.status(400).json({ erro: 'aluno_id e badge_nome são obrigatórios' });
    const registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    if (!registro) return res.status(404).json({ erro: 'Registro de pontos não encontrado' });
    const badges = JSON.parse(registro.badges_json || '[]');
    if (!badges.includes(badge_nome)) {
      badges.push(badge_nome);
      await db.run('UPDATE itagame_pontos SET badges_json = ? WHERE aluno_id = ?', [JSON.stringify(badges), aluno_id]);
      await db.run('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)', [aluno_id, 'badge', `Badge conquistada: ${badge_nome}`, 0]);
    }
    res.json({ badges });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/turmas', async (req, res) => {
  try {
    const turmas = await db.all('SELECT * FROM turmas ORDER BY nome');
    const result = await Promise.all(turmas.map(async t => {
      const ranking = await db.all(`
        SELECT ip.xp_total, ip.nivel, a.nome, a.foto_path
        FROM itagame_pontos ip JOIN alunos a ON ip.aluno_id = a.id
        WHERE ip.turma_id = ? AND a.ativo = 1
        ORDER BY ip.xp_total DESC
      `, [t.id]);
      const totalXP = ranking.reduce((s, r) => s + r.xp_total, 0);
      return { ...t, ranking: ranking.slice(0, 3), total_alunos: ranking.length, total_xp: totalXP };
    }));
    result.sort((a, b) => b.total_xp - a.total_xp);
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
