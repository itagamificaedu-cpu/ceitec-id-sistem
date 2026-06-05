/**
 * Tela de Projeção — Cabo de Guerra (TV/Datashow)
 * Fundo escuro, tema de jogo. Polling a cada 2s.
 * Sem autenticação — qualquer pessoa com o link pode ver.
 */

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || '/node-api'
const AZUL = '#3b82f6'
const LARANJA = '#f97316'
const BG = '#050a12'

function StickFigure({ cor, lado }) {
  const flip = lado === 'right' ? 'scaleX(-1)' : 'scaleX(1)'
  return (
    <svg width="60" height="80" viewBox="0 0 60 80" fill="none" style={{ transform: flip }}>
      {/* Cabeça */}
      <circle cx="30" cy="14" r="11" stroke={cor} strokeWidth="3" fill="none"/>
      {/* Corpo */}
      <line x1="30" y1="25" x2="30" y2="52" stroke={cor} strokeWidth="3"/>
      {/* Braços — segurando a corda */}
      <line x1="10" y1="36" x2="30" y2="32" stroke={cor} strokeWidth="3"/>
      <line x1="30" y1="32" x2="50" y2="36" stroke={cor} strokeWidth="3"/>
      {/* Pernas */}
      <line x1="30" y1="52" x2="16" y2="74" stroke={cor} strokeWidth="3"/>
      <line x1="30" y1="52" x2="44" y2="74" stroke={cor} strokeWidth="3"/>
    </svg>
  )
}

function Confete() {
  const cores = ['#FFE600','#22c55e','#3b82f6','#f97316','#ec4899','#8b5cf6']
  const pcs = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    cor: cores[i % cores.length],
    x: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
      {pcs.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: '-10px',
          width: p.size,
          height: p.size,
          background: p.cor,
          borderRadius: 2,
          animation: `cair ${p.dur}s ${p.delay}s linear infinite`,
        }} />
      ))}
      <style>{`
        @keyframes cair {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1 }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0 }
        }
      `}</style>
    </div>
  )
}

