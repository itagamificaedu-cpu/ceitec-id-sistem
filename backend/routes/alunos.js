const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function gerarCodigo() {
  const ultimo = await db.get('SELECT codigo FROM alunos ORDER BY id DESC LIMIT 1');
  if (!ultimo) return 'ITA-0001';
  const partes = ultimo.codigo.split('-');
  const num = parseInt(partes[partes.length - 1]) + 1;
  return `ITA-${String(num).padStart(4, '0')}`;
}

router.use(autenticar);

router.post('/', async (req, res) => {
  try {
    const { nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula } = req.body;
    if (!nome || !turma || !curso) return res.status(400).json({ erro: 'Nome, turma e curso são obrigatórios' });

    const codigo = await gerarCodigo();
    const matricula = data_matricula || new Date().toISOString().split('T')[0];

    const result = await db.run(
      'INSERT INTO alunos (codigo, nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [codigo, nome, turma, curso, email_responsavel || null, telefone_responsavel || null, matricula]
    );
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const alunos = await db.all('SELECT * FROM alunos WHERE ativo = 1 ORDER BY nome');
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/qr/:codigo', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [req.params.codigo]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula } = req.body;
    await db.run(
      'UPDATE alunos SET nome=?, turma=?, curso=?, email_responsavel=?, telefone_responsavel=?, data_matricula=? WHERE id=?',
      [nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula, req.params.id]
    );
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('UPDATE alunos SET ativo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensagem: 'Aluno desativado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    const fotoPath = `/uploads/foto_${req.params.id}_${Date.now()}`;
    await db.run('UPDATE alunos SET foto_path = ? WHERE id = ?', [fotoPath, req.params.id]);
    res.json({ foto_path: fotoPath });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/importar', async (req, res) => {
  try {
    const { alunos, turma_id } = req.body;
    if (!Array.isArray(alunos) || alunos.length === 0) return res.status(400).json({ erro: 'Nenhum aluno para importar' });

    let turma_nome = '', curso_nome = '';
    if (turma_id) {
      const t = await db.get('SELECT * FROM turmas WHERE id = ?', [turma_id]);
      if (t) { turma_nome = t.nome; curso_nome = t.curso; }
    }

    const importados = [], erros = [];
    for (const a of alunos) {
      try {
        if (!a.nome || !a.nome.trim()) { erros.push({ nome: a.nome || '?', erro: 'Nome obrigatório' }); continue; }
        const codigo = await gerarCodigo();
        const matricula = a.data_matricula || new Date().toISOString().split('T')[0];
        const result = await db.run(
          'INSERT INTO alunos (codigo, nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula, turma_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [codigo, a.nome.trim(), a.turma || turma_nome, a.curso || curso_nome, a.email_responsavel || null, a.telefone_responsavel || null, matricula, turma_id || null]
        );
        importados.push({ id: result.lastInsertRowid, codigo, nome: a.nome.trim() });
      } catch (err) { erros.push({ nome: a.nome, erro: err.message }); }
    }
    res.json({ importados: importados.length, erros, lista: importados });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/qrcode', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    const qrDataUrl = await QRCode.toDataURL(aluno.codigo, { width: 200, margin: 1 });
    res.json({ qrcode: qrDataUrl, codigo: aluno.codigo });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
