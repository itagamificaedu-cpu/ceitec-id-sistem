/**
 * Painel do Professor — controle total da partida Cabo de Guerra
 * Abre em nova aba. Professor controla: iniciar, liberar pergunta, próxima, encerrar.
 */

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api'

const BG = '#0f0c29'
const CARD = '#16213e'
const BORDA = '#2a2a5e'
const AZUL = '#3b82f6'
const LARANJA = '#f97316'

function calcPorcentagemCorda(posicao, limite) {
  // 0% = time2 vencendo totalmente, 50% = centro, 100% = time1 vencendo totalmente
  return 50 + (posicao / limite) * 50
}

export default function HostCaboGuerra() {
  const { id } = useParams()
  const [partida, setPartida] = useState(null)
  const [questoes, setQuestoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [acao, setAcao] = useState(false) // lock durante ações
  const [participantes, setParticipantes] = useState({ time1: 0, time2: 0 })
  const pollingRef = useRef(null)

  async function carregar() {
    try {
      const [partR, estadoR] = await Promise.all([
        api.get(`/cabo-guerra/${id}`),
        fetch(`/node-api/cabo-guerra/estado/${id}`).then(r => r.json()),
      ])
      const p = partR.data
      setPartida(p)
      setQuestoes((() => { try { return JSON.parse(p.questoes_json || '[]') } catch { return [] } })())
      setParticipantes({ time1: estadoR.time1_participantes || 0, time2: estadoR.time2_participantes || 0 })
    } catch (e) {
      setErro(e.message || 'Erro ao carregar')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    pollingRef.current = setInterval(carregar, 3000)
    return () => clearInterval(pollingRef.current)
  }, [id]) // eslint-disable-line

  async function iniciar() {
    if (!window.confirm('Iniciar a partida agora? Ela ficará visível para os alunos da turma.')) return
    setAcao(true)
    try { await api.post(`/cabo-guerra/${id}/iniciar`); await carregar() }
    catch (e) { alert(e.response?.data?.erro || 'Erro') }
    finally { setAcao(false) }
  }

  async function liberarPergunta() {
    setAcao(true)
    try { await api.post(`/cabo-guerra/${id}/liberar-pergunta`); await carregar() }
    catch (e) { alert(e.response?.data?.erro || 'Erro') }
    finally { setAcao(false) }
  }

  async function proximaPergunta() {
    setAcao(true)
    try { const { data } = await api.post(`/cabo-guerra/${id}/proxima-pergunta`); setPartida(data); await carregar() }
    catch (e) { alert(e.response?.data?.erro || 'Erro') }
    finally { setAcao(false) }
  }

  async function encerrar() {
    if (!window.confirm('Encerrar a partida agora?')) return
    setAcao(true)
    try { await api.post(`/cabo-guerra/${id}/encerrar`); await carregar() }
    catch (e) { alert(e.response?.data?.erro || 'Erro') }
    finally { setAcao(false) }
  }

  if (carregando) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>⏳</div><p>Carregando...</p></div>
    </div>
  )

  if (erro) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8fa3', fontFamily: 'sans-serif', padding: 24 }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>⚠️</div><p>{erro}</p></div>
    </div>
  )

  const pct = calcPorcentagemCorda(partida.posicao_corda, partida.limite_vitoria)
  const questaoAtual = partida.pergunta_atual_index >= 0 ? questoes[partida.pergunta_atual_index] : null
  const isUltima = partida.pergunta_atual_index >= questoes.length - 1

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'sans-serif', padding: 0 }}>
      {/* Header */}
      <div style={{ background: '#000000aa', padding: '14px 20px', borderBottom: '1px solid #ffffff10', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#a0a0c0', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Cabo de Guerra — Painel do Professor</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{partida.titulo}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#a0a0c0', fontSize: 10 }}>Pergunta</div>
            <div style={{ color: '#FFE600', fontWeight: 900 }}>
              {partida.pergunta_atual_index < 0 ? '—' : `${partida.pergunta_atual_index + 1}/${questoes.length}`}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#a0a0c0', fontSize: 10 }}>Status</div>
            <div style={{ color: partida.status === 'em_andamento' ? '#22c55e' : '#94a3b8', fontWeight: 900 }}>
              {partida.status === 'em_andamento' ? '● AO VIVO' : partida.status === 'finalizado' ? '🏁 FINAL' : '📝 RASCUNHO'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>

        {/* Corda — visualização */}
        <div style={{ background: CARD, borderRadius: 20, padding: '20px 24px', border: `1px solid ${BORDA}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: AZUL, fontWeight: 900, fontSize: 20 }}>{partida.time1_nome}</div>
              <div style={{ color: '#a0a0c0', fontSize: 12 }}>{participantes.time1} alunos · {partida.time1_pontos} pts</div>
            </div>
            <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 14 }}>
              {partida.posicao_corda > 0 ? `← ${partida.time1_nome}` : partida.posicao_corda < 0 ? `${partida.time2_nome} →` : 'Centro'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: LARANJA, fontWeight: 900, fontSize: 20 }}>{partida.time2_nome}</div>
              <div style={{ color: '#a0a0c0', fontSize: 12 }}>{participantes.time2} alunos · {partida.time2_pontos} pts</div>
            </div>
          </div>

          {/* Barra da corda */}
          <div style={{ position: 'relative', height: 20, background: '#ffffff15', borderRadius: 10, overflow: 'hidden', margin: '8px 0' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${AZUL}, ${pct > 50 ? AZUL : LARANJA})`,
              transition: 'width .5s ease',
              borderRadius: 10,
            }} />
            {/* Marcador central */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#FFE600', transform: 'translateX(-50%)' }} />
            {/* Nó da corda */}
            <div style={{
              position: 'absolute', top: '50%', left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', border: `3px solid ${pct > 50 ? AZUL : LARANJA}`,
              transition: 'left .5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#ffffff40' }}>
            <span>Limite: {-partida.limite_vitoria}</span>
            <span>Posição: {partida.posicao_corda > 0 ? '+' : ''}{partida.posicao_corda}</span>
            <span>Limite: +{partida.limite_vitoria}</span>
          </div>
        </div>

        {/* Questão atual */}
        {questaoAtual && (
          <div style={{ background: CARD, borderRadius: 20, padding: '20px 24px', border: `1px solid ${BORDA}` }}>
            <div style={{ color: '#a0a0c0', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              Pergunta {partida.pergunta_atual_index + 1} — {partida.pergunta_liberada ? '🟢 Liberada para alunos' : '🔒 Não liberada'}
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{questaoAtual.texto}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[questaoAtual.alt_a, questaoAtual.alt_b, questaoAtual.alt_c, questaoAtual.alt_d].filter(Boolean).map((alt, i) => (
                <div key={i} style={{
                  background: i === questaoAtual.resposta_correta ? '#22c55e22' : '#ffffff08',
                  border: `1px solid ${i === questaoAtual.resposta_correta ? '#22c55e' : BORDA}`,
                  borderRadius: 10, padding: '8px 12px',
                  color: i === questaoAtual.resposta_correta ? '#22c55e' : '#a0a0c0',
                  fontSize: 13,
                }}>
                  <strong>{['A','B','C','D'][i]})</strong> {alt}
                  {i === questaoAtual.resposta_correta && <span style={{ marginLeft: 6 }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vencedor */}
        {partida.status === 'finalizado' && partida.vencedor && (
          <div style={{ background: '#FFE60022', border: '2px solid #FFE600', borderRadius: 20, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 56 }}>🏆</div>
            <div style={{ color: '#FFE600', fontWeight: 900, fontSize: 28, marginTop: 8 }}>
              VENCEDOR: {partida.vencedor}
            </div>
          </div>
        )}

        {/* Botões de controle */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {partida.status === 'rascunho' && (
            <button
              onClick={iniciar}
              disabled={acao}
              style={{ flex: 1, minWidth: 200, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 16, padding: '18px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: acao ? 'default' : 'pointer' }}
            >
              ▶ INICIAR PARTIDA
            </button>
          )}

          {partida.status === 'em_andamento' && !partida.pergunta_liberada && (
            <button
              onClick={liberarPergunta}
              disabled={acao}
              style={{ flex: 1, minWidth: 200, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: 16, padding: '18px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: acao ? 'default' : 'pointer' }}
            >
              🔓 LIBERAR PERGUNTA {partida.pergunta_atual_index + 1}
            </button>
          )}

          {partida.status === 'em_andamento' && partida.pergunta_liberada && (
            <button
              onClick={proximaPergunta}
              disabled={acao}
              style={{ flex: 1, minWidth: 200, background: isUltima ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 16, padding: '18px', color: '#fff', fontWeight: 900, fontSize: 18, cursor: acao ? 'default' : 'pointer' }}
            >
              {isUltima ? '🏁 ENCERRAR & VER RESULTADO' : '⏭ PRÓXIMA PERGUNTA'}
            </button>
          )}

          {partida.status === 'em_andamento' && (
            <button
              onClick={encerrar}
              disabled={acao}
              style={{ background: '#ffffff0d', border: '1px solid #ffffff20', borderRadius: 16, padding: '18px 20px', color: '#a0a0c0', fontWeight: 700, cursor: acao ? 'default' : 'pointer' }}
            >
              ✕ Encerrar
            </button>
          )}

          {/* Link projetor */}
          <button
            onClick={() => window.open(`/cabo-de-guerra/${id}/projetar`, '_blank')}
            style={{ background: '#ffffff0d', border: '1px solid #ffffff20', borderRadius: 16, padding: '18px 20px', color: '#a0a0c0', fontWeight: 700, cursor: 'pointer' }}
          >
            📺 Projetar
          </button>
        </div>

        {partida.status === 'finalizado' && (
          <button
            onClick={() => window.close()}
            style={{ width: '100%', background: '#ffffff10', border: 'none', borderRadius: 14, padding: '14px', color: '#a0a0c0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  )
}