export default function ProjetorCaboGuerra() {
  const { id } = useParams()
  const [estado, setEstado] = useState(null)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(null)
  const pollingRef = useRef(null)
  const ultimaPerguntaRef = useRef(-1)

  async function pollEstado() {
    try {
      const r = await fetch(`${API}/cabo-guerra/estado/${id}`)
      const data = await r.json()
      setEstado(data)

      // Reinicia o timer quando uma nova pergunta for liberada
      if (data.pergunta_liberada && data.pergunta_liberada_em) {
        const inicio = new Date(data.pergunta_liberada_em).getTime()
        const decorreu = Math.floor((Date.now() - inicio) / 1000)
        const restante = Math.max(0, data.tempo_por_pergunta - decorreu)

        if (data.pergunta_atual_index !== ultimaPerguntaRef.current) {
          ultimaPerguntaRef.current = data.pergunta_atual_index
          clearInterval(timerRef.current)
          setTimer(restante)
          timerRef.current = setInterval(() => {
            setTimer(t => {
              if (t <= 1) { clearInterval(timerRef.current); return 0 }
              return t - 1
            })
          }, 1000)
        }
      } else if (!data.pergunta_liberada) {
        clearInterval(timerRef.current)
        setTimer(0)
      }
    } catch { /* ignora */ }
  }

  useEffect(() => {
    pollEstado()
    pollingRef.current = setInterval(pollEstado, 2000)
    return () => {
      clearInterval(pollingRef.current)
      clearInterval(timerRef.current)
    }
  }, [id]) // eslint-disable-line

  if (!estado) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>⏳</div><p>Aguardando...</p></div>
    </div>
  )

  const pct = 50 + (estado.posicao_corda / estado.limite_vitoria) * 50
  const urgente = timer > 0 && timer <= 5
  const finalizado = estado.status === 'finalizado'
  const questao = estado.questao_atual

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: "'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {finalizado && <Confete />}

      {/* Header */}
      <div style={{ background: '#000000cc', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffffff0a' }}>
        <div style={{ color: '#ffffff60', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          🪢 Cabo de Guerra
        </div>
        <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 22, letterSpacing: 2 }}>
          {estado.titulo}
        </div>
        <div style={{ color: '#ffffff40', fontSize: 13 }}>
          {estado.status === 'em_andamento' ? `Pergunta ${estado.pergunta_atual_index + 1}/${estado.total_perguntas}` : estado.status.toUpperCase()}
        </div>
      </div>

      {/* Placar dos times */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0, padding: '20px 28px 0', alignItems: 'center' }}>
        {/* Time 1 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: AZUL, fontWeight: 900, fontSize: 32 }}>{estado.time1_nome}</div>
          <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 48 }}>{estado.time1_pontos}</div>
          <div style={{ color: '#334155', fontSize: 13 }}>{estado.time1_participantes} alunos</div>
        </div>

        {/* VS */}
        <div style={{ color: '#334155', fontWeight: 900, fontSize: 24, padding: '0 20px' }}>VS</div>

        {/* Time 2 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: LARANJA, fontWeight: 900, fontSize: 32 }}>{estado.time2_nome}</div>
          <div style={{ color: '#fb923c', fontWeight: 700, fontSize: 48 }}>{estado.time2_pontos}</div>
          <div style={{ color: '#334155', fontSize: 13 }}>{estado.time2_participantes} alunos</div>
        </div>
      </div>

      {/* Corda animada com bonecos */}
      <div style={{ padding: '16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <StickFigure cor={AZUL} lado="left" />
          <div style={{ flex: 1, margin: '0 16px', position: 'relative' }}>
            {/* Barra */}
            <div style={{ height: 24, background: '#ffffff0a', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${AZUL}, ${LARANJA})`,
                transition: 'width .8s ease',
                borderRadius: 12,
              }} />
              {/* Linha central */}
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, background: '#FFE600', transform: 'translateX(-50%)' }} />
              {/* Nó da corda */}
              <div style={{
                position: 'absolute', top: '50%', left: `${pct}%`,
                transform: 'translate(-50%, -50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: '#fff', border: `4px solid ${pct > 50 ? AZUL : LARANJA}`,
                transition: 'left .8s ease',
                boxShadow: `0 0 20px ${pct > 50 ? AZUL : LARANJA}88`,
              }} />
            </div>
            {/* Marcadores de limite */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {Array.from({ length: estado.limite_vitoria * 2 + 1 }, (_, i) => {
                const pos = i - estado.limite_vitoria
                return (
                  <div key={i} style={{
                    width: 4, height: 8,
                    background: pos === 0 ? '#FFE600' : '#ffffff20',
                    borderRadius: 2,
                  }} />
                )
              })}
            </div>
          </div>
          <StickFigure cor={LARANJA} lado="right" />
        </div>

        {/* Indicador de posição */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          {estado.posicao_corda > 0 && (
            <span style={{ color: AZUL, fontWeight: 700, fontSize: 14 }}>
              ← {estado.time1_nome} puxa a corda! ({estado.posicao_corda}/{estado.limite_vitoria})
            </span>
          )}
          {estado.posicao_corda < 0 && (
            <span style={{ color: LARANJA, fontWeight: 700, fontSize: 14 }}>
              {estado.time2_nome} puxa a corda! ({Math.abs(estado.posicao_corda)}/{estado.limite_vitoria}) →
            </span>
          )}
          {estado.posicao_corda === 0 && (
            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 14 }}>Centro — empatados!</span>
          )}
        </div>
      </div>

      {/* Área central — pergunta ou mensagem */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px 20px' }}>
        {finalizado ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 100, marginBottom: 16 }}>🏆</div>
            <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 52, textShadow: '0 0 40px #FFE60066' }}>
              {estado.vencedor}
            </div>
            <div style={{ color: '#ffffff40', fontWeight: 700, fontSize: 20, marginTop: 8 }}>
              VENCEU O CABO DE GUERRA!
            </div>
          </div>
        ) : !estado.pergunta_liberada ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#334155', fontSize: 18, fontWeight: 600 }}>
              {estado.status === 'em_andamento'
                ? '⏸ Aguardando o professor liberar a próxima pergunta...'
                : '⏳ Aguardando o professor iniciar a partida...'}
            </div>
          </div>
        ) : questao ? (
          <div style={{ width: '100%', maxWidth: 800 }}>
            {/* Timer */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{
                color: urgente ? '#ef4444' : '#FFE600',
                fontWeight: 900, fontSize: 48,
                animation: urgente ? 'blink .5s infinite' : 'none',
                filter: urgente ? 'drop-shadow(0 0 12px #ef4444)' : 'none',
              }}>
                {timer > 0 ? timer : '⌛'}
              </span>
            </div>

            {/* Pergunta */}
            <div style={{ background: '#ffffff08', borderRadius: 20, padding: '20px 28px', textAlign: 'center', marginBottom: 16 }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 26, margin: 0, lineHeight: 1.4 }}>
                {questao.texto}
              </p>
            </div>

            {/* Alternativas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(questao.alternativas || []).map((alt, i) => (
                <div key={i} style={{
                  background: ['#e21b3c22','#1368ce22','#d89e0022','#26890c22'][i],
                  border: `2px solid ${['#e21b3c','#1368ce','#d89e00','#26890c'][i]}55`,
                  borderRadius: 16,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span style={{
                    background: ['#e21b3c','#1368ce','#d89e00','#26890c'][i],
                    color: '#fff', fontWeight: 900, borderRadius: 8,
                    padding: '4px 10px', fontSize: 14, flexShrink: 0,
                  }}>
                    {['A','B','C','D'][i]}
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 16 }}>{alt}</span>
                </div>
              ))}
            </div>

            {/* Contador de respostas */}
            <div style={{ textAlign: 'center', marginTop: 12, color: '#334155', fontSize: 14 }}>
              {estado.respostas_recebidas} respostas recebidas
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}
