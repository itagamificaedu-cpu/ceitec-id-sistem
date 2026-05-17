import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

const PERFIL_COR = {
  admin:      'bg-purple-100 text-purple-700',
  secretaria: 'bg-blue-100 text-blue-700',
  professor:  'bg-green-100 text-green-700',
}
const PERFIL_ICO = { admin: '👑', secretaria: '📋', professor: '👨‍🏫' }

function tempoRelativo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  if (min < 2)   return 'agora mesmo'
  if (min < 60)  return `há ${min} min`
  if (h   < 24)  return `há ${h}h`
  if (d   < 7)   return `há ${d} dia${d > 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function horaFormatada(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AtividadeUsuarios() {
  const [dados, setDados]       = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]         = useState('')
  const [aba, setAba]           = useState('usuarios') // 'usuarios' | 'logins'
  const [busca, setBusca]       = useState('')

  useEffect(() => {
    api.get('/relatorios/atividade-usuarios')
      .then(r => setDados(r.data))
      .catch(e => setErro(e.response?.data?.erro || 'Erro ao carregar'))
      .finally(() => setCarregando(false))
  }, [])

  const logados = dados?.usuarios.filter(u => {
    if (!u.ultimo_login) return false
    return Date.now() - new Date(u.ultimo_login).getTime() < 8 * 3600 * 1000
  }) || []

  const usuariosFiltrados = dados?.usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase())
  ) || []

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">Atividade de Usuários</h1>
            <p className="text-sm text-gray-400">Monitore quem está online e o que cada usuário fez na plataforma</p>
          </div>

          {carregando && <div className="text-center py-20 text-gray-400">Carregando...</div>}
          {erro && <div className="text-center py-20 text-red-500">{erro}</div>}

          {dados && (
            <>
              {/* Cards resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-primary">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total de Usuários</p>
                  <p className="text-3xl font-bold text-textMain mt-1">{dados.usuarios.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Online Agora</p>
                  <p className="text-3xl font-bold text-textMain mt-1">{logados.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">últimas 8h</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-400">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Nunca Acessaram</p>
                  <p className="text-3xl font-bold text-textMain mt-1">
                    {dados.usuarios.filter(u => !u.ultimo_login).length}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-secondary">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Logins Registrados</p>
                  <p className="text-3xl font-bold text-textMain mt-1">{dados.logins_recentes.length}+</p>
                  <p className="text-xs text-gray-400 mt-0.5">últimos registros</p>
                </div>
              </div>

              {/* Online agora */}
              {logados.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
                    Online nas últimas 8 horas ({logados.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {logados.map(u => (
                      <div key={u.id} className="flex items-center gap-2 bg-white border border-green-200 rounded-full px-3 py-1.5 text-sm">
                        <span>{PERFIL_ICO[u.perfil]}</span>
                        <span className="font-medium text-gray-700">{u.nome.split(' ')[0]}</span>
                        <span className="text-xs text-gray-400">{tempoRelativo(u.ultimo_login)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abas */}
              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                {[['usuarios', '👥 Usuários'], ['logins', '🕐 Histórico de Logins']].map(([id, label]) => (
                  <button key={id} onClick={() => setAba(id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${aba === id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ABA: Usuários */}
              {aba === 'usuarios' && (
                <div className="bg-white rounded-xl shadow-md">
                  <div className="p-4 border-b">
                    <input
                      type="text"
                      placeholder="Buscar por nome ou e-mail..."
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      className="input-field w-full max-w-sm text-sm"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500 bg-gray-50">
                          <th className="px-5 py-3 text-left">Usuário</th>
                          <th className="px-4 py-3 text-left">Perfil</th>
                          <th className="px-4 py-3 text-left">Último Acesso</th>
                          <th className="px-4 py-3 text-center">Presenças</th>
                          <th className="px-4 py-3 text-center">Ocorrências</th>
                          <th className="px-4 py-3 text-center">Quizzes</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosFiltrados.map(u => {
                          const online = u.ultimo_login && Date.now() - new Date(u.ultimo_login).getTime() < 8 * 3600 * 1000
                          return (
                            <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-textMain">{u.nome}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERFIL_COR[u.perfil] || 'bg-gray-100 text-gray-600'}`}>
                                  {PERFIL_ICO[u.perfil]} {u.perfil}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {u.ultimo_login ? (
                                  <div>
                                    <p className="text-gray-700 text-xs">{horaFormatada(u.ultimo_login)}</p>
                                    <p className="text-xs text-gray-400">{tempoRelativo(u.ultimo_login)}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Nunca acessou</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-bold ${u.presencas_registradas > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                                  {u.presencas_registradas || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-bold ${u.ocorrencias_criadas > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                                  {u.ocorrencias_criadas || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-bold ${u.quizzes_criados > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                  {u.quizzes_criados || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {online ? (
                                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                                  </span>
                                ) : u.ultimo_login ? (
                                  <span className="text-xs text-gray-400">Offline</span>
                                ) : (
                                  <span className="text-xs text-yellow-600 font-medium">Nunca entrou</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA: Histórico de logins */}
              {aba === 'logins' && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b bg-gray-50">
                    <p className="text-sm text-gray-500">Últimos {dados.logins_recentes.length} acessos registrados na plataforma</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500 bg-gray-50">
                          <th className="px-5 py-3 text-left">Usuário</th>
                          <th className="px-4 py-3 text-left">Perfil</th>
                          <th className="px-4 py-3 text-left">Data / Hora</th>
                          <th className="px-4 py-3 text-left">Tempo</th>
                          <th className="px-4 py-3 text-left hidden md:table-cell">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.logins_recentes.map((l, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-textMain">{l.nome}</p>
                              <p className="text-xs text-gray-400">{l.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERFIL_COR[l.perfil] || 'bg-gray-100 text-gray-600'}`}>
                                {PERFIL_ICO[l.perfil]} {l.perfil}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{horaFormatada(l.logado_em)}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{tempoRelativo(l.logado_em)}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell font-mono">{l.ip || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
