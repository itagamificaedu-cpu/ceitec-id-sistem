import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { GraficoBarrasDesempenho } from '../../components/GraficoDesempenho'
import api from '../../api'

export default function ResultadosAvaliacao() {
  const { id } = useParams()
  const [avaliacao, setAvaliacao] = useState(null)
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [alunoSel, setAlunoSel] = useState(null)
  const [lancarAberto, setLancarAberto] = useState(false)
  const [notaLancar, setNotaLancar] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const [avRes, resRes] = await Promise.all([
          api.get(`/avaliacoes/${id}`),
          api.get(`/avaliacoes/${id}/resultados`)
        ])
        setAvaliacao(avRes.data)
        setResultados(resRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  async function lancarNotas() {
    setSalvando(true)
    try {
      const payload = Object.entries(notaLancar).map(([aluno_id, nota]) => ({ aluno_id: Number(aluno_id), nota }))
      await api.post(`/avaliacoes/${id}/notas`, { notas: payload })
      const { data } = await api.get(`/avaliacoes/${id}/resultados`)
      setResultados(data)
      setLancarAberto(false)
      setNotaLancar({})
    } catch { }
    finally { setSalvando(false) }
  }

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!avaliacao) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20"><p className="text-danger">Avaliação não encontrada</p></main></div>

  function exportarCSV() {
    const header = ['Aluno', 'Nota', '% Acerto', 'Status']
    const rows = resultados.map(r => [r.nome, r.nota_final ?? '', r.percentual_acerto != null ? r.percentual_acerto + '%' : '', r.nota_final == null ? 'Pendente' : r.nota_final >= 7 ? 'Aprovado' : r.nota_final >= 5 ? 'Recuperação' : 'Em risco'])
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `resultados_${avaliacao.titulo}.csv`; a.click()
  }

  const mediaGeral = resultados.length > 0 ? (resultados.reduce((s, r) => s + (r.nota_final ?? 0), 0) / resultados.filter(r => r.nota_final != null).length).toFixed(1) : '—'
  const aprovados = resultados.filter(r => r.nota_final >= 7).length
  const emRisco = resultados.filter(r => r.nota_final != null && r.nota_final < 5).length

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/avaliacoes" className="text-gray-500 hover:text-primary text-sm">← Avaliações</Link>
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-textMain">{avaliacao.titulo}</h1>
                <p className="text-gray-500 text-sm">{avaliacao.disciplina} • {avaliacao.tipo} • {avaliacao.total_questoes} questões • {avaliacao.turma_nome}</p>
                {avaliacao.data_aplicacao && <p className="text-xs text-gray-400 mt-1">📅 {new Date(avaliacao.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={exportarCSV} className="btn-secondary text-sm">📥 Exportar CSV</button>
                <button onClick={() => setLancarAberto(true)} className="btn-primary text-sm">📊 Lançar Notas</button>
                <Link to={`/avaliacoes/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">✏️ Editar</Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <p className="text-3xl font-bold text-primary">{mediaGeral}</p>
              <p className="text-xs text-gray-400 mt-1">Média da turma</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <p className="text-3xl font-bold text-success">{aprovados}</p>
              <p className="text-xs text-gray-400 mt-1">Aprovados (≥7)</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 text-center">
              <p className="text-3xl font-bold text-danger">{emRisco}</p>
              <p className="text-xs text-gray-400 mt-1">Em risco (&lt;5)</p>
            </div>
          </div>

          {/* Gráfico */}
          {resultados.filter(r => r.nota_final != null).length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-5 mb-5">
              <h3 className="font-semibold text-textMain mb-3">Notas por Aluno</h3>
              <GraficoBarrasDesempenho dados={resultados.filter(r => r.nota_final != null)} nomeChave="nome" valorChave="nota_final" />
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-textMain">Resultados por Aluno</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600">Aluno</th>
                  <th className="text-left px-4 py-3 text-gray-600">Nota</th>
                  <th className="text-left px-4 py-3 text-gray-600">%</th>
                  <th className="text-left px-4 py-3 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(r => (
                  <tr key={r.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setAlunoSel(r)}>
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: r.nota_final >= 7 ? '#27ae60' : r.nota_final >= 5 ? '#e67e22' : r.nota_final != null ? '#e74c3c' : '#9ca3af' }}>
                      {r.nota_final ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.percentual_acerto != null ? `${r.percentual_acerto}%` : '—'}</td>
                    <td className="px-4 py-3">
                      {r.nota_final == null ? <span className="text-gray-400 text-xs">Pendente</span>
                        : r.nota_final >= 7 ? <span className="px-2 py-0.5 bg-green-100 text-success rounded-full text-xs">Aprovado</span>
                        : r.nota_final >= 5 ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Recuperação</span>
                        : <span className="px-2 py-0.5 bg-red-100 text-danger rounded-full text-xs">Em risco</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal lançar notas */}
        {lancarAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-textMain mb-4">📊 Lançar Notas</h3>
              <div className="space-y-2 mb-4">
                {resultados.map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{r.nome}</span>
                    <input className="w-20 text-center border rounded-lg px-2 py-1 text-sm" type="number" min={0} max={10} step={0.1} placeholder="Nota" defaultValue={r.nota_final ?? ''} onChange={e => setNotaLancar(n => ({ ...n, [r.id]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={lancarNotas} disabled={salvando} className="btn-primary flex-1">{salvando ? 'Salvando...' : 'Salvar Notas'}</button>
                <button onClick={() => setLancarAberto(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
