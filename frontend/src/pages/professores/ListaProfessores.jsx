import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function ListaProfessores() {
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [confirmando, setConfirmando] = useState(null)
  const [modalAcesso, setModalAcesso] = useState(null)
  const [senhaAcesso, setSenhaAcesso] = useState('')
  const [salvandoAcesso, setSalvandoAcesso] = useState(false)
  const [erroAcesso, setErroAcesso] = useState('')
  const [successoAcesso, setSuccessoAcesso] = useState('')

  function carregar() {
    api.get('/professores').then(({ data }) => setProfessores(data)).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  async function excluir() {
    try {
      await api.delete(`/professores/${confirmando.id}`)
      setConfirmando(null)
      carregar()
    } catch { }
  }

  function abrirModalAcesso(p) {
    setModalAcesso(p)
    setSenhaAcesso('')
    setErroAcesso('')
    setSuccessoAcesso('')
  }

  async function criarAcesso(e) {
    e.preventDefault()
    if (!senhaAcesso || senhaAcesso.length < 6) {
      setErroAcesso('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setSalvandoAcesso(true)
    setErroAcesso('')
    try {
      await api.post('/usuarios', {
        nome: modalAcesso.nome,
        email: modalAcesso.email,
        senha: senhaAcesso,
        perfil: 'professor',
      })
      setSuccessoAcesso(`Acesso criado! O professor pode fazer login com: ${modalAcesso.email}`)
      setSenhaAcesso('')
    } catch (err) {
      const msg = err.response?.data?.erro || ''
      if (msg.toLowerCase().includes('já existe') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        setErroAcesso('Já existe uma conta com este e-mail. Use "Gerenciar Usuários" para alterar a senha.')
      } else {
        setErroAcesso(msg || 'Erro ao criar acesso')
      }
    } finally {
      setSalvandoAcesso(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textMain">Professores</h1>
            <Link to="/professores/novo" className="btn-primary text-sm">+ Novo Professor</Link>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : professores.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhum professor cadastrado</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {professores.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.foto_path ? <img src={p.foto_path} alt={p.nome} className="w-full h-full object-cover" /> : <span className="text-2xl">👨‍🏫</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-textMain truncate">{p.nome}</p>
                      <p className="text-xs text-secondary font-mono">{p.codigo}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <p className="text-gray-500 truncate">📚 {p.especialidade || '—'}</p>
                    <p className="text-gray-500 truncate">✉️ {p.email}</p>
                    {p.telefone && <p className="text-gray-500">📱 {p.telefone}</p>}
                  </div>
                  {p.disciplinas?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {p.disciplinas.slice(0, 3).map((d, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{d}</span>
                      ))}
                      {p.disciplinas.length > 3 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{p.disciplinas.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => abrirModalAcesso(p)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    >
                      🔑 Criar Acesso
                    </button>
                    <Link to={`/professores/${p.id}/editar`} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200">
                      ✏️ Editar
                    </Link>
                    <button onClick={() => setConfirmando(p)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal criar acesso */}
      {modalAcesso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {modalAcesso.foto_path ? <img src={modalAcesso.foto_path} alt={modalAcesso.nome} className="w-full h-full object-cover" /> : <span className="text-2xl">👨‍🏫</span>}
              </div>
              <div>
                <h2 className="text-lg font-bold text-textMain">Criar Acesso ao Sistema</h2>
                <p className="text-sm text-gray-500">{modalAcesso.nome}</p>
              </div>
            </div>

            {successoAcesso ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-success font-medium mb-1">Acesso criado com sucesso!</p>
                <p className="text-sm text-gray-500 mb-1">Login: <strong>{modalAcesso.email}</strong></p>
                <p className="text-xs text-gray-400 mb-4">O professor já pode acessar o sistema com essas credenciais.</p>
                <button onClick={() => setModalAcesso(null)} className="btn-primary w-full">Fechar</button>
              </div>
            ) : (
              <form onSubmit={criarAcesso} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500">Login (e-mail): <strong className="text-textMain">{modalAcesso.email}</strong></p>
                  <p className="text-xs text-gray-400 mt-0.5">O professor usará este e-mail para entrar no sistema</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Definir senha *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                    value={senhaAcesso}
                    onChange={e => setSenhaAcesso(e.target.value)}
                    minLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Comunique a senha ao professor pessoalmente ou por mensagem segura.</p>
                </div>
                {erroAcesso && <p className="text-danger text-xs bg-red-50 rounded-lg px-3 py-2">{erroAcesso}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModalAcesso(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={salvandoAcesso} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                    {salvandoAcesso ? 'Criando...' : '🔑 Criar Acesso'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-textMain mb-2">Excluir Professor</h2>
            <p className="text-gray-500 text-sm mb-1">Tem certeza que deseja excluir</p>
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
