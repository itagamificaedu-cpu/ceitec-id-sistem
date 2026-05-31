const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function gerarCodigo(escola_id) {
  const ultimo = await db.get('SELECT codigo FROM alunos WHERE escola_id = ? ORDER BY id DESC LIMIT 1', [escola_id]);
  if (!ultimo) return `ESC${escola_id}-0001`;
  const partes = ultimo.codigo.split('-');
  const num = parseInt(partes[partes.length - 1]) + 1;
  const prefixo = partes.slice(0, -1).join('-');
  return `${prefixo}-${String(num).padStart(4, '0')}`;
}

router.use(autenticar);

router.post('/', async (req, res) => {
  try {
    const { nome, turma, curso, email_responsavel, telefone_responsavel, data_matricula, turma_id } = req.body;
    if (!nome || !turma || !curso) return res.status(400).json({ erro: 'Nome, turma e curso são obrigatórios' });

    const eid = req.usuario.escola_id;
    const codigo = await gerarCodigo(eid);
    const matricula = data_matricula || new Date().toISOString().split('T')[0];

    const result = await db.run(
      'INSERT INTO alunos (codigo, nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo, nome, turma, turma_id || null, curso, email_responsavel || null, telefone_responsavel || null, matricula, eid]
    );
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const alunos = await db.all('SELECT * FROM alunos WHERE ativo = 1 AND escola_id = ? ORDER BY nome', [req.usuario.escola_id]);
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/qr/:codigo', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1 AND escola_id = ?', [req.params.codigo, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula } = req.body;
    await db.run(
      'UPDATE alunos SET nome=?, turma=?, turma_id=?, curso=?, email_responsavel=?, telefone_responsavel=?, data_matricula=? WHERE id=? AND escola_id=?',
      [nome, turma, turma_id || null, curso, email_responsavel, telefone_responsavel, data_matricula, req.params.id, req.usuario.escola_id]
    );
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id]);
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── Transferir aluno para outra turma ────────────────────────────────────────
// PATCH /api/alunos/:id/transferir  { turma_id: 5 }
// Atualiza apenas turma_id e turma (nome). Todos os dados do aluno seguem.
router.patch('/:id/transferir', async (req, res) => {
  try {
    const eid = req.usuario.escola_id
    const { turma_id } = req.body
    if (!turma_id) return res.status(400).json({ erro: 'turma_id é obrigatório' })

    // Verifica se a turma pertence à escola
    const turma = await db.get('SELECT * FROM turmas WHERE id = ? AND escola_id = ?', [turma_id, eid])
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' })

    // Verifica se o aluno pertence à escola
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ? AND escola_id = ?', [req.params.id, eid])
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' })

    const turmaAnterior = aluno.turma || 'sem turma'

    // Atualiza turma — todos os dados (XP, presenças, notas, álbum) seguem pelo aluno_id
    await db.run(
      'UPDATE alunos SET turma_id = ?, turma = ? WHERE id = ? AND escola_id = ?',
      [turma_id, turma.nome, req.params.id, eid]
    )

    const alunoAtualizado = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.id])
    res.json({
      aluno: alunoAtualizado,
      turma_anterior: turmaAnterior,
      turma_nova: turma.nome,
      mensagem: `${aluno.nome} transferido de "${turmaAnterior}" para "${turma.nome}" com sucesso!`
    })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await db.run('UPDATE alunos SET ativo = 0 WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ mensagem: 'Aluno desativado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    const fotoPath = `/uploads/foto_${req.params.id}_${Date.now()}`;
    await db.run('UPDATE alunos SET foto_path = ? WHERE id = ? AND escola_id = ?', [fotoPath, req.params.id, req.usuario.escola_id]);
    res.json({ foto_path: fotoPath });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/importar', async (req, res) => {
  try {
    const { alunos, turma_id, modo } = req.body;
    if (!Array.isArray(alunos) || alunos.length === 0) return res.status(400).json({ erro: 'Nenhum aluno para importar' });

    const eid = req.usuario.escola_id;
    let turma_nome = '', curso_nome = '';
    if (turma_id) {
      const t = await db.get('SELECT * FROM turmas WHERE id = ? AND escola_id = ?', [turma_id, eid]);
      if (t) { turma_nome = t.nome; curso_nome = t.curso; }
    }

    const REPLACEMENT = '�';
    const corrompidos = alunos.filter(a => (a.nome || '').includes(REPLACEMENT));
    if (corrompidos.length > 0) {
      return res.status(400).json({
        erro: `${corrompidos.length} nome(s) com caracteres inválidos (?). Salve o CSV como "CSV UTF-8" no Excel e importe novamente.`,
        nomes_corrompidos: corrompidos.map(a => a.nome)
      });
    }

    const importados = [], atualizados = [], erros = [];
    // Conjunto de nomes (em minúsculas) que vieram no CSV — usado para "modo limpar"
    const nomesImportados = new Set();

    for (const a of alunos) {
      try {
        if (!a.nome || !a.nome.trim()) { erros.push({ nome: a.nome || '?', erro: 'Nome obrigatório' }); continue; }
        const nomeNorm = a.nome.trim();
        nomesImportados.add(nomeNorm.toLowerCase());

        // Verifica se já existe aluno com mesmo nome na escola (ativo ou inativo)
        const existente = await db.get(
          "SELECT * FROM alunos WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?)) AND escola_id = ? ORDER BY ativo DESC LIMIT 1",
          [nomeNorm, eid]
        );

        if (existente) {
          // Atualiza dados e reativa caso estivesse inativo
          await db.run(
            'UPDATE alunos SET turma=?, turma_id=?, curso=?, email_responsavel=?, telefone_responsavel=?, ativo=1 WHERE id=?',
            [
              a.turma || turma_nome || existente.turma,
              turma_id ? parseInt(turma_id) : existente.turma_id,
              a.curso || curso_nome || existente.curso,
              a.email_responsavel || existente.email_responsavel,
              a.telefone_responsavel || existente.telefone_responsavel,
              existente.id
            ]
          );
          atualizados.push({ id: existente.id, codigo: existente.codigo, nome: nomeNorm });
        } else {
          // Insere novo aluno
          const codigo = await gerarCodigo(eid);
          const matricula = a.data_matricula || new Date().toISOString().split('T')[0];
          const result = await db.run(
            'INSERT INTO alunos (codigo, nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo, nomeNorm, a.turma || turma_nome, turma_id || null, a.curso || curso_nome, a.email_responsavel || null, a.telefone_responsavel || null, matricula, eid]
          );
          importados.push({ id: result.lastInsertRowid, codigo, nome: nomeNorm });
        }
      } catch (err) { erros.push({ nome: a.nome, erro: err.message }); }
    }

    // Se modo === 'limpar' e turma_id definida: desativa alunos da turma que NÃO vieram no CSV
    let removidos = 0;
    if (modo === 'limpar' && turma_id) {
      const alunosTurma = await db.all(
        'SELECT * FROM alunos WHERE turma_id = ? AND escola_id = ? AND ativo = 1',
        [turma_id, eid]
      );
      for (const al of alunosTurma) {
        const nomeAl = (al.nome || '').toLowerCase().trim();
        if (!nomesImportados.has(nomeAl)) {
          await db.run('UPDATE alunos SET ativo = 0 WHERE id = ?', [al.id]);
          removidos++;
        }
      }
    }

    res.json({
      importados: importados.length,
      atualizados: atualizados.length,
      removidos,
      erros,
      lista: [...importados, ...atualizados]
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/qrcode', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    const qrDataUrl = await QRCode.toDataURL(aluno.codigo, { width: 200, margin: 1 });
    res.json({ qrcode: qrDataUrl, codigo: aluno.codigo });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
