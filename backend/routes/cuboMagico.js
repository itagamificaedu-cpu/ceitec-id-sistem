// Rota: Campeonato de Cubo Mágico
// Inscrições dos alunos e chaveamento da competição
const express = require('express');
const db      = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// ── Inicializar tabelas se não existirem ─────────────────────────────────────
async function initTabelas() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cubo_inscricoes (
      id         SERIAL PRIMARY KEY,
      escola_id  INTEGER NOT NULL,
      nome       TEXT    NOT NULL,
      turma      TEXT    NOT NULL,
      criado_em  TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cubo_chaveamento (
      id         SERIAL PRIMARY KEY,
      escola_id  INTEGER NOT NULL,
      dados      TEXT    NOT NULL,
      atualizado TIMESTAMP DEFAULT NOW()
    )
  `);
}
initTabelas().catch(console.error);

// ── INSCRIÇÕES ───────────────────────────────────────────────────────────────

// GET /api/cubo/inscricoes — listar inscrições da escola
router.get('/inscricoes', autenticar, async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const lista = await db.all(
      `SELECT * FROM cubo_inscricoes WHERE escola_id = ? ORDER BY turma, nome`,
      [eid]
    );
    res.json(lista);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/cubo/inscricoes — inscrever aluno (público: sem autenticar)
router.post('/inscricoes', async (req, res) => {
  try {
    const { nome, turma, escola_id } = req.body;
    if (!nome || !turma || !escola_id) {
      return res.status(400).json({ erro: 'Nome, turma e escola_id são obrigatórios' });
    }
    // Não permite duplicata na mesma turma/escola
    const existe = await db.get(
      `SELECT id FROM cubo_inscricoes WHERE escola_id = ? AND turma = ? AND nome = ?`,
      [escola_id, turma, nome.trim()]
    );
    if (existe) {
      return res.status(409).json({ erro: 'Este aluno já está inscrito nesta turma' });
    }
    const r = await db.run(
      `INSERT INTO cubo_inscricoes (escola_id, nome, turma) VALUES (?, ?, ?)`,
      [escola_id, nome.trim(), turma.trim()]
    );
    res.json({ id: r.lastInsertRowid, nome: nome.trim(), turma: turma.trim() });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE /api/cubo/inscricoes/:id — remover inscrição (só autenticado)
router.delete('/inscricoes/:id', autenticar, async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    await db.run(
      `DELETE FROM cubo_inscricoes WHERE id = ? AND escola_id = ?`,
      [req.params.id, eid]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── CHAVEAMENTO ──────────────────────────────────────────────────────────────

// GET /api/cubo/chaveamento — buscar chaveamento salvo
router.get('/chaveamento', autenticar, async (req, res) => {
  try {
    const eid  = req.usuario.escola_id;
    const linha = await db.get(
      `SELECT dados FROM cubo_chaveamento WHERE escola_id = ? ORDER BY id DESC LIMIT 1`,
      [eid]
    );
    res.json(linha ? JSON.parse(linha.dados) : null);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST /api/cubo/chaveamento — salvar/atualizar chaveamento
router.post('/chaveamento', autenticar, async (req, res) => {
  try {
    const eid   = req.usuario.escola_id;
    const dados = JSON.stringify(req.body);
    const existe = await db.get(
      `SELECT id FROM cubo_chaveamento WHERE escola_id = ?`, [eid]
    );
    if (existe) {
      await db.run(
        `UPDATE cubo_chaveamento SET dados = ?, atualizado = NOW() WHERE escola_id = ?`,
        [dados, eid]
      );
    } else {
      await db.run(
        `INSERT INTO cubo_chaveamento (escola_id, dados) VALUES (?, ?)`,
        [eid, dados]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
