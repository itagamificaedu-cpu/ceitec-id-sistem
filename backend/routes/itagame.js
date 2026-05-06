const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const ITAGAME_PY = 'https://projetoitagame.pythonanywhere.com';
const CHAVE = 'gamificaedu_secreto_2026';

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

// Busca ranking do PythonAnywhere mesclado com fotos/turmas do CEITEC
router.get('/ranking', async (req, res) => {
  console.log('[ranking] chamado escola_id:', req.usuario?.escola_id);
  try {
    const { turma_id } = req.query;
    const eid = req.usuario.escola_id;

    // Alunos locais para fotos e turma_id
    const alunosLocais = await db.all(
      'SELECT a.id, a.nome, a.codigo, a.foto_path, a.turma_id, t.nome as turma_nome FROM alunos a LEFT JOIN turmas t ON a.turma_id = t.id WHERE a.ativo = 1 AND a.escola_id = ?',
      [eid]
    );
    const mapLocal = {};
    alunosLocais.forEach(a => { mapLocal[a.codigo.toUpperCase()] = a; });

    // Começa com todos os alunos do CEITEC (XP = 0)
    let ranking = alunosLocais.map(a => ({
      id: a.id,
      codigo: a.codigo,
      nome: a.nome,
      xp_total: 0,
      nivel: 1,
      nivel_info: calcularNivel(0),
      turma_nome: a.turma_nome || '',
      turma_id: a.turma_id || null,
      foto_path: a.foto_path || null,
    }));

    // Tenta sobrepor XP real do PythonAnywhere
    try {
      const pyRes = await fetch(`${ITAGAME_PY}/api/ranking/?chave=${CHAVE}`, { signal: AbortSignal.timeout(8000) });
      if (pyRes.ok) {
        const { ranking: pyRanking } = await pyRes.json();
        console.log('[itagame] PY ranking recebido:', pyRanking.length, 'alunos, chaves:', pyRanking.slice(0,3).map(a=>a.codigo));
        console.log('[itagame] CEITEC códigos (3 primeiros):', ranking.slice(0,3).map(a=>a.codigo));
        const mapPY = {};
        pyRanking.forEach(a => { if (a.codigo) mapPY[a.codigo.toUpperCase()] = a; });
        ranking = ranking.map(a => {
          const py = mapPY[a.codigo.toUpperCase()];
          if (py && py.xp > 0) {
            return { ...a, xp_total: py.xp, nivel: py.nivel || 1, nivel_info: calcularNivel(py.xp) };
          }
          return a;
        });
      }
    } catch (err) {
      console.error('[itagame] Erro ao buscar PY ranking:', err.message);
      // Se PythonAnywhere falhar, mantém XP local
      const localXP = await db.all(
        `SELECT aluno_id, xp_total, nivel FROM itagame_pontos WHERE xp_total > 0`
      );
      const mapLocalXP = {};
      localXP.forEach(r => { mapLocalXP[r.aluno_id] = r; });
      ranking = ranking.map(a => {
        const lxp = mapLocalXP[a.id];
        if (lxp) return { ...a, xp_total: lxp.xp_total, nivel: lxp.nivel, nivel_info: calcularNivel(lxp.xp_total) };
        return a;
      });
    }

    // Filtrar por turma
    if (turma_id) {
      ranking = ranking.filter(a => String(a.turma_id) === String(turma_id));
    }

    // Ordenar por XP
    ranking.sort((a, b) => (b.xp_total - a.xp_total) || a.nome.localeCompare(b.nome));

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

// Atribuir XP: envia ao PythonAnywhere E atualiza local
router.post('/atribuir', async (req, res) => {
  try {
    const { aluno_id, xp, motivo, tipo } = req.body;
    if (!aluno_id || !xp) return res.status(400).json({ erro: 'aluno_id e xp são obrigatórios' });

    const aluno = await db.get('SELECT * FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    // Enviar para PythonAnywhere
    let pySincronizado = false;
    let xpPY = null;
    try {
      const pyRes = await fetch(`${ITAGAME_PY}/api/xp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE, codigo: aluno.codigo, xp: Number(xp), motivo: motivo || 'XP atribuído pelo professor' }),
        signal: AbortSignal.timeout(8000),
      });
      if (pyRes.ok) {
        const pyData = await pyRes.json();
        pySincronizado = true;
        xpPY = pyData.xp_total;
      }
    } catch (_) {}

    // Atualizar local também
    let registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    if (!registro) {
      await db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING", [aluno_id, aluno.turma_id]);
      registro = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno_id]);
    }
    const novoXP = xpPY !== null ? xpPY : (registro.xp_total + Number(xp));
    const novoNivel = calcularNivel(novoXP).nivel;
    await db.run('UPDATE itagame_pontos SET xp_total = ?, nivel = ? WHERE aluno_id = ?', [novoXP, novoNivel, aluno_id]);
    await db.run('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)',
      [aluno_id, tipo || 'bonus', motivo || 'XP atribuído', Number(xp)]);

    res.json({ xp_total: novoXP, nivel: novoNivel, nivel_info: calcularNivel(novoXP), py_sincronizado: pySincronizado });
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
    await db.run('UPDATE itagame_pontos SET xp_total = ?, nivel = ? WHERE aluno_id = ?', [novoXP, novoNivel, aluno_id]);
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

// MISSÕES
router.get('/missoes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { turma_id } = req.query;
    let sql = 'SELECT m.*, t.nome as turma_nome FROM itagame_missoes m LEFT JOIN turmas t ON m.turma_id = t.id WHERE m.escola_id = ?';
    const params = [eid];
    if (turma_id) { sql += ' AND m.turma_id = ?'; params.push(turma_id); }
    sql += ' ORDER BY m.criado_em DESC';
    res.json(await db.all(sql, params));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/missoes', async (req, res) => {
  try {
    const { titulo, descricao, xp_recompensa, codigo_secreto, turma_id } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
    const { lastInsertRowid } = await db.run(
      'INSERT INTO itagame_missoes (escola_id, turma_id, titulo, descricao, xp_recompensa, codigo_secreto) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.escola_id, turma_id || null, titulo, descricao || '', xp_recompensa || 100, codigo_secreto || null]
    );
    res.json({ id: lastInsertRowid, titulo });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/missoes/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_missoes WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// RECADOS
router.get('/recados', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    res.json(await db.all(
      'SELECT r.*, t.nome as turma_nome FROM itagame_recados r LEFT JOIN turmas t ON r.turma_id = t.id WHERE r.escola_id = ? ORDER BY r.criado_em DESC',
      [eid]
    ));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/recados', async (req, res) => {
  try {
    const { titulo, mensagem, turma_id } = req.body;
    if (!titulo || !mensagem) return res.status(400).json({ erro: 'Título e mensagem obrigatórios' });
    const { lastInsertRowid } = await db.run(
      'INSERT INTO itagame_recados (escola_id, turma_id, titulo, mensagem) VALUES (?, ?, ?, ?)',
      [req.usuario.escola_id, turma_id || null, titulo, mensagem]
    );
    res.json({ id: lastInsertRowid, titulo });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/recados/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_recados WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// HISTÓRICO XP
router.get('/historico', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { turma_id, limit = 100 } = req.query;
    let sql = `
      SELECT h.id, h.tipo, h.descricao, h.xp_ganho, h.criado_em,
             a.nome as aluno_nome, a.turma as aluno_turma, a.foto_path
      FROM itagame_historico h
      LEFT JOIN alunos a ON h.aluno_id = a.id
      WHERE a.escola_id = $1
    `;
    const params = [eid];
    if (turma_id) {
      sql += ` AND a.turma_id = $${params.length + 1}`;
      params.push(turma_id);
    }
    sql += ` ORDER BY h.criado_em DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    res.json(await db.all(sql, params));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// PROVAS GAMIFICADAS
router.get('/provas', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const rows = await db.all(
      `SELECT p.*, t.nome as turma_nome FROM itagame_provas p LEFT JOIN turmas t ON p.turma_id = t.id WHERE p.escola_id = $1 ORDER BY p.criado_em DESC`,
      [eid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/provas', async (req, res) => {
  try {
    const { titulo, disciplina, descricao, xp_por_acerto, turma_id } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { lastInsertRowid } = await db.run(
      `INSERT INTO itagame_provas (escola_id, turma_id, titulo, disciplina, descricao, xp_por_acerto, codigo_acesso) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.usuario.escola_id, turma_id || null, titulo, disciplina || '', descricao || '', xp_por_acerto || 50, codigo]
    );
    res.json({ id: lastInsertRowid, titulo, codigo_acesso: codigo });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/provas/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_provas WHERE id = $1 AND escola_id = $2', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// REPOSITÓRIO DE MATERIAIS
router.get('/repositorio', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    res.json(await db.all(
      `SELECT * FROM itagame_repositorio WHERE escola_id = $1 ORDER BY criado_em DESC`,
      [eid]
    ));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/repositorio', async (req, res) => {
  try {
    const { titulo, descricao, link_url, tipo } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
    const { lastInsertRowid } = await db.run(
      `INSERT INTO itagame_repositorio (escola_id, titulo, descricao, link_url, tipo) VALUES ($1,$2,$3,$4,$5)`,
      [req.usuario.escola_id, titulo, descricao || '', link_url || '', tipo || 'outro']
    );
    res.json({ id: lastInsertRowid, titulo });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/repositorio/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_repositorio WHERE id = $1 AND escola_id = $2', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// LOJA
router.get('/loja', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM itagame_loja WHERE escola_id = ? AND ativo = 1 ORDER BY criado_em DESC', [req.usuario.escola_id]));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/loja', async (req, res) => {
  try {
    const { nome, descricao, custo_xp, icone } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
    const { lastInsertRowid } = await db.run(
      'INSERT INTO itagame_loja (escola_id, nome, descricao, custo_xp, icone) VALUES (?, ?, ?, ?, ?)',
      [req.usuario.escola_id, nome, descricao || '', custo_xp || 100, icone || '🎁']
    );
    res.json({ id: lastInsertRowid, nome });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/loja/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_loja WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// RESGATES (loja — debita XP do aluno)
router.get('/resgates', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT r.id, r.custo_xp, r.status, r.entregue, r.criado_em,
              a.nome as aluno_nome, a.turma as aluno_turma, a.foto_path,
              l.nome as item_nome, l.icone as item_icone
       FROM itagame_resgates r
       LEFT JOIN alunos a ON r.aluno_id = a.id
       LEFT JOIN itagame_loja l ON r.item_id = l.id
       WHERE r.escola_id = ?
       ORDER BY r.criado_em DESC`,
      [req.usuario.escola_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.post('/resgates', async (req, res) => {
  try {
    const { aluno_codigo, item_id } = req.body;
    if (!aluno_codigo || !item_id) return res.status(400).json({ erro: 'Código do aluno e item obrigatórios' });

    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [aluno_codigo.toUpperCase()]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const item = await db.get('SELECT * FROM itagame_loja WHERE id = ? AND escola_id = ?', [item_id, req.usuario.escola_id]);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });

    // Busca XP atual
    let pontos = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]);
    if (!pontos) {
      await db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING", [aluno.id, aluno.turma_id]);
      pontos = await db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]);
    }

    if ((pontos?.xp_total || 0) < item.custo_xp) {
      return res.status(400).json({ erro: `XP insuficiente. Aluno tem ${pontos?.xp_total || 0} XP, item custa ${item.custo_xp} XP.` });
    }

    // Debita XP
    const novoXP = pontos.xp_total - item.custo_xp;
    const novoNivel = calcularNivel(novoXP).nivel;
    await db.run('UPDATE itagame_pontos SET xp_total = ?, nivel = ? WHERE aluno_id = ?', [novoXP, novoNivel, aluno.id]);
    await db.run('INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, ?, ?, ?)',
      [aluno.id, 'resgate', `Resgatou item da loja: ${item.nome}`, -item.custo_xp]);

    // Tenta sincronizar com PythonAnywhere (debitar XP)
    try {
      await fetch(`${ITAGAME_PY}/api/xp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE, codigo: aluno.codigo, xp: -item.custo_xp, motivo: `Resgate loja: ${item.nome}` }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (_) {}

    const { lastInsertRowid } = await db.run(
      'INSERT INTO itagame_resgates (escola_id, aluno_id, item_id, custo_xp) VALUES (?, ?, ?, ?)',
      [req.usuario.escola_id, aluno.id, item_id, item.custo_xp]
    );

    res.json({ id: lastInsertRowid, aluno: aluno.nome, item: item.nome, xp_restante: novoXP });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.patch('/resgates/:id/entregar', async (req, res) => {
  try {
    await db.run('UPDATE itagame_resgates SET entregue = 1, status = ? WHERE id = ? AND escola_id = ?',
      ['entregue', req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/resgates/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM itagame_resgates WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;
