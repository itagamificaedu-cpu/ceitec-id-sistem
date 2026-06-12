import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { GraficoBarrasDesempenho } from '../components/GraficoDesempenho'
import api from '../api'

// ─── Componente de cards de resumo ──────────────────────────────────────────
function CardsResumo({ dados }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-md p-4 text-center">
        <p className="text-3xl font-bold text-primary">{dados.media_geral ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-1">Média Geral</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-4 text-center">
        <p className="text-3xl font-bold text-green-500">{dados.aprovados ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-1">Aprovados</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-4 text-center">
        <p className="text-3xl font-bold text-red-500">{dados.em_risco ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-1">Em Risco (&lt;5)</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-4 text-center">
        <p className="text-3xl font-bold text-secondary">{dados.total_alunos ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-1">Alunos com Resultado</p>
      </div>
    </div>
  )
}

// ─── Tabela de avaliações do Corretor ────────────────────────────────────────
function TabelaAvaliacoes({ avaliacoes }) {
  const [aberta, setAberta] = useState(null)

  if (!avaliacoes?.length) return null

  return (
    <div className="bg-white rounded-xl shadow-md p-5 mb-5">
      <h2 className="font-semibold text-textMain mb-4">📋 Provas Aplicadas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b">
              <th className="pb-2 pr-3">Prova</th>
              <th className="pb-2 pr-3">Disciplina</th>
              <th className="pb-2 pr-3">Turma</th>
              <th className="pb-2 pr-3 text-center">Alunos</th>
              <th className="pb-2 pr-3 text-center">Média</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map((av, idx) => (
              <React.Fragment key={idx}>
                <tr
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setAberta(aberta === idx ? null : idx)}
                >
                  <td className="py-2 pr-3 font-medium">{av.titulo}</td>
                  <td className="py-2 pr-3 text-gray-500">{av.disciplina}</td>
                  <td className="py-2 pr-3 text-gray-500">{av.turmas}</td>
                  <td className="py-2 pr-3 text-center">{av.total_alunos}</td>
                  <td className="py-2 pr-3 text-center">
                    <span
                      className="font-bold"
                      style={{ color: Number(av.media) >= 7 ? '#16a34a' : Number(av.media) >= 5 ? '#d97706' : '#dc2626' }}
                    >
                      {av.media}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs">{aberta === idx ? '▲' : '▼'}</td>
                </tr>

                {/* Detalhe dos alunos desta prova */}
                {aberta === idx && (
                  <tr>
                    <td colSpan={6} className="pb-4 pt-1">
                      <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 text-left border-b border-gray-200">
                              <th className="pb-1 pr-3">Aluno</th>
                              <th className="pb-1 pr-3">Turma</th>
                              <th className="pb-1 pr-3 text-center">Nota</th>
                              <th className="pb-1 pr-3 text-center">Acertos</th>
                              <th className="pb-1">Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {av.resultados.map((r, ri) => (
                              <tr key={ri} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 pr-3">{r.aluno}</td>
                                <td className="py-1 pr-3 text-gray-400">{r.turma}</td>
                                <td className="py-1 pr-3 text-center font-bold"
                                  style={{ color: r.nota >= 7 ? '#16a34a' : r.nota >= 5 ? '#d97706' : '#dc2626' }}>
                                  {r.nota}
                                </td>
                                <td className="py-1 pr-3 text-center text-gray-500">
                                  {r.acertos}/{av.numero_questoes}
                                </td>
                                <td className="py-1 text-gray-400">{r.data}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Desempenho() {
  const [aba, setAba]             = useState('corretor')   // 'corretor' | 'notas'
  const [turmas, setTurmas]       = useState([])
  const [turmaSel, setTurmaSel]   = useState('')
  const [turmaCorretorSel, setTurmaCorretorSel] = useState('')

  // dados para cada aba
  const [dadosCorretor, setDadosCorretor] = useState(null)
  const [dadosNotas, setDadosNotas]       = useState(null)
  const [carregando, setCarregando]       = useState(true)
  const [erro, setErro]                   = useState(null)

  // carrega turmas uma vez
  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
  }, [])

  // recarrega ao trocar aba ou turma
  useEffect(() => {
    setCarregando(true)
    setErro(null)

    if (aba === 'corretor') {
      api.get('/desempenho/corretor')
        .then(({ data }) => setDadosCorretor(data))
        .catch(e => setErro('Erro ao buscar dados do Corretor: ' + e.message))
        .finally(() => setCarregando(false))
    } else {
      const url = turmaSel ? `/desempenho/turma/${turmaSel}` : '/desempenho/geral'
      api.get(url)
        .then(({ data }) => setDadosNotas(data))
        .catch(() => setDadosNotas(null))
        .finally(() => setCarregando(false))
    }
  }, [aba, turmaSel])

  // Turmas disponíveis extraídas dos resultados do Corretor (client-side)
  const turmasCorretor = dadosCorretor?.avaliacoes
    ? [...new Set(
        dadosCorretor.avaliacoes.flatMap(av => av.resultados.map(r => r.turma)).filter(Boolean)
      )].sort()
    : []

  // Filtra dados do Corretor pela turma selecionada (sem alterar resultados)
  const dadosCorretorFiltrado = (() => {
    if (!dadosCorretor || !turmaCorretorSel) return dadosCorretor
    const avaliacoesFiltradas = dadosCorretor.avaliacoes
      .map(av => ({
        ...av,
        resultados: av.resultados.filter(r => r.turma === turmaCorretorSel),
      }))
      .filter(av => av.resultados.length > 0)

    if (!avaliacoesFiltradas.length) return { ...dadosCorretor, avaliacoes: [], total_alunos: 0, por_turma: [], por_disciplina: [], alunos_risco: [] }

    const todasNotas = avaliacoesFiltradas.flatMap(av => av.resultados.map(r => Number(r.nota) || 0))
    const media = ns => ns.length ? Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10 : null
    const discMap = {}
    avaliacoesFiltradas.forEach(av => {
      av.resultados.forEach(r => {
        const d = av.disciplina || 'Sem disciplina'
        if (!discMap[d]) discMap[d] = []
        discMap[d].push(Number(r.nota) || 0)
      })
    })
    return {
      ...dadosCorretor,
      avaliacoes: avaliacoesFiltradas,
      total_alunos: avaliacoesFiltradas.reduce((s, av) => s + av.resultados.length, 0),
      media_geral: media(todasNotas),
      aprovados: todasNotas.filter(n => n >= 7).length,
      em_risco: todasNotas.filter(n => n < 5).length,
      por_turma: [{ turma: turmaCorretorSel, media: media(todasNotas) }],
      por_disciplina: Object.entries(discMap).map(([disciplina, ns]) => ({ disciplina, media: media(ns) })),
    }
  })()

  const dados = aba === 'corretor' ? dadosCorretorFiltrado : dadosNotas

  // ── Exportar CSV dos resultados do Corretor ───────────────────────────────
  function exportarCSVCorretor() {
    if (!dadosCorretor?.avaliacoes?.length) return
    const linhas = [['Prova', 'Disciplina', 'Turma', 'Aluno', 'Nota', 'Acertos', 'Total Questões', 'Data']]
    for (const av of dadosCorretor.avaliacoes) {
      for (const r of av.resultados) {
        linhas.push([av.titulo, av.disciplina, r.turma, r.aluno, r.nota, r.acertos, av.numero_questoes, r.data])
      }
    }
    const csv   = linhas.map(l => l.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob  = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = 'resultados_prova_online.csv'
    a.click()
  }

  // ── Exportar CSV das notas manuais ────────────────────────────────────────
  function exportarCSVNotas() {
    if (!dadosNotas?.por_disciplina?.length) return
    const header = ['Disciplina', 'Média']
    const rows   = dadosNotas.por_disciplina.map(d => [d.disciplina, d.media])
    const csv    = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob   = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = 'desempenho_notas.csv'
    a.click()
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">📊 Desempenho Acadêmico</h1>

            {/* Botão exportar */}
            {aba === 'corretor' && dadosCorretor?.avaliacoes?.length > 0 && (
              <button onClick={exportarCSVCorretor} className="btn-secondary text-sm">
                📥 Exportar CSV
              </button>
            )}
            {aba === 'notas' && dadosNotas?.por_disciplina?.length > 0 && (
              <button onClick={exportarCSVNotas} className="btn-secondary text-sm">
                📥 Exportar CSV
              </button>
            )}
          </div>

          {/* Abas */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => { setAba('corretor'); setTurmaSel('') }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                aba === 'corretor'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🖥️ Prova Online (Corretor)
            </button>
            <button
              onClick={() => setAba('notas')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                aba === 'notas'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Notas Manuais
            </button>

            {/* Filtro de turma — Corretor */}
            {aba === 'corretor' && turmasCorretor.length > 0 && (
              <select
                className="ml-auto input-field w-auto text-sm"
                value={turmaCorretorSel}
                onChange={e => setTurmaCorretorSel(e.target.value)}
              >
                <option value="">Todas as turmas</option>
                {turmasCorretor.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}

            {/* Filtro de turma — Notas Manuais */}
            {aba === 'notas' && (
              <select
                className="ml-auto input-field w-auto text-sm"
                value={turmaSel}
                onChange={e => setTurmaSel(e.target.value)}
              >
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            )}
          </div>

          {/* Conteúdo */}
          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>

          ) : erro ? (
            <div className="text-center py-20 text-red-400">{erro}</div>

          ) : !dados || (aba === 'corretor' && !dadosCorretor?.total_alunos && !dadosCorretor?.avaliacoes?.length) ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 font-medium">
                {aba === 'corretor'
                  ? 'Nenhum resultado de Prova Online encontrado.'
                  : 'Sem notas manuais registradas.'}
              </p>
              {aba === 'corretor' && dadosCorretor?.aviso && (
                <p className="text-gray-400 text-sm mt-1">{dadosCorretor.aviso}</p>
              )}
              {aba === 'corretor' && (
                <p className="text-gray-400 text-sm mt-2">
                  Aplique provas pelo <strong>Corretor de Provas</strong> para ver os dados aqui.
                </p>
              )}
            </div>

          ) : (
            <>
              {/* Cards de resumo */}
              <CardsResumo dados={dados} />

              {/* Gráfico por turma */}
              {dados.por_turma?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                  <h2 className="font-semibold text-textMain mb-4">Média por Turma</h2>
                  <GraficoBarrasDesempenho dados={dados.por_turma} nomeChave="turma" valorChave="media" />
                </div>
              )}

              {/* Gráfico por disciplina */}
              {dados.por_disciplina?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                  <h2 className="font-semibold text-textMain mb-4">Média por Disciplina</h2>
                  <div className="space-y-3">
                    {dados.por_disciplina.map(d => (
                      <div key={d.disciplina}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{d.disciplina}</span>
                          <span
                            className="font-bold"
                            style={{ color: d.media >= 7 ? '#16a34a' : d.media >= 5 ? '#d97706' : '#dc2626' }}
                          >
                            {d.media}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${(d.media / 10) * 100}%`,
                              backgroundColor: d.media >= 7 ? '#16a34a' : d.media >= 5 ? '#d97706' : '#dc2626',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de provas (só aba Corretor) */}
              {aba === 'corretor' && <TabelaAvaliacoes avaliacoes={dadosCorretor?.avaliacoes} />}

              {/* Alunos em risco */}
              {dados.alunos_risco?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h2 className="font-semibold text-textMain mb-4">⚠️ Alunos em Risco (média &lt;5)</h2>
                  <div className="space-y-2">
                    {dados.alunos_risco.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          {a.foto_path
                            ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover rounded-full" />
                            : <span>👤</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{a.nome}</p>
                          <p className="text-xs text-gray-500">{a.turma_nome || a.turma}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{a.media_geral ?? '—'}</span>
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
