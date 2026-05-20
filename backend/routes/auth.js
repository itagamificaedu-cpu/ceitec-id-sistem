const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

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

    // Registra login no log de acessos
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    db.run(
      'INSERT INTO log_acessos (usuario_id, nome, email, perfil, escola_id, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [usuario.id, usuario.nome, usuario.email, usuario.perfil, escola_id, ip, ua]
    ).catch(() => {});

    // Se for professor, busca o código do Mestre da Escola para acesso direto
    let codigo_mestre = null;
    if (usuario.perfil === 'professor') {
      try {
        const prof = await db.get(
          'SELECT codigo_mestre FROM professores WHERE email = ? AND escola_id = ? AND ativo = 1',
          [email, escola_id]
        );
        codigo_mestre = prof?.codigo_mestre || null;
      } catch (_) {}
    }

    const trocar_senha = !!usuario.trocar_senha;
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, escola_id, codigo_mestre, trocar_senha },
      trocar_senha,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Verifica estado atual do usuário no banco (trocar_senha pode ter sido atualizado pelo admin)
router.get('/me', autenticar, async (req, res) => {
  try {
    const u = await db.get('SELECT trocar_senha FROM usuarios WHERE id = ?', [req.usuario.id]);
    res.json({ trocar_senha: !!u?.trocar_senha });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
