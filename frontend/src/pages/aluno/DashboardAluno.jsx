/**
 * Dashboard do Aluno — tela principal após login
 * Regra pedagógica central: só mostra atividade quando professor iniciar (ao vivo)
 * Polling a cada 4s para detectar quando professor iniciar ou encerrar
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/node-api'

export default function DashboardAluno() {
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [atividade, setAtividade] = useState(null) // { ativa, tipo, titulo, referencia_id, codigo_acesso }
  const [carregando, setCarregando] = useState(true)
  const [ultimaVerif, setUltimaVerif] = useState('')

  const token = localStorage.getItem('token_aluno')

  const cabecalho = { headers: { Authorization: `Bearer ${token}` } }

  // Carrega dados do aluno uma vez
  useEffect(() => {
    if (!token) return navigate('/aluno/login')
    axios.get(`${API}/aluno/me`, cabecalho)
      .then(({ data }) => setAluno(data))
      .catch(() => {
        localStorage.removeItem('token_aluno')
        localStorage.removeItem('aluno')
        navigate('/aluno/login')
      })
  }, []) // eslint-disable-line

  // Polling de atividade ativa a cada 4 segundos
  const verificarAtividade = useCallback(async () => {
    if (!token) return
    try {
      const { data } = await axios.get(`${API}/aluno/atividade-ativa`, cabecalho)
      setAtividade(data)
      setUltimaVerif(new Date().toLocaleTimeString('pt-BR'))
    } catch {
      setAtividade({ ativa: false })
    } finally {
      setCarregando(false)
    }
  }, [token]) // eslint-disable-line

  useEffect(() => {
    verificarAtividade()
    const intervalo = setInterval(verificarAtividade, 4000)
    return () => clearInterval(intervalo)
  }, [verificarAtividade])

  function sair() {
    localStorage.removeItem('token_aluno')
    localStorage.removeItem('aluno')
    navigate('/aluno/login')
  }

  function entrarAtividade() {
    if (!atividade?.ativa) return
    if (atividade.tipo === 'quiz') {
      navigate(`/q/${atividade.codigo_acesso}`)
    } else if (atividade.tipo === 'cabo_guerra') {
      navigate(`/aluno/cabo-guerra/${atividade.referencia_id}`)
    }
  }

  const alunoLocal = aluno || JSON.parse(localStorage.getItem('aluno') || '{}')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
      fontFamily: 'sans-serif',
      padding: 0,
    }}>
      {/* Header */}
      <div style={{
        background: '#1e293bdd',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #334155',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#3b82f6', fontWeight: 900, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            ITA TECNOLOGIA
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {alunoLocal.nome || 'Carregando...'}
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            {alunoLocal.turma_nome || alunoLocal.turma || ''}
          </div>
        </div>
        <button
          onClick={sair}
          style={{
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 10,
            padding: '8px 14px',
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sair 🚪
        </button>
      </div>

      {/* Conteúdo principal */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 70px)',
        padding: 24,
        gap: 24,
      }}>

        {carregando ? (
          <div style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>
            Verificando atividades...
          </div>
        ) : atividade?.ativa ? (
          /* ── CASO B: Atividade ativa — professor iniciou agora ── */
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            {/* Indicador pulsante */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
              <div style={{ fontSize: 72 }}>
                {atividade.tipo === 'quiz' ? '🎯' : '🪢'}
              </div>
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 16, height: 16, borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 0 0 #22c55e44',
                animation: 'pulsar 1.5s infinite',
              }} />
            </div>

            <h2 style={{ color: '#22c55e', fontWeight: 900, fontSize: 22, margin: '0 0 8px' }}>
              Atividade ao vivo!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 4px' }}>
              Seu professor iniciou:
            </p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 32px', lineHeight: 1.3 }}>
              {atividade.titulo}
            </p>

            <button
              onClick={entrarAtividade}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                borderRadius: 20,
                padding: '20px',
                color: '#fff',
                fontWeight: 900,
                fontSize: 20,
                cursor: 'pointer',
                letterSpacing: 1,
                boxShadow: '0 0 40px #22c55e44',
              }}
            >
              ▶ ENTRAR NA ATIVIDADE
            </button>

            <p style={{ color: '#475569', fontSize: 12, marginTop: 16 }}>
              Toque para participar agora!
            </p>
          </div>
        ) : (
          /* ── CASO A: Nenhuma atividade ativa ── */
          <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 80, marginBottom: 24, opacity: .6 }}>⏳</div>
            <h2 style={{ color: '#94a3b8', fontWeight: 900, fontSize: 22, margin: '0 0 12px' }}>
              Nenhuma atividade ativa
            </h2>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
              Aguarde seu professor iniciar<br />a atividade presencial.
            </p>

            {/* Indicador de polling */}
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#3b82f6',
                    animation: `dot 1.4s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
              <span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                Verificando... {ultimaVerif}
              </span>
            </div>
          </div>
        )}

        {/* Identificação do aluno */}
        {alunoLocal.codigo && (
          <div style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 14,
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Seu Código
            </div>
            <div style={{ color: '#64748b', fontWeight: 900, fontSize: 18, letterSpacing: 4 }}>
              {alunoLocal.codigo}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulsar {
          0% { box-shadow: 0 0 0 0 #22c55e88 }
          70% { box-shadow: 0 0 0 12px #22c55e00 }
          100% { box-shadow: 0 0 0 0 #22c55e00 }
        }
        @keyframes dot {
          0%, 100% { opacity: .3; transform: scale(1) }
          50% { opacity: 1; transform: scale(1.4) }
        }
      `}</style>
    </div>
  )
}
