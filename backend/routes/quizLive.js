/**
 * Quiz ao Vivo — Motor de jogo em tempo real via Socket.io
 * Estilo Kahoot/Wayground: lobby, questões, placar, pódio
 */

const AVATARS = [
  '🦊','🐼','🐯','🦁','🐸','🦄','🐧','🦋','🐺','🦝',
  '🐭','🐰','🐻','🐨','🐮','🐷','🐙','🦑','🦀','🐬',
  '🦈','🦜','🦚','🦩','🐓','🦉','🦎','🐢','🦘','🦔',
];

function getAvatar(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATARS[Math.abs(h) % AVATARS.length];
}

// rooms: quizId → { quizId, quiz, questoes, hostSocketId, state, currentQuestion, players, questionAnswers }
const rooms = new Map();

function getLeaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ socketId: p.socketId, nome: p.nome, avatar: p.avatar, codigo: p.codigo, score: p.score, streak: p.streak, position: i + 1 }));
}

function sendQuestion(io, room) {
  const q = room.questoes[room.currentQuestion];
  const timeLimit = room.quiz.tempo_por_questao || 30;
  const payload = {
    enunciado: q.enunciado,
    alts: [q.alt_a, q.alt_b, q.alt_c, q.alt_d].filter(Boolean),
    timeLimit,
    index: room.currentQuestion,
    total: room.questoes.length,
  };
  // Alunos não recebem a resposta correta
  io.to(`quiz-${room.quizId}`).emit('quiz:question', payload);
  // Host recebe a resposta correta também
  const hostSock = io.sockets.sockets.get(room.hostSocketId);
  if (hostSock) hostSock.emit('quiz:question-host', { ...payload, correctAnswer: q.resposta_correta });

  // ── Auto-avançar: servidor revela quando o tempo esgotar ──
  if (room.quiz.auto_avancar) {
    clearTimeout(room.autoTimer);
    room.autoTimer = setTimeout(() => {
      if (room.state === 'playing') revealQuestion(io, room);
    }, (timeLimit + 1) * 1000); // +1s de buffer
  }
}

function revealQuestion(io, room) {
  room.state = 'reveal';
  const q = room.questoes[room.currentQuestion];
  const totalTime = room.quiz.tempo_por_questao || 30;

  // Calcula pontos e atualiza scores
  for (const [socketId, player] of room.players) {
    const ans = room.questionAnswers.get(socketId);
    const correct = ans !== undefined ? ans.answer === q.resposta_correta : false;
    const speedBonus = (correct && ans) ? Math.round(((ans.timeLeft || 0) / totalTime) * 500) : 0;
    const points = correct ? (1000 + speedBonus) : 0;

    if (ans) room.questionAnswers.set(socketId, { ...ans, correct, points });

    player.score += points;
    player.streak = correct ? (player.streak || 0) + 1 : 0;
    player.answers.push({ questionIndex: room.currentQuestion, answer: ans ? ans.answer : -1, correct, points });
  }

  const leaderboard = getLeaderboard(room);

  // Manda feedback individual para cada aluno
  for (const [socketId] of room.players) {
    const playerSock = io.sockets.sockets.get(socketId);
    const ans = room.questionAnswers.get(socketId);
    const player = room.players.get(socketId);
    const position = leaderboard.findIndex(p => p.socketId === socketId) + 1;
    if (playerSock) {
      playerSock.emit('quiz:feedback', {
        correct: ans ? ans.correct : false,
        points: ans ? ans.points : 0,
        totalScore: player.score,
        position,
        totalPlayers: room.players.size,
        correctAnswer: q.resposta_correta,
        streak: player.streak,
      });
    }
  }

  // Estatísticas por alternativa
  const answerStats = [0, 1, 2, 3].map(i => ({
    alt: i,
    count: [...room.questionAnswers.values()].filter(a => a.answer === i).length,
  }));

  io.to(`quiz-${room.quizId}`).emit('quiz:reveal', {
    correctAnswer: q.resposta_correta,
    leaderboard: leaderboard.slice(0, 10),
    answerStats,
    questionIndex: room.currentQuestion,
    autoAvancar: !!room.quiz.auto_avancar,
  });

  // ── Auto-avançar: após 5s no reveal, passa para a próxima ──
  if (room.quiz.auto_avancar) {
    clearTimeout(room.autoTimer);
    room.autoTimer = setTimeout(() => {
      if (room.state !== 'reveal') return;
      const nextIdx = room.currentQuestion + 1;
      if (nextIdx >= room.questoes.length) {
        finishGame(io, room);
      } else {
        room.currentQuestion = nextIdx;
        room.questionAnswers = new Map();
        room.state = 'playing';
        sendQuestion(io, room);
      }
    }, 5000);
  }
}

