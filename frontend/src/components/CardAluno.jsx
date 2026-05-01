import React from 'react'
import { Link } from 'react-router-dom'

export default function CardAluno({ aluno, onDesativar }) {
  const fotoUrl = aluno.foto_path ? aluno.foto_path : null

  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        {fotoUrl ? (
          <img src={fotoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">👤</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-textMain truncate">{aluno.nome}</p>
        <p className="text-xs text-secondary font-mono font-bold">{aluno.codigo}</p>
        <p className="text-xs text-gray-500 truncate">{aluno.turma} • {aluno.curso}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Link to={`/alunos/${aluno.id}/carteirinha`} className="text-xs bg-primary text-white px-2 py-1 rounded hover:opacity-90 text-center">
          Carteirinha
        </Link>
        <Link to={`/alunos/${aluno.id}/editar`} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-center">
          Editar
        </Link>
        {onDesativar && (
          <button onClick={() => onDesativar(aluno.id)} className="text-xs bg-red-50 text-danger px-2 py-1 rounded hover:bg-red-100">
            Remover
          </button>
        )}
      </div>
    </div>
  )
}
