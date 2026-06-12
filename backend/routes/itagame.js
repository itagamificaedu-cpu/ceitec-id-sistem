const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const ITAGAME_PY = 'https://projetoitagame.pythonanywhere.com';
const CHAVE = 'gamificaedu_secreto_2026';

// ── Limites anti-abuso ────────────────────────────────────────
const XP_MAX_POR_TRANSACAO = 2000;  // maximo de XP em uma unica chamada
const XP_MAX_POR_DIA       = 5000;  // maximo de XP que um aluno pode ganhar por dia

async function verificarLimiteXP(aluno_id, xp_solicitado) {
  // Limita XP por transacao
  const xp = Math.min(Math.abs(Number(xp_solicitado)), XP_MAX_POR_TRANSACAO);

  // Verifica total ganho hoje
  const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const ganhoHoje = await db.get(
    `SELECT COALESCE(SUM(xp_ganho), 0) AS total
     FROM itagame_historico
     WHERE aluno_id = ? AND xp_ganho > 0
       AND DATE(criado_em) = DATE(NOW())`,
    [aluno_id]
  );
  const totalHoje = Number(ganhoHoje?.total || 0);

  if (totalHoje >= XP_MAX_POR_DIA) {
    return { permitido: false, xp: 0, motivo: `Limite diario de ${XP_MAX_POR_DIA} XP atingido` };
  }

  // Corta para nao ultrapassar o teto diario
  const xpPermitido = Math.min(xp, XP_MAX_POR_DIA - totalHoje);
  return { permitido: true, xp: xpPermitido };
}

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
  if (xp >= 2000) return { nivel: 5, nome: 'Mestre Tech 👑', proximo: null, xp_proximo: 0 };
  if (xp >= 1000) return { nivel: 4, nome: 'Hacker 🤖', proximo: 2000, xp_proximo: 2000 - xp };
  if (xp >= 500)  return { nivel: 3, nome: 'Engenheiro 🚀', proximo: 1000, xp_proximo: 1000 - xp };
  if (xp >= 200)  return { nivel: 2, nome: 'Inventor 💡', proximo: 500, xp_proximo: 500 - xp };
  return { nivel: 1, nome: 'Construtor ⚙️', proximo: 200, xp_proximo: 200 - xp };
}

