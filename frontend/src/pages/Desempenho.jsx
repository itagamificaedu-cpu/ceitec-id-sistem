import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { GraficoBarrasDesempenho } from '../components/GraficoDesempenho'
import api from '../api'

export default function Desempenho() {
  const [dados, setDados] = useState(null)
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
  }, [])

  useEffect(() => {
    setCarregando(true)
    const url = turmaSel ? `/desempenho/turma/${turmaSel}` : '/desempenho/geral'
    api.get(url).then(({ data }) => setDados(data)).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [turmaSel])

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">📊 Desempenho Acadêmico</h1>
            <div className="flex gap-2 flex-wrap">
              {dados?.por_disciplina?.length > 0 && (
                <button onClick={() => {
                  const header = ['Disciplina', 'Média']
                  const rows = dados.por_disciplina.map(d => [d.disciplina, d.media])
                  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'desempenho.csv'; a.click()
                }} className="btn-secondary text-sm">📥 Exportar CSV</button>
              )}
            <select className="input-field w-auto" value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
              <option value="">Todas as turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            </div>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : !dados ? (
            <div className="text-center py-20 text-gray-400">Sem dados de desempenho</div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{dados.media_geral ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Média Geral</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className="text-3xl font-bold text-success">{dados.aprovados ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Aprovados</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className="text-3xl font-bold text-danger">{dados.em_risco ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Em Risco</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className="text-3xl font-bold text-secondary">{dados.total_alunos ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Total de Alunos</p>
                </div>
              </div>

              {/* Gráfico por turma ou por disciplina */}
              {dados.por_turma?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                  <h2 className="font-semibold text-textMain mb-4">Média por Turma</h2>
                  <GraficoBarrasDesempenho dados={dados.por_turma} nomeChave="turma" valorChave="media" />
                </div>
              )}

              {dados.por_disciplina?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                  <h2 className="font-semibold text-textMain mb-4">Média por Disciplina</h2>
                  <div className="space-y-3">
                    {dados.por_disciplina.map(d => (
                      <div key={d.disciplina}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{d.disciplina}</span>
                          <span className="font-bold" style={{ color: d.media >= 7 ? '#27ae60' : d.media >= 5 ? '#e67e22' : '#e74c3c' }}>{d.media}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(d.media / 10) * 100}%`, backgroundColor: d.media >= 7 ? '#27ae60' : d.media >= 5 ? '#e67e22' : '#e74c3c' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alunos em risco */}
              {dados.alunos_risco?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h2 className="font-semibold text-textMain mb-4">⚠️ Alunos em Risco</h2>
                  <div className="space-y-2">
                    {dados.alunos_risco.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {a.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span>👤</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{a.nome}</p>
                          <p className="text-xs text-gray-500">{a.turma_nome}</p>
                        </div>
                        <span className="text-sm font-bold text-danger">{a.media_geral ?? '—'}</span>
                      </div>
                    ))}
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
