import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { GraficoRadar } from '../../components/GraficoDesempenho'
import api from '../../api'

const NIVEIS = ['', 'Aprendiz', 'Explorador', 'Guerreiro', 'Campeão', 'Lenda']

export default function PerfilAluno() {
  const { id } = useParams()
  const [dados, setDados] = useState(null)
  const [itagame, setItagame] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aluno, setAluno] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const [desempRes, itaRes, alunoRes] = await Promise.all([
          api.get(`/desempenho/aluno/${id}`),
          api.get(`/itagame/aluno/${id}`),
          api.get(`/alunos/${id}`)
        ])
        setDados(desempRes.data)
        setItagame(itaRes.data)
        setAluno(alunoRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!dados) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20"><p className="text-danger">Aluno não encontrado</p></main></div>

  const a = aluno || dados.aluno
  const xpPct = itagame ? Math.min(100, (itagame.xp_total / (itagame.nivel_info?.proximo || itagame.xp_total)) * 100) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/turmas" className="text-gray-500 hover:text-primary text-sm">← Turmas</Link>
          </div>

          {/* Header do aluno */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-5">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-secondary/30">
                {a?.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-3xl">👤</span>}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-textMain">{a?.nome}</h1>
                <p className="text-secondary font-mono font-bold">{a?.codigo}</p>
                <p className="text-gray-500 text-sm">{a?.turma} • {a?.curso}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link to={`/alunos/${id}/carteirinha`} className="btn-primary text-sm">🎫 Carteirinha</Link>
                <Link to={`/alunos/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">✏️ Editar</Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {/* Frequência */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">📅 Frequência</h3>
              {dados.notas?.length === 0 ? (
                <p className="text-gray-400 text-sm">Sem registros</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Média</span><span className="font-bold text-primary text-lg">{dados.media_geral ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Melhor disciplina</span><span className="font-medium text-success text-xs">{dados.melhor_disciplina?.disciplina || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Atenção em</span><span className="font-medium text-danger text-xs">{dados.disciplina_critica?.disciplina || '—'}</span></div>
                </div>
              )}
            </div>

            {/* ItagGame */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">🎮 ItagGame</h3>
              {itagame ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-secondary">{itagame.xp_total} XP</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">Nível {itagame.nivel}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{NIVEIS[itagame.nivel]}</p>
                  {itagame.nivel_info?.proximo && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div className="h-2 bg-secondary rounded-full" style={{ width: `${xpPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">{itagame.nivel_info.xp_proximo} XP para o próximo nível</p>
                    </>
                  )}
                  {itagame.badges?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {itagame.badges.map((b, i) => <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">{b}</span>)}
                    </div>
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Sem dados</p>}
            </div>

            {/* Ocorrências */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">⚠️ Ocorrências</h3>
              {dados.ocorrencias?.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma ocorrência</p>
              ) : (
                <div className="space-y-2">
                  {dados.ocorrencias.slice(0, 3).map(o => (
                    <div key={o.id} className="text-xs border rounded-lg p-2">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{o.tipo}</span>
                        <span className={`px-1 rounded ${o.gravidade === 'alta' ? 'bg-red-100 text-danger' : o.tipo === 'elogio' ? 'bg-green-100 text-success' : 'bg-yellow-100 text-yellow-700'}`}>{o.gravidade}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5 truncate">{o.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gráfico radar por disciplina */}
          {dados.mediasPorDisc?.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-textMain mb-3">Desempenho por Disciplina</h3>
                <GraficoRadar dados={dados.mediasPorDisc} />
              </div>

              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-textMain mb-3">Médias por Disciplina</h3>
                <div className="space-y-3">
                  {dados.mediasPorDisc.map(d => (
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
            </div>
          )}

          {/* Histórico de avaliações */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-textMain mb-4">Histórico de Avaliações</h3>
            {dados.notas?.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma avaliação registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Avaliação</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Disciplina</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Nota</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.notas.map(n => (
                      <tr key={n.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{n.titulo || 'Avaliação'}</td>
                        <td className="px-3 py-2 text-gray-500">{n.disciplina}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: n.nota_final >= 7 ? '#27ae60' : n.nota_final >= 5 ? '#e67e22' : '#e74c3c' }}>{n.nota_final}</td>
                        <td className="px-3 py-2 text-gray-500">{n.percentual_acerto}%</td>
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
