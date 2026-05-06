import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { GraficoBarrasDesempenho } from '../components/GraficoDesempenho'
import api from '../api'

const corNota = (n) => n >= 7 ? '#27ae60' : n >= 5 ? '#e67e22' : '#e74c3c'

export default function CorretorResultados() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avaliacaoSel, setAvaliacaoSel] = useState(null)
  const [alunoSel, setAlunoSel] = useState(null)

  function carregar() {
    setCarregando(true)
    setErro('')
    api.get('/corretor/avaliacoes')
      .then(({ data }) => {
        setAvaliacoes(data)
        if (data.length > 0) setAvaliacaoSel(0)
      })
      .catch(err => setErro(err.response?.data?.erro || 'Erro ao buscar resultados do Corretor'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  if (carregando) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          Buscando resultados do Corretor de Provas...
        </div>
      </main>
    </div>
  )

  if (erro) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-danger font-medium mb-2">Erro ao conectar com o Corretor</p>
          <p className="text-sm text-gray-500 mb-4">{erro}</p>
          <button onClick={carregar} className="btn-primary text-sm">🔄 Tentar novamente</button>
        </div>
      </main>
    </div>
  )

  const av = avaliacaoSel !== null ? avaliacoes[avaliacaoSel] : null
  const resultados = av?.resultados || []
  const notasValidas = resultados.filter(r => r.nota != null)
  const mediaGeral = notasValidas.length > 0
    ? (notasValidas.reduce((s, r) => s + r.nota, 0) / notasValidas.length).toFixed(1)
    : '—'
  const aprovados = resultados.filter(r => r.nota >= 7).length
  const emRisco = resultados.filter(r => r.nota != null && r.nota < 5).length

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">📋 Corretor de Provas — Resultados</h1>
            <button onClick={carregar} className="btn-secondary text-sm">🔄 Atualizar</button>
          </div>

          {avaliacoes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm mt-1">Os resultados aparecem aqui quando avaliações são corrigidas no Corretor de Provas</p>
            </div>
          ) : (
            <>
              {/* Abas de avaliação */}
              {avaliacoes.length > 1 && (
                <div className="flex gap-2 flex-wrap mb-5">
                  {avaliacoes.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => { setAvaliacaoSel(i); setAlunoSel(null) }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${avaliacaoSel === i ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}
                    >
                      {a.titulo}
                    </button>
                  ))}
                </div>
              )}

              {av && (
                <>
                  {/* Info da avaliação */}
                  <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                    <h2 className="text-xl font-bold text-textMain">{av.titulo}</h2>
                    <p className="text-gray-500 text-sm">{av.disciplina} • {av.turmas} • {av.total_alunos} alunos</p>
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
                  {notasValidas.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                      <h3 className="font-semibold text-textMain mb-3">Notas por Aluno</h3>
                      <GraficoBarrasDesempenho dados={notasValidas.map(r => ({ nome: r.aluno, nota_final: r.nota }))} nomeChave="nome" valorChave="nota_final" />
                    </div>
                  )}

                  {/* Tabela */}
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-textMain">Resultados por Aluno</h3>
                      <p className="text-xs text-gray-400">Clique em um aluno para ver questão por questão</p>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600">Aluno</th>
                          <th className="text-left px-4 py-3 text-gray-600">Nota</th>
                          <th className="text-left px-4 py-3 text-gray-600">% Acerto</th>
                          <th className="text-left px-4 py-3 text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 text-gray-600">Questões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.sort((a, b) => b.nota - a.nota).map((r, j) => {
                          const total = (r.acertos || 0) + (r.erros || 0)
                          const pct = total > 0 ? Math.round((r.acertos / total) * 100) : 0
                          const temDetalhe = r.questoes_detalhe?.length > 0
                          return (
                            <tr key={j} className="border-t hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setAlunoSel(r)}>
                              <td className="px-4 py-3 font-medium">{r.aluno}</td>
                              <td className="px-4 py-3 font-bold" style={{ color: corNota(r.nota) }}>{r.nota}</td>
                              <td className="px-4 py-3 text-gray-500">{pct}%</td>
                              <td className="px-4 py-3">
                                {r.nota >= 7
                                  ? <span className="px-2 py-0.5 bg-green-100 text-success rounded-full text-xs">Aprovado</span>
                                  : r.nota >= 5
                                  ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Recuperação</span>
                                  : <span className="px-2 py-0.5 bg-red-100 text-danger rounded-full text-xs">Em risco</span>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-0.5 flex-wrap">
                                  {temDetalhe
                                    ? r.questoes_detalhe.map((q, i) => (
                                        <span key={i} title={`Q${q.numero}: ${q.acertou ? 'Acerto' : 'Erro'}`}
                                          className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${q.acertou ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {q.numero}
                                        </span>
                                      ))
                                    : Array.from({ length: total }, (_, i) => i < r.acertos).map((acertou, i) => (
                                        <span key={i} title={`Q${i + 1}: ${acertou ? 'Acerto' : 'Erro'}`}
                                          className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${acertou ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {i + 1}
                                        </span>
                                      ))
                                  }
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal detalhe aluno */}
      {alunoSel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAlunoSel(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-textMain text-lg">{alunoSel.aluno}</h3>
                <p className="text-sm text-gray-500">
                  {av?.titulo} • Turma: {alunoSel.turma} • Nota: <strong style={{ color: corNota(alunoSel.nota) }}>{alunoSel.nota}</strong>
                </p>
              </div>
              <button onClick={() => setAlunoSel(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-5">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success">{alunoSel.acertos}</p>
                  <p className="text-xs text-gray-500">Acertos</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-danger">{alunoSel.erros}</p>
                  <p className="text-xs text-gray-500">Erros</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {(() => { const t = (alunoSel.acertos || 0) + (alunoSel.erros || 0); return t > 0 ? Math.round((alunoSel.acertos / t) * 100) + '%' : '—' })()}
                  </p>
                  <p className="text-xs text-gray-500">% Acerto</p>
                </div>
              </div>

              {/* Grade de questões */}
              {alunoSel.questoes_detalhe?.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Questão por Questão:</h4>
                  <div className="space-y-2">
                    {alunoSel.questoes_detalhe.map((q, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${q.acertou ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${q.acertou ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                          {q.numero}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium">Questão {q.numero}</p>
                          <div className="flex gap-4 mt-1 text-xs">
                            <span className={`font-medium ${q.acertou ? 'text-success' : 'text-danger'}`}>
                              Resposta: <strong className="uppercase">{q.resposta_aluno || '—'}</strong>
                            </span>
                            {!q.acertou && q.gabarito && (
                              <span className="text-success font-medium">
                                Correta: <strong className="uppercase">{q.gabarito}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-lg">{q.acertou ? '✅' : '❌'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                (() => {
                  const total = (alunoSel.acertos || 0) + (alunoSel.erros || 0)
                  if (total === 0) return <p className="text-sm text-gray-400 text-center py-4">Sem detalhes de questões disponíveis</p>
                  return (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Questão por Questão:</h4>
                      <div className="space-y-2">
                        {Array.from({ length: total }, (_, i) => i < alunoSel.acertos).map((acertou, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${acertou ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${acertou ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${acertou ? 'text-green-700' : 'text-red-700'}`}>Questão {i + 1}: {acertou ? 'Acerto' : 'Erro'}</p>
                            </div>
                            <span className="text-lg">{acertou ? '✅' : '❌'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
