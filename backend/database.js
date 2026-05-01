const bcrypt = require('bcryptjs');
const db = require('./db');

let initialized = false;

async function initDatabase() {
  if (initialized) return;
  initialized = true;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'secretaria',
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS professores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT,
      foto_path TEXT,
      especialidade TEXT,
      formacao TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      curso TEXT NOT NULL,
      ano_letivo TEXT DEFAULT '2024',
      turno TEXT DEFAULT 'manhã',
      professor_id INTEGER,
      max_alunos INTEGER DEFAULT 30,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS professor_turma_disciplina (
      id SERIAL PRIMARY KEY,
      professor_id INTEGER NOT NULL,
      turma_id INTEGER NOT NULL,
      disciplina TEXT NOT NULL,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id SERIAL PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      foto_path TEXT,
      turma TEXT NOT NULL,
      turma_id INTEGER,
      curso TEXT NOT NULL,
      email_responsavel TEXT,
      telefone_responsavel TEXT,
      data_matricula DATE NOT NULL,
      ativo INTEGER DEFAULT 1,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS presencas (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      data DATE NOT NULL,
      hora_entrada TEXT,
      status TEXT NOT NULL DEFAULT 'ausente',
      registrado_por TEXT DEFAULT 'scanner'
    );

    CREATE TABLE IF NOT EXISTS justificativas (
      id SERIAL PRIMARY KEY,
      presenca_id INTEGER,
      aluno_id INTEGER NOT NULL,
      data_falta DATE NOT NULL,
      descricao TEXT,
      tipo TEXT NOT NULL DEFAULT 'injustificada',
      arquivo_path TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      disciplina TEXT NOT NULL,
      turma_id INTEGER,
      professor_id INTEGER,
      tipo TEXT DEFAULT 'prova',
      total_questoes INTEGER DEFAULT 0,
      total_pontos REAL DEFAULT 10.0,
      data_aplicacao DATE,
      conteudo_json TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questoes (
      id SERIAL PRIMARY KEY,
      avaliacao_id INTEGER,
      enunciado TEXT NOT NULL,
      alternativa_a TEXT,
      alternativa_b TEXT,
      alternativa_c TEXT,
      alternativa_d TEXT,
      gabarito TEXT,
      pontos REAL DEFAULT 1.0,
      dificuldade TEXT DEFAULT 'medio',
      disciplina TEXT,
      ano_escolar TEXT,
      explicacao TEXT
    );

    CREATE TABLE IF NOT EXISTS respostas_alunos (
      id SERIAL PRIMARY KEY,
      avaliacao_id INTEGER NOT NULL,
      aluno_id INTEGER NOT NULL,
      questao_id INTEGER NOT NULL,
      resposta_marcada TEXT,
      correta INTEGER DEFAULT 0,
      pontos_obtidos REAL DEFAULT 0,
      respondido_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notas (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      avaliacao_id INTEGER NOT NULL,
      turma_id INTEGER,
      disciplina TEXT NOT NULL,
      nota_final REAL DEFAULT 0,
      percentual_acerto REAL DEFAULT 0,
      data_lancamento DATE DEFAULT CURRENT_DATE,
      UNIQUE (aluno_id, avaliacao_id)
    );

    CREATE TABLE IF NOT EXISTS ocorrencias (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      professor_id INTEGER,
      turma_id INTEGER,
      tipo TEXT NOT NULL DEFAULT 'comportamento',
      descricao TEXT NOT NULL,
      gravidade TEXT NOT NULL DEFAULT 'baixa',
      notificou_responsavel INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS planos_aula (
      id SERIAL PRIMARY KEY,
      professor_id INTEGER,
      turma_id INTEGER,
      disciplina TEXT NOT NULL,
      tema TEXT NOT NULL,
      objetivo TEXT,
      conteudo_json TEXT,
      gerado_por_ia INTEGER DEFAULT 0,
      data_aula DATE,
      criado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS itagame_pontos (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER UNIQUE NOT NULL,
      turma_id INTEGER,
      xp_total INTEGER DEFAULT 0,
      nivel INTEGER DEFAULT 1,
      badges_json TEXT DEFAULT '[]',
      missoes_concluidas INTEGER DEFAULT 0,
      atualizado_em TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS itagame_historico (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      xp_ganho INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  const adminExiste = await db.get('SELECT id FROM usuarios WHERE email = $1', ['admin@ita.com']);
  if (!adminExiste) {
    const senhaHash = bcrypt.hashSync('ita2024', 10);
    const senhaHashCeitec = bcrypt.hashSync('ceitec2024', 10);

    await db.run('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', ['Administrador', 'admin@ita.com', senhaHash, 'admin']);
    await db.run('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', ['Secretaria', 'secretaria@ita.com', senhaHash, 'secretaria']);
    await db.run('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', ['Admin CEITEC', 'admin@ceitec.com', senhaHashCeitec, 'admin']);
    await db.run('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', ['Secretaria CEITEC', 'secretaria@ceitec.com', senhaHashCeitec, 'secretaria']);

    const hoje = new Date().toISOString().split('T')[0];

    const profs = [
      { nome: 'Dr. Carlos Eduardo', email: 'carlos@ita.com', telefone: '558599100001', especialidade: 'Robótica e Eletrônica', formacao: 'Engenharia Elétrica - UFCE' },
      { nome: 'Profa. Ana Beatriz', email: 'ana@ita.com', telefone: '558599100002', especialidade: 'Programação e Desenvolvimento', formacao: 'Ciência da Computação - UFC' },
      { nome: 'Prof. Marcos Vieira', email: 'marcos@ita.com', telefone: '558599100003', especialidade: 'Design e Maker', formacao: 'Design Industrial - UNIFOR' },
    ];
    for (const p of profs) {
      await db.run('INSERT INTO professores (nome, email, telefone, especialidade, formacao) VALUES (?, ?, ?, ?, ?)', [p.nome, p.email, p.telefone, p.especialidade, p.formacao]);
      const senha = bcrypt.hashSync(p.telefone.slice(0, 6), 10);
      try { await db.run('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', [p.nome, p.email, senha, 'professor']); } catch {}
    }

    const turmas = [
      { nome: 'Robótica 9A', curso: 'Robótica Educacional', turno: 'manhã', professor_id: 1 },
      { nome: 'Programação 8B', curso: 'Desenvolvimento Web', turno: 'tarde', professor_id: 2 },
      { nome: 'Maker 7C', curso: 'Design e Fabricação Digital', turno: 'manhã', professor_id: 3 },
    ];
    for (const t of turmas) {
      await db.run('INSERT INTO turmas (nome, curso, turno, professor_id) VALUES (?, ?, ?, ?)', [t.nome, t.curso, t.turno, t.professor_id]);
    }

    const assocs = [
      [1, 1, 'Robótica'], [1, 1, 'Eletrônica'],
      [2, 2, 'Programação Web'], [2, 2, 'Banco de Dados'],
      [3, 3, 'Design Digital'], [3, 3, 'Fabricação 3D'],
    ];
    for (const [pid, tid, disc] of assocs) {
      await db.run('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)', [pid, tid, disc]);
    }

    const totalAlunos = await db.get('SELECT COUNT(*) as total FROM alunos');
    if (parseInt(totalAlunos.total) === 0) {
      const alunos = [
        { codigo: 'ITA-0001', nome: 'Ana Clara Souza', turma: 'Robótica 9A', turma_id: 1, curso: 'Robótica Educacional', email: 'resp.ana@email.com', tel: '5585999110001' },
        { codigo: 'ITA-0002', nome: 'Bruno Henrique Lima', turma: 'Robótica 9A', turma_id: 1, curso: 'Robótica Educacional', email: 'resp.bruno@email.com', tel: '5585999110002' },
        { codigo: 'ITA-0003', nome: 'Carla Mendes Rocha', turma: 'Programação 8B', turma_id: 2, curso: 'Desenvolvimento Web', email: 'resp.carla@email.com', tel: '5585999110003' },
        { codigo: 'ITA-0004', nome: 'Diego Ferreira Costa', turma: 'Programação 8B', turma_id: 2, curso: 'Desenvolvimento Web', email: 'resp.diego@email.com', tel: '5585999110004' },
        { codigo: 'ITA-0005', nome: 'Eduarda Alves Santos', turma: 'Maker 7C', turma_id: 3, curso: 'Design e Fabricação Digital', email: 'resp.edu@email.com', tel: '5585999110005' },
      ];
      for (const a of alunos) {
        await db.run('INSERT INTO alunos (codigo, nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [a.codigo, a.nome, a.turma, a.turma_id, a.curso, a.email, a.tel, hoje]);
      }
    }

    const av1 = await db.run('INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Prova 1 - Fundamentos de Robótica', 'Robótica', 1, 1, 'prova', 4, 10, hoje]);
    const av2 = await db.run('INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Quiz - HTML e CSS', 'Programação Web', 2, 2, 'quiz', 4, 10, hoje]);

    const qs1 = [
      ['O que é um microcontrolador?', 'Um tipo de motor', 'Um circuito integrado programável', 'Um sensor de temperatura', 'Uma fonte de energia', 'B', 'facil'],
      ['Qual linguagem é usada no Arduino?', 'Python', 'Java', 'C/C++', 'JavaScript', 'C', 'facil'],
      ['O que é PWM em robótica?', 'Power With Motor', 'Pulse Width Modulation', 'Programmed Wire Mode', 'Physical Web Module', 'B', 'medio'],
      ['Para que serve um servo motor?', 'Converter AC em DC', 'Medir temperatura', 'Controlar posição angular', 'Armazenar energia', 'C', 'medio'],
    ];
    for (const q of qs1) {
      await db.run('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [av1.lastInsertRowid, ...q, 2.5, q[6], 'Robótica']);
    }

    const qs2 = [
      ['O que significa HTML?', 'HyperText Markup Language', 'High Text Machine Learning', 'HyperText Media Link', 'Home Tool Markup Language', 'A', 'facil'],
      ['Qual propriedade CSS define a cor de fundo?', 'color', 'font-color', 'background-color', 'bg-color', 'C', 'facil'],
      ['O que é um seletor CSS?', 'Um tipo de tag HTML', 'Um padrão que seleciona elementos para aplicar estilos', 'Uma função JavaScript', 'Um atributo de formulário', 'B', 'medio'],
      ['Qual tag HTML cria um link?', '<link>', '<href>', '<url>', '<a>', 'D', 'facil'],
    ];
    for (const q of qs2) {
      await db.run('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [av2.lastInsertRowid, ...q, 2.5, q[6], 'Programação Web']);
    }

    const alunosList = await db.all('SELECT id, turma_id FROM alunos WHERE ativo = 1');
    const notasData = [{ nota: 8.5, pct: 85 }, { nota: 7.0, pct: 70 }, { nota: 9.0, pct: 90 }, { nota: 6.5, pct: 65 }, { nota: 8.0, pct: 80 }];
    for (let i = 0; i < alunosList.length; i++) {
      const aluno = alunosList[i];
      const nd = notasData[i % notasData.length];
      const avId = aluno.turma_id === 1 ? av1.lastInsertRowid : av2.lastInsertRowid;
      const disc = aluno.turma_id === 1 ? 'Robótica' : 'Programação Web';
      try { await db.run('INSERT INTO notas (aluno_id, avaliacao_id, turma_id, disciplina, nota_final, percentual_acerto) VALUES (?, ?, ?, ?, ?, ?)', [aluno.id, avId, aluno.turma_id, disc, nd.nota, nd.pct]); } catch {}
    }

    const xpIniciais = [320, 180, 540, 95, 750];
    for (let i = 0; i < alunosList.length; i++) {
      const aluno = alunosList[i];
      const xp = xpIniciais[i] || 100;
      const nivel = xp >= 2000 ? 5 : xp >= 1000 ? 4 : xp >= 500 ? 3 : xp >= 200 ? 2 : 1;
      const badges = JSON.stringify(xp > 300 ? ['🌟 Estrela', '📚 Estudioso'] : ['🌟 Estrela']);
      try { await db.run('INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT (aluno_id) DO NOTHING', [aluno.id, aluno.turma_id, xp, nivel, badges]); } catch {}
    }

    if (alunosList.length > 0) {
      await db.run('INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade) VALUES (?, ?, ?, ?, ?, ?)', [alunosList[0].id, 1, 1, 'elogio', 'Aluno apresentou excelente projeto de robótica.', 'baixa']);
      if (alunosList[1]) await db.run('INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade) VALUES (?, ?, ?, ?, ?, ?)', [alunosList[1].id, 2, 2, 'academico', 'Aluno não entregou 3 trabalhos consecutivos.', 'media']);
    }
  }

  console.log('✅ Banco PostgreSQL inicializado');
}

module.exports = { initDatabase };
