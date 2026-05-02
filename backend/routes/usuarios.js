const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const usuarios = await db.all(
      'SELECT id, nome, email, perfil, criado_em FROM usuarios WHERE escola_id = ? ORDER BY criado_em DESC',
      [req.usuario.escola_id]
    );
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) return res.status(400).json({ erro: 'Email já cadastrado' });
    const senha_hash = bcrypt.hashSync(senha, 10);
    const result = await db.run(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil, escola_id) VALUES (?, ?, ?, ?, ?)',
      [nome, email, senha_hash, perfil || 'secretaria', req.usuario.escola_id]
    );
    res.status(201).json({ id: result.lastInsertRowid, nome, email, perfil: perfil || 'secretaria' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (senha) {
      const senha_hash = bcrypt.hashSync(senha, 10);
      await db.run(
        'UPDATE usuarios SET nome=?, email=?, senha_hash=?, perfil=? WHERE id=? AND escola_id=?',
        [nome, email, senha_hash, perfil, req.params.id, req.usuario.escola_id]
      );
    } else {
      await db.run(
        'UPDATE usuarios SET nome=?, email=?, perfil=? WHERE id=? AND escola_id=?',
        [nome, email, perfil, req.params.id, req.usuario.escola_id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM usuarios WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
