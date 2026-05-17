// Módulo Mobile Tracker — rastreamento GPS de alunos em tempo real
// Acesso: admin/coordenador veem dashboard; professor NÃO acessa
// Aluno usa token PWA gerado pelo coordenador (não usa JWT do sistema)

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Coordenadas fixas do CEITEC em Itapipoca-CE
const CEITEC_LAT = -3.4970;
const CEITEC_LNG = -39.5785;
const RAIO_ESCOLA_METROS = 100;
const RAIO_CASA_METROS = 50;
const HORARIO_INICIO = 6;  // 06h00
const HORARIO_FIM = 18;    // 18h00

// Calcula distância em metros entre dois pontos GPS (Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const f1 = lat1 * Math.PI / 180;
  const f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Determina o status do aluno com base na posição GPS
function calcularStatus(lat, lng, perfil) {
  const distEscola = calcularDistancia(lat, lng, CEITEC_LAT, CEITEC_LNG);
  if (distEscola <= RAIO_ESCOLA_METROS) return 'na_escola';

  if (perfil?.lat_casa && perfil?.lng_casa) {
    const distCasa = calcularDistancia(lat, lng, parseFloat(perfil.lat_casa), parseFloat(perfil.lng_casa));
    if (distCasa <= RAIO_CASA_METROS) return 'em_casa';
  }

  return 'a_caminho';
}

// Gera token único para o PWA do aluno
function gerarTokenPwa() {
  return crypto.randomBytes(24).toString('hex');
}

