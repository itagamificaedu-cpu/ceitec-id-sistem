const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Professor vê o próprio perfil + turmas pelo email do token
router.get('/eu', async (req, res) => {
  try {
    const email = req.usuario.email;
    const eid = req.usuario.escola_id;
    const prof = await db.get(
      'SELECT * FROM professores WHERE email = ? AND escola_id = ? AND ativo = 1',
      [email, eid]
    );
    if (!prof) return res.status(404).json({ erro: 'Perfil de professor não encontrado. Peça ao administrador para vincular seu e-mail ao cadastro.' });

    // Turmas via professor_turma_disciplina
    const links = await db.all(
      'SELECT DISTINCT turma_id FROM professor_turma_disciplina WHERE professor_id = ?',
      [prof.id]
    );
    // Turmas com professor_id direto
    const direto = await db.all(
      'SELECT id as turma_id FROM turmas WHERE professor_id = ? AND escola_id = ?',
      [prof.id, eid]
    );
    const ids = [...new Set([...links.map(r => r.turma_id), ...direto.map(r => r.turma_id)])];

    const turmas = await Promise.all(ids.map(async tid => {
      const turma = await db.get('SELECT * FROM turmas WHERE id = ?', [tid]);
      if (!turma) return null;
      const alunos = await db.all(
        'SELECT id, nome, codigo, foto_path, curso, turma FROM alunos WHERE (turma_id = ? OR (turma_id IS NULL AND turma = ?)) AND ativo = 1 ORDER BY nome',
        [tid, turma.nome]
      );
      const disciplinas = await db.all(
        'SELECT disciplina FROM professor_turma_disciplina WHERE professor_id = ? AND turma_id = ?',
        [prof.id, tid]
      );
      return { ...turma, alunos, disciplinas: disciplinas.map(d => d.disciplina) };
    }));
    const turmasFiltradas = turmas.filter(Boolean);
    const totalAlunos = turmasFiltradas.reduce((s, t) => s + t.alunos.length, 0);

    res.json({ ...prof, turmas: turmasFiltradas, total_turmas: turmasFiltradas.length, total_alunos: totalAlunos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const profs = await db.all('SELECT * FROM professores WHERE ativo = 1 AND escola_id = ? ORDER BY nome', [eid]);
    const result = await Promise.all(profs.map(async p => {
      const turmas = await db.all(`
        SELECT ptd.disciplina, t.nome as turma_nome, t.id as turma_id
        FROM professor_turma_disciplina ptd
        JOIN turmas t ON ptd.turma_id = t.id
        WHERE ptd.professor_id = ?
      `, [p.id]);
      return { ...p, turmas };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const prof = await db.get('SELECT * FROM professores WHERE id = ? AND escola_id = ?', [req.params.id, eid]);
    if (!prof) return res.status(404).json({ erro: 'Professor não encontrado' });
    const turmas = await db.all(`SELECT ptd.*, t.nome as turma_nome FROM professor_turma_disciplina ptd JOIN turmas t ON ptd.turma_id = t.id WHERE ptd.professor_id = ?`, [req.params.id]);
    const planos = await db.all('SELECT * FROM planos_aula WHERE professor_id = ? ORDER BY criado_em DESC LIMIT 10', [req.params.id]);
    const avaliacoes = await db.all('SELECT av.*, t.nome as turma_nome FROM avaliacoes av LEFT JOIN turmas t ON av.turma_id = t.id WHERE av.professor_id = ? ORDER BY av.data_aplicacao DESC LIMIT 10', [req.params.id]);
    const totalAlunos = await db.get('SELECT COUNT(DISTINCT a.id) as total FROM alunos a JOIN turmas t ON a.turma_id = t.id WHERE t.professor_id = ? AND a.ativo = 1', [req.params.id]);
    res.json({ ...prof, turmas, planos, avaliacoes, total_alunos: totalAlunos.total });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { nome, email, telefone, especialidade, formacao, turmas_disciplinas } = req.body;
    if (!nome || !email) return res.status(400).json({ erro: 'Nome e email são obrigatórios' });
    const eid = req.usuario.escola_id;

    const result = await db.run(
      'INSERT INTO professores (nome, email, telefone, especialidade, formacao, escola_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, telefone || null, especialidade || null, formacao || null, eid]
    );
    const profId = result.lastInsertRowid;

    if (telefone && telefone.length >= 6) {
      const senhaHash = bcrypt.hashSync(telefone.slice(0, 6), 10);
      try {
        await db.run(
          'INSERT INTO usuarios (nome, email, senha_hash, perfil, escola_id) VALUES (?, ?, ?, ?, ?)',
          [nome, email, senhaHash, 'professor', eid]
        );
      } catch {}
    }

    if (turmas_disciplinas) {
      const td = typeof turmas_disciplinas === 'string' ? JSON.parse(turmas_disciplinas) : turmas_disciplinas;
      for (const item of td) {
        if (item.turma_id && item.disciplina) {
          await db.run('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)', [profId, item.turma_id, item.disciplina]);
          await db.run('UPDATE turmas SET professor_id = ? WHERE id = ?', [profId, item.turma_id]);
        }
      }
    }

    res.status(201).json(await db.get('SELECT * FROM professores WHERE id = ?', [profId]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', upload.single('foto'), async (req, res) => {
  try {
    const { nome, email, telefone, especialidade, formacao, turmas_disciplinas } = req.body;
    await db.run(
      'UPDATE professores SET nome=?, email=?, telefone=?, especialidade=?, formacao=? WHERE id=? AND escola_id=?',
      [nome, email, telefone, especialidade, formacao, req.params.id, req.usuario.escola_id]
    );

    if (turmas_disciplinas !== undefined) {
      await db.run('DELETE FROM professor_turma_disciplina WHERE professor_id = ?', [req.params.id]);
      const td = typeof turmas_disciplinas === 'string' ? JSON.parse(turmas_disciplinas) : turmas_disciplinas;
      for (const item of td) {
        if (item.turma_id && item.disciplina) {
          await db.run('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)', [req.params.id, item.turma_id, item.disciplina]);
          await db.run('UPDATE turmas SET professor_id = ? WHERE id = ?', [req.params.id, item.turma_id]);
        }
      }
    }

    res.json(await db.get('SELECT * FROM professores WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('UPDATE professores SET ativo = 0 WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ mensagem: 'Professor desativado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/:id/turma-disciplina', async (req, res) => {
  try {
    const { turma_id, disciplina } = req.body;
    const result = await db.run('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)', [req.params.id, turma_id, disciplina]);
    res.status(201).json(await db.get('SELECT * FROM professor_turma_disciplina WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id/turma-disciplina/:tdId', async (req, res) => {
  try {
    await db.run('DELETE FROM professor_turma_disciplina WHERE id = ? AND professor_id = ?', [req.params.tdId, req.params.id]);
    res.json({ mensagem: 'Associação removida' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
