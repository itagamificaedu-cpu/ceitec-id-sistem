const bcrypt = require('bcryptjs');
const db = require('./db');

let initialized = false;

async function initDatabase() {
  if (initialized) return;

  // Migrations: add columns if missing (idempotent)
  const migrations = [
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'escola'`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pagamento_mp_id TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS licenca_expira TIMESTAMP`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano_ativo INTEGER DEFAULT 1`,
    // Multi-tenancy: cada admin é uma escola; escola_id = id do admin
    `ALTER TABLE usuarios    ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE turmas      ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE alunos      ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE professores ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE presencas   ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE avaliacoes  ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE notas       ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE planos_aula ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE itagame_pontos    ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE itagame_historico ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE justificativas    ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE quiz_resultados   ADD COLUMN IF NOT EXISTS aluno_codigo TEXT`,
    `ALTER TABLE almoco_registros  ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trocar_senha INTEGER DEFAULT 0`,
    // Cada admin tem escola_id = próprio id
    `UPDATE usuarios SET escola_id = id WHERE perfil = 'admin' AND escola_id IS NULL`,
    // Demais usuários herdaram escola do admin ITA (dados demo)
    `UPDATE usuarios SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
    // Todos os dados já existentes pertencem ao ITA demo
    `UPDATE turmas      SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
    `UPDATE alunos      SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
    `UPDATE professores SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
    `UPDATE avaliacoes  SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
    `UPDATE ocorrencias SET escola_id = (SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1) WHERE escola_id IS NULL`,
  ];
  for (const sql of migrations) {
    try { await db.exec(sql); } catch (_) {}
  }

  const tabelas = [
    `CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'secretaria', plano TEXT DEFAULT 'escola', pagamento_mp_id TEXT, criado_em TIMESTAMP DEFAULT NOW())`,
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
    `CREATE TABLE IF NOT EXISTS itagame_missoes (id SERIAL PRIMARY KEY, escola_id INTEGER, turma_id INTEGER, titulo TEXT NOT NULL, descricao TEXT, xp_recompensa INTEGER DEFAULT 100, codigo_secreto TEXT, ativa INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_recados (id SERIAL PRIMARY KEY, escola_id INTEGER, turma_id INTEGER, titulo TEXT NOT NULL, mensagem TEXT NOT NULL, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_provas (id SERIAL PRIMARY KEY, escola_id INTEGER, turma_id INTEGER, titulo TEXT NOT NULL, disciplina TEXT, descricao TEXT, xp_por_acerto INTEGER DEFAULT 50, codigo_acesso TEXT, ativa INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_repositorio (id SERIAL PRIMARY KEY, escola_id INTEGER, titulo TEXT NOT NULL, descricao TEXT, link_url TEXT, tipo TEXT DEFAULT 'outro', criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_loja (id SERIAL PRIMARY KEY, escola_id INTEGER, nome TEXT NOT NULL, descricao TEXT, custo_xp INTEGER DEFAULT 100, icone TEXT DEFAULT '🎁', ativo INTEGER DEFAULT 1, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_resgates (id SERIAL PRIMARY KEY, escola_id INTEGER, aluno_id INTEGER NOT NULL, item_id INTEGER NOT NULL, custo_xp INTEGER DEFAULT 0, status TEXT DEFAULT 'pendente', entregue INTEGER DEFAULT 0, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS itagame_missao_entregas (id SERIAL PRIMARY KEY, escola_id INTEGER, missao_id INTEGER NOT NULL, aluno_id INTEGER NOT NULL, link_entrega TEXT, arquivo_path TEXT, descricao TEXT, status TEXT DEFAULT 'pendente', xp_concedido INTEGER DEFAULT 0, observacao TEXT, criado_em TIMESTAMP DEFAULT NOW(), UNIQUE(missao_id, aluno_id))`,
    `CREATE TABLE IF NOT EXISTS quizzes (id SERIAL PRIMARY KEY, titulo TEXT NOT NULL, descricao TEXT DEFAULT '', tempo_por_questao INTEGER DEFAULT 30, ativo INTEGER DEFAULT 1, codigo_acesso TEXT UNIQUE, escola_id INTEGER, criado_por INTEGER, criado_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS quiz_questoes (id SERIAL PRIMARY KEY, quiz_id INTEGER NOT NULL, enunciado TEXT NOT NULL, alt_a TEXT NOT NULL, alt_b TEXT NOT NULL, alt_c TEXT, alt_d TEXT, resposta_correta INTEGER DEFAULT 0, ordem INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS quiz_resultados (id SERIAL PRIMARY KEY, quiz_id INTEGER NOT NULL, aluno_nome TEXT DEFAULT 'Participante', acertos INTEGER DEFAULT 0, total INTEGER DEFAULT 0, percentual INTEGER DEFAULT 0, tempo_total INTEGER DEFAULT 0, respondido_em TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS almoco_registros (id SERIAL PRIMARY KEY, aluno_id INTEGER NOT NULL, data DATE NOT NULL, hora_registro TEXT, registrado_por TEXT DEFAULT 'scanner', escola_id INTEGER)`,

    /* ========== SALA MAKER ========== */

    /* Configuração: qual escola tem Sala Maker ativada */
    `CREATE TABLE IF NOT EXISTS sala_maker_config (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER UNIQUE NOT NULL,
      ativa INTEGER DEFAULT 1,
      nome_sala TEXT DEFAULT 'Sala Maker',
      descricao TEXT,
      responsavel TEXT,
      capacidade INTEGER DEFAULT 30,
      regulamento TEXT,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Inscrições de professores e alunos na Sala Maker */
    `CREATE TABLE IF NOT EXISTS sala_maker_inscricoes (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      tipo_inscrito TEXT NOT NULL DEFAULT 'professor',
      nome TEXT NOT NULL,
      email TEXT,
      turma_id INTEGER,
      turma_nome TEXT,
      disciplina TEXT,
      modalidade TEXT,
      nome_equipe TEXT,
      area_interesse TEXT,
      tipo_uso TEXT,
      descricao_projeto TEXT,
      tem_experiencia INTEGER DEFAULT 0,
      descricao_experiencia TEXT,
      competencias_json TEXT DEFAULT '[]',
      aceite_regulamento INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pendente',
      justificativa_recusa TEXT,
      aprovado_por INTEGER,
      aprovado_em TIMESTAMP,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Agendamentos da Sala Maker */
    `CREATE TABLE IF NOT EXISTS sala_maker_agendamentos (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      inscricao_id INTEGER,
      responsavel_id INTEGER NOT NULL,
      responsavel_nome TEXT NOT NULL,
      data_agendamento DATE NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      nome_projeto TEXT NOT NULL,
      descricao_projeto TEXT,
      num_participantes INTEGER DEFAULT 1,
      materiais_json TEXT DEFAULT '[]',
      equipamentos_json TEXT DEFAULT '[]',
      disciplinas_json TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pendente',
      justificativa_recusa TEXT,
      aprovado_por INTEGER,
      aprovado_em TIMESTAMP,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Atividades e projetos registrados na Sala Maker */
    `CREATE TABLE IF NOT EXISTS sala_maker_atividades (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      professor_id INTEGER NOT NULL,
      professor_nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'atividade',
      titulo TEXT NOT NULL,
      descricao TEXT,
      turmas_json TEXT DEFAULT '[]',
      equipes_json TEXT DEFAULT '[]',
      data_realizacao DATE,
      prazo_entrega DATE,
      equipamentos_usados_json TEXT DEFAULT '[]',
      competencias_json TEXT DEFAULT '[]',
      steam_json TEXT DEFAULT '[]',
      criterios_avaliacao TEXT,
      status TEXT NOT NULL DEFAULT 'em_andamento',
      etapas_json TEXT DEFAULT '[]',
      fotos_json TEXT DEFAULT '[]',
      resultado_json TEXT DEFAULT '[]',
      vencedor TEXT,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Presenças na Sala Maker (contexto separado das presenças de aula) */
    `CREATE TABLE IF NOT EXISTS sala_maker_presencas (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      usuario_id INTEGER,        -- id do usuário inscrito (usuarios.id)
      aluno_id INTEGER,          -- id do aluno via carteirinha (alunos.id)
      aluno_nome TEXT NOT NULL,  -- nome armazenado para agilizar relatórios
      atividade_id INTEGER,
      atividade_titulo TEXT,     -- título armazenado para agilizar relatórios
      data DATE NOT NULL,
      metodo TEXT NOT NULL DEFAULT 'manual',  -- 'qr' | 'manual'
      registrado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Cadastro de equipamentos da Sala Maker */
    `CREATE TABLE IF NOT EXISTS sala_maker_equipamentos (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      modelo TEXT,
      categoria TEXT,
      numero_serie TEXT,
      quantidade INTEGER DEFAULT 1,
      localizacao TEXT,
      descricao TEXT,
      status TEXT NOT NULL DEFAULT 'disponivel',
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Registros de manutenção dos equipamentos */
    `CREATE TABLE IF NOT EXISTS sala_maker_manutencoes (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      equipamento_id INTEGER NOT NULL,
      tipo_manutencao TEXT NOT NULL DEFAULT 'corretiva',
      descricao_problema TEXT NOT NULL,
      tecnico_responsavel TEXT,
      custo_estimado REAL,
      observacoes TEXT,
      observacao_conclusao TEXT,
      status TEXT NOT NULL DEFAULT 'aberta',
      aberta_em TIMESTAMP DEFAULT NOW(),
      concluida_em TIMESTAMP,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,
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
