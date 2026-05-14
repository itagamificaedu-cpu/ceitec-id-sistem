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

    // escola_id: usa o valor salvo no banco quando existir (permite admin mestre vinculado a outra escola)
    // fallback para o próprio id (comportamento original para admins sem escola_id definida)
    const escola_id = usuario.escola_id || usuario.id;

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, escola_id },
      process.env.JWT_SECRET || 'ceitec_secret_key_2024',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, escola_id },
      trocar_senha: !!usuario.trocar_senha,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
