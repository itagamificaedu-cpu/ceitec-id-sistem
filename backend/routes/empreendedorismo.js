// Rota: Empreendedorismo Digital
// Gerencia equipes, membros, arquivos e atividades escolhidas.
// Alunos elegíveis: apenas alunos do 9º ano da escola.

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Upload de arquivos — salva em /uploads/empreendedorismo/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'empreendedorismo');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ts   = Date.now();
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    cb(null, `${ts}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por arquivo
  fileFilter: (req, file, cb) => {
    // Aceita PDF e imagens
    const permitidos = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;
    if (permitidos.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use PDF ou imagem.'));
  },
});

// Todas as rotas exigem autenticação
router.use(autenticar);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Filtra apenas alunos do 9º ano da escola autenticada.
// Critério: nome da turma contém "9" (ex: "9A", "Robotica 9A", "9 ANO", etc.)
async function buscarAlunos9Ano(escola_id) {
  return db.all(
    `SELECT a.id, a.codigo, a.nome, a.turma, a.turma_id, t.nome AS turma_nome
     FROM alunos a
     LEFT JOIN turmas t ON t.id = a.turma_id AND t.escola_id = ?
     WHERE a.escola_id = ? AND a.ativo = 1
       AND (
         a.turma ILIKE '%9%ano%'
         OR a.turma ILIKE '%9 %'
         OR a.turma ~ '\\m9[A-Z]'
         OR t.nome ILIKE '%9%'
       )
     ORDER BY a.nome`,
    [escola_id, escola_id]
  );
}

// ─── GET /alunos-9ano — lista alunos elegíveis ─────────────────────────────
router.get('/alunos-9ano', async (req, res) => {
  try {
    const alunos = await buscarAlunos9Ano(req.usuario.escola_id);
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── GET /equipes — lista todas as equipes da escola ─────────────────────────
router.get('/equipes', async (req, res) => {
  try {
    const eid    = req.usuario.escola_id;
    const equipes = await db.all(
      `SELECT * FROM emp_equipes WHERE escola_id = ? ORDER BY criado_em DESC`,
      [eid]
    );

    // Para cada equipe, carrega os arquivos vinculados
    const resultado = await Promise.all(equipes.map(async eq => {
      const arquivos = await db.all(
        `SELECT * FROM emp_arquivos WHERE equipe_id = ? ORDER BY criado_em DESC`,
        [eq.id]
      );
      return {
        ...eq,
        membros:  JSON.parse(eq.membros_json  || '[]'),
        arquivos,
      };
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── POST /equipes — cria nova equipe ────────────────────────────────────────
router.post('/equipes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const {
      nome_startup, lider_id, lider_nome,
      atividade_id, atividade_nome,
      membros,               // array de { id, nome, turma }
      problema, solucao, publico_alvo,
      tecnologias, modelo_negocio, diferencial, prototipo,
    } = req.body;

    if (!nome_startup) return res.status(400).json({ erro: 'Nome da startup é obrigatório' });

    const result = await db.run(
      `INSERT INTO emp_equipes
        (escola_id, nome_startup, lider_id, lider_nome, atividade_id, atividade_nome,
         membros_json, problema, solucao, publico_alvo, tecnologias,
         modelo_negocio, diferencial, prototipo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eid,
        nome_startup,
        lider_id    || null,
        lider_nome  || '',
        atividade_id   || null,
        atividade_nome || '',
        JSON.stringify(membros || []),
        problema        || '',
        solucao         || '',
        publico_alvo    || '',
        tecnologias     || '',
        modelo_negocio  || '',
        diferencial     || '',
        prototipo       || '',
      ]
    );

    const equipe = await db.get('SELECT * FROM emp_equipes WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ ...equipe, membros: membros || [], arquivos: [] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── PUT /equipes/:id — edita equipe ─────────────────────────────────────────
router.put('/equipes/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { id } = req.params;

    // Verifica propriedade
    const existente = await db.get('SELECT id FROM emp_equipes WHERE id = ? AND escola_id = ?', [id, eid]);
    if (!existente) return res.status(404).json({ erro: 'Equipe não encontrada' });

    const {
      nome_startup, lider_id, lider_nome,
      atividade_id, atividade_nome, membros,
      problema, solucao, publico_alvo,
      tecnologias, modelo_negocio, diferencial, prototipo,
    } = req.body;

    await db.run(
      `UPDATE emp_equipes SET
        nome_startup = ?, lider_id = ?, lider_nome = ?,
        atividade_id = ?, atividade_nome = ?, membros_json = ?,
        problema = ?, solucao = ?, publico_alvo = ?,
        tecnologias = ?, modelo_negocio = ?, diferencial = ?, prototipo = ?,
        atualizado_em = NOW()
       WHERE id = ? AND escola_id = ?`,
      [
        nome_startup,
        lider_id    || null,
        lider_nome  || '',
        atividade_id   || null,
        atividade_nome || '',
        JSON.stringify(membros || []),
        problema       || '',
        solucao        || '',
        publico_alvo   || '',
        tecnologias    || '',
        modelo_negocio || '',
        diferencial    || '',
        prototipo      || '',
        id, eid,
      ]
    );

    const equipe   = await db.get('SELECT * FROM emp_equipes WHERE id = ?', [id]);
    const arquivos = await db.all('SELECT * FROM emp_arquivos WHERE equipe_id = ?', [id]);
    res.json({ ...equipe, membros: membros || [], arquivos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── DELETE /equipes/:id — exclui equipe e seus arquivos ─────────────────────
router.delete('/equipes/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { id } = req.params;

    const existente = await db.get('SELECT id FROM emp_equipes WHERE id = ? AND escola_id = ?', [id, eid]);
    if (!existente) return res.status(404).json({ erro: 'Equipe não encontrada' });

    // Remove arquivos físicos do disco
    const arquivos = await db.all('SELECT caminho FROM emp_arquivos WHERE equipe_id = ?', [id]);
    for (const arq of arquivos) {
      try { fs.unlinkSync(arq.caminho); } catch (_) {}
    }

    await db.run('DELETE FROM emp_arquivos WHERE equipe_id = ?', [id]);
    await db.run('DELETE FROM emp_equipes WHERE id = ? AND escola_id = ?', [id, eid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── POST /equipes/:id/upload — faz upload de arquivo para a equipe ──────────
router.post('/equipes/:id/upload', upload.single('arquivo'), async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { id } = req.params;

    // Verifica propriedade
    const equipe = await db.get('SELECT id FROM emp_equipes WHERE id = ? AND escola_id = ?', [id, eid]);
    if (!equipe) return res.status(404).json({ erro: 'Equipe não encontrada' });

    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

    const { membro_id, membro_nome } = req.body;
    const caminho_relativo = `/uploads/empreendedorismo/${req.file.filename}`;

    const result = await db.run(
      `INSERT INTO emp_arquivos
        (equipe_id, escola_id, nome_arquivo, tipo_arquivo, caminho, tamanho, membro_id, membro_nome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, eid,
        req.file.originalname,
        req.file.mimetype,
        caminho_relativo,
        req.file.size,
        membro_id  || null,
        membro_nome || '',
      ]
    );

    const arquivo = await db.get('SELECT * FROM emp_arquivos WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(arquivo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─── DELETE /arquivos/:id — remove um arquivo específico ─────────────────────
router.delete('/arquivos/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { id } = req.params;

    const arq = await db.get(
      'SELECT * FROM emp_arquivos WHERE id = ? AND escola_id = ?',
      [id, eid]
    );
    if (!arq) return res.status(404).json({ erro: 'Arquivo não encontrado' });

    // Remove o arquivo físico
    const caminho_abs = path.join(__dirname, '..', arq.caminho.replace(/^\//, ''));
    try { fs.unlinkSync(caminho_abs); } catch (_) {}

    await db.run('DELETE FROM emp_arquivos WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
