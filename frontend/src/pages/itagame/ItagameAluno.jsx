import React, { useState } from 'react'
import api from '../../api'

const ITAGAME_URL = 'https://projetoitagame.pythonanywhere.com'
const CHAVE = 'gamificaedu_secreto_2026'

export default function ItagameAluno() {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    const cod = codigo.trim().toUpperCase()
    if (!cod) return
    setErro('')
    setCarregando(true)
    try {
      const { data } = await api.get(`/itagame/publico/${cod}`)
      const params = new URLSearchParams({
        user: data.aluno.codigo,
        email: data.aluno.codigo,
        nome: data.aluno.nome,
        turma: data.aluno.turma_nome || data.aluno.turma || '',
        chave: CHAVE,
        tipo: 'aluno',
      })
      window.location.href = `${ITAGAME_URL}/login-magico/?${params}`
    } catch {
      setErro('Código não encontrado. Verifique com seu professor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎮</div>
        <div style={{ color: '#f5a623', fontWeight: 900, fontSize: 30, letterSpacing: 2 }}>ITAGAME</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Sistema de Gamificação Educacional</div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, border: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
          Digite seu <strong style={{ color: '#f5a623' }}>código de aluno</strong> para entrar no jogo
        </p>
        <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: ESC192-0001"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 22, textAlign: 'center', fontWeight: 800, letterSpacing: 3, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            autoFocus
          />
          {erro && (
            <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', margin: 0 }}>{erro}</p>
          )}
          <button
            type="submit"
            disabled={carregando || !codigo.trim()}
            style={{ background: carregando ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#f5a623,#ef4444)', border: 'none', borderRadius: 14, padding: '14px', color: '#fff', fontWeight: 900, fontSize: 17, cursor: carregando ? 'default' : 'pointer', transition: 'all .2s' }}
          >
            {carregando ? '⏳ Entrando...' : '🚀 Entrar no ItagGame'}
          </button>
        </form>
        <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: 12, marginTop: 20 }}>
          Seu código está na sua carteirinha escolar
        </p>
      </div>
    </div>
  )
}