function finishGame(io, room) {
  room.state = 'finished';
  const leaderboard = getLeaderboard(room);
  const allPlayers = [...room.players.values()];

  io.to(`quiz-${room.quizId}`).emit('quiz:finished', {
    leaderboard,
    totalQuestoes: room.questoes.length,
    questoes: room.questoes.map(q => ({
      id: q.id,
      enunciado: q.enunciado,
      correctAnswer: q.resposta_correta,
      alts: [q.alt_a, q.alt_b, q.alt_c, q.alt_d].filter(Boolean),
    })),
    myAnswers: null, // preenchido individualmente abaixo
  });

  // Envia resposta detalhada por aluno
  for (const [socketId, player] of room.players) {
    const playerSock = io.sockets.sockets.get(socketId);
    const position = leaderboard.findIndex(p => p.socketId === socketId) + 1;
    if (playerSock) {
      playerSock.emit('quiz:my-results', { position, score: player.score, answers: player.answers });
    }
  }

  // Envia resultados detalhados ao host (para tabela Q×aluno)
  const hostSock2 = io.sockets.sockets.get(room.hostSocketId);
  if (hostSock2) {
    const allAnswerData = allPlayers.map(p => ({
      socketId: p.socketId,
      nome: p.nome,
      avatar: p.avatar,
      codigo: p.codigo,
      score: p.score,
      answers: p.answers,
    }));
    hostSock2.emit('quiz:host-results', { allAnswers: allAnswerData });
  }

  // Salva resultados no banco
  const db = require('../db');
  for (const player of allPlayers) {
    const acertos = player.answers.filter(a => a.correct).length;
    const total = room.questoes.length;
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
    db.run(
      'INSERT INTO quiz_resultados (quiz_id, aluno_nome, aluno_codigo, acertos, total, percentual, tempo_total) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [room.quizId, player.nome, player.codigo || null, acertos, total, pct]
    ).catch(() => {});
    if (player.codigo && acertos > 0) {
      const xp = acertos * 10;
      db.get('SELECT * FROM alunos WHERE codigo = ? AND ativo = 1', [player.codigo.toUpperCase()])
        .then(aluno => {
          if (!aluno) return;
          return Promise.all([
            db.run("INSERT INTO itagame_pontos (aluno_id, turma_id, xp_total, nivel, badges_json) VALUES (?, ?, ?, 1, '[]') ON CONFLICT (aluno_id) DO UPDATE SET xp_total = itagame_pontos.xp_total + ?",
              [aluno.id, aluno.turma_id, xp, xp]),
            db.run("INSERT INTO itagame_historico (aluno_id, tipo, descricao, xp_ganho) VALUES (?, 'quiz', ?, ?)",
              [aluno.id, `Quiz ao vivo: ${room.quiz.titulo} — ${acertos}/${total} acertos`, xp]),
          ]);
        }).catch(() => {});
    }
  }

  // Limpa a sala depois de 30 min
  setTimeout(() => rooms.delete(room.quizId), 30 * 60 * 1000);
}

