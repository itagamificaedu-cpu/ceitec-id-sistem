/**
 * Cabo de Guerra — controle 100% pelo professor, aluno apenas reativo
 * Professor cria, inicia, controla ritmo e encerra
 * Aluno só acessa quando partida está em_andamento
 */

const express = require('express');
const db = require('../db');
const { autenticar } = require('../middleware/auth');
const { autenticarAluno } = require('./aluno');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

// Gera código de sala único (6 caracteres)
async function gerarCodigoSala() {
  let codigo;
  let tentativas = 0;
  do {
    codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existe = await db.get('SELECT id FROM cabo_guerra_partidas WHERE codigo_sala = ?', [codigo]);
    if (!existe) break;
    tentativas++;
  } while (tentativas < 10);
  return codigo;
}

// Calcula pontuação por time para uma pergunta específica
async function calcularPlacarPergunta(partidaId, perguntaIndex) {
  const respostas = await db.all(
    `SELECT time_numero, SUM(correta) AS acertos, COUNT(*) AS total
     FROM cabo_guerra_respostas
     WHERE partida_id = ? AND pergunta_index = ?
     GROUP BY time_numero`,
    [partidaId, perguntaIndex]
  );
  let time1_acertos = 0, time2_acertos = 0;
  for (const r of respostas) {
    if (r.time_numero === 1) time1_acertos = parseInt(r.acertos) || 0;
    if (r.time_numero === 2) time2_acertos = parseInt(r.acertos) || 0;
  }
  return { time1_acertos, time2_acertos };
}

// Encerra atividade ativa no banco central
async function encerrarAtividadeAtiva(turmaId) {
  await db.run(
    `UPDATE atividade_presencial_ativa
     SET status = 'finalizado', encerrada_em = NOW()
     WHERE turma_id = ? AND status = 'em_andamento'`,
    [turmaId]
  );
}

// ── Rotas públicas (sem autenticação) — projetor ─────────────────────────────

