/**
 * Cabo de Guerra Online — Batalha de Calculadoras Multiplayer
 * Socket.io module — eventos prefixados com 'cg:'
 * Toda a lógica roda no servidor: timer, perguntas, validação de respostas
 */

const salas = {}; // codigo -> estado_sala

// Gera código único de 4 letras
function gerarCodigo() {
  let cod;
  do {
    cod = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (salas[cod]);
  return cod;
}

// Gera pergunta de matemática
function gerarPergunta() {
  const tipo = Math.floor(Math.random() * 3);
  let a, b, r, txt;
  if (tipo === 0) {
    a = Math.floor(Math.random() * 50) + 5;
    b = Math.floor(Math.random() * 50) + 5;
    r = a + b; txt = `${a} + ${b} = ?`;
  } else if (tipo === 1) {
    a = Math.floor(Math.random() * 40) + 20;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    r = a - b; txt = `${a} − ${b} = ?`;
  } else {
    const f = [[2,3],[2,4],[2,5],[3,3],[3,4],[3,5],[4,4],[4,5],[5,5],[2,6],[3,6],[4,6],[5,6],[6,6],[2,7],[3,7]];
    const [fa, fb] = f[Math.floor(Math.random() * f.length)];
    r = fa * fb; txt = `${fa} × ${fb} = ?`;
  }
  return { txt, resposta: r };
}

// Estado público da sala (sem resposta correta!)
function estadoPublico(sala) {
  return {
    codigo: sala.codigo,
    nome1: sala.nome1,
    nome2: sala.nome2,
    status: sala.status,
    rodada: sala.rodada,
    total: sala.total,
    p1: sala.p1,
    p2: sala.p2,
    eq1_count: Object.values(sala.clientes).filter(c => c.equipe === 1).length,
    eq2_count: Object.values(sala.clientes).filter(c => c.equipe === 2).length,
    tempo: sala.tempo,
    pergunta_txt: sala.status === 'jogando' ? sala.pergunta_txt : null,
    ativo: sala.ativo,
  };
}

function _novaRodada(io, sala, codigo) {
  if (!salas[codigo]) return;
  const q = gerarPergunta();
  sala.pergunta_txt = q.txt;
  sala.resposta = q.resposta;
  sala.ativo = true;
  sala.tempo = 30;

  io.to(codigo).emit('cg:nova_pergunta', {
    txt: q.txt,
    rodada: sala.rodada,
    total: sala.total,
    p1: sala.p1,
    p2: sala.p2,
    tempo: 30,
  });

  // Timer no servidor — garante sincronismo entre todos os tablets
  sala.timer_iv = setInterval(() => {
    if (!salas[codigo]) { clearInterval(sala.timer_iv); return; }
    sala.tempo--;
    io.to(codigo).emit('cg:timer', { tempo: sala.tempo });
    if (sala.tempo <= 0) {
      clearInterval(sala.timer_iv);
      if (!sala.ativo) return; // já foi acertado antes do tempo
      sala.ativo = false;
      io.to(codigo).emit('cg:tempo_esgotado', {
        rodada: sala.rodada, p1: sala.p1, p2: sala.p2,
      });
      setTimeout(() => _proximaOuFim(io, sala, codigo), 2500);
    }
  }, 1000);
}

function _proximaOuFim(io, sala, codigo) {
  if (!salas[codigo]) return;
  if (sala.rodada >= sala.total) {
    _fimJogo(io, sala, codigo);
    return;
  }
  sala.rodada++;
  _novaRodada(io, sala, codigo);
}

function _fimJogo(io, sala, codigo) {
  sala.status = 'fim';
  let vencedor = 0;
  if (sala.p1 > sala.p2) vencedor = 1;
  else if (sala.p2 > sala.p1) vencedor = 2;
  io.to(codigo).emit('cg:fim', {
    p1: sala.p1, p2: sala.p2, vencedor,
    nome1: sala.nome1, nome2: sala.nome2,
  });
  // Limpa sala após 10 minutos para liberar memória
  setTimeout(() => { delete salas[codigo]; }, 600000);
}

module.exports = function iniciarCaboGuerraOnline(io) {
  io.on('connection', (socket) => {

    // ── Professor cria sala ───────────────────────────────────
    socket.on('cg:criar_sala', ({ nome1, nome2 }) => {
      const codigo = gerarCodigo();
      salas[codigo] = {
        codigo,
        prof_id: socket.id,
        nome1: nome1 || 'Equipe 1',
        nome2: nome2 || 'Equipe 2',
        status: 'aguardando',  // aguardando | jogando | fim
        rodada: 0,
        total: 10,
        p1: 0,
        p2: 0,
        tempo: 30,
        ativo: false,
        pergunta_txt: null,
        resposta: null,
        timer_iv: null,
        clientes: {},  // socket_id -> { nome, equipe }
      };
      socket.join(codigo);
      socket.emit('cg:sala_criada', { codigo, sala: estadoPublico(salas[codigo]) });
    });

    // ── Aluno entra na sala ───────────────────────────────────
    socket.on('cg:entrar_sala', ({ codigo, nome, equipe }) => {
      const c = (codigo || '').toUpperCase().trim();
      const sala = salas[c];
      if (!sala) {
        socket.emit('cg:erro', { msg: 'Código inválido. Verifique com o professor.' });
        return;
      }
      if (sala.status === 'fim') {
        socket.emit('cg:erro', { msg: 'Este jogo já terminou.' });
        return;
      }
      sala.clientes[socket.id] = { nome: nome || 'Aluno', equipe: parseInt(equipe) || 1 };
      socket.join(c);
      socket.emit('cg:entrou', {
        sala: estadoPublico(sala),
        minha_equipe: sala.clientes[socket.id].equipe,
      });
      // Notifica todos que alguém entrou
      io.to(c).emit('cg:estado', estadoPublico(sala));
    });

    // ── Professor inicia o jogo ───────────────────────────────
    socket.on('cg:iniciar', ({ codigo }) => {
      const sala = salas[codigo];
      if (!sala || sala.prof_id !== socket.id) return;
      if (sala.status !== 'aguardando') return;
      sala.status = 'jogando';
      sala.rodada = 1;
      sala.p1 = 0;
      sala.p2 = 0;
      _novaRodada(io, sala, codigo);
    });

    // ── Aluno responde ────────────────────────────────────────
    socket.on('cg:resposta', ({ codigo, valor }) => {
      const sala = salas[codigo];
      if (!sala || sala.status !== 'jogando' || !sala.ativo) return;
      const cliente = sala.clientes[socket.id];
      if (!cliente) return;
      if (parseInt(valor) !== sala.resposta) {
        // Errou — avisa só quem errou
        socket.emit('cg:errou', {});
        return;
      }
      // Acertou! Para o timer e pontua
      sala.ativo = false;
      clearInterval(sala.timer_iv);
      if (cliente.equipe === 1) sala.p1++; else sala.p2++;
      io.to(codigo).emit('cg:acertou', {
        equipe: cliente.equipe,
        nome_jogador: cliente.nome,
        p1: sala.p1,
        p2: sala.p2,
        rodada: sala.rodada,
      });
      setTimeout(() => _proximaOuFim(io, sala, codigo), 2500);
    });

    // ── Desconexão ────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const codigo in salas) {
        const sala = salas[codigo];
        if (sala.clientes[socket.id]) {
          delete sala.clientes[socket.id];
          io.to(codigo).emit('cg:estado', estadoPublico(sala));
        }
      }
    });
  });
};
