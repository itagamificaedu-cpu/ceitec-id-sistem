import React from 'react'
import { Link } from 'react-router-dom'

export default function CardTurma({ turma, onEditar, onExcluir }) {
  const corFreq = turma.frequencia_media >= 75 ? '#27ae60' : turma.frequencia_media >= 50 ? '#e67e22' : '#e74c3c'
  const corMedia = turma.media_desempenho >= 7 ? '#27ae60' : turma.media_desempenho >= 5 ? '#e67e22' : '#e74c3c'

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="h-2" style={{ background: 'linear-gradient(90deg, #1e3a5f, #f5a623)' }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-textMain text-lg">{turma.nome}</h3>
            <p className="text-gray-500 text-sm">{turma.curso}</p>
            <p className="text-xs text-gray-400 mt-0.5">{turma.turno} • {turma.ano_letivo}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{turma.total_alunos}</p>
            <p className="text-xs text-gray-400">alunos</p>
          </div>
        </div>

        {turma.professor_nome && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <span>👨‍🏫</span> {turma.professor_nome}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold" style={{ color: corFreq }}>{turma.frequencia_media}%</p>
            <p className="text-xs text-gray-400">Frequência</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold" style={{ color: turma.media_desempenho ? corMedia : '#999' }}>
              {turma.media_desempenho || '—'}
            </p>
            <p className="text-xs text-gray-400">Média</p>
          </div>
        </div>

        <Link to={`/turmas/${turma.id}`} className="block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary hover:text-white mb-2">
          Ver Turma →
        </Link>

        <div className="flex gap-2">
          <button
            onClick={() => onEditar && onEditar(turma)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors border border-yellow-200"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onExcluir && onExcluir(turma)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
          >
            🗑️ Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