// GET /api/cabo-guerra/estado/:id — estado atual da partida (polling do projetor)
router.get('/estado/:id', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ?',
      [req.params.id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });

    const questoes = JSON.parse(partida.questoes_json || '[]');
    const questao_atual = partida.pergunta_atual_index >= 0
      ? questoes[partida.pergunta_atual_index] || null
      : null;

    // Conta participantes por time
    const participantes = await db.all(
      `SELECT time_numero, COUNT(*) AS total
       FROM cabo_guerra_participantes WHERE partida_id = ? GROUP BY time_numero`,
      [partida.id]
    );
    const time1_participantes = participantes.find(p => p.time_numero === 1)?.total || 0;
    const time2_participantes = participantes.find(p => p.time_numero === 2)?.total || 0;

    // Contagem de respostas para a pergunta atual
    let respostas_recebidas = 0;
    if (partida.pergunta_liberada && partida.pergunta_atual_index >= 0) {
      const r = await db.get(
        `SELECT COUNT(*) AS total FROM cabo_guerra_respostas
         WHERE partida_id = ? AND pergunta_index = ?`,
        [partida.id, partida.pergunta_atual_index]
      );
      respostas_recebidas = parseInt(r?.total) || 0;
    }

    res.json({
      id: partida.id,
      titulo: partida.titulo,
      status: partida.status,
      time1_nome: partida.time1_nome,
      time2_nome: partida.time2_nome,
      posicao_corda: partida.posicao_corda,
      limite_vitoria: partida.limite_vitoria,
      time1_pontos: partida.time1_pontos,
      time2_pontos: partida.time2_pontos,
      pergunta_atual_index: partida.pergunta_atual_index,
      pergunta_liberada: !!partida.pergunta_liberada,
      pergunta_liberada_em: partida.pergunta_liberada_em,
      tempo_por_pergunta: partida.tempo_por_pergunta,
      total_perguntas: questoes.length,
      vencedor: partida.vencedor,
      time1_participantes: parseInt(time1_participantes),
      time2_participantes: parseInt(time2_participantes),
      respostas_recebidas,
      // Envia texto e alternativas (sem resposta correta) se liberada
      questao_atual: questao_atual && partida.pergunta_liberada ? {
        texto: questao_atual.texto,
        alternativas: [questao_atual.alt_a, questao_atual.alt_b, questao_atual.alt_c, questao_atual.alt_d].filter(Boolean),
      } : null,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── Rotas autenticadas — Professor ───────────────────────────────────────────

router.use(autenticar);

// GET /api/cabo-guerra — lista partidas da escola do professor
router.get('/', async (req, res) => {
  try {
    const partidas = await db.all(
      `SELECT p.*, t.nome AS turma_nome
       FROM cabo_guerra_partidas p
       LEFT JOIN turmas t ON p.turma_id = t.id
       WHERE p.escola_id = ?
       ORDER BY p.criado_em DESC`,
      [req.usuario.escola_id]
    );
    res.json(partidas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/cabo-guerra/:id — detalhe da partida
router.get('/:id', async (req, res) => {
  try {
    const partida = await db.get(
      `SELECT p.*, t.nome AS turma_nome
       FROM cabo_guerra_partidas p
       LEFT JOIN turmas t ON p.turma_id = t.id
       WHERE p.id = ? AND p.escola_id = ?`,
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });

    const respostas = await db.all(
      `SELECT pergunta_index, time_numero, COUNT(*) AS total, SUM(correta) AS acertos
       FROM cabo_guerra_respostas WHERE partida_id = ?
       GROUP BY pergunta_index, time_numero`,
      [partida.id]
    );

    res.json({ ...partida, respostas });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra — cria nova partida (status rascunho)
router.post('/', async (req, res) => {
  try {
    const {
      titulo, turma_id, disciplina,
      time1_nome, time2_nome,
      questoes, limite_vitoria, tempo_por_pergunta,
    } = req.body;

    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório' });
    if (!turma_id) return res.status(400).json({ erro: 'Turma é obrigatória' });
    if (!questoes || questoes.length === 0) return res.status(400).json({ erro: 'Adicione ao menos uma questão' });

    const codigo_sala = await gerarCodigoSala();

    const result = await db.run(
      `INSERT INTO cabo_guerra_partidas
       (escola_id, turma_id, professor_id, titulo, disciplina,
        time1_nome, time2_nome, questoes_json, limite_vitoria,
        tempo_por_pergunta, codigo_sala, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.usuario.escola_id,
        turma_id,
        req.usuario.id,
        titulo,
        disciplina || '',
        time1_nome || 'Time 1',
        time2_nome || 'Time 2',
        JSON.stringify(questoes),
        limite_vitoria || 5,
        tempo_por_pergunta || 30,
        codigo_sala,
        'rascunho',
      ]
    );

    const partida = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(partida);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/cabo-guerra/:id — atualiza partida (só se rascunho)
router.put('/:id', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status === 'em_andamento') {
      return res.status(400).json({ erro: 'Não é possível editar uma partida em andamento' });
    }

    const {
      titulo, turma_id, disciplina,
      time1_nome, time2_nome,
      questoes, limite_vitoria, tempo_por_pergunta,
    } = req.body;

    await db.run(
      `UPDATE cabo_guerra_partidas SET
       titulo=?, turma_id=?, disciplina=?, time1_nome=?, time2_nome=?,
       questoes_json=?, limite_vitoria=?, tempo_por_pergunta=?
       WHERE id=? AND escola_id=?`,
      [
        titulo || partida.titulo,
        turma_id || partida.turma_id,
        disciplina ?? partida.disciplina,
        time1_nome || partida.time1_nome,
        time2_nome || partida.time2_nome,
        questoes ? JSON.stringify(questoes) : partida.questoes_json,
        limite_vitoria ?? partida.limite_vitoria,
        tempo_por_pergunta ?? partida.tempo_por_pergunta,
        req.params.id,
        req.usuario.escola_id,
      ]
    );

    const atualizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [req.params.id]);
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/cabo-guerra/:id — exclui partida
router.delete('/:id', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status === 'em_andamento') {
      return res.status(400).json({ erro: 'Encerre a partida antes de excluir' });
    }

    await db.run('DELETE FROM cabo_guerra_respostas WHERE partida_id = ?', [req.params.id]);
    await db.run('DELETE FROM cabo_guerra_participantes WHERE partida_id = ?', [req.params.id]);
    await db.run('DELETE FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?', [req.params.id, req.usuario.escola_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra/:id/iniciar — professor inicia a partida
router.post('/:id/iniciar', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status === 'em_andamento') return res.status(400).json({ erro: 'Partida já em andamento' });
    if (partida.status === 'finalizado') return res.status(400).json({ erro: 'Partida já finalizada' });

    const questoes = JSON.parse(partida.questoes_json || '[]');
    if (questoes.length === 0) return res.status(400).json({ erro: 'Adicione ao menos uma questão antes de iniciar' });

    // Encerra qualquer atividade anterior ativa para esta turma
    await db.run(
      `UPDATE atividade_presencial_ativa SET status='finalizado', encerrada_em=NOW()
       WHERE turma_id = ? AND status = 'em_andamento'`,
      [partida.turma_id]
    );

    // Atualiza a partida para em_andamento
    await db.run(
      `UPDATE cabo_guerra_partidas SET
       status='em_andamento', iniciado_em=NOW(),
       pergunta_atual_index=0, pergunta_liberada=0,
       posicao_corda=0, time1_pontos=0, time2_pontos=0, vencedor=NULL
       WHERE id=?`,
      [req.params.id]
    );

    // Registra atividade presencial ativa para a turma
    await db.run(
      `INSERT INTO atividade_presencial_ativa
       (escola_id, turma_id, tipo, referencia_id, referencia_titulo, codigo_acesso, status)
       VALUES (?,?,?,?,?,?,?)`,
      [partida.escola_id, partida.turma_id, 'cabo_guerra', partida.id, partida.titulo, partida.codigo_sala, 'em_andamento']
    );

    const atualizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [req.params.id]);
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra/:id/liberar-pergunta — professor libera a pergunta atual para os alunos
router.post('/:id/liberar-pergunta', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status !== 'em_andamento') return res.status(400).json({ erro: 'Partida não está em andamento' });
    if (partida.pergunta_liberada) return res.status(400).json({ erro: 'Pergunta já liberada' });

    await db.run(
      `UPDATE cabo_guerra_partidas SET pergunta_liberada=1, pergunta_liberada_em=NOW() WHERE id=?`,
      [req.params.id]
    );

    const atualizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [req.params.id]);
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra/:id/proxima-pergunta — avalia pergunta atual, move a corda, avança
router.post('/:id/proxima-pergunta', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status !== 'em_andamento') return res.status(400).json({ erro: 'Partida não está em andamento' });

    const questoes = JSON.parse(partida.questoes_json || '[]');
    const idx = partida.pergunta_atual_index;

    // Calcula placar da pergunta atual (se foi liberada)
    let nova_posicao = partida.posicao_corda;
    let novo_time1 = partida.time1_pontos;
    let novo_time2 = partida.time2_pontos;

    if (partida.pergunta_liberada && idx >= 0) {
      const { time1_acertos, time2_acertos } = await calcularPlacarPergunta(partida.id, idx);
      novo_time1 += time1_acertos;
      novo_time2 += time2_acertos;

      // Move a corda conforme time vencedor na pergunta
      if (time1_acertos > time2_acertos) nova_posicao += 1;
      else if (time2_acertos > time1_acertos) nova_posicao -= 1;

      // Limita a posição ao limite de vitória
      nova_posicao = Math.max(-partida.limite_vitoria, Math.min(partida.limite_vitoria, nova_posicao));
    }

    // Verifica se há vencedor por posição extrema da corda
    if (nova_posicao >= partida.limite_vitoria || nova_posicao <= -partida.limite_vitoria) {
      const vencedor = nova_posicao > 0 ? partida.time1_nome : partida.time2_nome;
      await db.run(
        `UPDATE cabo_guerra_partidas SET
         status='finalizado', vencedor=?, posicao_corda=?,
         time1_pontos=?, time2_pontos=?, pergunta_liberada=0, finalizado_em=NOW()
         WHERE id=?`,
        [vencedor, nova_posicao, novo_time1, novo_time2, partida.id]
      );
      await encerrarAtividadeAtiva(partida.turma_id);
      const finalizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [partida.id]);
      return res.json({ ...finalizada, encerrada: true });
    }

    // Verifica se era a última pergunta
    const proximo_idx = idx + 1;
    if (proximo_idx >= questoes.length) {
      const vencedor = nova_posicao > 0 ? partida.time1_nome : nova_posicao < 0 ? partida.time2_nome : 'Empate';
      await db.run(
        `UPDATE cabo_guerra_partidas SET
         status='finalizado', vencedor=?, posicao_corda=?,
         time1_pontos=?, time2_pontos=?, pergunta_liberada=0, finalizado_em=NOW()
         WHERE id=?`,
        [vencedor, nova_posicao, novo_time1, novo_time2, partida.id]
      );
      await encerrarAtividadeAtiva(partida.turma_id);
      const finalizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [partida.id]);
      return res.json({ ...finalizada, encerrada: true });
    }

    // Avança para a próxima pergunta
    await db.run(
      `UPDATE cabo_guerra_partidas SET
       pergunta_atual_index=?, pergunta_liberada=0, pergunta_liberada_em=NULL,
       posicao_corda=?, time1_pontos=?, time2_pontos=?
       WHERE id=?`,
      [proximo_idx, nova_posicao, novo_time1, novo_time2, partida.id]
    );

    const atualizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [partida.id]);
    res.json({ ...atualizada, encerrada: false });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra/:id/encerrar — professor encerra a partida manualmente
router.post('/:id/encerrar', async (req, res) => {
  try {
    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ? AND escola_id = ?',
      [req.params.id, req.usuario.escola_id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status !== 'em_andamento') return res.status(400).json({ erro: 'Partida não está em andamento' });

    const vencedor = partida.posicao_corda > 0 ? partida.time1_nome
      : partida.posicao_corda < 0 ? partida.time2_nome : 'Empate';

    await db.run(
      `UPDATE cabo_guerra_partidas SET
       status='finalizado', vencedor=?, pergunta_liberada=0, finalizado_em=NOW()
       WHERE id=?`,
      [vencedor, partida.id]
    );
    await encerrarAtividadeAtiva(partida.turma_id);

    const finalizada = await db.get('SELECT * FROM cabo_guerra_partidas WHERE id = ?', [partida.id]);
    res.json(finalizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── Rotas do Aluno (autenticação aluno) ──────────────────────────────────────

// POST /api/cabo-guerra/:id/entrar — aluno escolhe time e entra na partida
router.post('/:id/entrar', autenticarAluno, async (req, res) => {
  try {
    const { time_numero } = req.body;
    if (time_numero !== 1 && time_numero !== 2) {
      return res.status(400).json({ erro: 'Escolha o time 1 ou 2' });
    }

    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ?',
      [req.params.id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });
    if (partida.status !== 'em_andamento') {
      return res.status(400).json({ erro: 'Esta partida não está em andamento' });
    }

    // Verifica isolamento por escola e turma
    if (partida.escola_id !== req.aluno.escola_id) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }
    if (partida.turma_id !== req.aluno.turma_id) {
      return res.status(403).json({ erro: 'Você não pertence à turma desta partida' });
    }

    // Registra participante (ON CONFLICT atualiza o time se aluno trocar)
    await db.run(
      `INSERT INTO cabo_guerra_participantes (partida_id, aluno_codigo, aluno_nome, time_numero)
       VALUES (?,?,?,?)
       ON CONFLICT (partida_id, aluno_codigo)
       DO UPDATE SET time_numero = EXCLUDED.time_numero`,
      [partida.id, req.aluno.codigo, req.aluno.nome, time_numero]
    );

    res.json({
      ok: true,
      time_numero,
      time_nome: time_numero === 1 ? partida.time1_nome : partida.time2_nome,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cabo-guerra/:id/responder — aluno responde pergunta atual
// Trava central: rejeita se status != em_andamento ou pergunta não liberada
router.post('/:id/responder', autenticarAluno, async (req, res) => {
  try {
    const { resposta_dada } = req.body;
    if (resposta_dada === undefined || resposta_dada === null) {
      return res.status(400).json({ erro: 'Resposta é obrigatória' });
    }

    const partida = await db.get(
      'SELECT * FROM cabo_guerra_partidas WHERE id = ?',
      [req.params.id]
    );
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });

    // Trava de segurança: rejeita resposta fora de sessão ativa
    if (partida.status !== 'em_andamento') {
      return res.status(400).json({ erro: 'Partida não está em andamento' });
    }
    if (!partida.pergunta_liberada) {
      return res.status(400).json({ erro: 'Pergunta ainda não liberada pelo professor' });
    }

    // Verifica isolamento por escola e turma
    if (partida.escola_id !== req.aluno.escola_id || partida.turma_id !== req.aluno.turma_id) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const idx = partida.pergunta_atual_index;

    // Impede resposta duplicada na mesma pergunta
    const jaRespondeu = await db.get(
      'SELECT id FROM cabo_guerra_respostas WHERE partida_id=? AND aluno_codigo=? AND pergunta_index=?',
      [partida.id, req.aluno.codigo, idx]
    );
    if (jaRespondeu) return res.status(400).json({ erro: 'Você já respondeu esta pergunta' });

    // Busca time do participante
    const participante = await db.get(
      'SELECT time_numero FROM cabo_guerra_participantes WHERE partida_id=? AND aluno_codigo=?',
      [partida.id, req.aluno.codigo]
    );
    if (!participante) return res.status(400).json({ erro: 'Entre na partida antes de responder' });

    // Verifica se a resposta está correta
    const questoes = JSON.parse(partida.questoes_json || '[]');
    const questao = questoes[idx];
    const correta = questao && parseInt(resposta_dada) === parseInt(questao.resposta_correta) ? 1 : 0;

    await db.run(
      `INSERT INTO cabo_guerra_respostas
       (partida_id, aluno_codigo, aluno_nome, time_numero, pergunta_index, resposta_dada, correta)
       VALUES (?,?,?,?,?,?,?)`,
      [partida.id, req.aluno.codigo, req.aluno.nome, participante.time_numero, idx, resposta_dada, correta]
    );

    res.json({ ok: true, correta: !!correta });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/cabo-guerra/:id/meu-time — aluno consulta seu time na partida
router.get('/:id/meu-time', autenticarAluno, async (req, res) => {
  try {
    const participante = await db.get(
      'SELECT * FROM cabo_guerra_participantes WHERE partida_id=? AND aluno_codigo=?',
      [req.params.id, req.aluno.codigo]
    );
    if (!participante) return res.json({ time: null });
    const partida = await db.get('SELECT time1_nome, time2_nome FROM cabo_guerra_partidas WHERE id=?', [req.params.id]);
    res.json({
      time: participante.time_numero,
      time_nome: participante.time_numero === 1 ? partida?.time1_nome : partida?.time2_nome,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/cabo-guerra/:id/minha-resposta — aluno verifica se já respondeu a pergunta atual
router.get('/:id/minha-resposta', autenticarAluno, async (req, res) => {
  try {
    const partida = await db.get('SELECT pergunta_atual_index FROM cabo_guerra_partidas WHERE id=?', [req.params.id]);
    if (!partida) return res.status(404).json({ erro: 'Partida não encontrada' });

    const resposta = await db.get(
      'SELECT * FROM cabo_guerra_respostas WHERE partida_id=? AND aluno_codigo=? AND pergunta_index=?',
      [req.params.id, req.aluno.codigo, partida.pergunta_atual_index]
    );
    res.json({ ja_respondeu: !!resposta, correta: resposta ? !!resposta.correta : null });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
