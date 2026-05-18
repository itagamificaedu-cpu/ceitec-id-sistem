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
    // Professores e secretaria devem trocar a senha no primeiro acesso
    const perfil_final = perfil || 'secretaria';
    const trocar_senha = (perfil_final === 'professor' || perfil_final === 'secretaria') ? 1 : 0;
    const result = await db.run(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil, escola_id, trocar_senha) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, senha_hash, perfil_final, req.usuario.escola_id, trocar_senha]
    );
    res.status(201).json({ id: result.lastInsertRowid, nome, email, perfil: perfil_final });
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

// Gera senhas individuais para todos os usuários e retorna lista para PDF
// Usuário troca a própria senha no primeiro acesso
router.post('/trocar-senha', async (req, res) => {
  try {
    const { senha_nova } = req.body;
    if (!senha_nova || senha_nova.length < 6)
      return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    const hash = bcrypt.hashSync(senha_nova, 10);
    await db.run(
      'UPDATE usuarios SET senha_hash = ?, trocar_senha = 0 WHERE id = ?',
      [hash, req.usuario.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/gerar-senhas', async (req, res) => {
  try {
    const usuarios = await db.all(
      'SELECT id, nome, email, perfil FROM usuarios WHERE escola_id = ? ORDER BY nome',
      [req.usuario.escola_id]
    );

    const lista = [];
    for (const u of usuarios) {
      const senha = gerarSenha();
      const hash = bcrypt.hashSync(senha, 10);
      await db.run(
        'UPDATE usuarios SET senha_hash = ?, trocar_senha = 1 WHERE id = ?',
        [hash, u.id]
      );
      lista.push({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, senha });
    }
    res.json({ ok: true, usuarios: lista });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

function gerarSenha() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM usuarios WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
