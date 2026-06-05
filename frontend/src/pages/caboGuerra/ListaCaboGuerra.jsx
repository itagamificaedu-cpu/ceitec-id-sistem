/**
 * Lista de partidas de Cabo de Guerra — visão do professor/coordenador
 */

import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const STATUS_LABEL = {
  rascunho:     { cor: '#94a3b8', texto: 'Rascunho',     emoji: '📝' },
  em_andamento: { cor: '#22c55e', texto: 'Em andamento', emoji: '🟢' },
  finalizado:   { cor: '#64748b', texto: 'Finalizado',   emoji: '🏁' },
}

export default function ListaCaboGuerra() {
  const [partidas, setPartidas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/cabo-guerra').then(({ data }) => setPartidas(data)).finally(() => setCarregando(false))
  }, [])

  async function excluir(p) {
    if (!window.confirm(`Excluir a partida "${p.titulo}"?`)) return
    await api.delete(`/cabo-guerra/${p.id}`)
    setPartidas(prev => prev.filter(x => x.id !== p.id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-textMain">🪢 Cabo de Guerra</h1>
              <p className="text-sm text-gray-500 mt-0.5">Partidas presenciais — controle total do professor</p>
            </div>
            <Link to="/cabo-de-guerra/novo" className="btn-primary text-sm">+ Nova Partida</Link>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando partidas...</div>
          ) : partidas.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🪢</div>
              <p className="text-gray-500 font-medium">Nenhuma partida criada ainda</p>
              <p className="text-gray-400 text-sm mt-1">Clique em "+ Nova Partida" para começar</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {partidas.map(p => {
                const s = STATUS_LABEL[p.status] || STATUS_LABEL.rascunho
                const questoes = (() => { try { return JSON.parse(p.questoes_json || '[]').length } catch { return 0 } })()
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    {/* Ícone */}
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">
                      🪢
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{p.titulo}</span>
                        <span style={{ color: s.cor, background: s.cor + '22', borderRadius: 99 }}
                          className="text-xs font-bold px-2 py-0.5">
                          {s.emoji} {s.texto}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                        <span>📚 {p.turma_nome || 'Turma ?'}</span>
                        <span>❓ {questoes} perguntas</span>
                        <span>{p.time1_nome} 🆚 {p.time2_nome}</span>
                        {p.disciplina && <span>🔬 {p.disciplina}</span>}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 flex-shrink-0">
                      {p.status === 'em_andamento' ? (
                        <button
                          onClick={() => window.open(`/cabo-de-guerra/${p.id}/host`, '_blank')}
                          className="px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 border-0 cursor-pointer"
                        >
                          🎮 Controlar
                        </button>
                      ) : p.status === 'rascunho' ? (
                        <>
                          <button
                            onClick={() => navigate(`/cabo-de-guerra/${p.id}/editar`)}
                            className="px-3 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => window.open(`/cabo-de-guerra/${p.id}/host`, '_blank')}
                            className="px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 border-0 cursor-pointer"
                          >
                            ▶ Iniciar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => window.open(`/cabo-de-guerra/${p.id}/host`, '_blank')}
                          className="px-3 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
                        >
                          📊 Resultado
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/cabo-de-guerra/${p.id}/projetar`)}
                        className="px-3 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
                        title="Tela de projeção (TV/datashow)"
                      >
                        📺
                      </button>

                      {p.status !== 'em_andamento' && (
                        <button
                          onClick={() => excluir(p)}
                          className="px-3 py-2 rounded-xl text-sm bg-red-50 border border-red-200 text-red-500 hover:bg-red-100"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
