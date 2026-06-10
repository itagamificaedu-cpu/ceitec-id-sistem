import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { GraficoBarrasDesempenho } from '../../components/GraficoDesempenho'
import api from '../../api'

// ── Painel de correção manual da questão dissertativa ─────────────────────────
// Professor define a nota (com apoio opcional da IA) e um feedback para o aluno
function CorrecaoDissertativa({ avaliacaoId, questao, aoCorrigir }) {
  const [pontos,    setPontos]    = useState(questao.pontos_obtidos ?? '')
  const [feedback,  setFeedback]  = useState(questao.feedback_professor || '')
  const [sugestao,  setSugestao]  = useState(null)
  const [sugerindo, setSugerindo] = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [msg,       setMsg]       = useState('')

  async function pedirSugestaoIA() {
    setSugerindo(true); setMsg('')
    try {
      const { data } = await api.post('/ia/sugerir-correcao', {
        enunciado: questao.enunciado,
        criterios: questao.criterios_correcao,
        resposta_aluno: questao.resposta_texto,
        pontos_max: questao.pontos,
      })
      setSugestao(data)
      setPontos(data.pontos_sugeridos)
      if (!feedback) setFeedback(data.feedback_aluno || '')
    } catch (e) {
      setMsg(e.response?.data?.erro || 'Erro ao pedir sugestão da IA')
    } finally { setSugerindo(false) }
  }

  async function salvarCorrecao() {
    if (pontos === '' || pontos == null) return setMsg('Informe a pontuação')
    setSalvando(true); setMsg('')
    try {
      const { data } = await api.post(`/avaliacoes/${avaliacaoId}/corrigir-dissertativa`, {
        resposta_id: questao.resposta_id,
        pontos_obtidos: Number(pontos),
        feedback,
      })
      setMsg(`✅ Corrigida! Nota do aluno atualizada: ${data.nota_final}`)
      aoCorrigir && aoCorrigir()
    } catch (e) {
      setMsg(e.response?.data?.erro || 'Erro ao salvar correção')
    } finally { setSalvando(false) }
  }

  return (
    <div className="mt-2 p-3 rounded-lg" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
      <p className="text-xs font-bold mb-1" style={{ color: '#92400e' }}>✍️ RESPOSTA DO ALUNO:</p>
      <p className="text-sm mb-2 whitespace-pre-wrap" style={{ color: '#374151', background: '#fff', borderRadius: 8, padding: '8px 10px' }}>
        {questao.resposta_texto || '— (em branco)'}
      </p>

      {questao.criterios_correcao && (
        <details className="mb-2">
          <summary className="text-xs font-semibold cursor-pointer" style={{ color: '#92400e' }}>📋 Ver critérios de correção</summary>
          <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: '#6b7280' }}>{questao.criterios_correcao}</p>
        </details>
      )}

      {sugestao && (
        <div className="mb-2 p-2 rounded-lg text-xs" style={{ background: '#faf5ff', border: '1px solid #e9d5ff', color: '#6b21a8' }}>
          🤖 <strong>Sugestão da IA: {sugestao.pontos_sugeridos} / {questao.pontos} pts</strong>
          <p className="mt-1">{sugestao.justificativa}</p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <label className="text-xs font-semibold" style={{ color: '#92400e' }}>Pontos (máx {questao.pontos}):</label>
        <input
          type="number" min={0} max={questao.pontos} step={0.1}
          className="w-20 text-center border rounded-lg px-2 py-1 text-sm"
          value={pontos}
          onChange={e => setPontos(e.target.value)}
        />
        <button onClick={pedirSugestaoIA} disabled={sugerindo}
          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200">
          {sugerindo ? '⏳ Analisando...' : '🤖 Sugestão da IA'}
        </button>
      </div>

      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm resize-none mb-2"
        rows={2}
        placeholder="Feedback para o aluno (opcional)..."
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button onClick={salvarCorrecao} disabled={salvando} className="btn-primary text-xs">
          {salvando ? 'Salvando...' : questao.corrigida ? '💾 Atualizar correção' : '✅ Salvar correção'}
        </button>
        {msg && <span className="text-xs font-medium" style={{ color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
      </div>
    </div>
  )
}

export default function ResultadosAvaliacao() {
  const { id } = useParams()
  const [avaliacao, setAvaliacao] = useState(null)
  const [resultados, setResultados] = useState([])
  const [questoes, setQuestoes] = useState([])
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
        const data = resRes.data
        if (Array.isArray(data)) {
          setResultados(data)
        } else {
          setResultados(data.notas || [])
          setQuestoes(data.questoes || [])
        }
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  // Recarrega resultados após o professor corrigir uma dissertativa
  async function recarregarResultados() {
    try {
      const { data } = await api.get(`/avaliacoes/${id}/resultados`)
      setResultados(data.notas || [])
      setQuestoes(data.questoes || [])
    } catch { }
  }

  async function lancarNotas() {
    setSalvando(true)
    try {
      const payload = Object.entries(notaLancar).map(([aluno_id, nota]) => ({ aluno_id: Number(aluno_id), nota }))
      await api.post(`/avaliacoes/${id}/notas`, { notas: payload })
      const { data } = await api.get(`/avaliacoes/${id}/resultados`)
      setResultados(data.notas || data || [])
      setLancarAberto(false)
      setNotaLancar({})
    } catch { }
    finally { setSalvando(false) }
  }

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!avaliacao) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20"><p className="text-danger">Avaliação não encontrada</p></main></div>

  function exportarCSV() {
    const header = ['Aluno', 'Nota', '% Acerto', 'Status', 'BNCC']
    const rows = resultados.map(r => [r.nome, r.nota_final ?? '', r.percentual_acerto != null ? r.percentual_acerto + '%' : '', r.nota_final == null ? 'Pendente' : r.nota_final >= 7 ? 'Aprovado' : r.nota_final >= 5 ? 'Recuperação' : 'Em risco', avaliacao.bncc_codigo || ''])
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `resultados_${avaliacao.titulo}.csv`; a.click()
  }

  const notasValidas = resultados.filter(r => r.nota_final != null)
  const mediaGeral = notasValidas.length > 0 ? (notasValidas.reduce((s, r) => s + r.nota_final, 0) / notasValidas.length).toFixed(1) : '—'
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
                {avaliacao.bncc_codigo && (
                  <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                    📚 BNCC: {avaliacao.bncc_codigo}{avaliacao.bncc_ano ? ` • ${avaliacao.bncc_ano}º ano` : ''}{avaliacao.bncc_componente ? ` • ${avaliacao.bncc_componente}` : ''}
                  </span>
                )}
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
          {notasValidas.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-5 mb-5">
              <h3 className="font-semibold text-textMain mb-3">Notas por Aluno</h3>
              <GraficoBarrasDesempenho dados={notasValidas} nomeChave="nome" valorChave="nota_final" />
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-5">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-textMain">Resultados por Aluno</h3>
              <p className="text-xs text-gray-400">Clique em um aluno para ver questão por questão</p>
            </div>
            {resultados.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>Nenhum resultado lançado ainda</p>
                <button onClick={() => setLancarAberto(true)} className="btn-primary mt-3 text-sm">Lançar Notas</button>
              </div>
            ) : (
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
                  {resultados.map(r => (
                    <tr key={r.id} className="border-t hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setAlunoSel(r)}>
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
                      <td className="px-4 py-3">
                        {r.questoes_detalhe ? (
                          <div className="flex gap-0.5 flex-wrap">
                            {r.questoes_detalhe.map((q, i) => (
                              <span key={i} title={`Q${q.numero}: ${q.acertou ? 'Acerto' : 'Erro'}`}
                                className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${q.acertou ? 'bg-green-100 text-green-700' : q.resposta_aluno ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                                {q.numero}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-blue-500">Ver detalhe →</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal detalhe aluno */}
        {alunoSel && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAlunoSel(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h3 className="font-bold text-textMain text-lg">{alunoSel.nome}</h3>
                  <p className="text-sm text-gray-500">{avaliacao.titulo} • Nota: <strong style={{ color: alunoSel.nota_final >= 7 ? '#27ae60' : alunoSel.nota_final >= 5 ? '#e67e22' : '#e74c3c' }}>{alunoSel.nota_final ?? '—'}</strong></p>
                </div>
                <button onClick={() => setAlunoSel(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              <div className="p-5">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-success">{alunoSel.questoes_detalhe?.filter(q => q.acertou).length ?? alunoSel.acertos ?? '—'}</p>
                    <p className="text-xs text-gray-500">Acertos</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-danger">{alunoSel.questoes_detalhe?.filter(q => !q.acertou && q.resposta_aluno).length ?? alunoSel.erros ?? '—'}</p>
                    <p className="text-xs text-gray-500">Erros</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{alunoSel.percentual_acerto != null ? `${alunoSel.percentual_acerto}%` : '—'}</p>
                    <p className="text-xs text-gray-500">% Acerto</p>
                  </div>
                </div>

                {/* Questão por questão */}
                {alunoSel.questoes_detalhe && alunoSel.questoes_detalhe.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">Questão por Questão:</h4>
                    <div className="space-y-2">
                      {alunoSel.questoes_detalhe.map(q => (
                        <div key={q.numero} className={`flex items-start gap-3 p-3 rounded-lg border ${q.acertou ? 'bg-green-50 border-green-200' : q.resposta_aluno ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${q.acertou ? 'bg-green-200 text-green-800' : q.resposta_aluno ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'}`}>
                            {q.numero}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-snug">{q.enunciado || `Questão ${q.numero}`}</p>

                            {/* Dissertativa: painel de correção manual + IA */}
                            {q.tipo_questao === 'dissertativa' ? (
                              q.resposta_id ? (
                                <CorrecaoDissertativa
                                  avaliacaoId={id}
                                  questao={q}
                                  aoCorrigir={recarregarResultados}
                                />
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">Aluno ainda não respondeu</p>
                              )
                            ) : ['associacao', 'caca_palavras', 'cruzadinha', 'lacunas'].includes(q.tipo_questao) ? (
                              <div className="mt-1 text-xs text-gray-600">
                                {{ associacao: '🔗 Associação', caca_palavras: '🔤 Caça-Palavras', cruzadinha: '➕ Cruzadinha', lacunas: '✏️ Completar Lacunas' }[q.tipo_questao]}
                                {' '}• Pontos obtidos: <strong>{q.pontos_obtidos ?? 0} / {q.pontos}</strong>
                              </div>
                            ) : (
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
                            )}
                          </div>
                          <span className="text-lg flex-shrink-0">
                            {q.tipo_questao === 'dissertativa' && !q.corrigida ? '⏳' : q.acertou ? '✅' : (q.resposta_aluno || q.resposta_texto) ? (q.tipo_questao !== 'multipla' && (q.pontos_obtidos || 0) > 0 ? '🟡' : '❌') : '⬜'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Respostas detalhadas não disponíveis para este aluno</p>
                )}
              </div>
            </div>
          </div>
        )}

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
