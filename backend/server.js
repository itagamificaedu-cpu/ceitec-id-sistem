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
app.use('/api/almoco',      verificarLicenca, require('./routes/almoco'));
app.use('/api/portal',       require('./routes/portal')); // portal do aluno — sem check de licença
app.use('/api/quiz',         require('./routes/quiz'));    // quiz público — sem check de licença

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
  socket.on('disconnect', () => {});
});
app.set('io', io);

initDatabase().catch(console.error);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 ITA TECNOLOGIA EDUCACIONAL — Backend v2.0`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
