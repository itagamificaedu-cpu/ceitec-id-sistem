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
    `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS auto_avancar INTEGER DEFAULT 0`,
    `ALTER TABLE professores ADD COLUMN IF NOT EXISTS codigo_mestre TEXT`,
    `ALTER TABLE almoco_registros  ADD COLUMN IF NOT EXISTS escola_id INTEGER`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trocar_senha INTEGER DEFAULT 0`,
    // Perfil especial do dono da plataforma ITA (acesso global — não é escola contratante)
    `UPDATE usuarios SET perfil = 'ita_admin' WHERE email = 'itagamificaedu@gmail.com'`,
    // Cada admin tem escola_id = próprio id
    `UPDATE usuarios SET escola_id = id WHERE perfil IN ('admin','ita_admin') AND escola_id IS NULL`,
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
    `CREATE TABLE IF NOT EXISTS saida_sala (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      professor_id INTEGER,
      motivo TEXT DEFAULT 'banheiro',
      hora_saida TIMESTAMP NOT NULL DEFAULT NOW(),
      hora_retorno TIMESTAMP,
      duracao_minutos INTEGER,
      status TEXT DEFAULT 'fora',
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

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

    /* Log de acessos: registra cada login bem-sucedido */
    `CREATE TABLE IF NOT EXISTS log_acessos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      perfil TEXT NOT NULL,
      escola_id INTEGER,
      ip TEXT,
      user_agent TEXT,
      logado_em TIMESTAMP DEFAULT NOW()
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

    /* ========== EMPREENDEDORISMO DIGITAL ========== */

    /* Equipes das startups — vinculadas à escola e a alunos do 9º ano */
    `CREATE TABLE IF NOT EXISTS emp_equipes (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      nome_startup TEXT NOT NULL,
      lider_id INTEGER,
      lider_nome TEXT DEFAULT '',
      atividade_id INTEGER,
      atividade_nome TEXT DEFAULT '',
      membros_json TEXT DEFAULT '[]',
      problema TEXT DEFAULT '',
      solucao TEXT DEFAULT '',
      publico_alvo TEXT DEFAULT '',
      tecnologias TEXT DEFAULT '',
      modelo_negocio TEXT DEFAULT '',
      diferencial TEXT DEFAULT '',
      prototipo TEXT DEFAULT '',
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Arquivos enviados por membros das equipes (PDF, fotos) */
    `CREATE TABLE IF NOT EXISTS emp_arquivos (
      id SERIAL PRIMARY KEY,
      equipe_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      nome_arquivo TEXT NOT NULL,
      tipo_arquivo TEXT NOT NULL,
      caminho TEXT NOT NULL,
      tamanho INTEGER DEFAULT 0,
      membro_id INTEGER,
      membro_nome TEXT DEFAULT '',
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* ========== MOBILE TRACKER ========== */

    /* Perfil estendido do aluno para rastreamento GPS */
    `CREATE TABLE IF NOT EXISTS tracker_perfis (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER UNIQUE NOT NULL,
      escola_id INTEGER NOT NULL,
      endereco_residencia TEXT,
      bairro TEXT DEFAULT '',
      referencia_local TEXT DEFAULT '',
      lat_casa DECIMAL(10,7),
      lng_casa DECIMAL(10,7),
      meio_transporte TEXT DEFAULT 'a_pe',
      tempo_medio_trajeto_minutos INTEGER DEFAULT 30,
      distancia_km DECIMAL(5,2),
      tem_celular INTEGER DEFAULT 1,
      modelo_celular TEXT DEFAULT '',
      numero_celular TEXT DEFAULT '',
      token_pwa TEXT UNIQUE,
      consentimento_aceito INTEGER DEFAULT 0,
      consentimento_em TIMESTAMP,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Histórico de localizações GPS (séries temporais) */
    `CREATE TABLE IF NOT EXISTS tracker_localizacoes (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      precisao_metros FLOAT DEFAULT 0,
      velocidade_kmh FLOAT,
      altitude FLOAT,
      status TEXT DEFAULT 'desconhecido',
      bateria_percent INTEGER,
      celular_online INTEGER DEFAULT 1
    )`,

    /* Snapshot do estado atual de cada aluno (atualizado em tempo real) */
    `CREATE TABLE IF NOT EXISTS tracker_status_atual (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER UNIQUE NOT NULL,
      escola_id INTEGER NOT NULL,
      status_atual TEXT DEFAULT 'offline',
      ultima_atualizacao TIMESTAMP,
      ultima_lat DECIMAL(10,7),
      ultima_lng DECIMAL(10,7),
      bateria_atual INTEGER,
      chegou_escola_hoje INTEGER DEFAULT 0,
      horario_chegada TIMESTAMP,
      saiu_escola INTEGER DEFAULT 0,
      horario_saida TIMESTAMP
    )`,

    /* ========== MESTRE DA ESCOLA ========== */

    /* Professores com código de acesso único (ex: PROF-AB12) */
    `CREATE TABLE IF NOT EXISTS mestre_professores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo_acesso TEXT UNIQUE NOT NULL,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Grade horária — id UUID para compatibilidade com o frontend */
    `CREATE TABLE IF NOT EXISTS mestre_horarios (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      professor_nome TEXT NOT NULL,
      dia_semana TEXT NOT NULL,
      aula_numero INTEGER NOT NULL,
      horario_inicio TEXT NOT NULL,
      horario_fim TEXT NOT NULL,
      disciplina TEXT NOT NULL,
      turma TEXT NOT NULL,
      sala TEXT DEFAULT '',
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Posts: atividades e recados por turma */
    `CREATE TABLE IF NOT EXISTS mestre_posts (
      id SERIAL PRIMARY KEY,
      turma TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* Rastreio de leituras e conclusões dos alunos */
    `CREATE TABLE IF NOT EXISTS mestre_tracked_actions (
      id SERIAL PRIMARY KEY,
      student_name TEXT,
      action_type TEXT NOT NULL,
      post_id TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* ===== PROFESSOR GAME — Gamificação dos professores ===== */
    `CREATE TABLE IF NOT EXISTS prof_gamificacao (
      usuario_id INTEGER PRIMARY KEY,
      escola_id  INTEGER,
      xp_total   INTEGER DEFAULT 0,
      nivel      INTEGER DEFAULT 1,
      streak     INTEGER DEFAULT 0,
      ultimo_login DATE,
      criado_em  TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS prof_xp_historico (
      id         SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      escola_id  INTEGER,
      tipo       TEXT NOT NULL,
      descricao  TEXT,
      xp_ganho   INTEGER DEFAULT 0,
      criado_em  TIMESTAMP DEFAULT NOW()
    )`,

    /* ========== AGENDA E AVISOS ========== */

    `CREATE TABLE IF NOT EXISTS avisos (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'aviso',
      data_evento DATE,
      fixado INTEGER DEFAULT 0,
      criado_por_nome TEXT DEFAULT '',
      criado_por_id INTEGER,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS avisos_lidos (
      aviso_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      lido_em TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (aviso_id, usuario_id)
    )`,

    /* ========== COMUNICAÇÃO COM PAIS ========== */

    `CREATE TABLE IF NOT EXISTS comunicados (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      criado_por_id INTEGER,
      criado_por_nome TEXT DEFAULT '',
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'email',
      turma_id INTEGER,
      turma_nome TEXT,
      total_destinatarios INTEGER DEFAULT 0,
      enviados INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS comunicado_envios (
      id SERIAL PRIMARY KEY,
      comunicado_id INTEGER NOT NULL,
      aluno_id INTEGER NOT NULL,
      aluno_nome TEXT,
      email TEXT,
      telefone TEXT,
      status_email TEXT DEFAULT 'nao_enviado',
      erro_email TEXT,
      enviado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* ========== CALENDÁRIO ESCOLAR ========== */

    `CREATE TABLE IF NOT EXISTS eventos_calendario (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      data_inicio DATE NOT NULL,
      data_fim DATE,
      tipo TEXT NOT NULL DEFAULT 'evento',
      turma_id INTEGER,
      turma_nome TEXT,
      criado_por_id INTEGER,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    /* ========== ÁLBUM DOS CRAQUES DO CONHECIMENTO ========== */

    `CREATE TABLE IF NOT EXISTS album_colecoes (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      icone TEXT DEFAULT '🃏',
      cor TEXT DEFAULT '#6366f1',
      ordem INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS album_figurinhas (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL,
      numero TEXT NOT NULL,
      nome TEXT NOT NULL,
      colecao_id INTEGER,
      classe TEXT NOT NULL DEFAULT 'geral',
      raridade TEXT NOT NULL DEFAULT 'comum',
      poder TEXT DEFAULT '',
      historia TEXT DEFAULT '',
      curiosidade TEXT DEFAULT '',
      xp_bonus INTEGER DEFAULT 0,
      icone_emoji TEXT DEFAULT '🤖',
      cor_primaria TEXT DEFAULT '#6366f1',
      cor_secundaria TEXT DEFAULT '#8b5cf6',
      ativo INTEGER DEFAULT 1,
      criado_em TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS album_aluno (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      figurinha_id INTEGER NOT NULL,
      quantidade INTEGER DEFAULT 1,
      obtida_em TIMESTAMP DEFAULT NOW(),
      UNIQUE(aluno_id, figurinha_id)
    )`,

    `CREATE TABLE IF NOT EXISTS album_pacotes_log (
      id SERIAL PRIMARY KEY,
      aluno_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      tipo TEXT DEFAULT 'comum',
      figurinhas_ids TEXT DEFAULT '[]',
      custo_xp INTEGER DEFAULT 0,
      aberto_em TIMESTAMP DEFAULT NOW()
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

  // ── Seed do Álbum da Copa do Mundo 2026 ─────────────────────
  const adminId = await db.get(`SELECT id FROM usuarios WHERE email = 'admin@ita.com' LIMIT 1`);
  if (adminId) {
    // Se ainda tem os personagens antigos, limpa e re-seed com Copa
    const figAntiga = await db.get(`SELECT id FROM album_figurinhas WHERE escola_id = ? AND classe = 'robotica' LIMIT 1`, [adminId.id]);
    if (figAntiga) {
      await db.exec(`DELETE FROM album_figurinhas WHERE escola_id = ${adminId.id}`);
      await db.exec(`DELETE FROM album_colecoes   WHERE escola_id = ${adminId.id}`);
      console.log('Álbum: personagens CEITEC removidos, re-seed Copa do Mundo.');
    }
    const jaTemCol = await db.get(`SELECT id FROM album_colecoes WHERE escola_id = ? LIMIT 1`, [adminId.id]);
    if (!jaTemCol) {
      // ── Seleções (coleções) da Copa do Mundo 2026 ───────────────
      const colecoes = [
        { nome: '🇧🇷 Brasil',     icone: '🇧🇷', cor: '#009C3B', ordem: 1 },
        { nome: '🇦🇷 Argentina',  icone: '🇦🇷', cor: '#74ACDF', ordem: 2 },
        { nome: '🇫🇷 França',     icone: '🇫🇷', cor: '#002395', ordem: 3 },
        { nome: '🇵🇹 Portugal',   icone: '🇵🇹', cor: '#006600', ordem: 4 },
        { nome: '🇪🇸 Espanha',    icone: '🇪🇸', cor: '#c60b1e', ordem: 5 },
        { nome: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', icone: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cor: '#cf081f', ordem: 6 },
        { nome: '🇩🇪 Alemanha',   icone: '🇩🇪', cor: '#DD0000', ordem: 7 },
        { nome: '🌟 Especiais',   icone: '🏆', cor: '#f5a623', ordem: 8 },
      ];
      const colIds = {};
      for (const c of colecoes) {
        const r = await db.run(
          `INSERT INTO album_colecoes (escola_id, nome, icone, cor, ordem) VALUES (?,?,?,?,?)`,
          [adminId.id, c.nome, c.icone, c.cor, c.ordem]
        );
        colIds[c.nome] = r.lastInsertRowid;
      }

      // ── 50 Jogadores Copa do Mundo 2026 ─────────────────────────
      // poder = desafio educacional (matemática com stats de futebol)
      const figs = [
        // ── 🇧🇷 BRASIL ───────────────────────────────────────────
        { n:'001', nome:'Vinicius Jr.',  pos:'Atacante', rar:'lendaria', emoji:'⭐', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Um jogador marca gols em 60% dos jogos. Em 30 jogos, quantos gols marcou?',         xp:100 },
        { n:'002', nome:'Rodrygo',       pos:'Atacante', rar:'epica',    emoji:'🔥', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Se o time marca 2,5 gols por jogo, em 8 jogos quantos gols marca no total?',         xp:50  },
        { n:'003', nome:'Endrick',       pos:'Atacante', rar:'rara',     emoji:'⚡', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Endrick tem 18 anos. Daqui a 7 anos, quantos anos terá?',                             xp:25  },
        { n:'004', nome:'Raphinha',      pos:'Ponta',    rar:'rara',     emoji:'🎯', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Um ponta deu 15 assistências em 20 jogos. Qual a média por jogo?',                   xp:25  },
        { n:'005', nome:'Paquetá',       pos:'Meia',     rar:'rara',     emoji:'🎨', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'O campo tem 105m de comprimento. Quantos campos cabem em 1km?',                     xp:25  },
        { n:'006', nome:'Casemiro',      pos:'Volante',  rar:'epica',    emoji:'🛡️', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Um volante intercepta 3 bolas por jogo. Em 12 jogos, quantas interceptações?',      xp:50  },
        { n:'007', nome:'Marquinhos',    pos:'Zagueiro', rar:'epica',    emoji:'🧱', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'O Brasil sofreu 5 gols em 10 jogos. Qual a média de gols sofridos por jogo?',       xp:50  },
        { n:'008', nome:'Alisson',       pos:'Goleiro',  rar:'epica',    emoji:'🥅', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Um goleiro defendeu 80% dos chutes. De 25 chutes, quantos defendeu?',              xp:50  },
        { n:'009', nome:'Militão',       pos:'Zagueiro', rar:'rara',     emoji:'💪', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Se o Brasil ganhou 7 de 10 jogos, qual o percentual de vitórias?',                 xp:25  },
        { n:'010', nome:'Neymar Jr.',    pos:'Atacante', rar:'epica',    emoji:'🌟', cp:'#009C3B', cs:'#FFDF00', col:'🇧🇷 Brasil',    poder:'Neymar marcou 79 gols em 120 jogos. Qual sua média de gols por jogo?',             xp:50  },

        // ── 🇦🇷 ARGENTINA ─────────────────────────────────────────
        { n:'011', nome:'Lionel Messi',      pos:'Atacante', rar:'lendaria', emoji:'🐐', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'Messi marcou 800 gols. Se marcar mais 50, quantos terá?',                           xp:100 },
        { n:'012', nome:'Julián Álvarez',    pos:'Atacante', rar:'epica',    emoji:'🦁', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'Álvarez marcou 4 gols na Copa 2022 em 7 jogos. Qual a média?',                      xp:50  },
        { n:'013', nome:'De Paul',           pos:'Meia',     rar:'rara',     emoji:'⚙️', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'O campo tem 68m de largura. Qual a área se o comprimento for 105m?',               xp:25  },
        { n:'014', nome:'Mac Allister',      pos:'Meia',     rar:'rara',     emoji:'🎯', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'A Argentina ganhou a Copa em 2022 depois de 36 anos. Em que ano foi a anterior?',  xp:25  },
        { n:'015', nome:'Romero',            pos:'Zagueiro', rar:'comum',    emoji:'🛡️', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'Se um zagueiro disputa 90 duelos e vence 63, qual o percentual de vitórias?',     xp:10  },
        { n:'016', nome:'Di María',          pos:'Ponta',    rar:'epica',    emoji:'🦅', cp:'#74ACDF', cs:'#FFFFFF', col:'🇦🇷 Argentina', poder:'Di María tem 130 jogos pela Argentina. Se jogou 10 mais, quantos tem?',            xp:50  },

        // ── 🇫🇷 FRANÇA ───────────────────────────────────────────
        { n:'017', nome:'Kylian Mbappé',    pos:'Atacante', rar:'lendaria', emoji:'💨', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'Mbappé corre 36 km/h. Em 10 segundos, quantos metros percorre?',                  xp:100 },
        { n:'018', nome:'Camavinga',         pos:'Meia',     rar:'rara',     emoji:'🌊', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'Camavinga nasceu em 2002. Quantos anos tem em 2026?',                              xp:25  },
        { n:'019', nome:'Tchouaméni',        pos:'Volante',  rar:'rara',     emoji:'⚓', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'A França tem 22 jogadores convocados. Se 11 jogam, quantos ficam na reserva?',   xp:25  },
        { n:'020', nome:'Ousmane Dembélé',  pos:'Ponta',    rar:'rara',     emoji:'🏃', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'Dembélé fez 8 assistências em 16 jogos. Qual a média?',                           xp:25  },
        { n:'021', nome:'William Saliba',    pos:'Zagueiro', rar:'rara',     emoji:'🗼', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'A França ganhou a Copa em 1998 e 2018. Quantos anos entre as duas?',              xp:25  },
        { n:'022', nome:'Antoine Griezmann',pos:'Meia',     rar:'epica',    emoji:'🎭', cp:'#002395', cs:'#ED2939', col:'🇫🇷 França',    poder:'Griezmann tem 50 gols em 120 jogos. Qual o percentual de jogos em que marcou?', xp:50  },

        // ── 🇵🇹 PORTUGAL ─────────────────────────────────────────
        { n:'023', nome:'Cristiano Ronaldo', pos:'Atacante', rar:'lendaria', emoji:'🐉', cp:'#006600', cs:'#FF0000', col:'🇵🇹 Portugal',  poder:'CR7 marcou 130 gols em Copas e Europeus. Se marcar mais 10, quantos terá?',      xp:100 },
        { n:'024', nome:'Bruno Fernandes',   pos:'Meia',     rar:'epica',    emoji:'🎩', cp:'#006600', cs:'#FF0000', col:'🇵🇹 Portugal',  poder:'Bruno deu 20 assistências e marcou 15 gols. Quantas participações em gol?',      xp:50  },
        { n:'025', nome:'Bernardo Silva',    pos:'Meia',     rar:'epica',    emoji:'🔮', cp:'#006600', cs:'#FF0000', col:'🇵🇹 Portugal',  poder:'Se Portugal marcou 3 gols em cada um de 4 jogos, quantos gols no total?',        xp:50  },
        { n:'026', nome:'Rafael Leão',       pos:'Atacante', rar:'rara',     emoji:'⚡', cp:'#006600', cs:'#FF0000', col:'🇵🇹 Portugal',  poder:'Leão tem velocidade de 34 km/h. Em 5 segundos, quantos metros percorre?',       xp:25  },
        { n:'027', nome:'Rúben Dias',        pos:'Zagueiro', rar:'rara',     emoji:'🏰', cp:'#006600', cs:'#FF0000', col:'🇵🇹 Portugal',  poder:'Portugal sofreu 2 gols em 8 jogos. Qual a média de gols sofridos?',             xp:25  },

        // ── 🇪🇸 ESPANHA ───────────────────────────────────────────
        { n:'028', nome:'Rodri',             pos:'Volante',  rar:'lendaria', emoji:'🧠', cp:'#c60b1e', cs:'#ffc400', col:'🇪🇸 Espanha',   poder:'Rodri ganhou a Bola de Ouro em 2024. Quantos anos depois de Iniesta (2010)?',   xp:100 },
        { n:'029', nome:'Pedri',             pos:'Meia',     rar:'epica',    emoji:'🎵', cp:'#c60b1e', cs:'#ffc400', col:'🇪🇸 Espanha',   poder:'Pedri completou 95% dos passes. De 200 passes, quantos completou?',             xp:50  },
        { n:'030', nome:'Lamine Yamal',      pos:'Ponta',    rar:'epica',    emoji:'🌟', cp:'#c60b1e', cs:'#ffc400', col:'🇪🇸 Espanha',   poder:'Yamal tem 17 anos em 2026. Em que ano nasceu?',                                 xp:50  },
        { n:'031', nome:'Álvaro Morata',     pos:'Atacante', rar:'rara',     emoji:'🦅', cp:'#c60b1e', cs:'#ffc400', col:'🇪🇸 Espanha',   poder:'Morata marcou em 40% dos jogos. Em 15 jogos, em quantos marcou?',              xp:25  },
        { n:'032', nome:'Dani Carvajal',     pos:'Lateral',  rar:'rara',     emoji:'⚙️', cp:'#c60b1e', cs:'#ffc400', col:'🇪🇸 Espanha',   poder:'A Espanha ganhou a Euro 2024. Quantos anos após a Copa de 2010?',              xp:25  },

        // ── 🏴󠁧󠁢󠁥󠁮󠁧󠁿 INGLATERRA ──────────────────────────────────────
        { n:'033', nome:'Jude Bellingham', pos:'Meia',     rar:'epica',    emoji:'👑', cp:'#cf081f', cs:'#FFFFFF', col:'🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', poder:'Bellingham marcou 23 gols em 32 jogos pelo Real Madrid. Qual a média?',          xp:50  },
        { n:'034', nome:'Harry Kane',      pos:'Atacante', rar:'epica',    emoji:'🎯', cp:'#cf081f', cs:'#FFFFFF', col:'🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', poder:'Kane marcou 63 gols em 90 jogos pela seleção. Qual a média?',                   xp:50  },
        { n:'035', nome:'Bukayo Saka',     pos:'Ponta',    rar:'rara',     emoji:'🔱', cp:'#cf081f', cs:'#FFFFFF', col:'🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', poder:'Saka tem 22 anos. Daqui a 8 anos terá quantos?',                                 xp:25  },
        { n:'036', nome:'Phil Foden',      pos:'Meia',     rar:'rara',     emoji:'🌊', cp:'#cf081f', cs:'#FFFFFF', col:'🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', poder:'Se o time fez 18 gols em 6 jogos, qual a média por jogo?',                    xp:25  },
        { n:'037', nome:'Declan Rice',     pos:'Volante',  rar:'rara',     emoji:'🏰', cp:'#cf081f', cs:'#FFFFFF', col:'🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', poder:'Rice disputou 72 duelos e venceu 45. Qual o percentual de duelos vencidos?',  xp:25  },

        // ── 🇩🇪 ALEMANHA ─────────────────────────────────────────
        { n:'038', nome:'Toni Kroos',        pos:'Meia',     rar:'epica',    emoji:'⚙️', cp:'#DD0000', cs:'#FFCC00', col:'🇩🇪 Alemanha',  poder:'Kroos completa 94% dos passes. De 150 passes, quantos completa?',              xp:50  },
        { n:'039', nome:'Florian Wirtz',     pos:'Meia',     rar:'epica',    emoji:'🌟', cp:'#DD0000', cs:'#FFCC00', col:'🇩🇪 Alemanha',  poder:'Wirtz tem 22 anos. Qual será sua idade na Copa de 2030?',                       xp:50  },
        { n:'040', nome:'Thomas Müller',     pos:'Meia',     rar:'rara',     emoji:'🦊', cp:'#DD0000', cs:'#FFCC00', col:'🇩🇪 Alemanha',  poder:'Müller fez 10 gols em 2 Copas. Qual a média por Copa?',                        xp:25  },
        { n:'041', nome:'Manuel Neuer',      pos:'Goleiro',  rar:'rara',     emoji:'🧤', cp:'#DD0000', cs:'#FFCC00', col:'🇩🇪 Alemanha',  poder:'Neuer jogou 4 Copas. Se cada Copa tem 7 jogos, quantos jogos disputou?',      xp:25  },
        { n:'042', nome:'İlkay Gündoğan',   pos:'Meia',     rar:'rara',     emoji:'🎯', cp:'#DD0000', cs:'#FFCC00', col:'🇩🇪 Alemanha',  poder:'A Alemanha ganhou 4 Copas. Quantos títulos terá se vencer mais 1?',           xp:25  },

        // ── 🌟 ESPECIAIS ──────────────────────────────────────────
        { n:'043', nome:'Erling Haaland',   pos:'Atacante', rar:'epica',    emoji:'🚀', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'Haaland marcou 52 gols em 50 jogos. Quantos a mais que o número de jogos?',   xp:50  },
        { n:'044', nome:'Kevin De Bruyne',  pos:'Meia',     rar:'epica',    emoji:'🎨', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'De Bruyne deu 200 assistências na carreira. Quantas daqui a 50 mais?',         xp:50  },
        { n:'045', nome:'Robert Lewandowski',pos:'Atacante',rar:'epica',    emoji:'🦅', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'Lewandowski marcou 76 gols em Liga dos Campeões. Quantos com mais 24?',       xp:50  },
        { n:'046', nome:'Mohamed Salah',    pos:'Atacante', rar:'epica',    emoji:'⚡', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'Salah corre 100m em 10 segundos. Qual a velocidade em m/s?',                  xp:50  },
        { n:'047', nome:'Son Heung-min',    pos:'Atacante', rar:'rara',     emoji:'🌺', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'Son marcou 15 gols em 30 jogos na temporada. Qual a média por jogo?',         xp:25  },
        { n:'048', nome:'Lautaro Martínez', pos:'Atacante', rar:'epica',    emoji:'🐂', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'Martínez marcou 3 gols num jogo que durou 90 minutos. Um gol a cada quantos minutos?', xp:50 },
        { n:'049', nome:'Taça da Copa 2026',pos:'Troféu',   rar:'lendaria', emoji:'🏆', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'A Copa 2026 terá 48 seleções. Quantas a mais que em 2022 que teve 32?',      xp:200 },
        { n:'050', nome:'Bola de Ouro 2026',pos:'Prêmio',   rar:'lendaria', emoji:'⭐', cp:'#f5a623', cs:'#e08000', col:'🌟 Especiais',  poder:'O jogador que ganhou a Bola de Ouro recebe troféu de 24 quilates. Se pesa 450g, quantos gramas de ouro tem?', xp:200 },
      ];

      for (const f of figs) {
        const cid = colIds[f.col] || null;
        const pos = f.pos.replace(/'/g, "''");
        const poder = f.poder.replace(/'/g, "''");
        const nome = f.nome.replace(/'/g, "''");
        await db.exec(
          `INSERT INTO album_figurinhas
             (escola_id, numero, nome, colecao_id, classe, raridade, poder,
              historia, curiosidade, xp_bonus, icone_emoji, cor_primaria, cor_secundaria)
           VALUES (${adminId.id}, '${f.n}', '${nome}', ${cid},
                   '${pos}', '${f.rar}', '${poder}',
                   '', '', ${f.xp}, '${f.emoji}', '${f.cp}', '${f.cs}')
           ON CONFLICT DO NOTHING`
        );
      }
      console.log('Álbum Copa do Mundo 2026: 50 jogadores inseridos.');
    }
  }

  console.log('Banco PostgreSQL inicializado');
  initialized = true;
}

module.exports = { initDatabase };
