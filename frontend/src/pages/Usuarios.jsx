import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

const PERFIS = ['admin', 'secretaria', 'professor']
const PERFIL_LABEL = { admin: '👑 Admin', secretaria: '📋 Secretaria', professor: '👨‍🏫 Professor' }
const PERFIL_COR = { admin: 'bg-purple-100 text-purple-700', secretaria: 'bg-blue-100 text-blue-700', professor: 'bg-green-100 text-green-700' }

const VAZIO = { nome: '', email: '', senha: '', perfil: 'secretaria' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null) // null | 'novo' | objeto usuario
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(null)

  function carregar() {
    api.get('/usuarios').then(({ data }) => setUsuarios(data)).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setForm(VAZIO)
    setErro('')
    setModal('novo')
  }

  function abrirEditar(u) {
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil })
    setErro('')
    setModal(u)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      if (modal === 'novo') {
        await api.post('/usuarios', form)
      } else {
        await api.put(`/usuarios/${modal.id}`, form)
      }
      setModal(null)
      carregar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    try {
      await api.delete(`/usuarios/${confirmando.id}`)
      setConfirmando(null)
      carregar()
    } catch { }
  }

  const usuarioAtual = JSON.parse(localStorage.getItem('usuario') || '{}')

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-textMain">Gerenciar Usuários</h1>
              <p className="text-sm text-gray-500 mt-1">Crie e gerencie contas de acesso ao sistema</p>
            </div>
            <button onClick={abrirNovo} className="btn-primary text-sm">+ Nova Conta</button>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Perfil</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Criado em</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-textMain text-sm">{u.nome}</td>
                      <td className="px-5 py-3 text-gray-500 text-sm">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERFIL_COR[u.perfil] || 'bg-gray-100 text-gray-600'}`}>
                          {PERFIL_LABEL[u.perfil] || u.perfil}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => abrirEditar(u)} className="px-3 py-1 rounded-lg text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200">✏️ Editar</button>
                          {u.id !== usuarioAtual.id && (
                            <button onClick={() => setConfirmando(u)} className="px-3 py-1 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">🗑️ Excluir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-textMain mb-4">
              {modal === 'novo' ? '➕ Nova Conta de Acesso' : '✏️ Editar Usuário'}
            </h2>
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo</label>
                <input className="input-field" placeholder="Ex: Escola Estadual São Paulo" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email (será o login)</label>
                <input type="email" className="input-field" placeholder="escola@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Senha {modal !== 'novo' && <span className="text-gray-400">(deixe em branco para manter)</span>}
                </label>
                <input type="password" className="input-field" placeholder={modal === 'novo' ? 'Senha de acesso' : '••••••••'} value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} required={modal === 'novo'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nível de acesso</label>
                <select className="input-field" value={form.perfil} onChange={e => setForm(p => ({ ...p, perfil: e.target.value }))}>
                  {PERFIS.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                </select>
              </div>
              {erro && <p className="text-red-500 text-xs">{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {salvando ? 'Salvando...' : modal === 'novo' ? 'Criar Conta' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-textMain mb-2">Excluir Usuário</h2>
            <p className="text-gray-500 text-sm mb-1">Excluir a conta de</p>
            <p className="font-bold text-red-600 mb-5">"{confirmando.nome}"?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={excluir} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
