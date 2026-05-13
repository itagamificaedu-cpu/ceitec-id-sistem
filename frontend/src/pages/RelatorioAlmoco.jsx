import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

export default function RelatorioAlmoco() {
  const hoje = new Date().toISOString().split('T')[0]

  const [data, setData] = useState(hoje)
  const [turma, setTurma] = useState('')
  const [turmas, setTurmas] = useState([])
  const [registros, setRegistros] = useState([])
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarRelatorio()
  }, [data, turma])

  async function carregarRelatorio() {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ data })
      if (turma) params.set('turma', turma)

      const [relRes, hojeRes] = await Promise.all([
        api.get(`/almoco/relatorio?${params}`),
        data === hoje ? api.get('/almoco/hoje') : Promise.resolve(null),
      ])

      setRegistros(relRes.data.registros || [])
      setTurmas(relRes.data.turmas || [])
      if (hojeRes) setTotalAlunos(hojeRes.data.total_alunos || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  async function removerRegistro(id) {
    if (!confirm('Remover este registro de almoço?')) return
    try {
      await api.delete(`/almoco/${id}`)
      setRegistros(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover registro')
    }
  }

  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })

  const percentual = totalAlunos > 0 ? Math.round((registros.length / totalAlunos) * 100) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-textMain">🍽️ Controle de Almoço</h1>
              <p className="text-sm text-gray-400 capitalize">{dataFormatada}</p>
            </div>
            <Link
              to="/almoco/scanner"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: '#b45309' }}
            >
              <span className="text-base">📷</span> Abrir Scanner
            </Link>
          </div>

          {/* Estatísticas */}
          {data === hoje && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4" style={{ borderColor: '#b45309' }}>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Almoços Hoje</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#b45309' }}>{registros.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-gray-300">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total de Alunos</p>
                <p className="text-3xl font-bold mt-1 text-gray-700">{totalAlunos}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aproveitamento</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{percentual}%</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Data</label>
              <input
                type="date"
                value={data}
                max={hoje}
                onChange={e => setData(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#b45309' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Turma</label>
              <select
                value={turma}
                onChange={e => setTurma(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none min-w-[160px]"
              >
                <option value="">Todas as turmas</option>
                {turmas.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={carregarRelatorio}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#b45309' }}
            >
              Atualizar
            </button>
          </div>

          {/* Lista de registros */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-textMain">
                Registros {registros.length > 0 && <span className="text-gray-400 font-normal text-sm">({registros.length})</span>}
              </h2>
            </div>

            {carregando ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🍽️</div>
                <p className="text-gray-400 font-medium">Nenhum almoço registrado</p>
                <p className="text-gray-300 text-sm mt-1">
                  {data === hoje ? 'Use o scanner para registrar os almoços de hoje.' : `Sem registros em ${new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                      <th className="px-4 py-3 text-left font-semibold">Aluno</th>
                      <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Turma</th>
                      <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Código</th>
                      <th className="px-4 py-3 text-left font-semibold">Horário</th>
                      <th className="px-4 py-3 text-left font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r, i) => (
                      <tr key={r.id} className={`border-b last:border-0 hover:bg-orange-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.foto_path ? (
                              <img src={r.foto_path} alt={r.nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                            )}
                            <span className="font-medium text-textMain">{r.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.turma}</td>
                        <td className="px-4 py-3 font-mono text-gray-400 text-xs hidden sm:table-cell">{r.codigo}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>
                            🕐 {r.hora_registro || '--:--'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removerRegistro(r.id)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                            title="Remover registro"
                          >
                            ✕ Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
