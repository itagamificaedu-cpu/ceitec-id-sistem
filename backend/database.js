const bcrypt = require('bcryptjs');
const db = require('./db');

let initialized = false;

async function initDatabase() {
  if (initialized) return;

  const tabelas = [
    `CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'secretaria', criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS professores (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, telefone TEXT, foto_path TEXT, especialidade TEXT, formacao TEXT, ativo INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS turmas (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, curso TEXT NOT NULL, ano_letivo TEXT DEFAULT '2024', turno TEXT DEFAULT 'manha', professor_id INTEGER, max_alunos INTEGER DEFAULT 30, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS professor_turma_disciplina (id SERIAL PRIMARY KEY, professor_id INTEGER NOT NULL, turma_id INTEGER NOT NULL, disciplina TEXT NOT NULL, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS alunos (id SERIAL PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, nome TEXT NOT NULL, foto_path TEXT, turma TEXT NOT NULL, turma_id INTEGER, curso TEXT NOT NULL, email_responsavel TEXT, telefone_responsavel TEXT, data_matricula DATE NOT NULL, ativo INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS presencas (id SERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL, data DATE NOT NULL, hora_entrada TEXT, status TEXT NOT NULL DEFAULT 'ausente', registrado_por TEXT DEFAULT 'scanner')`,
    `CREATE TABLE IF NOT EXISTS justificativas (id SERIAL PRIMARY KEY, presenca_id INTEGER, aluno_id INTEGER NOT NULL, data_falta DATE NOT NULL, descricao TEXT, tipo TEXT NOT NULL DEFAULT 'injustificada', arquivo_path TEXT, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS avaliacoes (id SERIAL PRIMARY KEY, titulo TEXT NOT NULL, disciplina TEXT NOT NULL, turma_id INTEGER, professor_id INTEGER, tipo TEXT DEFAULT 'prova', total_questoes INTEGER DEFAULT 0, total_pontos REAL DEFAULT 10.0, data_aplicacao DATE, conteudo_json TEXT, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS questoes (id SERIAL PRIMARY KEY, avaliacao_id INTEGER, enunciado TEXT NOT NULL, alternativa_a TEXT, alternativa_b TEXT, alternativa_c TEXT, alternativa_d TEXT, gabarito TEXT, pontos REAL DEFAULT 1.0, dificuldade TEXT DEFAULT 'medio', disciplina TEXT, ano_escolar TEXT, explicacao TEXT)`,
    `CREATE TABLE IF NOT EXISTS respostas_alunos (id SERIAL PRIMARY KEY, avaliacao_id INTEGER NOT NULL, aluno_id INTEGER NOT NULL, questao_id INTEGER NOT NULL, resposta_marcada TEXT, correta INTEGER DEFAULT 0, pontos_obtidos REAL DEFAULT 0, respondido_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS notas (id SERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL, avaliacao_id INTEGER NOT NULL, turma_id INTEGER, disciplina TEXT NOT NULL, nota_final REAL DEFAULT 0, percentual_acerto REAL DEFAULT 0, data_lancamento DATE DEFAULT CURRENT_DATE, UNIQUE (aluno_id, avaliacao_id))`,
    `CREATE TABLE IF NOT EXISTS ocorrencias (id SERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL, professor_id INTEGER, turma_id INTEGER, tipo TEXT NOT NULL DEFAULT 'comportamento', descricao TEXT NOT NULL, gravidade TEXT NOT NULL DEFAULT 'baixa', notificou_responsavel INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS planos_aula (id SERIAL PRIMARY KEY, professor_id INTEGER, turma_id INTEGER, disciplina TEXT NOT NULL, tema TEXT NOT NULL, objetivo TEXT, conteudo_json TEXT, gerado_por_ia INTEGER DEFAULT 0, data_aula DATE, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_pontos (id SERIAL PRIMARY KEY, aluno_id INTEGER UNIQUE NOT NULL, turma_id INTEGER, xp_total INTEGER DEFAULT 0, nivel INTEGER DEFAULT 1, badges_json TEXT DEFAULT '[]', missoes_concluidas INTEGER DEFAULT 0, atualizado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_historico (id SERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL, tipo TEXT NOT NULL, descricao TEXT NOT NULL, xp_ganho INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT NOW())`,
  ];

  for (const sql of tabelas) {
    await db.exec(sql);
  }

  const hoje = new Date().toISOString().split('T')[0];

  const senhaHash = bcrypt.hashSync('ita2024', 10);
  const senhaHashCeitec = bcrypt.hashSync('ceitec2024', 10);

  const usuarios = [
    ['Administrador',     'admin@ita.com',         senhaHash,       'admin'],
    ['Secretaria',        'secretaria@ita.com',    senhaHash,       'secretaria'],
    ['Admin CEITEC',      'admin@ceitec.com',      senhaHashCeitec, 'admin'],
    ['Secretaria CEITEC', 'secretaria@ceitec.com', senhaHashCeitec, 'secretaria'],
  ];

  for (const [nome, email, senha_hash, perfil] of usuarios) {
    await db.exec(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ('${nome.replace(/'/g, "''")}', '${email}', '${senha_hash}', '${perfil}') ON CONFLICT (email) DO NOTHING`
    );
  }

  const profs = [
    { nome: 'Dr. Carlos Eduardo', email: 'carlos@ita.com', telefone: '558599100001', especialidade: 'Robotica e Eletronica', formacao: 'Engenharia Eletrica - UFCE' },
    { nome: 'Profa. Ana Beatriz',  email: 'ana@ita.com',    telefone: '558599100002', especialidade: 'Programacao e Desenvolvimento', formacao: 'Ciencia da Computacao - UFC' },
    { nome: 'Prof. Marcos Vieira', email: 'marcos@ita.com', telefone: '558599100003', especialidade: 'Design e Maker', formacao: 'Design Industrial - UNIFOR' },
  ];
  for (const p of profs) {
    await db.exec(
      `INSERT INTO professores (nome, email, telefone, especialidade, formacao) VALUES ('${p.nome}', '${p.email}', '${p.telefone}', '${p.especialidade}', '${p.formacao}') ON CONFLICT (email) DO NOTHING`
    );
    const senha = bcrypt.hashSync(p.telefone.slice(0, 6), 10);
    await db.exec(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ('${p.nome}', '${p.email}', '${senha}', 'professor') ON CONFLICT (email) DO NOTHING`
    );
  }

  for (const [nome, curso, turno] of [
    ['Robotica 9A',     'Robotica Educacional',      'manha'],
    ['Programacao 8B',  'Desenvolvimento Web',        'tarde'],
    ['Maker 7C',        'Design e Fabricacao Digital','manha'],
  ]) {
    await db.exec(
      `INSERT INTO turmas (nome, curso, turno) VALUES ('${nome}', '${curso}', '${turno}') ON CONFLICT DO NOTHING`
    );
  }

  const alunos = [
    { codigo: 'ITA-0001', nome: 'Ana Clara Souza',        turma: 'Robotica 9A',    turma_id: 1, curso: 'Robotica Educacional',       email: 'resp.ana@email.com',   tel: '5585999110001' },
    { codigo: 'ITA-0002', nome: 'Bruno Henrique Lima',    turma: 'Robotica 9A',    turma_id: 1, curso: 'Robotica Educacional',       email: 'resp.bruno@email.com', tel: '5585999110002' },
    { codigo: 'ITA-0003', nome: 'Carla Mendes Rocha',     turma: 'Programacao 8B', turma_id: 2, curso: 'Desenvolvimento Web',         email: 'resp.carla@email.com', tel: '5585999110003' },
    { codigo: 'ITA-0004', nome: 'Diego Ferreira Costa',   turma: 'Programacao 8B', turma_id: 2, curso: 'Desenvolvimento Web',         email: 'resp.diego@email.com', tel: '5585999110004' },
    { codigo: 'ITA-0005', nome: 'Eduarda Alves Santos',   turma: 'Maker 7C',       turma_id: 3, curso: 'Design e Fabricacao Digital', email: 'resp.edu@email.com',   tel: '5585999110005' },
  ];
  for (const a of alunos) {
    await db.exec(
      `INSERT INTO alunos (codigo, nome, turma, turma_id, curso, email_responsavel, telefone_responsavel, data_matricula) VALUES ('${a.codigo}', '${a.nome}', '${a.turma}', ${a.turma_id}, '${a.curso}', '${a.email}', '${a.tel}', '${hoje}') ON CONFLICT (codigo) DO NOTHING`
    );
  }

  console.log('Banco PostgreSQL inicializado');
  initialized = true;
}

module.exports = { initDatabase };
