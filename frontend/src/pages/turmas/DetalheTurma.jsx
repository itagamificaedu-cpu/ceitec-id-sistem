import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function DetalheTurma() {
  const { id } = useParams()
  const [turma, setTurma] = useState(null)
  const [aba, setAba] = useState('alunos')
  const [frequencia, setFrequencia] = useState([])
  const [desempenho, setDesempenho] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [turmaRes, freqRes, despRes] = await Promise.all([
          api.get(`/turmas/${id}`),
          api.get(`/turmas/${id}/frequencia`),
          api.get(`/turmas/${id}/desempenho`)
        ])
        setTurma(turmaRes.data)
        setFrequencia(freqRes.data)
        setDesempenho(despRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  function exportarCSV(dados, nome) {
    const header = ['Nome', 'Código', 'Turma', 'Status/Média']
    const rows = dados.map(a => [a.nome, a.codigo, turma?.nome, a.percentual ?? a.media_geral ?? ''])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${nome}_${turma?.nome}.csv`; a.click()
  }

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!turma) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6"><p className="text-danger">Turma não encontrada</p></main></div>

  const abas = [
    { id: 'alunos', label: '👥 Alunos' },
    { id: 'frequencia', label: '📅 Frequência' },
    { id: 'desempenho', label: '📊 Desempenho' },
    { id: 'avaliacoes', label: '📝 Avaliações' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <Link to="/turmas" className="text-gray-500 hover:text-primary text-sm">← Turmas</Link>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-textMain">{turma.nome}</h1>
                <p className="text-gray-500">{turma.curso} • {turma.turno} • {turma.ano_letivo}</p>
                {turma.professor_nome && <p className="text-sm text-gray-400 mt-1">👨‍🏫 Prof. {turma.professor_nome} — {turma.professor_especialidade}</p>}
              </div>
              <div className="flex gap-3 text-center">
                <div className="bg-gray-50 rounded-xl px-4 py-2">
                  <p className="text-2xl font-bold text-primary">{turma.alunos?.length || 0}</p>
                  <p className="text-xs text-gray-400">Alunos</p>
                </div>
              </div>
            </div>
            {turma.disciplinas?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {turma.disciplinas.map(d => <span key={d} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{d}</span>)}
              </div>
            )}
          </div>

          {/* Abas */}
          <div className="flex border-b mb-6 overflow-x-auto">
            {abas.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${aba === a.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Aba Alunos */}
          {aba === 'alunos' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">{turma.alunos?.length} aluno(s)</p>
                <button onClick={() => exportarCSV(turma.alunos, 'alunos')} className="btn-secondary text-sm">📥 Exportar CSV</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {turma.alunos?.map(a => (
                  <Link key={a.id} to={`/alunos/${a.id}/perfil`} className="bg-white rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-xl">👤</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-textMain truncate">{a.nome}</p>
                      <p className="text-xs text-secondary font-mono">{a.codigo}</p>
                      <p className="text-xs text-gray-400">{a.curso}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Aba Frequência */}
          {aba === 'frequencia' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Frequência acumulada</p>
                <button onClick={() => exportarCSV(frequencia.map(a => ({ ...a, percentual: a.percentual + '%' })), 'frequencia')} className="btn-secondary text-sm">📥 Exportar CSV</button>
              </div>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Aluno</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Presenças</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Faltas</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Frequência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencia.map(a => (
                      <tr key={a.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.nome}</td>
                        <td className="px-4 py-3 text-success">{a.presentes}</td>
                        <td className="px-4 py-3 text-danger">{a.faltas}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${a.percentual}%`, backgroundColor: a.percentual >= 75 ? '#27ae60' : a.percentual >= 50 ? '#e67e22' : '#e74c3c' }} />
                            </div>
                            <span className="font-medium">{a.percentual}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba Desempenho */}
          {aba === 'desempenho' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Ranking por média geral</p>
                <button onClick={() => exportarCSV(desempenho, 'desempenho')} className="btn-secondary text-sm">📥 Exportar CSV</button>
              </div>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600">#</th>
                      <th className="text-left px-4 py-3 text-gray-600">Aluno</th>
                      <th className="text-left px-4 py-3 text-gray-600">Média</th>
                      <th className="text-left px-4 py-3 text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desempenho.map((a, i) => (
                      <tr key={a.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/alunos/${a.id}/perfil`} className="hover:text-primary">{a.nome}</Link>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: a.media_geral >= 7 ? '#27ae60' : a.media_geral >= 5 ? '#e67e22' : '#e74c3c' }}>
                          {a.media_geral ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.em_risco ? <span className="px-2 py-0.5 bg-red-100 text-danger rounded-full text-xs">Em risco</span> : <span className="px-2 py-0.5 bg-green-100 text-success rounded-full text-xs">Regular</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba Avaliações */}
          {aba === 'avaliacoes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">{turma.avaliacoes?.length} avaliação(ões)</p>
                <Link to="/avaliacoes/nova" className="btn-primary text-sm">+ Nova Avaliação</Link>
              </div>
              {turma.avaliacoes?.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Nenhuma avaliação aplicada</p>
              ) : (
                <div className="space-y-3">
                  {turma.avaliacoes?.map(av => (
                    <Link key={av.id} to={`/avaliacoes/${av.id}`} className="flex items-center gap-4 bg-white rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">📝</div>
                      <div className="flex-1">
                        <p className="font-medium">{av.titulo}</p>
                        <p className="text-xs text-gray-400">{av.disciplina} • {av.tipo} • {av.total_questoes} questões</p>
                      </div>
                      {av.data_aplicacao && <p className="text-xs text-gray-400">{new Date(av.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
