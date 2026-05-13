import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import GraficoFrequencia from '../components/GraficoFrequencia'
import api from '../api'

function Card({ titulo, valor, icone, cor, sub }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${cor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{titulo}</p>
          <p className="text-3xl font-bold text-textMain mt-1">{valor}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <span className="text-3xl opacity-80">{icone}</span>
      </div>
    </div>
  )
}

function DashboardProfessor({ usuario }) {
  const [prof, setProf] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get('/professores/eu')
      .then(({ data }) => setProf(data))
      .catch(err => setErro(err.response?.data?.erro || 'Erro ao carregar dados'))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <div className="text-center py-20 text-gray-400">Carregando...</div>

  if (erro) return (
    <div className="max-w-xl mx-auto mt-10 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-textMain mb-2">Perfil não vinculado</h2>
      <p className="text-gray-500 text-sm">{erro}</p>
      <p className="text-xs text-gray-400 mt-2">Entre em contato com o administrador da escola.</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textMain">Olá, {prof.nome?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-400">{prof.especialidade || 'Professor'}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card titulo="Minhas Turmas" valor={prof.total_turmas} icone="🏫" cor="border-primary" />
        <Card titulo="Total de Alunos" valor={prof.total_alunos} icone="👥" cor="border-secondary" />
        <Card titulo="ItagGame" valor="🎮" icone="⭐" cor="border-yellow-400" sub="Acesse pelo menu" />
      </div>

      {/* Minhas turmas */}
      {prof.turmas?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p className="font-medium">Nenhuma turma vinculada ainda</p>
          <p className="text-sm mt-1">Peça ao administrador para vincular suas turmas no cadastro de professor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {prof.turmas?.map(turma => (
            <div key={turma.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Cabeçalho da turma */}
              <div className="bg-primary p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{turma.nome}</h2>
                  <p className="text-white/70 text-sm">
                    {turma.disciplinas?.join(', ') || turma.curso} • {turma.alunos?.length || 0} alunos
                  </p>
                </div>
                <Link
                  to={`/turmas/${turma.id}`}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Ver turma →
                </Link>
              </div>

              {/* Lista de alunos (prévia) */}
              {turma.alunos?.length > 0 ? (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0">
                    {turma.alunos.slice(0, 8).map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-r border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {a.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-sm">👤</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-textMain truncate">{a.nome.split(' ')[0]}</p>
                          <p className="text-xs text-gray-400 font-mono truncate">{a.codigo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {turma.alunos.length > 8 && (
                    <div className="px-4 py-2 text-xs text-gray-400 text-center border-t">
                      + {turma.alunos.length - 8} aluno(s) — <Link to={`/turmas/${turma.id}`} className="text-primary hover:underline">ver todos</Link>
                    </div>
                  )}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum aluno cadastrado nesta turma ainda</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState(null)
  const [semanal, setSemanal] = useState([])
  const [carregando, setCarregando] = useState(true)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    if (usuario.perfil === 'professor') { setCarregando(false); return }
    async function carregar() {
      try {
        const [dashRes, semanalRes] = await Promise.all([
          api.get('/relatorios/dashboard'),
          api.get('/relatorios/frequencia-semanal')
        ])
        setDados(dashRes.data)
        setSemanal(semanalRes.data.map(d => ({
          ...d,
          data: new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        })))
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [])

  if (usuario.perfil === 'professor') {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
          <DashboardProfessor usuario={usuario} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-textMain">Dashboard</h1>
              <p className="text-sm text-gray-400">Bem-vindo, {usuario.nome}</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/scanner" className="btn-primary flex items-center gap-2">
                <span>📷</span> Presença
              </Link>
              <Link to="/almoco/scanner" className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity" style={{ background: '#b45309' }}>
                <span>🍽️</span> Almoço
              </Link>
            </div>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : dados ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card titulo="Total de Alunos" valor={dados.totalAlunos} icone="👥" cor="border-primary" />
                <Card titulo="Presentes Hoje" valor={dados.presentesHoje} icone="✅" cor="border-success" />
                <Card titulo="Ausentes Hoje" valor={dados.ausentesHoje} icone="❌" cor="border-danger" />
                <Card titulo="Frequência" valor={`${dados.frequencia}%`} icone="📊" cor="border-secondary" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: '👥', label: 'Turmas', to: '/turmas', cor: '#1e3a5f' },
                  { icon: '📝', label: 'Avaliações', to: '/avaliacoes', cor: '#27ae60' },
                  { icon: '🎮', label: 'ItagGame', to: '/itagame', cor: '#f5a623' },
                  { icon: '🤖', label: 'IA', to: '/ia/questoes', cor: '#9b59b6' },
                  { icon: '🍽️', label: 'Controle de Almoço', to: '/almoco/relatorio', cor: '#b45309' },
                  { icon: '📋', label: 'Corretor de Provas', to: '/corretor-resultados', cor: '#1a237e' },
                  { icon: '📊', label: 'Desempenho', to: '/desempenho', cor: '#8e44ad' },
                  { icon: '📈', label: 'Relatórios', to: '/relatorios', cor: '#16a085' },
                  { icon: '🔬', label: 'Diagnóstico IA', to: '/diagnostico', cor: '#c0392b' },
                ].map(a => (
                  <Link key={a.to} to={a.to} className="flex items-center gap-3 p-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: a.cor }}>
                    <span className="text-xl">{a.icon}</span> {a.label}
                  </Link>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h2 className="font-semibold text-textMain mb-4">Frequência — Últimos 7 Dias</h2>
                  <GraficoFrequencia dados={semanal} />
                </div>

                <div className="bg-white rounded-xl shadow-md p-5">
                  <h2 className="font-semibold text-textMain mb-4">Frequência por Turma (Hoje)</h2>
                  {dados.freqPorTurma.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhuma turma cadastrada</p>
                  ) : (
                    <div className="space-y-3">
                      {dados.freqPorTurma.map(t => (
                        <div key={t.turma}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 truncate max-w-[180px]">{t.turma}</span>
                            <span className="font-semibold">{t.percentual}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{
                              width: `${t.percentual}%`,
                              backgroundColor: t.percentual >= 75 ? '#27ae60' : t.percentual >= 50 ? '#e67e22' : '#e74c3c'
                            }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{t.presentes}/{t.total} alunos</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-textMain">Últimos Registros</h2>
                  <Link to="/relatorios" className="text-sm text-primary hover:underline">Ver relatórios →</Link>
                </div>
                {dados.ultimos5.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum registro hoje</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-gray-500 text-xs">
                          <th className="pb-2 text-left">Aluno</th>
                          <th className="pb-2 text-left hidden md:table-cell">Turma</th>
                          <th className="pb-2 text-left">Data</th>
                          <th className="pb-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.ultimos5.map(p => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 font-medium">{p.nome}</td>
                            <td className="py-2 text-gray-500 text-xs hidden md:table-cell">{p.turma}</td>
                            <td className="py-2 text-gray-500">{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'presente' ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>
                                {p.status === 'presente' ? '✅' : '❌'} {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
