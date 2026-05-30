require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./database');
const { verificarLicenca } = require('./middleware/licenca');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pwa/tracker', express.static(path.join(__dirname, 'pwa-tracker'))); // PWA do aluno

// Vercel strips /api prefix — add it back if missing
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') && req.path !== '/api') {
    req.url = '/api' + req.url;
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/pagamento', require('./routes/pagamento')); // público (planos, webhook, minha-licenca)

// Rotas protegidas — verificam licença ativa
app.use('/api/alunos',       verificarLicenca, require('./routes/alunos'));
app.use('/api/turmas',       verificarLicenca, require('./routes/turmas'));
app.use('/api/professores',  verificarLicenca, require('./routes/professores'));
app.use('/api/presenca',     verificarLicenca, require('./routes/presenca'));
app.use('/api/avaliacoes',   verificarLicenca, require('./routes/avaliacoes'));
app.use('/api/desempenho',   verificarLicenca, require('./routes/desempenho'));
app.use('/api/ocorrencias',  verificarLicenca, require('./routes/ocorrencias'));
app.use('/api/relatorios',   verificarLicenca, require('./routes/relatorios'));
app.use('/api/justificativas', verificarLicenca, require('./routes/justificativas'));
app.use('/api/itagame',      verificarLicenca, require('./routes/itagame'));
app.use('/api/ia',           verificarLicenca, require('./routes/ia'));
app.use('/api/usuarios',     verificarLicenca, require('./routes/usuarios'));
app.use('/api/corretor',     verificarLicenca, require('./routes/corretor'));
app.use('/api/almoco',       verificarLicenca, require('./routes/almoco'));
app.use('/api/saida-sala',   verificarLicenca, require('./routes/saida-sala'));
app.use('/api/sala-maker',         verificarLicenca, require('./routes/salaMaker')); // Módulo Sala Maker
app.use('/api/empreendedorismo',   verificarLicenca, require('./routes/empreendedorismo')); // Empreendedorismo Digital
app.use('/api/educacao-inclusiva', verificarLicenca, require('./routes/educacaoInclusiva')); // Gerador de Atividades Inclusivas
app.use('/api/comunicacao',       verificarLicenca, require('./routes/comunicacao'));        // Comunicação com Pais
app.use('/api/calendario',        verificarLicenca, require('./routes/calendario'));         // Calendário Escolar
app.use('/api/portal',       require('./routes/portal')); // portal do aluno — sem check de licença
app.use('/api/prof-game',    verificarLicenca, require('./routes/professorGame').router); // Gamificação dos professores
app.use('/api/quiz',         require('./routes/quiz'));    // quiz público — sem check de licença
app.use('/api/mobile-tracker', require('./routes/mobile-tracker')); // tracker GPS (POST /localizar é público)
app.use('/api/mestre',        require('./routes/mestre'));          // Mestre da Escola (sem autenticação JWT)
app.use('/api/agenda',        require('./routes/agenda'));           // Agenda e Avisos (rota /publico não exige auth)
app.use('/api/album',         require('./routes/album'));            // Álbum dos Craques do Conhecimento

app.get('/api/status', (req, res) => {
  res.json({ ok: true, versao: '2.0.0', sistema: 'ITA Tecnologia Educacional' });
});

app.get('/api/debug-db', async (req, res) => {
  try {
    const db = require('./db');
    const usuarios = await db.all('SELECT id, nome, email, perfil FROM usuarios ORDER BY id');
    const alunos = await db.all('SELECT COUNT(*) as total FROM alunos');
    res.json({ usuarios, total_alunos: alunos[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

io.on('connection', (socket) => {
  // Admin entra na sala da escola para receber atualizações do tracker
  socket.on('tracker:entrar', ({ escola_id }) => {
    if (escola_id) socket.join(`tracker-escola-${escola_id}`);
  });
  socket.on('disconnect', () => {});
});
app.set('io', io);
require('./routes/quizLive')(io);

initDatabase().catch(console.error);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 ITA TECNOLOGIA EDUCACIONAL — Backend v2.0`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
