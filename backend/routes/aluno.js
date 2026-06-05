/**
 * Portal do Aluno — autenticação e consulta de atividade presencial ativa
 * Alunos se autenticam com o código da carteirinha (ex: ITA-0001)
 * Não usa senha — o código da carteirinha é o identificador único
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ceitec_secret_key_2024';

// ── Middleware de autenticação do aluno ──────────────────────────────────────
function autenticarAluno(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.tipo !== 'aluno') return res.status(403).json({ erro: 'Acesso negado' });
    req.aluno = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// POST /api/aluno/login — autenticação via código da carteirinha
router.post('/login', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Código é obrigatório' });

    const aluno = await db.get(
      `SELECT a.*, t.nome AS turma_nome
       FROM alunos a
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE UPPER(a.codigo) = UPPER(?) AND a.ativo = 1`,
      [codigo.trim()]
    );

    if (!aluno) {
      return res.status(404).json({ erro: 'Código não encontrado. Verifique sua carteirinha.' });
    }

    const token = jwt.sign(
      {
        tipo: 'aluno',
        id: aluno.id,
        codigo: aluno.codigo,
        nome: aluno.nome,
        turma_id: aluno.turma_id,
        turma_nome: aluno.turma_nome || aluno.turma,
        escola_id: aluno.escola_id,
        perfil: 'aluno',
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      aluno: {
        id: aluno.id,
        codigo: aluno.codigo,
        nome: aluno.nome,
        turma_id: aluno.turma_id,
        turma_nome: aluno.turma_nome || aluno.turma,
        escola_id: aluno.escola_id,
      }
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/aluno/me — dados do aluno autenticado
router.get('/me', autenticarAluno, async (req, res) => {
  try {
    const aluno = await db.get(
      `SELECT a.id, a.codigo, a.nome, a.turma, a.turma_id, a.escola_id,
              t.nome AS turma_nome
       FROM alunos a
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = ? AND a.ativo = 1`,
      [req.aluno.id]
    );
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/aluno/atividade-ativa — atividade presencial ativa da turma do aluno
// Trava central: só retorna ativa=true se professor iniciou e não encerrou
router.get('/atividade-ativa', autenticarAluno, async (req, res) => {
  try {
    const { turma_id } = req.aluno;
    if (!turma_id) return res.json({ ativa: false });

    const atividade = await db.get(
      `SELECT * FROM atividade_presencial_ativa
       WHERE turma_id = ? AND status = 'em_andamento'
       ORDER BY iniciada_em DESC LIMIT 1`,
      [turma_id]
    );

    if (!atividade) return res.json({ ativa: false });

    res.json({
      ativa: true,
      id: atividade.id,
      tipo: atividade.tipo,
      titulo: atividade.referencia_titulo,
      referencia_id: atividade.referencia_id,
      codigo_acesso: atividade.codigo_acesso,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = { router, autenticarAluno };
