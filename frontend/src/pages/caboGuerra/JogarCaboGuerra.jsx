/**
 * Jogar Cabo de Guerra — tela do aluno
 * Aluno escolhe time → aguarda pergunta liberada → responde → vê corda mover
 * Polling a cada 2s para manter a tela sincronizada com o professor
 * Backend rejeita qualquer ação se status != em_andamento
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/node-api'
const AZUL = '#3b82f6'
const LARANJA = '#f97316'
const BG = '#0f0c29'
const CARD = '#16213e'
const BORDA = '#2a2a5e'

function CordaBar({ posicao, limite, time1Nome, time2Nome }) {
  const pct = 50 + (posicao / limite) * 50
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: AZUL, fontWeight: 700 }}>{time1Nome}</span>
        <span style={{ color: '#64748b', fontSize: 11 }}>Posição: {posicao > 0 ? '+' : ''}{posicao}</span>
        <span style={{ color: LARANJA, fontWeight: 700 }}>{time2Nome}</span>
      </div>
      <div style={{ position: 'relative', height: 16, background: '#ffffff15', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${AZUL}, ${LARANJA})`,
          transition: 'width .6s ease',
          borderRadius: 8,
        }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#FFE600', transform: 'translateX(-50%)' }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', border: `3px solid ${pct > 50 ? AZUL : LARANJA}`,
          transition: 'left .6s ease',
        }} />
      </div>
    </div>
  )
}

export default function JogarCaboGuerra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token_aluno')
  const alunoLocal = JSON.parse(localStorage.getItem('aluno') || '{}')

  const [estado, setEstado] = useState(null) // estado atual da partida (polling público)
  const [meuTime, setMeuTime] = useState(null) // { time: 1|2, time_nome: '...' }
  const [jaRespondeu, setJaRespondeu] = useState(false)
  const [respostaCorreta, setRespostaCorreta] = useState(null)
  const [escolhida, setEscolhida] = useState(null)
  const [respondendo, setRespondendo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const ultimaPerguntatRef = useRef(-1)
  const pollingRef = useRef(null)

  const cabecalho = { headers: { Authorization: `Bearer ${token}` } }

  // Polling do estado público (projetor)
  const pollEstado = useCallback(async () => {
    try {
      const r = await fetch(`${API}/cabo-guerra/estado/${id}`)
      const data = await r.json()
      setEstado(prev => {
        // Quando professor avança pergunta, reseta estado de resposta do aluno
        if (prev && data.pergunta_atual_index !== prev.pergunta_atual_index) {
          setJaRespondeu(false)
          setRespostaCorreta(null)
          setEscolhida(null)
        }
        return data
      })
    } catch { /* ignora */ }
    finally { setCarregando(false) }
  }, [id])

  // Carrega o time do aluno
  const carregarMeuTime = useCallback(async () => {
    if (!token) return
    try {
      const { data } = await axios.get(`${API}/cabo-guerra/${id}/meu-time`, cabecalho)
      setMeuTime(data.time ? data : null)
    } catch { /* ignora */ }
  }, [id, token]) // eslint-disable-line

  useEffect(() => {
    if (!token) return navigate('/aluno/login')
    pollEstado()
    carregarMeuTime()
    pollingRef.current = setInterval(pollEstado, 2000)
    return () => clearInterval(pollingRef.current)
  }, []) // eslint-disable-line

  // Quando muda a pergunta atual, verifica se aluno já respondeu
  useEffect(() => {
    if (!estado || !token) return
    if (estado.pergunta_atual_index !== ultimaPerguntatRef.current) {
      ultimaPerguntatRef.current = estado.pergunta_atual_index
      setJaRespondeu(false)
      setRespostaCorreta(null)
      setEscolhida(null)
      // Verifica se já respondeu esta pergunta (pode ter respondido antes do polling)
      axios.get(`${API}/cabo-guerra/${id}/minha-resposta`, cabecalho)
        .then(({ data }) => {
          if (data.ja_respondeu) {
            setJaRespondeu(true)
            setRespostaCorreta(data.correta)
          }
        }).catch(() => {})
    }
  }, [estado?.pergunta_atual_index]) // eslint-disable-line

  async function escolherTime(timeNum) {
    if (!token) return navigate('/aluno/login')
    try {
      const { data } = await axios.post(`${API}/cabo-guerra/${id}/entrar`, { time_numero: timeNum }, cabecalho)
      setMeuTime({ time: timeNum, time_nome: data.time_nome })
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao entrar na partida')
    }
  }

  async function responder(idx) {
    if (jaRespondeu || respondendo || !estado?.pergunta_liberada) return
    if (!token) return navigate('/aluno/login')
    setRespondendo(true)
    setEscolhida(idx)
    try {
      const { data } = await axios.post(`${API}/cabo-guerra/${id}/responder`, { resposta_dada: idx }, cabecalho)
      setJaRespondeu(true)
      setRespostaCorreta(data.correta)
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao registrar resposta')
      setEscolhida(null)
    } finally {
      setRespondendo(false)
    }
  }

  if (carregando) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div><p>Carregando...</p></div>
    </div>
  )

  if (!estado) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8fa3', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>⚠️</div><p>Partida não encontrada</p></div>
    </div>
  )

  // Partida finalizada
  if (estado.status === 'finalizado') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif', gap: 20 }}>
        <div style={{ fontSize: 80 }}>🏁</div>
        <h2 style={{ color: '#FFE600', fontWeight: 900, fontSize: 26, textAlign: 'center', margin: 0 }}>Partida Encerrada!</h2>
        {estado.vencedor && (
          <div style={{ background: '#FFE60022', border: '2px solid #FFE600', borderRadius: 20, padding: '16px 32px', textAlign: 'center' }}>
            <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 20 }}>🏆 {estado.vencedor}</div>
          </div>
        )}
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <CordaBar posicao={estado.posicao_corda} limite={estado.limite_vitoria} time1Nome={estado.time1_nome} time2Nome={estado.time2_nome} />
        </div>
        <button
          onClick={() => navigate('/aluno/dashboard')}
          style={{ background: '#ffffff12', border: 'none', borderRadius: 14, padding: '14px 32px', color: '#a0a0c0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          ← Voltar ao início
        </button>
      </div>
    )
  }

  // Partida não iniciada
  if (estado.status !== 'em_andamento') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>⏳</div><p>Aguardando professor iniciar...</p></div>
      </div>
    )
  }

  // Selecionar time
  if (!meuTime?.time) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif', gap: 24 }}>
        <div style={{ fontSize: 64 }}>🪢</div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, textAlign: 'center', margin: 0 }}>{estado.titulo}</h2>
        <p style={{ color: '#64748b', fontSize: 15, textAlign: 'center', margin: 0 }}>Olá, {alunoLocal.nome}!<br/>Escolha seu time:</p>

        {erro && <div style={{ color: '#fca5a5', background: '#ef444422', border: '1px solid #ef444466', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 380 }}>
          <button
            onClick={() => escolherTime(1)}
            style={{ flex: 1, background: `linear-gradient(135deg, ${AZUL}, #1d4ed8)`, border: 'none', borderRadius: 20, padding: '24px 16px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer' }}
          >
            {estado.time1_nome}<br /><span style={{ fontSize: 30 }}>🔵</span><br /><span style={{ fontSize: 12, opacity: .7 }}>{estado.time1_participantes} alunos</span>
          </button>
          <button
            onClick={() => escolherTime(2)}
            style={{ flex: 1, background: `linear-gradient(135deg, ${LARANJA}, #c2410c)`, border: 'none', borderRadius: 20, padding: '24px 16px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer' }}
          >
            {estado.time2_nome}<br /><span style={{ fontSize: 30 }}>🟠</span><br /><span style={{ fontSize: 12, opacity: .7 }}>{estado.time2_participantes} alunos</span>
          </button>
        </div>
      </div>
    )
  }

  const corTime = meuTime.time === 1 ? AZUL : LARANJA
  const questao = estado.questao_atual

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#000000aa', padding: '10px 16px', borderBottom: '1px solid #ffffff10', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#a0a0c0', fontSize: 11 }}>{alunoLocal.nome}</div>
          <div style={{ color: corTime, fontWeight: 700, fontSize: 14 }}>🎯 {meuTime.time_nome}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 13 }}>
            {estado.pergunta_atual_index >= 0 ? `Pergunta ${estado.pergunta_atual_index + 1}/${estado.total_perguntas}` : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: AZUL, fontSize: 12, fontWeight: 700 }}>{estado.time1_pontos} pts</div>
          <div style={{ color: LARANJA, fontSize: 12, fontWeight: 700 }}>{estado.time2_pontos} pts</div>
        </div>
      </div>

      {/* Corda */}
      <div style={{ padding: '8px 16px', background: CARD, borderBottom: `1px solid ${BORDA}` }}>
        <CordaBar posicao={estado.posicao_corda} limite={estado.limite_vitoria} time1Nome={estado.time1_nome} time2Nome={estado.time2_nome} />
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', gap: 16 }}>
        {!estado.pergunta_liberada ? (
          /* Aguardando professor liberar */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
            <h3 style={{ color: '#94a3b8', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Aguardando professor...</h3>
            <p style={{ color: '#475569', fontSize: 14 }}>A próxima pergunta será liberada em breve</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: corTime, animation: `dot ${1.2}s ${i*0.3}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        ) : jaRespondeu ? (
          /* Já respondeu — mostra feedback */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>{respostaCorreta ? '✅' : '❌'}</div>
            <div style={{ color: respostaCorreta ? '#22c55e' : '#ef4444', fontWeight: 900, fontSize: 28 }}>
              {respostaCorreta ? 'CORRETO!' : 'ERROU!'}
            </div>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 12 }}>Aguardando próxima pergunta...</p>
          </div>
        ) : questao ? (
          /* Pergunta liberada — aluno responde */
          <>
            <div style={{ background: '#ffffff08', borderRadius: 16, padding: '16px', textAlign: 'center', width: '100%', maxWidth: 420 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0, lineHeight: 1.4 }}>{questao.texto}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 420 }}>
              {(questao.alternativas || []).map((alt, i) => {
                const selecionada = escolhida === i
                return (
                  <button
                    key={i}
                    onClick={() => responder(i)}
                    disabled={jaRespondeu || respondendo}
                    style={{
                      background: ['#e21b3c', '#1368ce', '#d89e00', '#26890c'][i],
                      border: selecionada ? '3px solid #fff' : '3px solid transparent',
                      borderRadius: 16,
                      padding: '16px 10px',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: jaRespondeu ? 'default' : 'pointer',
                      opacity: jaRespondeu && !selecionada ? 0.4 : 1,
                      minHeight: 72,
                      lineHeight: 1.3,
                    }}
                  >
                    {['▲','◆','⬤','■'][i]} {alt}
                  </button>
                )
              })}
            </div>
            <p style={{ color: '#475569', fontSize: 12 }}>Toque na alternativa para responder</p>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 48 }}>⏳</div>
            <p>Aguardando...</p>
          </div>
        )}
      </div>

      {erro && (
        <div style={{ background: '#ef444422', border: '1px solid #ef444466', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', margin: '0 12px 12px', fontSize: 14, textAlign: 'center' }}>
          {erro}
        </div>
      )}

      <style>{`
        @keyframes dot { 0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)} }
      `}</style>
    </div>
  )
}
