const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload de PDFs de missão
const uploadDir = path.join(__dirname, '../uploads/missoes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas PDF permitido'));
  },
});

function calcularNivel(xp) {
  const niveis = [
    { min: 0,    nome: 'Iniciante',   cor: '#6b7280', emoji: '🔩' },
    { min: 100,  nome: 'Construtor',  cor: '#3b82f6', emoji: '⚙️' },
    { min: 250,  nome: 'Inventor',    cor: '#10b981', emoji: '💡' },
    { min: 500,  nome: 'Engenheiro',  cor: '#f59e0b', emoji: '🚀' },
    { min: 1000, nome: 'Hacker',      cor: '#ef4444', emoji: '🤖' },
    { min: 2000, nome: 'Mestre Tech', cor: '#8b5cf6', emoji: '👑' },
  ];
  let atual = niveis[0], proximo = niveis[1];
  for (let i = niveis.length - 1; i >= 0; i--) {
    if (xp >= niveis[i].min) { atual = niveis[i]; proximo = niveis[i + 1] || null; break; }
  }
  const progresso = proximo ? Math.round(((xp - atual.min) / (proximo.min - atual.min)) * 100) : 100;
  return { ...atual, proximo_min: proximo?.min || null, progresso };
}

/* ── GET /api/portal/:codigo — dados completos do aluno ── */
router.get('/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.toUpperCase().trim();
    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [codigo]);
    if (!aluno) return res.status(404).json({ erro: 'Código não encontrado. Verifique sua carteirinha.' });

    await db.run(
      "INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, 0, 1, '[]') ON CONFLICT (aluno_id) DO NOTHING",
      [aluno.id, aluno.turma_id]
    );

    const eid = aluno.escola_id;

    const [xp, historico_xp, notas, presencas, ocorrencias, missoes, entregas, recados, repositorio, provas, loja, resgates] = await Promise.all([
      db.get('SELECT * FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]),
      db.all('SELECT * FROM itagame_historico WHERE aluno_id = ? ORDER BY criado_em DESC LIMIT 30', [aluno.id]),
      db.all(`SELECT n.*, av.titulo AS avaliacao_titulo, av.tipo AS avaliacao_tipo, av.disciplina, av.data_aplicacao FROM notas n JOIN avaliacoes av ON n.avaliacao_id = av.id WHERE n.aluno_id = ? ORDER BY av.data_aplicacao DESC`, [aluno.id]),
      db.all('SELECT data, hora_entrada, status FROM presencas WHERE aluno_id = ? ORDER BY data DESC LIMIT 60', [aluno.id]),
      db.all(`SELECT o.tipo, o.descricao, o.gravidade, o.criado_em, p.nome AS professor_nome FROM ocorrencias o LEFT JOIN professores p ON o.professor_id = p.id WHERE o.aluno_id = ? ORDER BY o.criado_em DESC`, [aluno.id]),
      db.all('SELECT id, titulo, descricao, xp_recompensa, criado_em FROM itagame_missoes WHERE escola_id = ? AND ativa = 1 ORDER BY criado_em DESC', [eid]),
      db.all('SELECT * FROM itagame_missao_entregas WHERE aluno_id = ?', [aluno.id]),
      db.all('SELECT titulo, mensagem, criado_em FROM itagame_recados WHERE escola_id = ? ORDER BY criado_em DESC LIMIT 10', [eid]),
      db.all('SELECT titulo, descricao, link_url, tipo, criado_em FROM itagame_repositorio WHERE escola_id = ? ORDER BY criado_em DESC', [eid]),
      db.all('SELECT id, titulo, disciplina, descricao, xp_por_acerto, codigo_acesso, criado_em FROM itagame_provas WHERE escola_id = ? AND ativa = 1 ORDER BY criado_em DESC', [eid]),
      db.all('SELECT * FROM itagame_loja WHERE escola_id = ? AND ativo = 1 ORDER BY custo_xp ASC', [eid]),
      db.all('SELECT * FROM itagame_resgates WHERE aluno_id = ?', [aluno.id]),
    ]);

    const xpTotal = xp?.xp_total || 0;
    const entregasMap = {};
    entregas.forEach(e => { entregasMap[e.missao_id] = e; });
    const resgatesMap = {};
    resgates.forEach(r => { resgatesMap[r.item_id] = r; });

    res.json({
      aluno: { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo, turma: aluno.turma, foto_path: aluno.foto_path },
      itagame: {
        xp_total: xpTotal,
        nivel: calcularNivel(xpTotal),
        badges: JSON.parse(xp?.badges_json || '[]'),
        historico: historico_xp,
        recados,
        missoes: missoes.map(m => ({ ...m, entrega: entregasMap[m.id] || null })),
        provas,
        loja: loja.map(item => ({ ...item, resgate: resgatesMap[item.id] || null })),
      },
      notas,
      presencas,
      ocorrencias,
      repositorio,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* ── POST /api/portal/missao-entrega — aluno envia prova de missão ── */
router.post('/missao-entrega', upload.single('arquivo'), async (req, res) => {
  try {
    const { codigo, missao_id, link_entrega, descricao } = req.body;
    if (!codigo || !missao_id) return res.status(400).json({ erro: 'Código e missão obrigatórios' });

    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [codigo.toUpperCase()]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const missao = await db.get('SELECT * FROM itagame_missoes WHERE id = ? AND ativa = 1', [missao_id]);
    if (!missao) return res.status(404).json({ erro: 'Missão não encontrada' });

    const arquivo_path = req.file ? `/uploads/missoes/${req.file.filename}` : null;

    await db.run(
      `INSERT INTO itagame_missao_entregas (escola_id, missao_id, aluno_id, link_entrega, arquivo_path, descricao, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pendente')
       ON CONFLICT (missao_id, aluno_id) DO UPDATE SET link_entrega = EXCLUDED.link_entrega, arquivo_path = COALESCE(EXCLUDED.arquivo_path, itagame_missao_entregas.arquivo_path), descricao = EXCLUDED.descricao, status = 'pendente'`,
      [aluno.escola_id, missao_id, aluno.id, link_entrega || null, arquivo_path, descricao || null]
    );

    res.json({ ok: true, mensagem: 'Missão enviada! Aguarde aprovação do professor.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* ── POST /api/portal/resgatar — aluno resgata item da loja ── */
router.post('/resgatar', async (req, res) => {
  try {
    const { codigo, item_id } = req.body;
    if (!codigo || !item_id) return res.status(400).json({ erro: 'Código e item obrigatórios' });

    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [codigo.toUpperCase()]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const item = await db.get('SELECT * FROM itagame_loja WHERE id = ? AND ativo = 1', [item_id]);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });

    const jaResgatou = await db.get('SELECT id FROM itagame_resgates WHERE aluno_id = ? AND item_id = ? AND status != ?', [aluno.id, item_id, 'cancelado']);
    if (jaResgatou) return res.status(400).json({ erro: 'Você já resgatou este item' });

    const xp = await db.get('SELECT xp_total FROM itagame_pontos WHERE aluno_id = ?', [aluno.id]);
    const xpAtual = xp?.xp_total || 0;
    if (xpAtual < item.custo_xp) return res.status(400).json({ erro: `XP insuficiente. Você tem ${xpAtual} XP, precisa de ${item.custo_xp} XP.` });

    const novoXP = xpAtual - item.custo_xp;
    await db.run('UPDATE itagame_pontos SET xp_total = ? WHERE aluno_id = ?', [novoXP, aluno.id]);
    await db.run(
      `INSERT INTO itagame_resgates (escola_id, aluno_id, item_id, custo_xp, status) VALUES (?, ?, ?, ?, 'pendente')`,
      [aluno.escola_id, aluno.id, item_id, item.custo_xp]
    );
    await db.run(
      `INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, 'loja', ?, ?)`,
      [aluno.id, `Resgatou: ${item.nome}`, -item.custo_xp]
    );

    res.json({ ok: true, mensagem: `${item.icone} ${item.nome} resgatado! Aguarde entrega.`, xp_total: novoXP });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
