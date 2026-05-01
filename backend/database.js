const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function migrarBanco(db) {
  // Adicionar colunas novas em tabelas existentes (migrations seguras)
  const colunas = db.prepare("PRAGMA table_info(alunos)").all().map(c => c.name);
  if (!colunas.includes('turma_id')) {
    db.exec("ALTER TABLE alunos ADD COLUMN turma_id INTEGER REFERENCES turmas(id)");
  }
}

function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'secretaria',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS professores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT,
      foto_path TEXT,
      especialidade TEXT,
      formacao TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      curso TEXT NOT NULL,
      ano_letivo TEXT DEFAULT '2024',
      turno TEXT DEFAULT 'manhã',
      professor_id INTEGER,
      max_alunos INTEGER DEFAULT 30,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professor_id) REFERENCES professores(id)
    );

    CREATE TABLE IF NOT EXISTS professor_turma_disciplina (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professor_id INTEGER NOT NULL,
      turma_id INTEGER NOT NULL,
      disciplina TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professor_id) REFERENCES professores(id),
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS presencas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      data DATE NOT NULL,
      hora_entrada TEXT,
      status TEXT NOT NULL DEFAULT 'ausente',
      registrado_por TEXT DEFAULT 'scanner',
      FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    );

    CREATE TABLE IF NOT EXISTS justificativas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presenca_id INTEGER,
      aluno_id INTEGER NOT NULL,
      data_falta DATE NOT NULL,
      descricao TEXT,
      tipo TEXT NOT NULL DEFAULT 'injustificada',
      arquivo_path TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (presenca_id) REFERENCES presencas(id),
      FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      disciplina TEXT NOT NULL,
      turma_id INTEGER,
      professor_id INTEGER,
      tipo TEXT DEFAULT 'prova',
      total_questoes INTEGER DEFAULT 0,
      total_pontos REAL DEFAULT 10.0,
      data_aplicacao DATE,
      conteudo_json TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas(id),
      FOREIGN KEY (professor_id) REFERENCES professores(id)
    );

    CREATE TABLE IF NOT EXISTS questoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      explicacao TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id)
    );

    CREATE TABLE IF NOT EXISTS respostas_alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      aluno_id INTEGER NOT NULL,
      questao_id INTEGER NOT NULL,
      resposta_marcada TEXT,
      correta INTEGER DEFAULT 0,
      pontos_obtidos REAL DEFAULT 0,
      respondido_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id),
      FOREIGN KEY (aluno_id) REFERENCES alunos(id),
      FOREIGN KEY (questao_id) REFERENCES questoes(id)
    );

    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      avaliacao_id INTEGER NOT NULL,
      turma_id INTEGER,
      disciplina TEXT NOT NULL,
      nota_final REAL DEFAULT 0,
      percentual_acerto REAL DEFAULT 0,
      data_lancamento DATE DEFAULT CURRENT_DATE,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id),
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id),
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS ocorrencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      professor_id INTEGER,
      turma_id INTEGER,
      tipo TEXT NOT NULL DEFAULT 'comportamento',
      descricao TEXT NOT NULL,
      gravidade TEXT NOT NULL DEFAULT 'baixa',
      notificou_responsavel INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id),
      FOREIGN KEY (professor_id) REFERENCES professores(id),
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS planos_aula (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professor_id INTEGER,
      turma_id INTEGER,
      disciplina TEXT NOT NULL,
      tema TEXT NOT NULL,
      objetivo TEXT,
      conteudo_json TEXT,
      gerado_por_ia INTEGER DEFAULT 0,
      data_aula DATE,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professor_id) REFERENCES professores(id),
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS itagame_pontos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER UNIQUE NOT NULL,
      turma_id INTEGER,
      xp_total INTEGER DEFAULT 0,
      nivel INTEGER DEFAULT 1,
      badges_json TEXT DEFAULT '[]',
      missoes_concluidas INTEGER DEFAULT 0,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id),
      FOREIGN KEY (turma_id) REFERENCES turmas(id)
    );

    CREATE TABLE IF NOT EXISTS itagame_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      xp_ganho INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    );
  `);

  migrarBanco(db);

  const adminExiste = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@ita.com');
  if (!adminExiste) {
    const senhaHash = bcrypt.hashSync('ita2024', 10);
    const senhaHashCeitec = bcrypt.hashSync('ceitec2024', 10);

    db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run('Administrador', 'admin@ita.com', senhaHash, 'admin');
    db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run('Secretaria', 'secretaria@ita.com', senhaHash, 'secretaria');

    // Manter credenciais antigas compatíveis
    const adminCeitecExiste = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@ceitec.com');
    if (!adminCeitecExiste) {
      db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run('Admin CEITEC', 'admin@ceitec.com', senhaHashCeitec, 'admin');
      db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run('Secretaria CEITEC', 'secretaria@ceitec.com', senhaHashCeitec, 'secretaria');
    }

    const hoje = new Date().toISOString().split('T')[0];

    // Professores
    const profs = [
      { nome: 'Dr. Carlos Eduardo', email: 'carlos@ita.com', telefone: '558599100001', especialidade: 'Robótica e Eletrônica', formacao: 'Engenharia Elétrica - UFCE' },
      { nome: 'Profa. Ana Beatriz', email: 'ana@ita.com', telefone: '558599100002', especialidade: 'Programação e Desenvolvimento', formacao: 'Ciência da Computação - UFC' },
      { nome: 'Prof. Marcos Vieira', email: 'marcos@ita.com', telefone: '558599100003', especialidade: 'Design e Maker', formacao: 'Design Industrial - UNIFOR' },
    ];
    const insertProf = db.prepare('INSERT INTO professores (nome, email, telefone, especialidade, formacao) VALUES (?, ?, ?, ?, ?)');
    profs.forEach(p => insertProf.run(p.nome, p.email, p.telefone, p.especialidade, p.formacao));

    // Criar usuários para professores
    profs.forEach(p => {
      const senha = bcrypt.hashSync(p.telefone.slice(0, 6), 10);
      try { db.prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)').run(p.nome, p.email, senha, 'professor'); } catch {}
    });

    // Turmas
    const turmas = [
      { nome: 'Robótica 9A', curso: 'Robótica Educacional', turno: 'manhã', professor_id: 1 },
      { nome: 'Programação 8B', curso: 'Desenvolvimento Web', turno: 'tarde', professor_id: 2 },
      { nome: 'Maker 7C', curso: 'Design e Fabricação Digital', turno: 'manhã', professor_id: 3 },
    ];
    const insertTurma = db.prepare('INSERT INTO turmas (nome, curso, turno, professor_id) VALUES (?, ?, ?, ?)');
    turmas.forEach(t => insertTurma.run(t.nome, t.curso, t.turno, t.professor_id));

    // Associações professor-turma-disciplina
    const assocs = [
      { professor_id: 1, turma_id: 1, disciplina: 'Robótica' },
      { professor_id: 1, turma_id: 1, disciplina: 'Eletrônica' },
      { professor_id: 2, turma_id: 2, disciplina: 'Programação Web' },
      { professor_id: 2, turma_id: 2, disciplina: 'Banco de Dados' },
      { professor_id: 3, turma_id: 3, disciplina: 'Design Digital' },
      { professor_id: 3, turma_id: 3, disciplina: 'Fabricação 3D' },
    ];
    const insertAssoc = db.prepare('INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES (?, ?, ?)');
    assocs.forEach(a => insertAssoc.run(a.professor_id, a.turma_id, a.disciplina));

    // Alunos com turma_id
    const alunos = [
      { codigo: 'ITA-0001', nome: 'Ana Clara Souza', turma: 'Robótica 9A', turma_id: 1, curso: 'Robótica Educacional', email: 'resp.ana@email.com', tel: '5585999110001' },
      { codigo: 'ITA-0002', nome: 'Bruno Henrique Lima', turma: 'Robótica 9A', turma_id: 1, curso: 'Robótica Educacional', email: 'resp.bruno@email.com', tel: '5585999110002' },
      { codigo: 'ITA-0003', nome: 'Carla Mendes Rocha', turma: 'Programação 8B', turma_id: 2, curso: 'Desenvolvimento Web', email: 'resp.carla@email.com', tel: '5585999110003' },
      { codigo: 'ITA-0004', nome: 'Diego Ferreira Costa', turma: 'Programação 8B', turma_id: 2, curso: 'Desenvolvimento Web', email: 'resp.diego@email.com', tel: '5585999110004' },
      { codigo: 'ITA-0005', nome: 'Eduarda Alves Santos', turma: 'Maker 7C', turma_id: 3, curso: 'Design e Fabricação Digital', email: 'resp.edu@email.com', tel: '5585999110005' },
    ];

    // Verificar se alunos já existem (de versão anterior)
    const alunosExistentes = db.prepare('SELECT COUNT(*) as total FROM alunos').get();
    if (alunosExistentes.total === 0) {
      const insertAluno = db.prepare('INSERT INTO alunos (codigo, nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      alunos.forEach(a => insertAluno.run(a.codigo, a.nome, a.turma, a.turma_id, a.curso, a.email, a.tel, hoje));
    } else {
      // Atualizar turma_id nos alunos existentes
      db.prepare("UPDATE alunos SET turma_id = 1, codigo = 'ITA-0001' WHERE codigo = 'CEITEC-0001'").run();
      db.prepare("UPDATE alunos SET turma_id = 1, codigo = 'ITA-0002' WHERE codigo = 'CEITEC-0002'").run();
      db.prepare("UPDATE alunos SET turma_id = 2, codigo = 'ITA-0003' WHERE codigo = 'CEITEC-0003'").run();
      db.prepare("UPDATE alunos SET turma_id = 2, codigo = 'ITA-0004' WHERE codigo = 'CEITEC-0004'").run();
      db.prepare("UPDATE alunos SET turma_id = 3, codigo = 'ITA-0005' WHERE codigo = 'CEITEC-0005'").run();
      db.prepare("UPDATE alunos SET turma = 'Robótica 9A' WHERE turma = 'Turma Robótica A'").run();
      db.prepare("UPDATE alunos SET turma = 'Programação 8B', curso = 'Desenvolvimento Web' WHERE turma = 'Turma Programação B'").run();
    }

    // Avaliações de exemplo
    const av1 = db.prepare('INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Prova 1 - Fundamentos de Robótica', 'Robótica', 1, 1, 'prova', 4, 10, hoje);
    const av2 = db.prepare('INSERT INTO avaliacoes (titulo, disciplina, turma_id, professor_id, tipo, total_questoes, total_pontos, data_aplicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Quiz - HTML e CSS', 'Programação Web', 2, 2, 'quiz', 4, 10, hoje);

    // Questões av1
    const qs1 = [
      { enunciado: 'O que é um microcontrolador?', a: 'Um tipo de motor', b: 'Um circuito integrado programável', c: 'Um sensor de temperatura', d: 'Uma fonte de energia', gabarito: 'B', dificuldade: 'facil' },
      { enunciado: 'Qual linguagem é usada no Arduino?', a: 'Python', b: 'Java', c: 'C/C++', d: 'JavaScript', gabarito: 'C', dificuldade: 'facil' },
      { enunciado: 'O que é PWM em robótica?', a: 'Power With Motor', b: 'Pulse Width Modulation', c: 'Programmed Wire Mode', d: 'Physical Web Module', gabarito: 'B', dificuldade: 'medio' },
      { enunciado: 'Para que serve um servo motor?', a: 'Converter AC em DC', b: 'Medir temperatura', c: 'Controlar posição angular', d: 'Armazenar energia', gabarito: 'C', dificuldade: 'medio' },
    ];
    const insertQ = db.prepare('INSERT INTO questoes (avaliacao_id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, gabarito, pontos, dificuldade, disciplina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    qs1.forEach(q => insertQ.run(av1.lastInsertRowid, q.enunciado, q.a, q.b, q.c, q.d, q.gabarito, 2.5, q.dificuldade, 'Robótica'));

    // Questões av2
    const qs2 = [
      { enunciado: 'O que significa HTML?', a: 'HyperText Markup Language', b: 'High Text Machine Learning', c: 'HyperText Media Link', d: 'Home Tool Markup Language', gabarito: 'A', dificuldade: 'facil' },
      { enunciado: 'Qual propriedade CSS define a cor de fundo?', a: 'color', b: 'font-color', c: 'background-color', d: 'bg-color', gabarito: 'C', dificuldade: 'facil' },
      { enunciado: 'O que é um seletor CSS?', a: 'Um tipo de tag HTML', b: 'Um padrão que seleciona elementos para aplicar estilos', c: 'Uma função JavaScript', d: 'Um atributo de formulário', gabarito: 'B', dificuldade: 'medio' },
      { enunciado: 'Qual tag HTML cria um link?', a: '<link>', b: '<href>', c: '<url>', d: '<a>', gabarito: 'D', dificuldade: 'facil' },
    ];
    qs2.forEach(q => insertQ.run(av2.lastInsertRowid, q.enunciado, q.a, q.b, q.c, q.d, q.gabarito, 2.5, q.dificuldade, 'Programação Web'));

    // Notas fictícias
    const alunosList = db.prepare('SELECT id, turma_id FROM alunos WHERE ativo = 1').all();
    const notasData = [
      { nota: 8.5, pct: 85 }, { nota: 7.0, pct: 70 }, { nota: 9.0, pct: 90 },
      { nota: 6.5, pct: 65 }, { nota: 8.0, pct: 80 },
    ];
    const insertNota = db.prepare('INSERT INTO notas (aluno_id, avaliacao_id, turma_id, disciplina, nota_final, percentual_acerto) VALUES (?, ?, ?, ?, ?, ?)');
    alunosList.forEach((aluno, i) => {
      const nd = notasData[i % notasData.length];
      const avId = aluno.turma_id === 1 ? av1.lastInsertRowid : av2.lastInsertRowid;
      const disc = aluno.turma_id === 1 ? 'Robótica' : 'Programação Web';
      try { insertNota.run(aluno.id, avId, aluno.turma_id, disc, nd.nota, nd.pct); } catch {}
    });

    // ItagGame inicial para todos os alunos
    const insertXP = db.prepare('INSERT OR IGNORE INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, ?, ?, ?)');
    const xpIniciais = [320, 180, 540, 95, 750];
    alunosList.forEach((aluno, i) => {
      const xp = xpIniciais[i] || 100;
      const nivel = xp >= 2000 ? 5 : xp >= 1000 ? 4 : xp >= 500 ? 3 : xp >= 200 ? 2 : 1;
      const badges = JSON.stringify(xp > 300 ? ['🌟 Estrela', '📚 Estudioso'] : ['🌟 Estrela']);
      insertXP.run(aluno.id, aluno.turma_id, xp, nivel, badges);
    });

    // Ocorrências de exemplo
    if (alunosList.length > 0) {
      db.prepare('INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade) VALUES (?, ?, ?, ?, ?, ?)').run(alunosList[0].id, 1, 1, 'elogio', 'Aluno apresentou excelente projeto de robótica autônoma na feira de ciências.', 'baixa');
      db.prepare('INSERT INTO ocorrencias (aluno_id, professor_id, turma_id, tipo, descricao, gravidade) VALUES (?, ?, ?, ?, ?, ?)').run(alunosList[1]?.id || alunosList[0].id, 2, 2, 'academico', 'Aluno não entregou 3 trabalhos consecutivos sem justificativa.', 'media');
    }
  }

  console.log('✅ Banco de dados ITA Tecnologia inicializado');
  return db;
}

module.exports = { getDb, initDatabase };