// Ranking usa banco local (Neon DB) como fonte de verdade — XP gerenciado pelo sistema ITA
router.get('/ranking', async (req, res) => {
  try {
    const { turma_id } = req.query;
    const eid = req.usuario.escola_id;

    // Busca alunos com seus pontos locais (já zerados no reset de 18/05/2025)
    const alunosLocais = await db.all(
      `SELECT a.id, a.nome, a.codigo, a.foto_path, a.turma_id, t.nome as turma_nome,
              COALESCE(ip.xp_total, 0) as xp_total, COALESCE(ip.nivel, 1) as nivel
       FROM alunos a
       LEFT JOIN turmas t ON a.turma_id = t.id
       LEFT JOIN itagame_pontos ip ON ip.aluno_id = a.id
       WHERE a.ativo = 1 AND a.escola_id = ?`,
      [eid]
    );

    let ranking = alunosLocais.map(a => ({
      id: a.id,
      codigo: a.codigo,
      nome: a.nome,
      xp_total: a.xp_total,
      nivel: a.nivel,
      nivel_info: calcularNivel(a.xp_total),
      turma_nome: a.turma_nome || '',
      turma_id: a.turma_id || null,
      foto_path: a.foto_path || null,
    }));

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

// DESATIVADO — professores não podem dar XP manualmente
router.post('/atribuir', (req, res) => {
  res.status(403).json({ erro: 'XP manual desativado. Alunos ganham XP apenas realizando atividades.' });
});

// DESATIVADO — XP só por atividades
// DESATIVADO — XP só por atividades
router.post('/xp', (req, res) => {
  res.status(403).json({ erro: 'XP manual desativado. Alunos ganham XP apenas realizando atividades.' });
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

// SYNC — sincroniza bidirecional: envia alunos e puxa XP real do ItagGame
router.post('/sync', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    console.log('[SYNC] Iniciando sync para escola_id:', eid);

    // Busca alunos da escola
    const alunos = await db.all('SELECT id, nome, codigo, turma_id FROM alunos WHERE escola_id = $1 AND ativo = 1', [eid]);
    console.log('[SYNC] Alunos encontrados:', alunos.length);

    // 1) Envia alunos para o PythonAnywhere (não-bloqueante)
    const turmas = await db.all('SELECT id, nome FROM turmas WHERE escola_id = $1', [eid]);
    const turmasComAlunos = turmas.map(t => ({
      nome: t.nome,
      alunos: alunos.filter(a => a.turma_id === t.id).map(a => ({ codigo: a.codigo, nome: a.nome })),
    }));
    fetch(`${ITAGAME_PY}/api/sync-turmas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: CHAVE, turmas: turmasComAlunos }),
      signal: AbortSignal.timeout(15000),
    }).catch(() => {});

    // 2) Puxa XP real do PythonAnywhere
    let erroSync = null;
    let xpSincronizados = 0;

    const rankRes = await fetch(`${ITAGAME_PY}/api/ranking/?chave=${CHAVE}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!rankRes.ok) {
      erroSync = `PythonAnywhere retornou ${rankRes.status}`;
      console.log('[SYNC] Erro PythonAnywhere:', erroSync);
    } else {
      const dados = await rankRes.json();
      // API retorna { ranking: [...] } com campos nome/xp/nivel/turma
      const alunosPY = dados.ranking || dados.alunos || [];
      console.log('[SYNC] Alunos recebidos do PythonAnywhere:', alunosPY.length);

      // Mapa nome (uppercase) → XP/nivel
      const mapaXP = {};
      for (const a of alunosPY) {
        const chave = (a.nome || '').trim().toUpperCase();
        if (chave) mapaXP[chave] = { xp: a.xp || 0, nivel: a.nivel || 1 };
      }

      // Log de alunos com XP > 0 no PythonAnywhere
      const comXpPY = alunosPY.filter(a => a.xp > 0);
      console.log('[SYNC] Alunos com XP>0 no PythonAnywhere:', comXpPY.length);
      comXpPY.forEach(a => console.log(`  PY: ${a.nome} → ${a.xp} XP`));

      // UPSERT em lote: INSERT ... ON CONFLICT DO UPDATE (1 query só)
      if (alunos.length > 0) {
        // Constrói query de upsert em lote
        const valores = [];
        const params = [];
        let idx = 1;
        for (const aluno of alunos) {
          const pyDado = mapaXP[(aluno.nome || '').trim().toUpperCase()];
          const xpReal = pyDado ? pyDado.xp : 0;
          const nivelReal = pyDado ? pyDado.nivel : 1;
          valores.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, '[]')`);
          params.push(aluno.id, aluno.turma_id, xpReal, nivelReal);
        }

        const upsertSQL = `
          INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json)
          VALUES ${valores.join(', ')}
          ON CONFLICT (aluno_id) DO UPDATE
            SET xp_total = EXCLUDED.xp_total,
                nivel    = EXCLUDED.nivel
        `;
        await db.pool.query(upsertSQL, params);
        xpSincronizados = alunos.length;
        console.log('[SYNC] Upsert concluído para', xpSincronizados, 'alunos');

        // Verifica ANA BEATRIZ após sync
        const ana = await db.get('SELECT xp_total FROM itagame_pontos ip JOIN alunos a ON ip.aluno_id = a.id WHERE a.codigo = $1', ['ESC192-0167']);
        console.log('[SYNC] ANA BEATRIZ após sync:', JSON.stringify(ana));
      }
    }

    res.json({ ok: true, sincronizados: alunos.length, xp_atualizados: xpSincronizados, turmas: turmas.length, erro_sync: erroSync });
  } catch (err) {
    console.error('[SYNC] ERRO:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ZERAR RANKING — reseta XP por turma ou todos da escola
router.post('/reset', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { turma_id } = req.body;

    if (turma_id) {
      // Zera só a turma selecionada
      await db.run(
        `UPDATE itagame_pontos SET xp_total = 0, nivel = 1
         WHERE aluno_id IN (
           SELECT id FROM alunos
           WHERE escola_id = ? AND ativo = 1 AND turma_id = ?
         )`,
        [eid, turma_id]
      );
      res.json({ ok: true, mensagem: 'Ranking da turma zerado com sucesso!' });
    } else {
      // Zera todos da escola (mantém chamada PythonAnywhere para reset geral)
      try {
        await fetch(`${ITAGAME_PY}/api/reset-xp/?chave=${CHAVE}`, {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
        });
      } catch (_) { /* ignora se PY não responder */ }

      await db.run(
        `UPDATE itagame_pontos SET xp_total = 0, nivel = 1
         WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ? AND ativo = 1)`,
        [eid]
      );
      res.json({ ok: true, mensagem: 'Ranking geral zerado com sucesso!' });
    }
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
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

// ALUNOS ONLINE — registra e consulta presença ativa (últimos 10 min)
router.post('/online/ping', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const aluno_id = req.usuario.aluno_id || req.body.aluno_id;
    if (!aluno_id) return res.json({ ok: true });
    const agora = Math.floor(Date.now() / 1000);
    await db.exec(
      `INSERT INTO itagame_online (aluno_id, escola_id, ultimo_ping)
       VALUES (${aluno_id}, ${eid}, ${agora})
       ON CONFLICT (aluno_id) DO UPDATE SET ultimo_ping = ${agora}, escola_id = ${eid}`
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

router.get('/online', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { turma_id } = req.query;
    const dez_min = Math.floor(Date.now() / 1000) - 600;
    const agora = Math.floor(Date.now() / 1000);

    // 1. Alunos online na plataforma ITA (banco local)
    // ita_admin ve todos; professor ve só da sua escola
    const isAdmin = req.usuario.perfil === 'ita_admin' || req.usuario.is_admin;
    let sqlITA, params;
    if (isAdmin) {
      sqlITA = `SELECT a.id, a.nome, a.turma, a.foto_path,
               COALESCE(ip.xp_total, 0) as xp_total, o.ultimo_ping
               FROM itagame_online o
               JOIN alunos a ON o.aluno_id = a.id
               LEFT JOIN itagame_pontos ip ON ip.aluno_id = a.id
               WHERE o.ultimo_ping > $1`;
      params = [dez_min];
    } else {
      sqlITA = `SELECT a.id, a.nome, a.turma, a.foto_path,
               COALESCE(ip.xp_total, 0) as xp_total, o.ultimo_ping
               FROM itagame_online o
               JOIN alunos a ON o.aluno_id = a.id
               LEFT JOIN itagame_pontos ip ON ip.aluno_id = a.id
               WHERE o.escola_id = $1 AND o.ultimo_ping > $2`;
      params = [eid, dez_min];
    }
    if (turma_id) { sqlITA += isAdmin ? ' AND a.turma_id = $2' : ' AND a.turma_id = $3'; params.push(turma_id); }
    sqlITA += ' ORDER BY o.ultimo_ping DESC';
    const listaITA = await db.all(sqlITA, params);
    const onlineITA = listaITA.map(a => ({
      nome: a.nome,
      turma: a.turma || 'Sem turma',
      xp: a.xp_total,
      nivel: 1,
      ha_segundos: agora - a.ultimo_ping,
      sistema: 'ITA'
    }));

    // 2. Alunos online no ItagGame (PythonAnywhere)
    let onlinePY = [];
    try {
      const CHAVE = 'gamificaedu_secreto_2026';
      const ITAGAME_URL = 'https://projetoitagame.pythonanywhere.com';
      const resp = await fetch(`${ITAGAME_URL}/api/online-alunos/?chave=${CHAVE}`,
        { signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        const data = await resp.json();
        onlinePY = (data.online || []);
      }
    } catch (_) { /* PY offline, ignora */ }

    // 3. Junta e remove duplicatas por nome
    const todos = [...onlineITA, ...onlinePY];
    const vistos = new Set();
    const resultado = todos.filter(a => {
      const chave = a.nome.trim().toUpperCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
    resultado.sort((a, b) => a.ha_segundos - b.ha_segundos);

    res.json(resultado);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;

// ── GET /api/itagame/banidos — lista alunos banidos por fraude (só professor/admin) ──
router.get('/banidos', autenticar, async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const banidos = await db.all(
      `SELECT a.id, a.nome, a.codigo, a.turma,
              h.descricao AS motivo, h.criado_em AS data_ban
       FROM alunos a
       JOIN itagame_historico h ON h.aluno_id = a.id AND h.tipo = 'ban'
       WHERE a.escola_id = ? AND a.ativo = 0
       ORDER BY h.criado_em DESC`,
      [eid]
    );
    res.json({ banidos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── POST /api/itagame/desbanir/:id — reativa aluno banido (SOMENTE ita_admin) ──
router.post('/desbanir/:id', autenticar, async (req, res) => {
  // Apenas o administrador ITA pode reativar contas banidas — professores não têm acesso
  if (req.usuario.perfil !== 'ita_admin') {
    return res.status(403).json({ erro: 'Acesso negado. Somente o administrador ITA pode reativar contas suspensas.' });
  }
  try {
    await db.run(
      "UPDATE alunos SET ativo = 1 WHERE id = ?",
      [req.params.id]
    );
    await db.run(
      "INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, 'desban', 'Conta reativada pelo administrador ITA', 0)",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
