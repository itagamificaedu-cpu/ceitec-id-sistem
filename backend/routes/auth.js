const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });

    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const senhaValida = bcrypt.compareSync(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ erro: 'Credenciais inválidas' });

    // Admin: escola_id = próprio id. Outros: herdam escola_id do admin que os criou.
    const escola_id = usuario.perfil === 'admin' ? usuario.id : (usuario.escola_id || usuario.id);

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, escola_id },
      process.env.JWT_SECRET || 'ceitec_secret_key_2024',
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, escola_id } });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
