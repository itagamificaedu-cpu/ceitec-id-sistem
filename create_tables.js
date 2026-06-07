const db = require('./db');
(async () => {
  try {
    await db.exec(
      'CREATE TABLE IF NOT EXISTS atividade_presencial_ativa (' +
      '  id SERIAL PRIMARY KEY,' +
      '  escola_id INTEGER NOT NULL,' +
      '  turma_id INTEGER NOT NULL,' +
      '  tipo TEXT NOT NULL,' +
      '  referencia_id INTEGER NOT NULL,' +
      '  referencia_titulo TEXT NOT NULL DEFAULT \'\',' +
      '  codigo_acesso TEXT,' +
      '  status TEXT NOT NULL DEFAULT \'em_andamento\',' +
      '  iniciada_em TIMESTAMP DEFAULT NOW(),' +
      '  encerrada_em TIMESTAMP' +
      ')'
    );
    console.log('OK: atividade_presencial_ativa');
    await db.exec(
      'CREATE TABLE IF NOT EXISTS cabo_guerra_partidas (' +
      '  id SERIAL PRIMARY KEY,' +
      '  escola_id INTEGER NOT NULL,' +
      '  turma_id INTEGER NOT NULL,' +
      '  professor_id INTEGER NOT NULL,' +
      '  titulo TEXT NOT NULL,' +
      '  disciplina TEXT DEFAULT \'\',' +
      '  time1_nome TEXT NOT NULL DEFAULT \'Time 1\',' +
      '  time2_nome TEXT NOT NULL DEFAULT \'Time 2\',' +
      '  questoes_json TEXT NOT NULL DEFAULT \'[]\',' +
      '  status TEXT NOT NULL DEFAULT \'rascunho\',' +
      '  posicao_corda INTEGER NOT NULL DEFAULT 0,' +
      '  limite_vitoria INTEGER NOT NULL DEFAULT 5,' +
      '  codigo_sala TEXT UNIQUE,' +
      '  pergunta_atual_index INTEGER NOT NULL DEFAULT -1,' +
      '  pergunta_liberada INTEGER NOT NULL DEFAULT 0,' +
      '  pergunta_liberada_em TIMESTAMP,' +
      '  tempo_por_pergunta INTEGER NOT NULL DEFAULT 30,' +
      '  time1_pontos INTEGER NOT NULL DEFAULT 0,' +
      '  time2_pontos INTEGER NOT NULL DEFAULT 0,' +
      '  vencedor TEXT,' +
      '  criado_em TIMESTAMP DEFAULT NOW(),' +
      '  iniciado_em TIMESTAMP,' +
      '  finalizado_em TIMESTAMP' +
      ')'
    );
    console.log('OK: cabo_guerra_partidas');
    await db.exec(
      'CREATE TABLE IF NOT EXISTS cabo_guerra_participantes (' +
      '  id SERIAL PRIMARY KEY,' +
      '  partida_id INTEGER NOT NULL,' +
      '  aluno_codigo TEXT NOT NULL,' +
      '  aluno_nome TEXT NOT NULL,' +
      '  time_numero INTEGER NOT NULL,' +
      '  entrou_em TIMESTAMP DEFAULT NOW(),' +
      '  UNIQUE(partida_id, aluno_codigo)' +
      ')'
    );
    console.log('OK: cabo_guerra_participantes');
    await db.exec(
      'CREATE TABLE IF NOT EXISTS cabo_guerra_respostas (' +
      '  id SERIAL PRIMARY KEY,' +
      '  partida_id INTEGER NOT NULL,' +
      '  aluno_codigo TEXT NOT NULL,' +
      '  aluno_nome TEXT NOT NULL,' +
      '  time_numero INTEGER NOT NULL,' +
      '  pergunta_index INTEGER NOT NULL,' +
      '  resposta_dada INTEGER NOT NULL,' +
      '  correta INTEGER NOT NULL DEFAULT 0,' +
      '  respondido_em TIMESTAMP DEFAULT NOW()' +
      ')'
    );
    console.log('OK: cabo_guerra_respostas');
    console.log('TODAS AS TABELAS OK!');
    process.exit(0);
  } catch(e) {
    console.error('ERRO:', e.message);
    process.exit(1);
  }
})();
