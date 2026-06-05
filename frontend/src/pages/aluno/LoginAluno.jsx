/**
 * Login do Aluno — autenticação via código da carteirinha
 * Não usa senha: o código único da carteirinha (ex: ITA-0001) identifica o aluno
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/node-api'

export default function LoginAluno() {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  async function entrar(e) {
    e.preventDefault()
    const cod = codigo.trim().toUpperCase()
    if (!cod) return setErro('Informe o código da sua carteirinha')
    setErro('')
    setCarregando(true)
    try {
      const { data } = await axios.post(`${API}/aluno/login`, { codigo: cod })
      localStorage.setItem('token_aluno', data.token)
      localStorage.setItem('aluno', JSON.stringify(data.aluno))
      navigate('/aluno/dashboard')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Código não encontrado. Verifique sua carteirinha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 24,
        padding: 40,
        maxWidth: 400,
        width: '100%',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎓</div>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: '0 0 4px' }}>
          ITA Tecnologia
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px' }}>
          Portal do Aluno
        </p>

        {/* Formulário */}
        <form onSubmit={entrar}>
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Código da Carteirinha
            </label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: ITA-0001"
              autoFocus
              maxLength={20}
              style={{
                width: '100%',
                background: '#0f172a',
                border: `2px solid ${erro ? '#ef4444' : '#334155'}`,
                borderRadius: 12,
                padding: '14px 16px',
                color: '#fff',
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: 4,
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {erro && (
            <div style={{
              background: '#ef444422',
              border: '1px solid #ef444466',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#fca5a5',
              marginBottom: 16,
              fontSize: 14,
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              background: carregando ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: 'none',
              borderRadius: 14,
              padding: '16px',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
              cursor: carregando ? 'default' : 'pointer',
              letterSpacing: 1,
              transition: 'opacity .2s',
            }}
          >
            {carregando ? 'Entrando...' : '▶ ENTRAR'}
          </button>
        </form>

        {/* Ajuda */}
        <p style={{ color: '#475569', fontSize: 12, marginTop: 24 }}>
          O código está na sua carteirinha escolar.<br />
          Peça ao professor se não souber.
        </p>
      </div>
    </div>
  )
}
