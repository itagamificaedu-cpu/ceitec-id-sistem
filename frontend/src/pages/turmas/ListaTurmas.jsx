import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import CardTurma from '../../components/CardTurma'
import api from '../../api'

export default function ListaTurmas() {
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [salvando, setSalvando] = useState(false)

  function carregar() {
    api.get('/turmas').then(({ data }) => setTurmas(data)).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  async function salvarEdicao(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.put(`/turmas/${editando.id}`, editando)
      setEditando(null)
      carregar()
    } catch { } finally { setSalvando(false) }
  }

  async function confirmarExclusao() {
    try {
      await api.delete(`/turmas/${confirmando.id}`)
      setConfirmando(null)
      carregar()
    } catch { }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-textMain mb-6">Turmas e Alunos</h1>
          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhuma turma cadastrada</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {turmas.map(t => (
                <CardTurma
                  key={t.id}
                  turma={t}
                  onEditar={setEditando}
                  onExcluir={setConfirmando}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-textMain mb-4">✏️ Editar Turma</h2>
            <form onSubmit={salvarEdicao} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input className="input-field" value={editando.nome} onChange={e => setEditando(p => ({ ...p, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Curso</label>
                <input className="input-field" value={editando.curso} onChange={e => setEditando(p => ({ ...p, curso: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Turno</label>
                  <select className="input-field" value={editando.turno} onChange={e => setEditando(p => ({ ...p, turno: e.target.value }))}>
                    <option value="manhã">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ano Letivo</label>
                  <input className="input-field" value={editando.ano_letivo} onChange={e => setEditando(p => ({ ...p, ano_letivo: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Máx. Alunos</label>
                <input type="number" className="input-field" value={editando.max_alunos} onChange={e => setEditando(p => ({ ...p, max_alunos: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-textMain mb-2">Excluir Turma</h2>
            <p className="text-gray-500 text-sm mb-1">Tem certeza que deseja excluir</p>
            <p className="font-bold text-red-600 mb-1">"{confirmando.nome}"?</p>
            <p className="text-xs text-gray-400 mb-5">Todos os alunos e presenças desta turma serão excluídos.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarExclusao} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
