import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { GraficoBarrasDesempenho } from '../components/GraficoDesempenho'
import api from '../api'

const corNota = (n) => n >= 7 ? '#27ae60' : n >= 5 ? '#e67e22' : '#e74c3c'

export default function CorretorResultados() {
  const [todasAvaliacoes, setTodasAvaliacoes] = useState([])
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([])
  const [turmaSel, setTurmaSel]   = useState('')
  const [avaliacaoSel, setAvaliacaoSel] = useState(null)
  const [alunoSel, setAlunoSel]   = useState(null)
  const [detalheAluno, setDetalheAluno] = useState(null)  // questões reais
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  function carregar(turma = '') {
    setCarregando(true)
    setErro('')
    setAvaliacaoSel(null)
    setAlunoSel(null)
    setDetalheAluno(null)
    const params = turma ? `?turma=${encodeURIComponent(turma)}` : ''
    api.get(`/corretor/avaliacoes${params}`)
      .then(({ data }) => {
        const avs  = data.avaliacoes  || []
        const trms = data.turmas      || []
        setTodasAvaliacoes(avs)
        setTurmasDisponiveis(trms)
        if (avs.length > 0) setAvaliacaoSel(0)
      })
      .catch(err => setErro(err.response?.data?.erro || 'Erro ao buscar resultados do Corretor'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  function onTurmaMudou(t) {
    setTurmaSel(t)
    carregar(t)
  }

  // Ao clicar num aluno: abre o modal e busca detalhe por questão
  function abrirDetalhe(r) {
    setAlunoSel(r)
    setDetalheAluno(null)
    if (r.id) {
      setCarregandoDetalhe(true)
      api.get(`/corretor/detalhe/${r.id}`)
        .then(({ data }) => setDetalheAluno(data))
        .catch(() => setDetalheAluno(null))
        .finally(() => setCarregandoDetalhe(false))
    }
  }

  function fecharModal() {
    setAlunoSel(null)
    setDetalheAluno(null)
  }

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
          <button onClick={() => carregar(turmaSel)} className="btn-primary text-sm">🔄 Tentar novamente</button>
        </div>
      </main>
    </div>
  )

  const av = avaliacaoSel !== null ? todasAvaliacoes[avaliacaoSel] : null
  const resultados = av?.resultados || []
  const notasValidas = resultados.filter(r => r.nota != null)
  const mediaGeral = notasValidas.length > 0
    ? (notasValidas.reduce((s, r) => s + r.nota, 0) / notasValidas.length).toFixed(1)
    : '—'
  const aprovados = resultados.filter(r => r.nota >= 7).length
  const emRisco   = resultados.filter(r => r.nota != null && r.nota < 5).length

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">📋 Corretor de Provas — Resultados</h1>
            <button onClick={() => carregar(turmaSel)} className="btn-secondary text-sm">🔄 Atualizar</button>
          </div>

          {/* Filtro de turma */}
          {turmasDisponiveis.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-gray-600">🏫 Filtrar por turma:</label>
              <select
                value={turmaSel}
                onChange={e => onTurmaMudou(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white min-w-[180px]"
              >
                <option value="">Todas as turmas</option>
                {turmasDisponiveis.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {turmaSel && (
                <button
                  onClick={() => onTurmaMudou('')}
                  className="text-xs text-gray-400 hover:text-danger underline"
                >
                  Limpar filtro
                </button>
              )}
            </div>
          )}

          {todasAvaliacoes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm mt-1">
                {turmaSel
                  ? `Nenhuma avaliação corrigida para a turma "${turmaSel}"`
                  : 'Os resultados aparecem aqui quando avaliações são corrigidas no Corretor de Provas'}
              </p>
            </div>
          ) : (
            <>
              {/* Abas de avaliação */}
              {todasAvaliacoes.length > 1 && (
                <div className="flex gap-2 flex-wrap mb-5">
                  {todasAvaliacoes.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => { setAvaliacaoSel(i); setAlunoSel(null); setDetalheAluno(null) }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${avaliacaoSel === i ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}
                    >
                      {a.titulo}
                      <span className={`ml-1 text-xs ${avaliacaoSel === i ? 'text-blue-200' : 'text-gray-400'}`}>
                        ({a.total_alunos})
                      </span>
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
                      <GraficoBarrasDesempenho
                        dados={notasValidas.map(r => ({ nome: r.aluno, nota_final: r.nota }))}
                        nomeChave="nome"
                        valorChave="nota_final"
                      />
                    </div>
                  )}

                  {/* Tabela */}
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-textMain">Resultados por Aluno</h3>
                      <p className="text-xs text-gray-400">Clique no aluno para ver questão por questão</p>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600">Aluno</th>
                          <th className="text-left px-4 py-3 text-gray-600">Turma</th>
                          {av.resultados.some(r => r.professor) && (
                            <th className="text-left px-4 py-3 text-gray-600">Professor</th>
                          )}
                          <th className="text-left px-4 py-3 text-gray-600">Nota</th>
                          <th className="text-left px-4 py-3 text-gray-600">% Acerto</th>
                          <th className="text-left px-4 py-3 text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 text-gray-600">Acertos / Erros</th>
                          <th className="text-left px-4 py-3 text-gray-600">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.sort((a, b) => b.nota - a.nota).map((r, j) => {
                          const total = (r.acertos || 0) + (r.erros || 0)
                          const pct = total > 0 ? Math.round((r.acertos / total) * 100) : 0
                          const mostraProfessor = av.resultados.some(x => x.professor)
                          return (
                            <tr
                              key={j}
                              className="border-t hover:bg-blue-50 transition-colors cursor-pointer"
                              onClick={() => abrirDetalhe(r)}
                              title="Clique para ver questão por questão"
                            >
                              <td className="px-4 py-3 font-medium">
                                {r.aluno}
                                {r.id && <span className="ml-1 text-blue-300 text-xs">🔍</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{r.turma}</td>
                              {mostraProfessor && (
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {r.professor ? r.professor.split('@')[0] : '—'}
                                </td>
                              )}
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
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-semibold text-sm">✓ {r.acertos}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-red-500 font-semibold text-sm">✗ {r.erros}</span>
                                  {total > 0 && (
                                    <div className="w-16 h-2 bg-red-100 rounded-full overflow-hidden ml-1">
                                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{r.data || '—'}</td>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={fecharModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Cabeçalho do modal */}
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-textMain text-lg">{alunoSel.aluno}</h3>
                <p className="text-sm text-gray-500">
                  {av?.titulo} • Turma: {alunoSel.turma} • Nota: <strong style={{ color: corNota(alunoSel.nota) }}>{alunoSel.nota}</strong>
                  {alunoSel.professor && (
                    <span className="ml-2 text-gray-400">• Prof: {alunoSel.professor.split('@')[0]}</span>
                  )}
                </p>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-5">
              {/* Resumo em cards */}
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

              {/* Barra de progresso */}
              {(() => {
                const total = (alunoSel.acertos || 0) + (alunoSel.erros || 0)
                const pct = total > 0 ? Math.round((alunoSel.acertos / total) * 100) : 0
                return total > 0 ? (
                  <div className="mb-5">
                    <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-1">{pct}% de acerto</p>
                  </div>
                ) : null
              })()}

              {/* Grade questão por questão */}
              {carregandoDetalhe && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Carregando questões...</p>
                </div>
              )}

              {!carregandoDetalhe && detalheAluno && detalheAluno.questoes && detalheAluno.questoes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-textMain mb-3 text-sm">📝 Gabarito Questão por Questão</h4>

                  {/* Legenda */}
                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500 inline-block"></span> Acertou</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-400 inline-block"></span> Errou</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-300 inline-block"></span> Sem resposta</span>
                  </div>

                  {/* Grid de questões */}
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {detalheAluno.questoes.map((q) => {
                      let bg = 'bg-gray-100 text-gray-500'
                      let titulo = `Q${q.numero}: Sem resposta | Gabarito: ${q.gabarito}`
                      if (q.acertou === true) {
                        bg = 'bg-green-500 text-white'
                        titulo = `Q${q.numero}: ✓ Acertou (${q.resposta_aluno})`
                      } else if (q.acertou === false) {
                        bg = 'bg-red-400 text-white'
                        titulo = `Q${q.numero}: ✗ Errou — Aluno: ${q.resposta_aluno || '?'} | Certo: ${q.gabarito}`
                      }
                      return (
                        <div
                          key={q.numero}
                          className={`${bg} rounded-lg p-2 text-center text-xs font-bold cursor-default select-none`}
                          title={titulo}
                        >
                          <div className="text-[10px] opacity-70">Q{q.numero}</div>
                          <div className="text-sm leading-tight">
                            {q.acertou === true ? '✓' : q.acertou === false ? '✗' : '—'}
                          </div>
                          {q.acertou === false && (
                            <div className="text-[9px] opacity-80 mt-0.5">
                              {q.resposta_aluno || '?'}→{q.gabarito}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Tabela detalhada dos erros */}
                  {detalheAluno.questoes.filter(q => q.acertou === false).length > 0 && (
                    <div className="mt-5">
                      <h4 className="font-semibold text-danger text-sm mb-2">
                        ✗ Questões erradas ({detalheAluno.questoes.filter(q => q.acertou === false).length})
                      </h4>
                      <div className="bg-red-50 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-red-100">
                            <tr>
                              <th className="text-left px-3 py-2 text-red-700">Questão</th>
                              <th className="text-left px-3 py-2 text-red-700">Resposta do aluno</th>
                              <th className="text-left px-3 py-2 text-red-700">Gabarito correto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalheAluno.questoes.filter(q => q.acertou === false).map(q => (
                              <tr key={q.numero} className="border-t border-red-100">
                                <td className="px-3 py-2 font-semibold">Q{q.numero}</td>
                                <td className="px-3 py-2 text-red-600 font-bold">{q.resposta_aluno || '—'}</td>
                                <td className="px-3 py-2 text-green-700 font-bold">{q.gabarito}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!carregandoDetalhe && !detalheAluno && !alunoSel.id && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  ℹ️ Detalhe por questão disponível apenas para resultados mais recentes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
