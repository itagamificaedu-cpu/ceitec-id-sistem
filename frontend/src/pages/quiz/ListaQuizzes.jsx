import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const VITE_APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

export default function ListaQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [copiado, setCopiado] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/quiz').then(({ data }) => setQuizzes(data)).finally(() => setCarregando(false))
  }, [])

  async function excluir(quiz) {
    if (!window.confirm(`Excluir o quiz "${quiz.titulo}"? Esta ação não pode ser desfeita.`)) return
    await api.delete(`/quiz/${quiz.id}`)
    setQuizzes(prev => prev.filter(q => q.id !== quiz.id))
  }

  async function copiarLink(quiz) {
    const link = `${VITE_APP_URL}/q/${quiz.codigo_acesso}`
    await navigator.clipboard.writeText(link)
    setCopiado(quiz.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const filtrados = quizzes.filter(q =>
    q.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    q.descricao?.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <Link to="/avaliacoes" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              📝 Avaliações
            </Link>
            <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px">
              🎯 Quiz
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-textMain">Quizzes Interativos</h1>
              <p className="text-sm text-gray-500 mt-0.5">Crie e compartilhe quizzes estilo Kahoot para seus alunos</p>
            </div>
            <Link to="/quiz/novo" className="btn-primary text-sm">+ Criar Quiz</Link>
          </div>

          {/* Busca */}
          <div className="mb-5">
            <input
              className="input-field"
              placeholder="🔍 Buscar quiz..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando quizzes...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-500 font-medium">Nenhum quiz criado ainda</p>
              <p className="text-gray-400 text-sm mt-1">Clique em "+ Criar Quiz" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtrados.map((quiz, idx) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  cor={CORES[idx % CORES.length]}
                  copiado={copiado === quiz.id}
                  onCopiar={() => copiarLink(quiz)}
                  onEditar={() => navigate(`/quiz/${quiz.id}/editar`)}
                  onRanking={() => navigate(`/quiz/${quiz.id}/ranking`)}
                  onExcluir={() => excluir(quiz)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const CORES = [
  { bg: 'from-violet-500 to-purple-600', icon: '🚀' },
  { bg: 'from-blue-500 to-cyan-600',     icon: '🌊' },
  { bg: 'from-green-500 to-emerald-600', icon: '🌿' },
  { bg: 'from-orange-500 to-amber-600',  icon: '🔥' },
  { bg: 'from-pink-500 to-rose-600',     icon: '⭐' },
  { bg: 'from-indigo-500 to-blue-600',   icon: '🎮' },
]

function QuizCard({ quiz, cor, copiado, onCopiar, onEditar, onRanking, onExcluir }) {
  const VITE_APP_URL = import.meta.env.VITE_APP_URL || window.location.origin
  const linkJogar = `${VITE_APP_URL}/q/${quiz.codigo_acesso}`

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
      {/* Cabeçalho colorido */}
      <div className={`bg-gradient-to-r ${cor.bg} p-5 relative`}>
        <span className="text-4xl">{cor.icon}</span>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${quiz.ativo ? 'bg-green-400 text-white' : 'bg-gray-400 text-white'}`}>
            {quiz.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{quiz.titulo}</h3>
        {quiz.descricao && (
          <p className="text-gray-500 text-xs mb-3 line-clamp-2">{quiz.descricao}</p>
        )}

        {/* Chips de info */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            📝 {quiz.total_questoes || 0} perguntas
          </span>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            ⏱️ {quiz.tempo_por_questao}s cada
          </span>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            🎮 {quiz.total_jogadas || 0} jogadas
          </span>
        </div>

        {/* Código de acesso */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Código</p>
            <p className="font-black text-lg text-gray-800 tracking-widest">{quiz.codigo_acesso}</p>
          </div>
          <button
            onClick={onCopiar}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium hover:bg-gray-50 transition-colors"
          >
            {copiado ? '✅ Copiado!' : '📋 Copiar link'}
          </button>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <a
            href={linkJogar}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 transition-opacity"
          >
            ▶ Jogar
          </a>
          <button
            onClick={onRanking}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Ver ranking"
          >
            🏆
          </button>
          <button
            onClick={onEditar}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={onExcluir}
            className="px-3 py-2 rounded-xl text-sm bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
