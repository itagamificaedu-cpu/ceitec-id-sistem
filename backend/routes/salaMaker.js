// ============================================================
// SALA MAKER — Rotas da API (Node.js / Express)
// Módulo opcional da plataforma ITA Tecnologia Educacional.
// Todas as rotas exigem autenticação JWT e isolam dados por escola_id.
// ============================================================

const express = require('express');
const db      = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar); // todas as rotas exigem token válido

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Retorna true se o usuário é admin da escola */
const isAdmin = (req) => req.usuario.perfil === 'admin';

/** Retorna true se o usuário é professor */
const isProfessor = (req) => req.usuario.perfil === 'professor';

/** Lança 403 se não for admin */
function exigeAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ erro: 'Apenas administradores podem executar esta ação.' });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// CONFIGURAÇÃO DA SALA MAKER
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/config
 * Retorna a configuração da Sala Maker da escola.
 * Se não existir, retorna { ativa: false }.
 */
router.get('/config', async (req, res) => {
  try {
    const config = await db.get(
      'SELECT * FROM sala_maker_config WHERE escola_id = ?',
      [req.usuario.escola_id]
    );
    res.json(config || { ativa: false, escola_id: req.usuario.escola_id });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PUT /api/sala-maker/config
 * Cria ou atualiza a configuração da Sala Maker.
 * Apenas admin pode alterar.
 */
router.put('/config', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const { ativa, nome_sala, descricao, responsavel, capacidade, regulamento } = req.body;

    const existente = await db.get(
      'SELECT id FROM sala_maker_config WHERE escola_id = ?', [eid]
    );

    if (existente) {
      await db.run(
        `UPDATE sala_maker_config SET
          ativa = ?, nome_sala = ?, descricao = ?,
          responsavel = ?, capacidade = ?, regulamento = ?,
          atualizado_em = NOW()
         WHERE escola_id = ?`,
        [ativa ?? 1, nome_sala || 'Sala Maker', descricao, responsavel, capacidade || 30, regulamento, eid]
      );
    } else {
      await db.run(
        `INSERT INTO sala_maker_config
          (escola_id, ativa, nome_sala, descricao, responsavel, capacidade, regulamento)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eid, ativa ?? 1, nome_sala || 'Sala Maker', descricao, responsavel, capacidade || 30, regulamento]
      );
    }

    const config = await db.get(
      'SELECT * FROM sala_maker_config WHERE escola_id = ?', [eid]
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// PAINEL GERAL — RESUMO / DASHBOARD
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/painel
 * Retorna os dados de resumo do painel da Sala Maker.
 */
router.get('/painel', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;

    // Total de inscrições aprovadas por tipo
    const inscricoes = await db.all(
      `SELECT tipo_inscrito, COUNT(*) as total
       FROM sala_maker_inscricoes
       WHERE escola_id = ? AND status = 'aprovada'
       GROUP BY tipo_inscrito`,
      [eid]
    );

    const totalAlunos     = inscricoes.find(i => i.tipo_inscrito === 'aluno')?.total     || 0;
    const totalProfessores= inscricoes.find(i => i.tipo_inscrito === 'professor')?.total || 0;

    // Agendamentos da semana atual
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    const agendamentosSemana = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_agendamentos
       WHERE escola_id = ? AND status = 'aprovado'
         AND data_agendamento BETWEEN ? AND ?`,
      [eid,
       inicioSemana.toISOString().split('T')[0],
       fimSemana.toISOString().split('T')[0]]
    );

    // Agendamentos pendentes de aprovação
    const pendentesAgendamentos = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_agendamentos
       WHERE escola_id = ? AND status = 'pendente'`,
      [eid]
    );

    // Inscrições pendentes
    const pendentesInscricoes = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_inscricoes
       WHERE escola_id = ? AND status = 'pendente'`,
      [eid]
    );

    // Atividades em andamento
    const atividadesAndamento = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_atividades
       WHERE escola_id = ? AND status = 'em_andamento'`,
      [eid]
    );

    // Equipamentos disponíveis
    const equipamentosDisponiveis = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_equipamentos
       WHERE escola_id = ? AND status = 'disponivel'`,
      [eid]
    );

    // Equipamentos em manutenção
    const equipamentosManutencao = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_equipamentos
       WHERE escola_id = ? AND status = 'manutencao'`,
      [eid]
    );

    // Calendário semanal — agendamentos da semana com detalhes
    const calendarioSemana = await db.all(
      `SELECT id, responsavel_nome, nome_projeto, data_agendamento,
              hora_inicio, hora_fim, status, num_participantes
       FROM sala_maker_agendamentos
       WHERE escola_id = ? AND data_agendamento BETWEEN ? AND ?
       ORDER BY data_agendamento, hora_inicio`,
      [eid,
       inicioSemana.toISOString().split('T')[0],
       fimSemana.toISOString().split('T')[0]]
    );

    res.json({
      total_alunos: Number(totalAlunos),
      total_professores: Number(totalProfessores),
      agendamentos_semana: Number(agendamentosSemana?.total || 0),
      atividades_andamento: Number(atividadesAndamento?.total || 0),
      equipamentos_disponiveis: Number(equipamentosDisponiveis?.total || 0),
      equipamentos_manutencao: Number(equipamentosManutencao?.total || 0),
      pendentes_agendamentos: Number(pendentesAgendamentos?.total || 0),
      pendentes_inscricoes: Number(pendentesInscricoes?.total || 0),
      calendario_semana: calendarioSemana,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// INSCRIÇÕES
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/inscricoes
 * Lista inscrições da escola. Admin vê todas; professor vê apenas a sua.
 */
router.get('/inscricoes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { status, tipo } = req.query;

    let sql = `SELECT * FROM sala_maker_inscricoes WHERE escola_id = ?`;
    const params = [eid];

    // Professor vê apenas a própria inscrição
    if (isProfessor(req)) {
      sql += ' AND usuario_id = ?';
      params.push(req.usuario.id);
    }

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (tipo)   { sql += ' AND tipo_inscrito = ?'; params.push(tipo); }

    sql += ' ORDER BY criado_em DESC';
    const inscricoes = await db.all(sql, params);

    // Parsear JSON armazenados como texto
    res.json(inscricoes.map(i => ({
      ...i,
      competencias_json: safeParse(i.competencias_json, []),
    })));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/inscricoes
 * Cria uma nova inscrição (professor ou aluno).
 */
router.post('/inscricoes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const {
      tipo_inscrito, nome, email, turma_id, turma_nome, disciplina,
      modalidade, nome_equipe, area_interesse, tipo_uso, descricao_projeto,
      tem_experiencia, descricao_experiencia, competencias_json, aceite_regulamento,
    } = req.body;

    // Validações obrigatórias
    if (!nome)               return res.status(400).json({ erro: 'Nome é obrigatório.' });
    if (!aceite_regulamento) return res.status(400).json({ erro: 'É necessário aceitar o regulamento.' });

    // Verificar se já tem inscrição ativa para este usuário
    const existente = await db.get(
      `SELECT id FROM sala_maker_inscricoes
       WHERE escola_id = ? AND usuario_id = ? AND status != 'recusada'`,
      [eid, req.usuario.id]
    );
    if (existente) {
      return res.status(409).json({ erro: 'Você já possui uma inscrição na Sala Maker.' });
    }

    const result = await db.run(
      `INSERT INTO sala_maker_inscricoes
        (escola_id, usuario_id, tipo_inscrito, nome, email, turma_id, turma_nome,
         disciplina, modalidade, nome_equipe, area_interesse, tipo_uso,
         descricao_projeto, tem_experiencia, descricao_experiencia,
         competencias_json, aceite_regulamento, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
      [
        eid, req.usuario.id,
        tipo_inscrito || 'professor', nome, email || req.usuario.email,
        turma_id || null, turma_nome || null, disciplina || null,
        modalidade || null, nome_equipe || null, area_interesse || null,
        tipo_uso || null, descricao_projeto || null,
        tem_experiencia ? 1 : 0, descricao_experiencia || null,
        JSON.stringify(competencias_json || []), 1,
      ]
    );

    const inscricao = await db.get(
      'SELECT * FROM sala_maker_inscricoes WHERE id = ?', [result.lastInsertRowid]
    );
    res.status(201).json(inscricao);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PATCH /api/sala-maker/inscricoes/:id/status
 * Admin aprova ou recusa uma inscrição.
 */
router.patch('/inscricoes/:id/status', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const { status, justificativa_recusa } = req.body;

    if (!['aprovada', 'recusada'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido. Use: aprovada ou recusada.' });
    }

    // Garantir que a inscrição pertence à escola
    const inscricao = await db.get(
      'SELECT id FROM sala_maker_inscricoes WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!inscricao) return res.status(404).json({ erro: 'Inscrição não encontrada.' });

    await db.run(
      `UPDATE sala_maker_inscricoes
       SET status = ?, justificativa_recusa = ?, aprovado_por = ?, aprovado_em = NOW()
       WHERE id = ?`,
      [status, justificativa_recusa || null, req.usuario.id, req.params.id]
    );

    res.json({ mensagem: `Inscrição ${status} com sucesso.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// AGENDAMENTOS
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/agendamentos
 * Lista agendamentos. Admin vê todos; professor vê apenas os seus.
 */
router.get('/agendamentos', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { status, data_inicio, data_fim } = req.query;

    let sql = `SELECT * FROM sala_maker_agendamentos WHERE escola_id = ?`;
    const params = [eid];

    if (isProfessor(req)) {
      sql += ' AND responsavel_id = ?';
      params.push(req.usuario.id);
    }
    if (status)      { sql += ' AND status = ?'; params.push(status); }
    if (data_inicio) { sql += ' AND data_agendamento >= ?'; params.push(data_inicio); }
    if (data_fim)    { sql += ' AND data_agendamento <= ?'; params.push(data_fim); }

    sql += ' ORDER BY data_agendamento DESC, hora_inicio';
    const agendamentos = await db.all(sql, params);

    res.json(agendamentos.map(a => ({
      ...a,
      materiais_json:    safeParse(a.materiais_json, []),
      equipamentos_json: safeParse(a.equipamentos_json, []),
      disciplinas_json:  safeParse(a.disciplinas_json, []),
    })));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/agendamentos
 * Cria um novo agendamento.
 * Regras: mín. 48h de antecedência, 1 por professor por dia, sem sobreposição.
 */
router.post('/agendamentos', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const {
      data_agendamento, hora_inicio, hora_fim, nome_projeto,
      descricao_projeto, num_participantes, materiais_json,
      equipamentos_json, disciplinas_json,
    } = req.body;

    // Validações básicas
    if (!data_agendamento || !hora_inicio || !hora_fim || !nome_projeto) {
      return res.status(400).json({ erro: 'Data, horário e nome do projeto são obrigatórios.' });
    }

    // Regra: mínimo 48h de antecedência
    const agora  = new Date();
    const dataAg = new Date(data_agendamento + 'T' + hora_inicio);
    const diffHoras = (dataAg - agora) / (1000 * 60 * 60);
    if (diffHoras < 48) {
      return res.status(400).json({ erro: 'Agendamentos devem ser feitos com pelo menos 48 horas de antecedência.' });
    }

    // Regra: 1 agendamento por professor por dia (exceto admin)
    if (isProfessor(req)) {
      const agNoDia = await db.get(
        `SELECT id FROM sala_maker_agendamentos
         WHERE escola_id = ? AND responsavel_id = ? AND data_agendamento = ?
           AND status != 'cancelado' AND status != 'recusado'`,
        [eid, req.usuario.id, data_agendamento]
      );
      if (agNoDia) {
        return res.status(409).json({ erro: 'Você já possui um agendamento nesta data.' });
      }
    }

    // Regra: verificar sobreposição de horário na mesma data
    const sobreposto = await db.all(
      `SELECT id FROM sala_maker_agendamentos
       WHERE escola_id = ? AND data_agendamento = ?
         AND status IN ('aprovado', 'pendente')
         AND NOT (hora_fim <= ? OR hora_inicio >= ?)`,
      [eid, data_agendamento, hora_inicio, hora_fim]
    );
    if (sobreposto.length > 0) {
      return res.status(409).json({ erro: 'Já existe um agendamento neste horário. Escolha outro horário.' });
    }

    const result = await db.run(
      `INSERT INTO sala_maker_agendamentos
        (escola_id, responsavel_id, responsavel_nome, data_agendamento,
         hora_inicio, hora_fim, nome_projeto, descricao_projeto,
         num_participantes, materiais_json, equipamentos_json,
         disciplinas_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
      [
        eid, req.usuario.id, req.usuario.nome, data_agendamento,
        hora_inicio, hora_fim, nome_projeto, descricao_projeto || null,
        num_participantes || 1,
        JSON.stringify(materiais_json   || []),
        JSON.stringify(equipamentos_json|| []),
        JSON.stringify(disciplinas_json || []),
      ]
    );

    const agendamento = await db.get(
      'SELECT * FROM sala_maker_agendamentos WHERE id = ?', [result.lastInsertRowid]
    );
    res.status(201).json(agendamento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PATCH /api/sala-maker/agendamentos/:id/status
 * Admin aprova, recusa ou cancela um agendamento.
 */
router.patch('/agendamentos/:id/status', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { status, justificativa_recusa } = req.body;
    const statusValidos = ['aprovado', 'recusado', 'cancelado', 'concluido'];

    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${statusValidos.join(', ')}.` });
    }

    // Admin aprova/recusa; professor pode apenas cancelar o próprio
    const agendamento = await db.get(
      'SELECT * FROM sala_maker_agendamentos WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    if (!isAdmin(req)) {
      if (agendamento.responsavel_id !== req.usuario.id) {
        return res.status(403).json({ erro: 'Sem permissão para alterar este agendamento.' });
      }
      if (status !== 'cancelado') {
        return res.status(403).json({ erro: 'Professores podem apenas cancelar os próprios agendamentos.' });
      }
    }

    await db.run(
      `UPDATE sala_maker_agendamentos
       SET status = ?, justificativa_recusa = ?, aprovado_por = ?, aprovado_em = NOW()
       WHERE id = ?`,
      [status, justificativa_recusa || null, req.usuario.id, req.params.id]
    );

    res.json({ mensagem: `Agendamento ${status} com sucesso.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/sala-maker/agendamentos/horarios-ocupados
 * Retorna horários já ocupados em uma data específica.
 */
router.get('/agendamentos/horarios-ocupados', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ erro: 'Data é obrigatória.' });

    const ocupados = await db.all(
      `SELECT hora_inicio, hora_fim, nome_projeto
       FROM sala_maker_agendamentos
       WHERE escola_id = ? AND data_agendamento = ? AND status IN ('aprovado', 'pendente')
       ORDER BY hora_inicio`,
      [req.usuario.escola_id, data]
    );
    res.json(ocupados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// ATIVIDADES E PROJETOS
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/atividades
 * Lista atividades. Admin vê todas; professor vê apenas as suas.
 */
router.get('/atividades', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { tipo, status } = req.query;

    let sql = `SELECT * FROM sala_maker_atividades WHERE escola_id = ?`;
    const params = [eid];

    if (isProfessor(req)) {
      sql += ' AND professor_id = ?';
      params.push(req.usuario.id);
    }
    if (tipo)   { sql += ' AND tipo = ?';   params.push(tipo); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY criado_em DESC';
    const atividades = await db.all(sql, params);

    res.json(atividades.map(a => ({
      ...a,
      turmas_json:           safeParse(a.turmas_json, []),
      equipes_json:          safeParse(a.equipes_json, []),
      equipamentos_usados_json: safeParse(a.equipamentos_usados_json, []),
      competencias_json:     safeParse(a.competencias_json, []),
      steam_json:            safeParse(a.steam_json, []),
      etapas_json:           safeParse(a.etapas_json, []),
      fotos_json:            safeParse(a.fotos_json, []),
      resultado_json:        safeParse(a.resultado_json, []),
    })));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/atividades
 * Cria uma nova atividade/projeto.
 */
router.post('/atividades', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const {
      tipo, titulo, descricao, turmas_json, equipes_json,
      data_realizacao, prazo_entrega, equipamentos_usados_json,
      competencias_json, steam_json, criterios_avaliacao,
      etapas_json, resultado_json, vencedor,
    } = req.body;

    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const tiposValidos = ['atividade', 'desafio', 'missao', 'prova_pratica', 'projeto_livre'];
    if (tipo && !tiposValidos.includes(tipo)) {
      return res.status(400).json({ erro: `Tipo inválido. Use: ${tiposValidos.join(', ')}.` });
    }

    const result = await db.run(
      `INSERT INTO sala_maker_atividades
        (escola_id, professor_id, professor_nome, tipo, titulo, descricao,
         turmas_json, equipes_json, data_realizacao, prazo_entrega,
         equipamentos_usados_json, competencias_json, steam_json,
         criterios_avaliacao, etapas_json, resultado_json, vencedor, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'em_andamento')`,
      [
        eid, req.usuario.id, req.usuario.nome,
        tipo || 'atividade', titulo, descricao || null,
        JSON.stringify(turmas_json  || []),
        JSON.stringify(equipes_json || []),
        data_realizacao || null, prazo_entrega || null,
        JSON.stringify(equipamentos_usados_json || []),
        JSON.stringify(competencias_json || []),
        JSON.stringify(steam_json || []),
        criterios_avaliacao || null,
        JSON.stringify(etapas_json  || []),
        JSON.stringify(resultado_json || []),
        vencedor || null,
      ]
    );

    const atividade = await db.get(
      'SELECT * FROM sala_maker_atividades WHERE id = ?', [result.lastInsertRowid]
    );
    res.status(201).json(atividade);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PUT /api/sala-maker/atividades/:id
 * Atualiza uma atividade.
 */
router.put('/atividades/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const atividade = await db.get(
      'SELECT * FROM sala_maker_atividades WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!atividade) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    // Professor só pode editar as próprias atividades
    if (isProfessor(req) && atividade.professor_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Sem permissão para editar esta atividade.' });
    }

    const {
      titulo, descricao, turmas_json, equipes_json, data_realizacao,
      prazo_entrega, equipamentos_usados_json, competencias_json, steam_json,
      criterios_avaliacao, status, etapas_json, fotos_json, resultado_json, vencedor,
    } = req.body;

    await db.run(
      `UPDATE sala_maker_atividades SET
        titulo = ?, descricao = ?, turmas_json = ?, equipes_json = ?,
        data_realizacao = ?, prazo_entrega = ?,
        equipamentos_usados_json = ?, competencias_json = ?, steam_json = ?,
        criterios_avaliacao = ?, status = ?, etapas_json = ?,
        fotos_json = ?, resultado_json = ?, vencedor = ?,
        atualizado_em = NOW()
       WHERE id = ?`,
      [
        titulo || atividade.titulo,
        descricao ?? atividade.descricao,
        JSON.stringify(turmas_json  || safeParse(atividade.turmas_json,  [])),
        JSON.stringify(equipes_json || safeParse(atividade.equipes_json, [])),
        data_realizacao  ?? atividade.data_realizacao,
        prazo_entrega    ?? atividade.prazo_entrega,
        JSON.stringify(equipamentos_usados_json || safeParse(atividade.equipamentos_usados_json, [])),
        JSON.stringify(competencias_json || safeParse(atividade.competencias_json, [])),
        JSON.stringify(steam_json || safeParse(atividade.steam_json, [])),
        criterios_avaliacao ?? atividade.criterios_avaliacao,
        status || atividade.status,
        JSON.stringify(etapas_json   || safeParse(atividade.etapas_json,   [])),
        JSON.stringify(fotos_json    || safeParse(atividade.fotos_json,    [])),
        JSON.stringify(resultado_json|| safeParse(atividade.resultado_json,[])),
        vencedor ?? atividade.vencedor,
        req.params.id,
      ]
    );

    res.json(await db.get('SELECT * FROM sala_maker_atividades WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * DELETE /api/sala-maker/atividades/:id
 * Exclui uma atividade (apenas admin ou dono da atividade).
 */
router.delete('/atividades/:id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const atividade = await db.get(
      'SELECT * FROM sala_maker_atividades WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!atividade) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    if (!isAdmin(req) && atividade.professor_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Sem permissão para excluir esta atividade.' });
    }

    await db.run('DELETE FROM sala_maker_atividades WHERE id = ?', [req.params.id]);
    res.json({ mensagem: 'Atividade excluída com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// PRESENÇA NA SALA MAKER
// ─────────────────────────────────────────────

/**
 * POST /api/sala-maker/presenca/scanner
 * Registra presença via QR Code da carteirinha digital.
 * O frontend envia { qr_code, atividade_id }.
 */
router.post('/presenca/scanner', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { qr_code, atividade_id } = req.body;

    if (!qr_code) return res.status(400).json({ erro: 'qr_code é obrigatório.' });

    // Busca aluno pelo código QR (campo 'codigo' na tabela alunos)
    const aluno = await db.get(
      'SELECT * FROM alunos WHERE codigo = ? AND ativo = 1 AND escola_id = ?',
      [qr_code, eid]
    );
    if (!aluno) {
      return res.status(404).json({ erro: 'Carteirinha não reconhecida.', tipo: 'nao_encontrado' });
    }

    const hoje = new Date().toISOString().split('T')[0];

    // Busca título da atividade se informada
    let atividadeTitulo = null;
    if (atividade_id) {
      const ativ = await db.get(
        'SELECT titulo FROM sala_maker_atividades WHERE id = ? AND escola_id = ?',
        [atividade_id, eid]
      );
      atividadeTitulo = ativ?.titulo || null;
    }

    // Evitar duplicata na mesma atividade/dia (IS NOT DISTINCT FROM trata NULL corretamente no PostgreSQL)
    const existente = await db.get(
      `SELECT id FROM sala_maker_presencas
       WHERE aluno_id = ? AND escola_id = ? AND data = ?
         AND atividade_id IS NOT DISTINCT FROM ?`,
      [aluno.id, eid, hoje, atividade_id || null]
    );
    if (existente) {
      return res.json({
        mensagem: 'Presença já registrada para esta sessão.',
        tipo: 'duplicado',
        aluno_nome: aluno.nome,
      });
    }

    await db.run(
      `INSERT INTO sala_maker_presencas
        (escola_id, aluno_id, aluno_nome, atividade_id, atividade_titulo, data, metodo)
       VALUES (?, ?, ?, ?, ?, ?, 'qr')`,
      [eid, aluno.id, aluno.nome, atividade_id || null, atividadeTitulo, hoje]
    );

    res.json({ mensagem: `Presença de ${aluno.nome} registrada!`, tipo: 'sucesso', aluno_nome: aluno.nome });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/presenca/manual
 * Registra presença manualmente a partir da lista de inscritos.
 * O frontend envia { usuario_id, atividade_id, data }.
 */
router.post('/presenca/manual', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { usuario_id, atividade_id, data } = req.body;

    if (!usuario_id) return res.status(400).json({ erro: 'usuario_id é obrigatório.' });

    // Busca o inscrito para pegar o nome
    const inscrito = await db.get(
      'SELECT * FROM sala_maker_inscricoes WHERE usuario_id = ? AND escola_id = ? AND status = \'aprovado\'',
      [usuario_id, eid]
    );
    if (!inscrito) return res.status(404).json({ erro: 'Inscrito não encontrado ou não aprovado.' });

    const dataPresenca = data || new Date().toISOString().split('T')[0];

    // Busca título da atividade
    let atividadeTitulo = null;
    if (atividade_id) {
      const ativ = await db.get(
        'SELECT titulo FROM sala_maker_atividades WHERE id = ? AND escola_id = ?',
        [atividade_id, eid]
      );
      atividadeTitulo = ativ?.titulo || null;
    }

    // Evitar duplicata (IS NOT DISTINCT FROM trata NULL corretamente no PostgreSQL)
    const existente = await db.get(
      `SELECT id FROM sala_maker_presencas
       WHERE usuario_id = ? AND escola_id = ? AND data = ?
         AND atividade_id IS NOT DISTINCT FROM ?`,
      [usuario_id, eid, dataPresenca, atividade_id || null]
    );
    if (existente) {
      return res.json({ mensagem: 'Presença já registrada.', tipo: 'duplicado' });
    }

    await db.run(
      `INSERT INTO sala_maker_presencas
        (escola_id, usuario_id, aluno_nome, atividade_id, atividade_titulo, data, metodo)
       VALUES (?, ?, ?, ?, ?, ?, 'manual')`,
      [eid, usuario_id, inscrito.nome, atividade_id || null, atividadeTitulo, dataPresenca]
    );

    res.status(201).json({ mensagem: 'Presença registrada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/sala-maker/presenca
 * Lista presenças. Filtros: atividade_id, data_inicio, data_fim.
 * Professor vê apenas as suas atividades.
 */
router.get('/presenca', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { atividade_id, data_inicio, data_fim } = req.query;

    let sql = `SELECT * FROM sala_maker_presencas WHERE escola_id = ?`;
    const params = [eid];

    // Professor vê apenas presenças das suas atividades
    if (isProfessor(req)) {
      sql += ` AND atividade_id IN (
        SELECT id FROM sala_maker_atividades WHERE professor_id = ? AND escola_id = ?
      )`;
      params.push(req.usuario.id, eid);
    }

    if (atividade_id) { sql += ' AND atividade_id = ?'; params.push(atividade_id); }
    if (data_inicio)  { sql += ' AND data >= ?';        params.push(data_inicio); }
    if (data_fim)     { sql += ' AND data <= ?';        params.push(data_fim); }

    sql += ' ORDER BY data DESC, registrado_em DESC';

    res.json(await db.all(sql, params));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// EQUIPAMENTOS
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/equipamentos
 * Lista todos os equipamentos da escola.
 */
router.get('/equipamentos', async (req, res) => {
  try {
    const equipamentos = await db.all(
      `SELECT e.*,
         (SELECT COUNT(*) FROM sala_maker_manutencoes m
          WHERE m.equipamento_id = e.id AND m.status = 'aberta') as manutencoes_abertas
       FROM sala_maker_equipamentos e
       WHERE e.escola_id = ?
       ORDER BY e.categoria, e.nome`,
      [req.usuario.escola_id]
    );
    res.json(equipamentos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/equipamentos
 * Cadastra um novo equipamento. Apenas admin.
 */
router.post('/equipamentos', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const { nome, modelo, categoria, numero_serie, quantidade, localizacao, descricao, status } = req.body;

    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    const result = await db.run(
      `INSERT INTO sala_maker_equipamentos
        (escola_id, nome, modelo, categoria, numero_serie, quantidade, localizacao, descricao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eid, nome, modelo || null, categoria || null, numero_serie || null,
       quantidade || 1, localizacao || null, descricao || null, status || 'disponivel']
    );

    res.status(201).json(
      await db.get('SELECT * FROM sala_maker_equipamentos WHERE id = ?', [result.lastInsertRowid])
    );
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PUT /api/sala-maker/equipamentos/:id
 * Atualiza dados de um equipamento. Apenas admin.
 */
router.put('/equipamentos/:id', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const equip = await db.get(
      'SELECT * FROM sala_maker_equipamentos WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!equip) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

    const { nome, modelo, categoria, numero_serie, quantidade, localizacao, descricao, status } = req.body;

    await db.run(
      `UPDATE sala_maker_equipamentos
       SET nome = ?, modelo = ?, categoria = ?, numero_serie = ?,
           quantidade = ?, localizacao = ?, descricao = ?, status = ?, atualizado_em = NOW()
       WHERE id = ?`,
      [
        nome          || equip.nome,
        modelo        ?? equip.modelo,
        categoria     ?? equip.categoria,
        numero_serie  ?? equip.numero_serie,
        quantidade    ?? equip.quantidade,
        localizacao   ?? equip.localizacao,
        descricao     ?? equip.descricao,
        status        || equip.status,
        req.params.id,
      ]
    );

    res.json(
      await db.get('SELECT * FROM sala_maker_equipamentos WHERE id = ?', [req.params.id])
    );
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * DELETE /api/sala-maker/equipamentos/:id
 * Remove um equipamento. Apenas admin.
 */
router.delete('/equipamentos/:id', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const equip = await db.get(
      'SELECT id FROM sala_maker_equipamentos WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!equip) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

    await db.run('DELETE FROM sala_maker_manutencoes WHERE equipamento_id = ?', [req.params.id]);
    await db.run('DELETE FROM sala_maker_equipamentos WHERE id = ?', [req.params.id]);

    res.json({ mensagem: 'Equipamento excluído.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// MANUTENÇÕES
// ─────────────────────────────────────────────

/**
 * GET /api/sala-maker/manutencoes
 * Lista manutenções da escola com nome do equipamento.
 */
router.get('/manutencoes', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const manutencoes = await db.all(
      `SELECT m.*, e.nome as equipamento_nome, e.categoria as equipamento_tipo
       FROM sala_maker_manutencoes m
       JOIN sala_maker_equipamentos e ON m.equipamento_id = e.id
       WHERE m.escola_id = ?
       ORDER BY m.aberta_em DESC`,
      [eid]
    );
    res.json(manutencoes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/sala-maker/manutencoes
 * Registra uma nova manutenção. Apenas admin.
 * Atualiza automaticamente o status do equipamento para 'manutencao'.
 */
router.post('/manutencoes', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const { equipamento_id, tipo_manutencao, descricao_problema, tecnico_responsavel, custo_estimado, observacoes } = req.body;

    if (!equipamento_id || !descricao_problema) {
      return res.status(400).json({ erro: 'equipamento_id e descricao_problema são obrigatórios.' });
    }

    // Verificar que o equipamento pertence à escola
    const equip = await db.get(
      'SELECT id FROM sala_maker_equipamentos WHERE id = ? AND escola_id = ?',
      [equipamento_id, eid]
    );
    if (!equip) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

    // Colocar equipamento em manutenção
    await db.run(
      `UPDATE sala_maker_equipamentos SET status = 'manutencao', atualizado_em = NOW() WHERE id = ?`,
      [equipamento_id]
    );

    const result = await db.run(
      `INSERT INTO sala_maker_manutencoes
        (escola_id, equipamento_id, tipo_manutencao, descricao_problema,
         tecnico_responsavel, custo_estimado, observacoes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'aberta')`,
      [eid, equipamento_id, tipo_manutencao || 'corretiva', descricao_problema,
       tecnico_responsavel || null, custo_estimado || null, observacoes || null]
    );

    res.status(201).json(
      await db.get('SELECT * FROM sala_maker_manutencoes WHERE id = ?', [result.lastInsertRowid])
    );
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PATCH /api/sala-maker/manutencoes/:id/concluir
 * Conclui uma manutenção e libera o equipamento. Apenas admin.
 */
router.patch('/manutencoes/:id/concluir', async (req, res) => {
  if (!exigeAdmin(req, res)) return;
  try {
    const eid = req.usuario.escola_id;
    const manutencao = await db.get(
      'SELECT * FROM sala_maker_manutencoes WHERE id = ? AND escola_id = ?',
      [req.params.id, eid]
    );
    if (!manutencao) return res.status(404).json({ erro: 'Manutenção não encontrada.' });
    if (manutencao.status === 'concluida') {
      return res.status(400).json({ erro: 'Manutenção já concluída.' });
    }

    const { observacao_conclusao } = req.body;

    await db.run(
      `UPDATE sala_maker_manutencoes
       SET status = 'concluida', concluida_em = NOW(),
           observacao_conclusao = COALESCE(?, observacao_conclusao)
       WHERE id = ?`,
      [observacao_conclusao || null, req.params.id]
    );

    // Liberar o equipamento se não houver outras manutenções abertas
    const outras = await db.get(
      `SELECT COUNT(*) as total FROM sala_maker_manutencoes
       WHERE equipamento_id = ? AND status = 'aberta' AND id != ?`,
      [manutencao.equipamento_id, req.params.id]
    );

    if (Number(outras?.total || 0) === 0) {
      await db.run(
        `UPDATE sala_maker_equipamentos SET status = 'disponivel', atualizado_em = NOW() WHERE id = ?`,
        [manutencao.equipamento_id]
      );
    }

    res.json({ mensagem: 'Manutenção concluída. Equipamento liberado.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ─────────────────────────────────────────────
// UTILITÁRIO
// ─────────────────────────────────────────────

/** Parseia JSON com fallback seguro */
function safeParse(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

module.exports = router;
