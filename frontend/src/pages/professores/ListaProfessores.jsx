import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function ListaProfessores() {
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get('/professores').then(({ data }) => setProfessores(data)).finally(() => setCarregando(false))
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textMain">Professores</h1>
            <Link to="/professores/novo" className="btn-primary text-sm">+ Novo Professor</Link>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : professores.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhum professor cadastrado</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {professores.map(p => (
                <Link key={p.id} to={`/professores/${p.id}/editar`} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.foto_path ? <img src={p.foto_path} alt={p.nome} className="w-full h-full object-cover" /> : <span className="text-2xl">👨‍🏫</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-textMain truncate">{p.nome}</p>
                      <p className="text-xs text-secondary font-mono">{p.codigo}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-500 truncate">📚 {p.especialidade || '—'}</p>
                    <p className="text-gray-500 truncate">✉️ {p.email}</p>
                    {p.telefone && <p className="text-gray-500">📱 {p.telefone}</p>}
                  </div>
                  {p.disciplinas?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.disciplinas.slice(0, 3).map((d, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{d}</span>
                      ))}
                      {p.disciplinas.length > 3 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{p.disciplinas.length - 3}</span>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