// ──────────────────────────────────────────────────────────────────
// ROTA PÚBLICA — recebe ping GPS do PWA do aluno
// POST /api/mobile-tracker/localizar
// Body: { token, latitude, longitude, precisao, velocidade, altitude, bateria }
// ──────────────────────────────────────────────────────────────────
router.post('/localizar', async (req, res) => {
  try {
    const { token, latitude, longitude, precisao, velocidade, altitude, bateria } = req.body;
    if (!token || !latitude || !longitude) {
      return res.status(400).json({ erro: 'Token, latitude e longitude são obrigatórios' });
    }

    // Valida token do aluno
    const perfil = await db.get('SELECT * FROM tracker_perfis WHERE token_pwa = ?', [token]);
    if (!perfil) return res.status(401).json({ erro: 'Token inválido' });

    if (!perfil.consentimento_aceito) {
      return res.status(403).json({ erro: 'Consentimento não registrado' });
    }

    // Só coleta dentro do horário escolar (06h–18h, horário de Brasília)
    const agora = new Date();
    const horaLocal = agora.getUTCHours() - 3; // UTC-3 Brasília
    if (horaLocal < HORARIO_INICIO || horaLocal >= HORARIO_FIM) {
      return res.json({ ok: true, fora_horario: true });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const status = calcularStatus(lat, lng, perfil);

    // Registra no histórico de localizações
    await db.run(
      `INSERT INTO tracker_localizacoes
         (aluno_id, escola_id, latitude, longitude, precisao_metros, velocidade_kmh, altitude, status, bateria_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [perfil.aluno_id, perfil.escola_id, lat, lng, precisao || 0, velocidade || null, altitude || null, status, bateria || null]
    );

    // Atualiza snapshot de status atual
    const jaChegou = await db.get(
      'SELECT chegou_escola_hoje, horario_chegada FROM tracker_status_atual WHERE aluno_id = ?',
      [perfil.aluno_id]
    );

    const chegouAgora = status === 'na_escola' && !jaChegou?.chegou_escola_hoje;
    const saindoAgora = status !== 'na_escola' && jaChegou?.chegou_escola_hoje && !jaChegou?.saiu_escola;

    await db.run(
      `INSERT INTO tracker_status_atual
         (aluno_id, escola_id, status_atual, ultima_atualizacao, ultima_lat, ultima_lng, bateria_atual,
          chegou_escola_hoje, horario_chegada, saiu_escola, horario_saida)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (aluno_id) DO UPDATE SET
         status_atual = EXCLUDED.status_atual,
         ultima_atualizacao = NOW(),
         ultima_lat = EXCLUDED.ultima_lat,
         ultima_lng = EXCLUDED.ultima_lng,
         bateria_atual = EXCLUDED.bateria_atual,
         chegou_escola_hoje = CASE WHEN tracker_status_atual.chegou_escola_hoje = 1 THEN 1 ELSE EXCLUDED.chegou_escola_hoje END,
         horario_chegada = COALESCE(tracker_status_atual.horario_chegada, EXCLUDED.horario_chegada),
         saiu_escola = CASE WHEN EXCLUDED.status_atual != 'na_escola' AND tracker_status_atual.chegou_escola_hoje = 1 AND tracker_status_atual.saiu_escola = 0 THEN 1 ELSE tracker_status_atual.saiu_escola END,
         horario_saida = CASE WHEN EXCLUDED.status_atual != 'na_escola' AND tracker_status_atual.chegou_escola_hoje = 1 AND tracker_status_atual.saiu_escola = 0 THEN NOW() ELSE tracker_status_atual.horario_saida END`,
      [perfil.aluno_id, perfil.escola_id, status, lat, lng, bateria || null,
       chegouAgora ? 1 : (jaChegou?.chegou_escola_hoje || 0),
       chegouAgora ? new Date() : (jaChegou?.horario_chegada || null),
       saindoAgora ? 1 : 0,
       saindoAgora ? new Date() : null]
    );

    // Emite evento Socket.io para o dashboard do admin em tempo real
    const aluno = await db.get(
      'SELECT a.nome, a.turma, a.foto_path FROM alunos a WHERE a.id = ?',
      [perfil.aluno_id]
    );
    const io = req.app.get('io');
    if (io) {
      io.to(`tracker-escola-${perfil.escola_id}`).emit('tracker:localizacao', {
        aluno_id: perfil.aluno_id,
        nome: aluno?.nome || '',
        turma: aluno?.turma || '',
        foto_path: aluno?.foto_path || null,
        lat,
        lng,
        status,
        bateria: bateria || null,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ ok: true, status });
  } catch (err) {
    console.error('[mobile-tracker] localizar:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// ROTAS PROTEGIDAS — somente admin/coordenador
// ──────────────────────────────────────────────────────────────────
router.use(autenticar);

// Bloqueia professores
router.use((req, res, next) => {
  if (req.usuario.perfil === 'professor') {
    return res.status(403).json({ erro: 'Professores não têm acesso ao rastreamento' });
  }
  next();
});

// GET /api/mobile-tracker/status-geral
// Retorna snapshot de todos os alunos da escola com seu status atual
router.get('/status-geral', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const rows = await db.all(
      `SELECT
        a.id, a.nome, a.turma, a.turma_id, a.codigo, a.foto_path,
        tp.lat_casa, tp.lng_casa, tp.bairro, tp.meio_transporte,
        tp.tem_celular, tp.numero_celular, tp.tempo_medio_trajeto_minutos,
        tsa.status_atual, tsa.ultima_atualizacao, tsa.ultima_lat, tsa.ultima_lng,
        tsa.bateria_atual, tsa.chegou_escola_hoje, tsa.horario_chegada,
        tsa.saiu_escola, tsa.horario_saida
      FROM alunos a
      LEFT JOIN tracker_perfis tp ON tp.aluno_id = a.id
      LEFT JOIN tracker_status_atual tsa ON tsa.aluno_id = a.id
      WHERE a.escola_id = ? AND a.ativo = 1
      ORDER BY a.nome`,
      [eid]
    );

    // Aluno sem token ativo = sem celular cadastrado no tracker
    const resultado = rows.map(r => ({
      ...r,
      status_atual: r.status_atual || (r.tem_celular === 0 ? 'sem_celular' : 'offline'),
    }));

    const contagens = {
      total: resultado.length,
      online: resultado.filter(r => r.status_atual !== 'offline' && r.status_atual !== 'sem_celular').length,
      na_escola: resultado.filter(r => r.status_atual === 'na_escola').length,
      offline: resultado.filter(r => r.status_atual === 'offline').length,
      sem_celular: resultado.filter(r => r.status_atual === 'sem_celular').length,
    };

    res.json({ alunos: resultado, contagens });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/mobile-tracker/trajetoria/:aluno_id?data=YYYY-MM-DD
// Retorna pontos GPS do aluno em um dia específico
router.get('/trajetoria/:aluno_id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { aluno_id } = req.params;
    const data = req.query.data || new Date().toISOString().split('T')[0];

    // Garante que o aluno pertence à escola
    const aluno = await db.get('SELECT id, nome, turma FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, eid]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const pontos = await db.all(
      `SELECT latitude, longitude, status, velocidade_kmh, bateria_percent, timestamp
       FROM tracker_localizacoes
       WHERE aluno_id = ? AND escola_id = ?
         AND timestamp::date = ?::date
       ORDER BY timestamp ASC`,
      [aluno_id, eid, data]
    );

    res.json({ aluno, data, pontos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/mobile-tracker/perfis
// Lista perfis tracker de todos os alunos da escola
router.get('/perfis', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const rows = await db.all(
      `SELECT a.id, a.nome, a.turma, a.codigo,
              tp.id as perfil_id, tp.bairro, tp.meio_transporte, tp.tem_celular,
              tp.numero_celular, tp.consentimento_aceito, tp.token_pwa,
              tp.lat_casa, tp.lng_casa, tp.endereco_residencia
       FROM alunos a
       LEFT JOIN tracker_perfis tp ON tp.aluno_id = a.id
       WHERE a.escola_id = ? AND a.ativo = 1
       ORDER BY a.nome`,
      [eid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/mobile-tracker/perfis/:aluno_id
// Cria ou atualiza o perfil tracker de um aluno
router.put('/perfis/:aluno_id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { aluno_id } = req.params;
    const {
      endereco_residencia, bairro, referencia_local,
      lat_casa, lng_casa, meio_transporte, tempo_medio_trajeto_minutos,
      distancia_km, tem_celular, modelo_celular, numero_celular,
      consentimento_aceito,
    } = req.body;

    // Garante que o aluno pertence à escola
    const aluno = await db.get('SELECT id FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, eid]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    // Verifica se já tem perfil
    const existente = await db.get('SELECT id, token_pwa FROM tracker_perfis WHERE aluno_id = ?', [aluno_id]);
    const token = existente?.token_pwa || gerarTokenPwa();
    const consentEm = consentimento_aceito && !existente?.consentimento_aceito ? new Date() : null;

    if (existente) {
      await db.run(
        `UPDATE tracker_perfis SET
           endereco_residencia=?, bairro=?, referencia_local=?, lat_casa=?, lng_casa=?,
           meio_transporte=?, tempo_medio_trajeto_minutos=?, distancia_km=?,
           tem_celular=?, modelo_celular=?, numero_celular=?,
           consentimento_aceito=?,
           consentimento_em=COALESCE(consentimento_em, ?),
           atualizado_em=NOW()
         WHERE aluno_id=?`,
        [endereco_residencia, bairro, referencia_local, lat_casa || null, lng_casa || null,
         meio_transporte, tempo_medio_trajeto_minutos || 30, distancia_km || null,
         tem_celular ? 1 : 0, modelo_celular, numero_celular,
         consentimento_aceito ? 1 : 0, consentEm, aluno_id]
      );
    } else {
      await db.run(
        `INSERT INTO tracker_perfis
           (aluno_id, escola_id, endereco_residencia, bairro, referencia_local, lat_casa, lng_casa,
            meio_transporte, tempo_medio_trajeto_minutos, distancia_km,
            tem_celular, modelo_celular, numero_celular, token_pwa,
            consentimento_aceito, consentimento_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [aluno_id, eid, endereco_residencia, bairro, referencia_local, lat_casa || null, lng_casa || null,
         meio_transporte, tempo_medio_trajeto_minutos || 30, distancia_km || null,
         tem_celular ? 1 : 0, modelo_celular, numero_celular, token,
         consentimento_aceito ? 1 : 0, consentEm]
      );
    }

    const perfil = await db.get('SELECT * FROM tracker_perfis WHERE aluno_id = ?', [aluno_id]);
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/mobile-tracker/link-pwa/:aluno_id
// Retorna o link do PWA para o aluno instalar no celular
router.get('/link-pwa/:aluno_id', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const { aluno_id } = req.params;

    const aluno = await db.get('SELECT id, nome FROM alunos WHERE id = ? AND escola_id = ?', [aluno_id, eid]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    let perfil = await db.get('SELECT token_pwa FROM tracker_perfis WHERE aluno_id = ?', [aluno_id]);
    if (!perfil) {
      // Cria perfil mínimo com token
      const token = gerarTokenPwa();
      await db.run(
        'INSERT INTO tracker_perfis (aluno_id, escola_id, token_pwa) VALUES (?, ?, ?)',
        [aluno_id, eid, token]
      );
      perfil = { token_pwa: token };
    }

    const baseUrl = process.env.APP_URL || 'https://itatecnologiaeducacional.tech';
    const link = `${baseUrl}/pwa/tracker/?token=${perfil.token_pwa}&nome=${encodeURIComponent(aluno.nome)}`;
    res.json({ link, token: perfil.token_pwa, aluno: aluno.nome });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/mobile-tracker/consentimento
// Aluno aceita o termo de consentimento pelo PWA (usa token)
router.post('/consentimento', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ erro: 'Token obrigatório' });

    const perfil = await db.get('SELECT id FROM tracker_perfis WHERE token_pwa = ?', [token]);
    if (!perfil) return res.status(404).json({ erro: 'Token inválido' });

    await db.run(
      'UPDATE tracker_perfis SET consentimento_aceito=1, consentimento_em=NOW() WHERE token_pwa=?',
      [token]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/mobile-tracker/alertas
// Retorna alertas automáticos do dia
router.get('/alertas', async (req, res) => {
  try {
    const eid = req.usuario.escola_id;
    const alertas = [];
    const agora = new Date();
    const horaLocal = agora.getUTCHours() - 3;

    if (horaLocal < HORARIO_INICIO || horaLocal >= HORARIO_FIM) {
      return res.json({ alertas: [] });
    }

    // Alunos offline há mais de 15 minutos em horário escolar
    const offline = await db.all(
      `SELECT a.nome, a.turma, tsa.ultima_atualizacao
       FROM tracker_status_atual tsa
       JOIN alunos a ON a.id = tsa.aluno_id
       WHERE tsa.escola_id = ? AND tsa.status_atual != 'na_escola'
         AND tsa.ultima_atualizacao < NOW() - INTERVAL '15 minutes'
         AND a.ativo = 1`,
      [eid]
    );
    offline.forEach(a => alertas.push({
      tipo: 'offline',
      aluno: a.nome,
      turma: a.turma,
      mensagem: `${a.nome} está offline há mais de 15 minutos`,
      gravidade: 'media',
    }));

    // Alunos com bateria abaixo de 10%
    const bateriaBaixa = await db.all(
      `SELECT a.nome, tsa.bateria_atual
       FROM tracker_status_atual tsa
       JOIN alunos a ON a.id = tsa.aluno_id
       WHERE tsa.escola_id = ? AND tsa.bateria_atual < 10 AND tsa.bateria_atual IS NOT NULL`,
      [eid]
    );
    bateriaBaixa.forEach(a => alertas.push({
      tipo: 'bateria',
      aluno: a.nome,
      mensagem: `${a.nome} com bateria em ${a.bateria_atual}%`,
      gravidade: 'baixa',
    }));

    res.json({ alertas });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