module.exports = function setupQuizLive(io) {
  io.on('connection', (socket) => {

    // ── HOST: Abre sala do quiz ──────────────────────────────────────────
    socket.on('quiz:host', async ({ quizId, token }) => {
      try {
        const jwt = require('jsonwebtoken');
        const db  = require('../db');
        let decoded;
        try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return socket.emit('quiz:error', 'Sessão expirada, faça login novamente.'); }

        const quiz = await db.get('SELECT * FROM quizzes WHERE id = ? AND escola_id = ?', [quizId, decoded.escola_id]);
        if (!quiz) return socket.emit('quiz:error', 'Quiz não encontrado ou sem permissão.');
        const questoes = await db.all('SELECT * FROM quiz_questoes WHERE quiz_id = ? ORDER BY ordem', [quizId]);
        if (questoes.length === 0) return socket.emit('quiz:error', 'Este quiz não tem questões cadastradas.');

        if (!rooms.has(quizId)) {
          rooms.set(quizId, {
            quizId, quiz, questoes,
            hostSocketId: socket.id,
            state: 'lobby',
            currentQuestion: -1,
            players: new Map(),
            questionAnswers: new Map(),
          });
        } else {
          const r = rooms.get(quizId);
          r.hostSocketId = socket.id;
          r.quiz = quiz;
          r.questoes = questoes;
        }

        socket.join(`quiz-${quizId}`);
        socket.data.isHost = true;
        socket.data.hostQuizId = quizId;

        const room = rooms.get(quizId);
        socket.emit('quiz:room-ready', {
          quiz: { id: quiz.id, titulo: quiz.titulo, codigo: quiz.codigo_acesso, tempo: quiz.tempo_por_questao, autoAvancar: !!quiz.auto_avancar },
          players: [...room.players.values()],
          state: room.state,
          currentQuestion: room.currentQuestion,
          totalQuestoes: questoes.length,
        });
      } catch (e) { socket.emit('quiz:error', e.message); }
    });

    // ── ALUNO: Entra na sala via código de acesso ─────────────────────────
    socket.on('quiz:join', ({ codigo, alunoCode, alunoNome, avatarEscolhido }) => {
      let targetRoom = null, targetQuizId = null;
      for (const [qid, room] of rooms) {
        if (room.quiz.codigo_acesso === (codigo || '').toUpperCase()) {
          targetRoom = room; targetQuizId = qid; break;
        }
      }
      if (!targetRoom) return socket.emit('quiz:error', 'Sala não encontrada. Peça ao professor para abrir o jogo ao vivo.');
      if (targetRoom.state === 'finished') return socket.emit('quiz:error', 'Este jogo já foi encerrado.');
      if (targetRoom.state !== 'lobby') return socket.emit('quiz:error', 'O jogo já começou! Aguarde a próxima rodada.');

      const nome = (alunoNome || alunoCode || 'Participante').trim();
      // Usa avatar escolhido pelo aluno, ou gera pelo hash do nome
      const avatar = (avatarEscolhido && AVATARS.includes(avatarEscolhido))
        ? avatarEscolhido
        : getAvatar(nome + (alunoCode || ''));

      // Remove entrada anterior (reconexão)
      for (const [sid, p] of targetRoom.players) {
        if (alunoCode && p.codigo === alunoCode) { targetRoom.players.delete(sid); break; }
      }

      const player = { socketId: socket.id, nome, codigo: alunoCode || null, avatar, score: 0, streak: 0, answers: [] };
      targetRoom.players.set(socket.id, player);
      socket.join(`quiz-${targetQuizId}`);
      socket.data.quizId = targetQuizId;

      socket.emit('quiz:joined', { nome, avatar, quizTitulo: targetRoom.quiz.titulo, totalQuestoes: targetRoom.questoes.length });

      const hostSock = io.sockets.sockets.get(targetRoom.hostSocketId);
      if (hostSock) hostSock.emit('quiz:lobby-update', { players: [...targetRoom.players.values()] });
    });

    // ── HOST: Inicia o jogo ───────────────────────────────────────────────
    socket.on('quiz:start', ({ quizId }) => {
      const room = rooms.get(quizId);
      if (!room || room.hostSocketId !== socket.id) return;
      if (room.players.size === 0) return socket.emit('quiz:error', 'Nenhum aluno na sala ainda!');
      room.state = 'playing';
      room.currentQuestion = 0;
      room.questionAnswers = new Map();
      io.to(`quiz-${quizId}`).emit('quiz:game-start', { totalQuestoes: room.questoes.length });
      setTimeout(() => sendQuestion(io, room), 1200);
    });

    // ── ALUNO: Responde questão ───────────────────────────────────────────
    socket.on('quiz:answer', ({ answer, timeLeft }) => {
      const quizId = socket.data.quizId;
      if (quizId === undefined) return;
      const room = rooms.get(quizId);
      if (!room || room.state !== 'playing') return;
      if (room.questionAnswers.has(socket.id)) return;

      room.questionAnswers.set(socket.id, { answer, timeLeft: timeLeft || 0 });
      socket.emit('quiz:answer-ack', { received: true });

      const hostSock = io.sockets.sockets.get(room.hostSocketId);
      if (hostSock) hostSock.emit('quiz:answer-update', { totalAnswered: room.questionAnswers.size, totalPlayers: room.players.size });

      // Revela automaticamente se todos responderam
      if (room.questionAnswers.size >= room.players.size) revealQuestion(io, room);
    });

    // ── HOST: Revelar resposta / Próxima questão ──────────────────────────
    socket.on('quiz:next', ({ quizId }) => {
      const room = rooms.get(quizId);
      if (!room || room.hostSocketId !== socket.id) return;
      clearTimeout(room.autoTimer); // cancela auto-avançar se host avançar manualmente
      if (room.state === 'playing') {
        revealQuestion(io, room);
      } else if (room.state === 'reveal') {
        const nextIdx = room.currentQuestion + 1;
        if (nextIdx >= room.questoes.length) {
          finishGame(io, room);
        } else {
          room.currentQuestion = nextIdx;
          room.questionAnswers = new Map();
          room.state = 'playing';
          sendQuestion(io, room);
        }
      }
    });

    // ── HOST: Encerra jogo antes do fim ───────────────────────────────────
    socket.on('quiz:end', ({ quizId }) => {
      const room = rooms.get(quizId);
      if (!room || room.hostSocketId !== socket.id) return;
      clearTimeout(room.autoTimer);
      finishGame(io, room);
    });

    socket.on('disconnect', () => {
      const quizId = socket.data.quizId;
      if (quizId !== undefined) {
        const room = rooms.get(quizId);
        if (room) room.players.delete(socket.id);
      }
    });
  });
};
