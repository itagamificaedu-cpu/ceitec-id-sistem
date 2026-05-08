import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function ListaAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    api.get('/avaliacoes').then(({ data }) => setAvaliacoes(data)).finally(() => setCarregando(false))
  }, [])

  const filtradas = avaliacoes.filter(a =>
    a.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    a.disciplina?.toLowerCase().includes(filtro.toLowerCase()) ||
    a.turma_nome?.toLowerCase().includes(filtro.toLowerCase())
  )

  async function excluir(av) {
    if (!window.confirm(`Excluir "${av.titulo}"? Esta ação não pode ser desfeita.`)) return
    await api.delete(`/avaliacoes/${av.id}`)
    setAvaliacoes(prev => prev.filter(a => a.id !== av.id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textMain">Avaliações</h1>
            <Link to="/avaliacoes/nova" className="btn-primary text-sm">+ Nova Avaliação</Link>
          </div>

          <div className="mb-5">
            <input className="input-field" placeholder="🔍 Buscar por título, disciplina ou turma..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhuma avaliação encontrada</div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(av => (
                <div key={av.id} className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">📝</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-textMain">{av.titulo}</p>
                    <p className="text-sm text-gray-500">{av.disciplina} • {av.tipo} • {av.total_questoes} questões</p>
                    <p className="text-xs text-gray-400 mt-0.5">{av.turma_nome} {av.data_aplicacao ? `• ${new Date(av.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/avaliacoes/${av.id}`} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20">Ver resultados</Link>
                    <Link to={`/avaliacoes/${av.id}/editar`} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">✏️</Link>
                    <button onClick={() => excluir(av)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
