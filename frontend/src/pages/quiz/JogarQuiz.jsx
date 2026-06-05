/**
 * Quiz ao Vivo — Tela do Aluno
 * Conecta via Socket.io à sala criada pelo professor e exibe
 * lobby → questões → feedback → pódio individual
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const CORES  = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const FORMAS = ['▲', '◆', '⬤', '■']

const AVATARS = [
  '🦊','🐼','🐯','🦁','🐸','🦄','🐧','🦋','🐺','🦝',
  '🐭','🐰','🐻','🐨','🐮','🐷','🐙','🦑','🦀','🐬',
  '🦈','🦜','🦚','🦩','🐓','🦉','🦎','🐢','🦘','🦔',
]
const BG     = '#0f0c29'
const CARD   = '#1a1a3e'
const BORDA  = '#3a3a6a'

/* ── Spinner genérico ── */
function Spinner({ texto }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>⏳</div>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>{texto}</p>
    </div>
  )
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function JogarQuiz() {
  const { codigo } = useParams()
  const [searchParams] = useSearchParams()
  const alunoCode  = searchParams.get('aluno') || ''
  const nomeParam  = searchParams.get('nome')  || ''

  /* estados do jogo */
  const [etapa,          setEtapa]          = useState('setup')
  const [nome,           setNome]           = useState(nomeParam)
  const [avatarEscolhido,setAvatarEscolhido]= useState(null)
  const [erro,           setErro]           = useState('')
  const [playerInfo,  setPlayerInfo]  = useState(null)   // {nome,avatar,quizTitulo,totalQuestoes}
  const [questao,     setQuestao]     = useState(null)   // {enunciado,alts,timeLimit,index,total}
  const [tempo,       setTempo]       = useState(30)
  const [respondeu,   setRespondeu]   = useState(false)
  const [escolhida,   setEscolhida]   = useState(null)
  const [feedback,    setFeedback]    = useState(null)   // {correct,points,totalScore,position,...}
  const [meuResultado,setMeuResultado]= useState(null)   // {position,score,answers}
  const [dadosFinais, setDadosFinais] = useState(null)   // {leaderboard,totalQuestoes,questoes}

  const socketRef  = useRef(null)
  const timerRef   = useRef(null)
  const etapaRef   = useRef('setup')
  etapaRef.current = etapa

  /* ── Conecta Socket.io e registra eventos ── */
  const conectar = useCallback((nomeFinal) => {
    if (socketRef.current) socketRef.current.disconnect()
    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('quiz:join', {
        codigo:         (codigo || '').toUpperCase(),
        alunoCode:      alunoCode || undefined,
        alunoNome:      nomeFinal,
        avatarEscolhido: avatarEscolhido || undefined,
      })
    })

    socket.on('quiz:error', msg => {
      setErro(msg)
      setEtapa('setup')
      socket.disconnect()
      socketRef.current = null
    })

    socket.on('quiz:joined', data => {
      setPlayerInfo(data)
      setEtapa('lobby')
    })

    socket.on('quiz:game-start', () => setEtapa('aguardando-questao'))

    socket.on('quiz:question', q => {
      clearInterval(timerRef.current)
      setQuestao(q)
      setTempo(q.timeLimit || 30)
      setRespondeu(false)
      setEscolhida(null)
      setFeedback(null)
      setEtapa('playing')
    })

    socket.on('quiz:answer-ack', () => {
      if (etapaRef.current === 'playing') setEtapa('answered')
    })

    socket.on('quiz:feedback', data => {
      clearInterval(timerRef.current)
      setFeedback(data)
      setEtapa('feedback')
    })

    socket.on('quiz:my-results', data => setMeuResultado(data))

    socket.on('quiz:finished', data => {
      setDadosFinais(data)
      setEtapa('finished')
    })

    socket.on('disconnect', () => {
      if (etapaRef.current !== 'finished') {
        setErro('Conexão perdida. Recarregue a página.')
        setEtapa('setup')
      }
    })
  }, [codigo, alunoCode, avatarEscolhido])

  /* Auto-conectar se nome vier via URL (aluno chegando do portal) */
  useEffect(() => {
    if (nomeParam) {
      setEtapa('conectando')
      conectar(nomeParam)
    }
    return () => {
      clearInterval(timerRef.current)
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, []) // eslint-disable-line

  /* Timer regressivo */
  useEffect(() => {
    if (etapa !== 'playing' || respondeu || !questao) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          if (!respondeu && socketRef.current) {
            socketRef.current.emit('quiz:answer', { answer: -1, timeLeft: 0 })
            setRespondeu(true)
            setEtapa('answered')
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [questao?.index, etapa, respondeu]) // eslint-disable-line

  function entrar() {
    const nomeFinal = nome.trim()
    if (!nomeFinal) return setErro('Digite seu nome para entrar!')
    setErro('')
    setEtapa('conectando')
    conectar(nomeFinal)
  }

  function responder(idx) {
    if (respondeu || etapa !== 'playing' || !socketRef.current) return
    setRespondeu(true)
    setEscolhida(idx)
    clearInterval(timerRef.current)
    socketRef.current.emit('quiz:answer', { answer: idx, timeLeft: tempo })
  }

  /* ══════════════════════════════════════════
     TELAS
  ══════════════════════════════════════════ */

  /* ── Setup / Entrada ── */
  if (etapa === 'setup') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: CARD, borderRadius: 24, padding: 32, maxWidth: 400, width: '100%', border: `1px solid ${BORDA}`, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 26, margin: '0 0 4px' }}>Quiz ao Vivo</h1>
        <p style={{ color: '#a0a0c0', fontSize: 14, margin: '0 0 24px' }}>
          Código: <strong style={{ color: '#FFE600', letterSpacing: 4 }}>{(codigo || '').toUpperCase()}</strong>
        </p>

        {erro && (
          <div style={{ background: '#ff2d7822', border: '1px solid #ff2d7866', borderRadius: 10, padding: '10px 14px', color: '#ff8fa3', marginBottom: 16, fontSize: 14 }}>
            {erro}
          </div>
        )}

        <input
          style={{ width: '100%', background: '#ffffff15', border: '2px solid #ffffff30', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
          placeholder="Seu nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && entrar()}
          maxLength={30}
          autoFocus
        />

        {/* Seletor de avatar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Escolha seu avatar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {AVATARS.map(av => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatarEscolhido(av === avatarEscolhido ? null : av)}
                style={{
                  fontSize: 24,
                  background: av === avatarEscolhido ? '#7c3aed55' : '#ffffff10',
                  border: `2px solid ${av === avatarEscolhido ? '#7c3aed' : 'transparent'}`,
                  borderRadius: 10,
                  padding: '5px 0',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  transform: av === avatarEscolhido ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: av === avatarEscolhido ? '0 0 10px #7c3aed88' : 'none',
                }}
              >
                {av}
              </button>
            ))}
          </div>
          {avatarEscolhido && (
            <div style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600, marginTop: 6, textAlign: 'center' }}>
              Avatar escolhido: {avatarEscolhido}
            </div>
          )}
        </div>

        {alunoCode && (
          <p style={{ color: '#00FF88', fontSize: 12, marginBottom: 16, fontWeight: 600 }}>
            ⚡ Código {alunoCode} — XP será contabilizado!
          </p>
        )}

        <button
          onClick={entrar}
          style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 14, padding: '14px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer', letterSpacing: 1 }}
        >
          ▶ ENTRAR
        </button>
      </div>
    </div>
  )

  if (etapa === 'conectando') return <Spinner texto="Entrando na sala..." />

  /* ── Lobby ── */
  if (etapa === 'lobby') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a0533, #0f0c29)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}>
      <div style={{ fontSize: 88, filter: 'drop-shadow(0 0 24px #7c3aed88)', lineHeight: 1 }}>
        {playerInfo?.avatar || '🦊'}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{playerInfo?.nome}</div>
        <div style={{ color: '#a0a0c0', fontSize: 14, marginTop: 6 }}>{playerInfo?.quizTitulo}</div>
        {playerInfo?.totalQuestoes && (
          <div style={{ color: '#ffffff40', fontSize: 12, marginTop: 4 }}>{playerInfo.totalQuestoes} questões</div>
        )}
      </div>
      <div style={{ background: '#ffffff0d', border: '1px solid #ffffff15', borderRadius: 20, padding: '18px 36px', textAlign: 'center' }}>
        <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' }}>
          AGUARDANDO O PROFESSOR
        </div>
        <div style={{ color: '#ffffff50', fontSize: 13, marginTop: 6 }}>O jogo começará em breve...</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: `dot 1.2s ${i * 0.4}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes dot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}`}</style>
    </div>
  )

  if (etapa === 'aguardando-questao') return <Spinner texto="Jogo iniciado! Preparando a primeira questão..." />

  /* ── Jogo ── */
  if ((etapa === 'playing' || etapa === 'answered') && questao) {
    const totalTempo = questao.timeLimit || 30
    const pctTimer   = Math.max(0, (tempo / totalTempo) * 100)
    const urgente    = tempo <= 5 && !respondeu

    return (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column' }}>
        {/* Barra de tempo */}
        <div style={{ height: 8, background: '#ffffff15', flexShrink: 0 }}>
          <div style={{
            height: '100%', width: `${pctTimer}%`,
            background: urgente ? '#ef4444' : 'linear-gradient(90deg, #7c3aed, #06b6d4)',
            transition: 'width 1s linear, background 0.3s',
          }} />
        </div>

        {/* Header */}
        <div style={{ background: '#0f0c29', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #ffffff10' }}>
          <span style={{ color: '#a0a0c0', fontSize: 13 }}>
            Questão <strong style={{ color: '#fff' }}>{(questao.index ?? 0) + 1}</strong>/{questao.total}
          </span>
          <span style={{
            fontSize: 26, fontWeight: 900,
            color: urgente ? '#ef4444' : '#FFE600',
            animation: urgente ? 'blink .5s infinite' : 'none',
          }}>{tempo}</span>
        </div>

        {/* Enunciado */}
        <div style={{ background: '#ffffff06', padding: '20px 16px', textAlign: 'center', borderBottom: '1px solid #ffffff10', flexShrink: 0 }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.4, margin: 0, maxWidth: 600, marginInline: 'auto' }}>
            {questao.enunciado}
          </p>
        </div>

        {/* Alternativas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 10px 12px' }}>
          {(questao.alts || []).map((alt, idx) => {
            const selecionada = escolhida === idx
            const inativa     = respondeu && !selecionada
            return (
              <button
                key={idx}
                onClick={() => responder(idx)}
                disabled={respondeu}
                style={{
                  background:    CORES[idx],
                  border:        'none',
                  borderRadius:  16,
                  padding:       '14px 10px',
                  color:         '#fff',
                  fontWeight:    800,
                  fontSize:      15,
                  cursor:        respondeu ? 'default' : 'pointer',
                  opacity:       inativa ? 0.35 : 1,
                  transform:     selecionada ? 'scale(0.97)' : 'scale(1)',
                  transition:    'opacity .2s, transform .1s',
                  display:       'flex',
                  alignItems:    'center',
                  gap:           10,
                  textAlign:     'left',
                  minHeight:     72,
                  boxShadow:     selecionada ? '0 0 0 4px rgba(255,255,255,.5)' : 'none',
                }}
              >
                <span style={{ fontSize: 22, opacity: .75 }}>{FORMAS[idx]}</span>
                <span style={{ lineHeight: 1.3, flex: 1 }}>{alt}</span>
              </button>
            )
          })}
        </div>

        {/* Status respondeu */}
        {respondeu && (
          <div style={{ background: '#000000bb', padding: '14px 16px', textAlign: 'center', color: '#a0a0c0', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
            ✓ Resposta registrada — aguardando os outros jogadores...
          </div>
        )}

        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    )
  }

  /* ── Feedback ── */
  if (etapa === 'feedback' && feedback) {
    const correto = feedback.correct
    return (
      <div style={{ minHeight: '100vh', background: correto ? '#011a0f' : '#1a0108', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <div style={{ fontSize: 80 }}>{correto ? '✅' : '❌'}</div>

        <div style={{ color: correto ? '#00FF88' : '#FF2D78', fontWeight: 900, fontSize: 34, letterSpacing: 2, textAlign: 'center' }}>
          {correto ? 'CORRETO!' : 'ERROU!'}
        </div>

        {correto ? (
          <div style={{ background: '#00FF8818', border: '2px solid #00FF8855', borderRadius: 20, padding: '18px 36px', textAlign: 'center' }}>
            <div style={{ color: '#00FF88', fontWeight: 900, fontSize: 32 }}>+{feedback.points} pts</div>
            <div style={{ color: '#ffffff60', fontSize: 13, marginTop: 4 }}>Total acumulado: <strong style={{ color: '#fff' }}>{feedback.totalScore}</strong></div>
          </div>
        ) : (
          <div style={{ background: '#FF2D7818', border: '2px solid #FF2D7855', borderRadius: 20, padding: '18px 36px', textAlign: 'center' }}>
            <div style={{ color: '#ff8fa3', fontSize: 15, fontWeight: 600 }}>Continue tentando! Você consegue 💪</div>
          </div>
        )}

        <div style={{ background: '#ffffff10', borderRadius: 16, padding: '14px 28px', textAlign: 'center' }}>
          <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 24 }}>#{feedback.position}</div>
          <div style={{ color: '#ffffff50', fontSize: 12 }}>de {feedback.totalPlayers} jogadores</div>
        </div>

        {feedback.streak >= 3 && (
          <div style={{ color: '#FF8C00', fontWeight: 700, fontSize: 15 }}>🔥 {feedback.streak} acertos seguidos!</div>
        )}

        <div style={{ color: '#ffffff30', fontSize: 12 }}>Aguardando próxima questão...</div>
      </div>
    )
  }

  /* ── Resultado Final ── */
  if (etapa === 'finished') {
    const pos     = meuResultado?.position
    const score   = meuResultado?.score || 0
    const answers = meuResultado?.answers || []
    const podioEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '🎮'

    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: 20, fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 28 }}>
            <div style={{ fontSize: 72, filter: pos && pos <= 3 ? 'drop-shadow(0 0 24px gold)' : 'none' }}>{podioEmoji}</div>
            <div style={{ fontWeight: 900, fontSize: 28, color: '#FFE600', marginTop: 8 }}>
              {pos ? `${pos}º Lugar` : 'Fim de jogo!'}
            </div>
            <div style={{ color: '#a0a0c0', fontSize: 16, marginTop: 4 }}>{playerInfo?.nome}</div>
            <div style={{ color: '#00FF88', fontWeight: 900, fontSize: 26, marginTop: 10 }}>{score} pontos</div>
          </div>

          {/* Grid de acertos/erros por questão */}
          {answers.length > 0 && (
            <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDA}`, marginBottom: 20 }}>
              <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
                Suas respostas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 8 }}>
                {answers.map((a, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ffffff40', fontSize: 10, marginBottom: 4 }}>Q{i + 1}</div>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, marginInline: 'auto',
                      background: a.correct ? '#00FF8822' : a.answer === -1 ? '#33333355' : '#FF2D7822',
                      border: `2px solid ${a.correct ? '#00FF88' : a.answer === -1 ? '#555' : '#FF2D78'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      color: a.correct ? '#00FF88' : a.answer === -1 ? '#555' : '#FF2D78',
                    }}>
                      {a.correct ? '✓' : a.answer === -1 ? '—' : '✗'}
                    </div>
                    {a.correct && <div style={{ color: '#00FF88', fontSize: 9, marginTop: 2 }}>+{a.points}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
            style={{ width: '100%', background: '#ffffff12', border: 'none', borderRadius: 14, padding: '14px', color: '#a0a0c0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  return <Spinner texto="Carregando..." />
}
