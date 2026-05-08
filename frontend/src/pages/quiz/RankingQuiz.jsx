import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const MEDALS = ['🥇', '🥈', '🥉']
const COR_PÓDIO = ['from-yellow-400 to-amber-500', 'from-gray-300 to-gray-400', 'from-orange-400 to-amber-600']

export default function RankingQuiz() {
  const { id } = useParams()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get(`/quiz/${id}/ranking`)
      .then(({ data }) => setDados(data))
      .finally(() => setCarregando(false))
  }, [id])

  if (carregando) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <p className="text-gray-400">Carregando ranking...</p>
        </main>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <p className="text-red-400">Quiz não encontrado</p>
        </main>
      </div>
    )
  }

  const { quiz, resultados, total_questoes } = dados
  const top3 = resultados.slice(0, 3)
  const resto = resultados.slice(3)

  function pctColor(pct) {
    if (pct >= 80) return 'text-green-600'
    if (pct >= 60) return 'text-yellow-600'
    return 'text-red-500'
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/quiz" className="text-gray-400 hover:text-gray-600">← Voltar</Link>
            <div>
              <h1 className="text-xl font-bold text-textMain">🏆 Ranking — {quiz.titulo}</h1>
              <p className="text-sm text-gray-500">{resultados.length} participante{resultados.length !== 1 ? 's' : ''} • {total_questoes} questões</p>
            </div>
          </div>

          {resultados.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-500 font-medium">Nenhum aluno respondeu este quiz ainda</p>
              <p className="text-gray-400 text-sm mt-1">Compartilhe o link com seus alunos!</p>
              <div className="mt-4 bg-gray-100 rounded-xl px-6 py-3 inline-block">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Código</p>
                <p className="font-black text-2xl text-gray-800 tracking-widest">{quiz.codigo_acesso}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Pódio */}
              {top3.length >= 1 && (
                <div className="flex items-end justify-center gap-3 mb-8 px-4">
                  {/* 2º lugar — se existir */}
                  {top3[1] && (
                    <div className="flex-1 max-w-[160px]">
                      <div className={`bg-gradient-to-b ${COR_PÓDIO[1]} rounded-t-2xl p-3 text-center h-24 flex flex-col items-center justify-center`}>
                        <div className="text-3xl">{MEDALS[1]}</div>
                        <p className="text-white font-bold text-xs mt-1 truncate w-full text-center">{top3[1].aluno_nome}</p>
                      </div>
                      <div className="bg-gray-200 rounded-b-2xl py-2 text-center">
                        <p className="font-black text-gray-800">{top3[1].acertos}/{total_questoes}</p>
                        <p className={`text-xs font-bold ${pctColor(top3[1].percentual)}`}>{top3[1].percentual}%</p>
                      </div>
                    </div>
                  )}

                  {/* 1º lugar */}
                  <div className="flex-1 max-w-[180px]">
                    <div className={`bg-gradient-to-b ${COR_PÓDIO[0]} rounded-t-2xl p-3 text-center h-32 flex flex-col items-center justify-center shadow-lg`}>
                      <div className="text-4xl">{MEDALS[0]}</div>
                      <p className="text-white font-black text-sm mt-1 truncate w-full text-center">{top3[0].aluno_nome}</p>
                    </div>
                    <div className="bg-amber-100 border border-amber-200 rounded-b-2xl py-2 text-center">
                      <p className="font-black text-amber-900 text-lg">{top3[0].acertos}/{total_questoes}</p>
                      <p className={`text-xs font-bold ${pctColor(top3[0].percentual)}`}>{top3[0].percentual}%</p>
                    </div>
                  </div>

                  {/* 3º lugar — se existir */}
                  {top3[2] && (
                    <div className="flex-1 max-w-[160px]">
                      <div className={`bg-gradient-to-b ${COR_PÓDIO[2]} rounded-t-2xl p-3 text-center h-20 flex flex-col items-center justify-center`}>
                        <div className="text-3xl">{MEDALS[2]}</div>
                        <p className="text-white font-bold text-xs mt-1 truncate w-full text-center">{top3[2].aluno_nome}</p>
                      </div>
                      <div className="bg-orange-100 rounded-b-2xl py-2 text-center">
                        <p className="font-black text-orange-800">{top3[2].acertos}/{total_questoes}</p>
                        <p className={`text-xs font-bold ${pctColor(top3[2].percentual)}`}>{top3[2].percentual}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabela completa */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex text-xs font-bold text-gray-400 uppercase tracking-wide">
                  <span className="w-10">#</span>
                  <span className="flex-1">Nome</span>
                  <span className="w-20 text-center">Acertos</span>
                  <span className="w-16 text-center">%</span>
                  <span className="w-16 text-center">Tempo</span>
                </div>
                {resultados.map((r, i) => (
                  <div
                    key={r.id}
                    className={`px-5 py-3 flex items-center text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-50 last:border-0`}
                  >
                    <span className="w-10 font-black text-gray-400">
                      {i < 3 ? MEDALS[i] : `${i + 1}º`}
                    </span>
                    <span className="flex-1 font-semibold text-gray-800 truncate">{r.aluno_nome}</span>
                    <span className="w-20 text-center font-bold text-gray-700">
                      {r.acertos}/{total_questoes}
                    </span>
                    <span className={`w-16 text-center font-bold ${pctColor(r.percentual)}`}>
                      {r.percentual}%
                    </span>
                    <span className="w-16 text-center text-gray-400 text-xs">
                      {r.tempo_total > 0 ? `${r.tempo_total}s` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Estatísticas */}
              {resultados.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Participantes', valor: resultados.length, icon: '👥' },
                    {
                      label: 'Média',
                      valor: `${Math.round(resultados.reduce((s, r) => s + r.percentual, 0) / resultados.length)}%`,
                      icon: '📊'
                    },
                    {
                      label: 'Taxa de acerto',
                      valor: `${Math.round(resultados.filter(r => r.percentual >= 60).length / resultados.length * 100)}%`,
                      icon: '✅'
                    },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                      <div className="text-2xl mb-0.5">{stat.icon}</div>
                      <div className="font-black text-gray-900 text-lg">{stat.valor}</div>
                      <div className="text-xs text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
