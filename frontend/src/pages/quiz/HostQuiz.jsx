/**
 * Quiz ao Vivo — Painel do Professor (Host)
 * Controla o jogo em tempo real: lobby → questões → revelar → pódio
 * Abre numa aba separada via ListaQuizzes
 */

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const CORES_RESP = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const LETRAS     = ['A', 'B', 'C', 'D']
const BG         = '#0f0c29'
const CARD       = '#16213e'
const BORDA      = '#2a2a5e'

/* ── Spinner ── */
function Spinner({ texto }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{texto}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function HostQuiz() {
  const { id: quizIdParam } = useParams()
  const quizId = Number(quizIdParam)
  const token  = localStorage.getItem('token')

  const [estado,       setEstado]       = useState('connecting')
  const [roomData,     setRoomData]     = useState(null)
  const [players,      setPlayers]      = useState([])
  const [questaoHost,  setQuestaoHost]  = useState(null)    // inclui correctAnswer
  const [answerUpdate, setAnswerUpdate] = useState({ totalAnswered: 0, totalPlayers: 0 })
  const [revealData,   setRevealData]   = useState(null)    // {correctAnswer,leaderboard,answerStats}
  const [finishedData, setFinishedData] = useState(null)
  const [hostResults,  setHostResults]  = useState(null)    // {allAnswers:[{nome,avatar,answers},...]}
  const [tempo,        setTempo]        = useState(0)
  const [autoAvancar,  setAutoAvancar]  = useState(false)
  const [contagemReveal, setContagemReveal] = useState(0)   // contagem regressiva no reveal (auto)
  const [erro,         setErro]         = useState('')

  const socketRef  = useRef(null)
  const timerRef   = useRef(null)
  const estadoRef  = useRef('connecting')
  estadoRef.current = estado
  const playersRef = useRef([])

  useEffect(() => {
    if (!token) {
      setErro('Sessão expirada. Faça login novamente e tente de novo.')
      setEstado('erro')
      return
    }

    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('quiz:host', { quizId, token })
    })

    socket.on('quiz:error', msg => {
      setErro(msg)
      setEstado('erro')
    })

    socket.on('quiz:room-ready', data => {
      setRoomData(data)
      const ps = data.players || []
      playersRef.current = ps
      setPlayers(ps)
      setAutoAvancar(!!data.quiz?.autoAvancar)
      setEstado(data.state === 'finished' ? 'finished' : 'lobby')
    })

    socket.on('quiz:lobby-update', ({ players: ps }) => {
      playersRef.current = ps
      setPlayers(ps)
    })

    socket.on('quiz:question-host', q => {
      clearInterval(timerRef.current)
      setQuestaoHost(q)
      setTempo(q.timeLimit || 30)
      setAnswerUpdate({ totalAnswered: 0, totalPlayers: playersRef.current.length })
      setEstado('playing')

      timerRef.current = setInterval(() => {
        setTempo(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0 }
          return t - 1
        })
      }, 1000)
    })

    socket.on('quiz:answer-update', data => setAnswerUpdate(data))

    socket.on('quiz:reveal', data => {
      clearInterval(timerRef.current)
      setRevealData(data)
      setEstado('reveal')
      // Se auto-avanço, mostra contagem regressiva de 5s
      if (data.autoAvancar) {
        setContagemReveal(5)
        const cd = setInterval(() => {
          setContagemReveal(t => {
            if (t <= 1) { clearInterval(cd); return 0 }
            return t - 1
          })
        }, 1000)
      }
    })

    socket.on('quiz:host-results', data => setHostResults(data))

    socket.on('quiz:finished', data => {
      setFinishedData(data)
      setEstado('finished')
    })

    socket.on('disconnect', () => {
      if (estadoRef.current !== 'finished') {
        setErro('Conexão perdida. Recarregue a página.')
        setEstado('erro')
      }
    })

    return () => {
      clearInterval(timerRef.current)
      socket.disconnect()
    }
  }, []) // eslint-disable-line

  const emit = (event, payload) => socketRef.current?.emit(event, payload)

  function iniciarJogo() { emit('quiz:start', { quizId }) }
  function avancar()     { emit('quiz:next',  { quizId }) }
  function encerrar() {
    if (!window.confirm('Encerrar o jogo agora? O resultado atual será salvo.')) return
    emit('quiz:end', { quizId })
  }

  /* ══════════════════════════════════════════
     TELAS
  ══════════════════════════════════════════ */

  if (estado === 'connecting') return <Spinner texto="Conectando à sala..." />

  if (estado === 'erro') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD, borderRadius: 24, padding: 32, maxWidth: 480, textAlign: 'center', border: '1px solid #ff2d7866' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: '#ff8fa3', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{erro}</p>
        <button onClick={() => window.close()} style={{ background: '#ffffff15', border: 'none', borderRadius: 12, padding: '10px 24px', color: '#a0a0c0', cursor: 'pointer', fontWeight: 600 }}>
          Fechar
        </button>
      </div>
    </div>
  )

  /* ── Lobby ── */
  if (estado === 'lobby') {
    const codigoAcesso = roomData?.quiz?.codigo || ''
    const linkJogar    = `${window.location.origin}/q/${codigoAcesso}`
    const qrUrl        = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkJogar)}`

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(140deg, #0f0c29, #1a1a3e)', color: '#fff', fontFamily: 'sans-serif' }}>
        {/* Top bar */}
        <div style={{ background: '#000000aa', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffffff10' }}>
          <div>
            <div style={{ color: '#a0a0c0', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Sala aberta — Quiz ao Vivo</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{roomData?.quiz?.titulo}</div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {autoAvancar && (
              <div style={{ background: '#7c3aed22', border: '1px solid #7c3aed66', borderRadius: 10, padding: '4px 10px', color: '#c4b5fd', fontSize: 11, fontWeight: 700 }}>
                ⚡ Auto-avanço
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#a0a0c0', fontSize: 11 }}>Jogadores</div>
              <div style={{ color: '#00FF88', fontWeight: 900, fontSize: 24 }}>{players.length}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) minmax(260px,2fr)', gap: 20, padding: 20, maxWidth: 1100, margin: '0 auto' }}>
          {/* Código + QR */}
          <div style={{ background: CARD, borderRadius: 24, padding: 28, border: `1px solid ${BORDA}`, textAlign: 'center' }}>
            <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Código de acesso</div>
            <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 48, letterSpacing: 10, lineHeight: 1, marginBottom: 12, textShadow: '0 0 20px #FFE60066' }}>
              {codigoAcesso}
            </div>
            <div style={{ color: '#a0a0c0', fontSize: 12, marginBottom: 16 }}>ou escaneie o QR code</div>
            <img src={qrUrl} alt="QR" style={{ width: 150, height: 150, borderRadius: 12, background: '#fff', padding: 8 }} />
            <div style={{ color: '#ffffff25', fontSize: 10, marginTop: 10, wordBreak: 'break-all' }}>{linkJogar}</div>
          </div>

          {/* Avatares dos alunos */}
          <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDA}` }}>
            <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Jogadores na sala ({players.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, maxHeight: 300, overflowY: 'auto' }}>
              {players.length === 0 ? (
                <div style={{ color: '#ffffff25', fontSize: 14, width: '100%', textAlign: 'center', padding: '40px 20px' }}>
                  Aguardando alunos entrarem com o código...
                </div>
              ) : (
                players.map((p, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 56 }}>
                    <div style={{ fontSize: 34 }}>{p.avatar}</div>
                    <div style={{ color: '#ffffff80', fontSize: 10, fontWeight: 600, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {p.nome.split(' ')[0]}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Botão Começar */}
        <div style={{ padding: '0 20px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <button
            onClick={iniciarJogo}
            disabled={players.length === 0}
            style={{
              width: '100%',
              background: players.length > 0 ? 'linear-gradient(135deg, #00FF88, #008844)' : '#2a2a3e',
              border: 'none', borderRadius: 20, padding: '20px',
              color: players.length > 0 ? '#000' : '#555',
              fontWeight: 900, fontSize: 22, cursor: players.length > 0 ? 'pointer' : 'default',
              letterSpacing: 2, transition: 'all .3s',
              boxShadow: players.length > 0 ? '0 0 40px #00FF8833' : 'none',
            }}
          >
            {players.length === 0 ? 'Aguardando jogadores...' : `▶ COMEÇAR O JOGO (${players.length} jogadores)`}
          </button>
        </div>
      </div>
    )
  }

  /* ── Playing ── */
  if (estado === 'playing' && questaoHost) {
    const totalTempo = questaoHost.timeLimit || 30
    const pctTimer   = Math.max(0, (tempo / totalTempo) * 100)
    const urgente    = tempo <= 5
    const pctResp    = answerUpdate.totalPlayers > 0
      ? (answerUpdate.totalAnswered / answerUpdate.totalPlayers) * 100 : 0

    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ height: 6, background: '#ffffff15' }}>
          <div style={{ height: '100%', width: `${pctTimer}%`, background: urgente ? '#ef4444' : '#7c3aed', transition: 'width 1s linear' }} />
        </div>

        {/* Header */}
        <div style={{ background: '#000000aa', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffffff10' }}>
          <span style={{ color: '#a0a0c0', fontSize: 14 }}>
            Questão <strong style={{ color: '#fff' }}>{(questaoHost.index ?? 0) + 1}</strong> / {questaoHost.total}
          </span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ color: '#a0a0c0', fontSize: 14 }}>
              <strong style={{ color: '#00FF88', fontSize: 18 }}>{answerUpdate.totalAnswered}</strong>/{answerUpdate.totalPlayers} responderam
            </span>
            <span style={{ color: urgente ? '#ef4444' : '#FFE600', fontWeight: 900, fontSize: 24 }}>{tempo}s</span>
          </div>
        </div>

        <div style={{ maxWidth: 920, margin: '0 auto', padding: 20 }}>

          {/* Placar em tempo real — TODOS os alunos */}
          <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDA}`, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDA}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>🏆 Pontuação em tempo real</span>
              <span style={{ color: '#00FF88', fontWeight: 700, fontSize: 14 }}>{answerUpdate.totalAnswered}/{answerUpdate.totalPlayers} responderam</span>
            </div>
            <div style={{ padding: '8px 0', maxHeight: 420, overflowY: 'auto' }}>
              {[...players]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px', borderBottom: `1px solid ${BORDA}22` }}>
                    <span style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#ffffff30', fontWeight: 900, fontSize: 16, width: 28, textAlign: 'center' }}>
                      {i + 1}º
                    </span>
                    <span style={{ fontSize: 28 }}>{p.avatar}</span>
                    <span style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 15 }}>{p.nome}</span>
                    <span style={{ color: '#FFE600', fontWeight: 900, fontSize: 20 }}>{p.score || 0} pts</span>
                  </div>
                ))
              }
              {players.length === 0 && (
                <div style={{ color: '#ffffff25', textAlign: 'center', padding: '30px 0', fontSize: 14 }}>Nenhum jogador conectado</div>
              )}
            </div>
            {/* Barra de progresso */}
            <div style={{ height: 6, background: '#ffffff10' }}>
              <div style={{ height: '100%', width: `${pctResp}%`, background: 'linear-gradient(90deg,#7c3aed,#00FF88)', transition: 'width .4s' }} />
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={avancar} style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 16, padding: '16px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer', letterSpacing: 1 }}>
              ⏭ REVELAR RESPOSTA
            </button>
            <button onClick={encerrar} style={{ background: '#ffffff0d', border: '1px solid #ffffff20', borderRadius: 16, padding: '16px 18px', color: '#a0a0c0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ✕ Encerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Reveal ── */
  if (estado === 'reveal' && revealData) {
    const isUltima = questaoHost && (questaoHost.index + 1) >= questaoHost.total
    const totalResp = (revealData.answerStats || []).reduce((s, a) => s + a.count, 0)

    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, color: '#FFE600', marginBottom: 20 }}>
            Questão {(revealData.questionIndex ?? 0) + 1} — Resultado
          </h2>

          {/* Resposta correta */}
          <div style={{ background: '#00FF8818', border: '2px solid #00FF8855', borderRadius: 14, padding: '12px 20px', textAlign: 'center', marginBottom: 18 }}>
            <span style={{ color: '#00FF88', fontWeight: 900, fontSize: 15 }}>
              ✓ Resposta correta: {LETRAS[revealData.correctAnswer]}
            </span>
            {questaoHost?.alts?.[revealData.correctAnswer] && (
              <span style={{ color: '#a0ffcc', fontSize: 14 }}> — {questaoHost.alts[revealData.correctAnswer]}</span>
            )}
          </div>

          {/* Distribuição de respostas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {(revealData.answerStats || []).map(stat => {
              const pct    = totalResp > 0 ? Math.round((stat.count / totalResp) * 100) : 0
              const correta = stat.alt === revealData.correctAnswer
              return (
                <div key={stat.alt} style={{ background: CARD, borderRadius: 14, padding: '12px 16px', border: `1px solid ${correta ? '#00FF8844' : BORDA}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ background: CORES_RESP[stat.alt], color: '#000', fontWeight: 900, fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>{LETRAS[stat.alt]}</span>
                    <span style={{ color: correta ? '#00FF88' : '#fff', fontWeight: 700 }}>{stat.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#ffffff10', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: correta ? '#00FF88' : CORES_RESP[stat.alt], borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Leaderboard top 10 */}
          <div style={{ background: CARD, borderRadius: 20, padding: '16px 20px', border: `1px solid ${BORDA}`, marginBottom: 20 }}>
            <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
              🏆 Placar — Top {Math.min(10, revealData.leaderboard?.length || 0)}
            </div>
            {(revealData.leaderboard || []).slice(0, 10).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 9 ? '1px solid #ffffff08' : 'none' }}>
                <span style={{ color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#ffffff30', fontWeight: 900, width: 24, fontSize: 14 }}>#{p.position}</span>
                <span style={{ fontSize: 22 }}>{p.avatar}</span>
                <span style={{ flex: 1, color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.nome}</span>
                <span style={{ color: '#FFE600', fontWeight: 900 }}>{p.score}</span>
              </div>
            ))}
          </div>

          {/* Contagem auto-avanço */}
          {revealData?.autoAvancar && contagemReveal > 0 && (
            <div style={{ background: '#7c3aed22', border: '1px solid #7c3aed55', borderRadius: 14, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 600 }}>⚡ Próxima questão em...</span>
              <span style={{ color: '#FFE600', fontWeight: 900, fontSize: 22 }}>{contagemReveal}s</span>
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={avancar}
              style={{ flex: 1, background: isUltima ? 'linear-gradient(135deg, #FF2D78, #990033)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 16, padding: '16px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer', letterSpacing: 1 }}
            >
              {isUltima ? '🏁 VER RESULTADO FINAL' : '▶ PRÓXIMA QUESTÃO'}
            </button>
            {!isUltima && (
              <button onClick={encerrar} style={{ background: '#ffffff0d', border: '1px solid #ffffff20', borderRadius: 16, padding: '16px 18px', color: '#a0a0c0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✕ Encerrar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Finished ── */
  if (estado === 'finished' && finishedData) {
    const leaderboard = finishedData.leaderboard || []
    const questoes    = finishedData.questoes    || []
    const allAnswers  = hostResults?.allAnswers   || []
    const podium      = leaderboard.slice(0, 3)

    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, color: '#FFE600', marginBottom: 28 }}>🏆 RESULTADO FINAL</h1>

          {/* Pódio */}
          <div style={{ background: CARD, borderRadius: 24, padding: '24px 28px 0', border: `1px solid ${BORDA}`, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20 }}>
              {/* 2º */}
              {podium[1] && (
                <div style={{ textAlign: 'center', marginBottom: 0 }}>
                  <div style={{ fontSize: 44 }}>{podium[1].avatar}</div>
                  <div style={{ color: '#C0C0C0', fontWeight: 900, fontSize: 14, marginTop: 4 }}>{podium[1].nome.split(' ')[0]}</div>
                  <div style={{ color: '#C0C0C0', fontSize: 12, marginBottom: 8 }}>{podium[1].score} pts</div>
                  <div style={{ background: '#888', color: '#fff', fontWeight: 900, padding: '14px 20px', borderRadius: '10px 10px 0 0', fontSize: 22, minWidth: 80 }}>🥈</div>
                </div>
              )}
              {/* 1º */}
              {podium[0] && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 60, filter: 'drop-shadow(0 0 20px gold)' }}>{podium[0].avatar}</div>
                  <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 16, marginTop: 4 }}>{podium[0].nome.split(' ')[0]}</div>
                  <div style={{ color: '#FFD700', fontSize: 13, marginBottom: 8 }}>{podium[0].score} pts</div>
                  <div style={{ background: '#FFD700', color: '#000', fontWeight: 900, padding: '20px 28px', borderRadius: '10px 10px 0 0', fontSize: 28, minWidth: 100 }}>🥇</div>
                </div>
              )}
              {/* 3º */}
              {podium[2] && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 38 }}>{podium[2].avatar}</div>
                  <div style={{ color: '#CD7F32', fontWeight: 900, fontSize: 14, marginTop: 4 }}>{podium[2].nome.split(' ')[0]}</div>
                  <div style={{ color: '#CD7F32', fontSize: 12, marginBottom: 8 }}>{podium[2].score} pts</div>
                  <div style={{ background: '#8B5E3C', color: '#fff', fontWeight: 900, padding: '10px 16px', borderRadius: '10px 10px 0 0', fontSize: 18, minWidth: 80 }}>🥉</div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela detalhada aluno × questão */}
          {allAnswers.length > 0 && questoes.length > 0 ? (
            <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDA}`, overflow: 'auto', marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDA}` }}>
                <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
                  Detalhamento por aluno
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr style={{ background: '#ffffff06' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#a0a0c0', fontWeight: 700, borderBottom: `1px solid ${BORDA}`, whiteSpace: 'nowrap' }}>Aluno</th>
                    {questoes.map((_, i) => (
                      <th key={i} style={{ padding: '10px 10px', textAlign: 'center', color: '#a0a0c0', fontWeight: 700, borderBottom: `1px solid ${BORDA}`, minWidth: 44 }}>Q{i + 1}</th>
                    ))}
                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#FFE600', fontWeight: 700, borderBottom: `1px solid ${BORDA}`, whiteSpace: 'nowrap' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {allAnswers.sort((a, b) => b.score - a.score).map((player, pi) => (
                    <tr key={pi} style={{ borderBottom: `1px solid ${BORDA}22` }}>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 18, marginRight: 8 }}>{player.avatar}</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{player.nome}</span>
                      </td>
                      {questoes.map((_, qi) => {
                        const ans = (player.answers || []).find(a => a.questionIndex === qi)
                        if (!ans) return <td key={qi} style={{ textAlign: 'center', color: '#ffffff25' }}>—</td>
                        return (
                          <td key={qi} style={{ textAlign: 'center', padding: '10px 10px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 7,
                              background: ans.correct ? '#00FF8822' : ans.answer === -1 ? '#ffffff08' : '#FF2D7822',
                              border: `1.5px solid ${ans.correct ? '#00FF88' : ans.answer === -1 ? '#ffffff25' : '#FF2D78'}`,
                              color: ans.correct ? '#00FF88' : ans.answer === -1 ? '#555' : '#FF2D78',
                              fontSize: 14,
                            }}>
                              {ans.correct ? '✓' : ans.answer === -1 ? '—' : '✗'}
                            </span>
                          </td>
                        )
                      })}
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#FFE600', fontWeight: 900 }}>{player.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Fallback: só placar */
            <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDA}`, marginBottom: 20 }}>
              <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Placar Final</div>
              {leaderboard.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < leaderboard.length - 1 ? `1px solid ${BORDA}33` : 'none' }}>
                  <span style={{ color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#ffffff30', fontWeight: 900, width: 28 }}>#{p.position}</span>
                  <span style={{ fontSize: 22 }}>{p.avatar}</span>
                  <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{p.nome}</span>
                  <span style={{ color: '#FFE600', fontWeight: 900 }}>{p.score}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => window.close()}
            style={{ width: '100%', background: '#ffffff10', border: 'none', borderRadius: 14, padding: '14px', color: '#a0a0c0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return <Spinner texto="Aguarde..." />
}
