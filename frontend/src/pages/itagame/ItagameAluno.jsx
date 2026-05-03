import React, { useState } from 'react'
import api from '../../api'

const NIVEIS = ['', 'Aprendiz', 'Explorador', 'Guerreiro', 'Campeão', 'Lenda']
const MEDALHA = ['', '🥉', '🥈', '🥇', '🏆', '👑']
const NIVEL_COR = ['', '#6b7280', '#3b82f6', '#22c55e', '#9333ea', '#f59e0b']
const TIPO_LABEL = { bonus: 'Bônus', participacao: 'Participação', desempenho: 'Desempenho', comportamento: 'Comportamento', avaliacao: 'Avaliação', badge: 'Badge', manual: 'Manual' }

function BarraXP({ xp, nivel, proximo }) {
  const faixas = [0, 100, 300, 700, 1500, 2000]
  const pct = nivel < 5 ? Math.min(100, ((xp - faixas[nivel]) / (faixas[nivel + 1] - faixas[nivel])) * 100) : 100
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
        <span>{xp} XP</span>
        {nivel < 5 && <span>faltam {proximo} XP para {NIVEIS[nivel + 1]}</span>}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 10 }}>
        <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: 99, height: 10, transition: 'width 1s' }} />
      </div>
    </div>
  )
}

export default function ItagameAluno() {
  const [codigo, setCodigo] = useState('')
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function buscar(e) {
    e.preventDefault()
    if (!codigo.trim()) return
    setErro('')
    setCarregando(true)
    try {
      const { data } = await api.get(`/itagame/publico/${codigo.trim().toUpperCase()}`)
      setDados(data)
    } catch {
      setErro('Código não encontrado. Verifique com seu professor.')
      setDados(null)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <div style={{ color: '#f5a623', fontWeight: 900, fontSize: 28, letterSpacing: 2 }}>ITAGAME</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sistema de Gamificação Educacional</div>
      </div>

      {!dados ? (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20, fontSize: 15 }}>
            Digite seu código de aluno para ver seus pontos e conquistas
          </p>
          <form onSubmit={buscar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: ESC1-0001"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 20, textAlign: 'center', fontWeight: 700, letterSpacing: 2, outline: 'none' }}
              autoFocus
            />
            {erro && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              style={{ background: 'linear-gradient(135deg,#f5a623,#ef4444)', border: 'none', borderRadius: 12, padding: '13px', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
            >
              {carregando ? 'Buscando...' : '🚀 Entrar no ItagGame'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Card do aluno */}
          <div style={{ background: 'linear-gradient(135deg,rgba(245,166,35,0.15),rgba(239,68,68,0.1))', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 24, padding: 28, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '3px solid #f5a623', margin: '0 auto 12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
              {dados.aluno.foto_path ? <img src={dados.aluno.foto_path} alt={dados.aluno.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 2 }}>{dados.aluno.nome}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>{dados.aluno.turma_nome || dados.aluno.turma}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 14px', color: '#f5a623', fontWeight: 700, fontSize: 24 }}>
                {MEDALHA[dados.nivel]} {NIVEIS[dados.nivel]}
              </span>
            </div>

            <div style={{ fontSize: 40, fontWeight: 900, color: '#f5a623', marginBottom: 4 }}>{dados.xp_total} XP</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>Nível {dados.nivel} de 5</div>

            <BarraXP xp={dados.xp_total} nivel={dados.nivel} proximo={dados.nivel_info?.xp_proximo} />
          </div>

          {/* Badges */}
          {dados.badges.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>CONQUISTAS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dados.badges.map((b, i) => (
                  <span key={i} style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 20, padding: '4px 12px', color: '#f5a623', fontSize: 13, fontWeight: 600 }}>🏅 {b}</span>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {dados.historico.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>HISTÓRICO RECENTE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dados.historico.slice(0, 10).map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{h.descricao}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{TIPO_LABEL[h.tipo] || h.tipo}</div>
                    </div>
                    {h.xp_ganho > 0 && <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 15 }}>+{h.xp_ganho} XP</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Código do aluno */}
          <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>SEU CÓDIGO DE ACESSO</div>
            <div style={{ color: '#f5a623', fontWeight: 900, fontSize: 22, letterSpacing: 3 }}>{dados.aluno.codigo}</div>
          </div>

          <button
            onClick={() => { setDados(null); setCodigo('') }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}
          >
            ← Voltar
          </button>
        </div>
      )}
    </div>
  )
}
