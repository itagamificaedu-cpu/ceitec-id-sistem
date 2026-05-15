import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function TrocarSenha() {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (senha !== confirma) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setSalvando(true)
    try {
      await api.post('/usuarios/trocar-senha', { senha_nova: senha })
      navigate('/dashboard')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar senha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-textMain">Crie sua nova senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Olá, <strong>{usuario.nome}</strong>! Este é seu primeiro acesso.<br />
            Crie uma senha pessoal para continuar.
          </p>
        </div>

        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nova senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="Repita a nova senha"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              required
            />
          </div>
          {erro && <p className="text-red-500 text-sm">{erro}</p>}
          <button
            type="submit"
            disabled={salvando}
            className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar e Entrar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
