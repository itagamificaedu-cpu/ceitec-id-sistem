import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import CardTurma from '../../components/CardTurma'
import api from '../../api'

export default function ListaTurmas() {
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).finally(() => setCarregando(false))
  }, [])

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
              {turmas.map(t => <CardTurma key={t.id} turma={t} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
