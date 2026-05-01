require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

initDatabase();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/alunos', require('./routes/alunos'));
app.use('/api/turmas', require('./routes/turmas'));
app.use('/api/professores', require('./routes/professores'));
app.use('/api/presenca', require('./routes/presenca'));
app.use('/api/avaliacoes', require('./routes/avaliacoes'));
app.use('/api/desempenho', require('./routes/desempenho'));
app.use('/api/ocorrencias', require('./routes/ocorrencias'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/justificativas', require('./routes/justificativas'));
app.use('/api/itagame', require('./routes/itagame'));
app.use('/api/ia', require('./routes/ia'));

app.get('/api/status', (req, res) => {
  const { isWhatsAppReady } = require('./whatsapp');
  res.json({ ok: true, whatsapp: isWhatsAppReady(), versao: '2.0.0', sistema: 'ITA Tecnologia Educacional' });
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

app.set('io', io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 ITA TECNOLOGIA EDUCACIONAL — Backend v2.0`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`\n🔄 Iniciando cliente WhatsApp...`);
  const { inicializarWhatsApp } = require('./whatsapp');
  inicializarWhatsApp();
});
