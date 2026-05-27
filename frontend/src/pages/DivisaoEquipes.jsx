/**
 * DivisaoEquipes.jsx
 * Sorteador de equipes — professor informa atividade, assunto,
 * alunos por equipe e turma; sistema sorteia e exibe as equipes.
 */
import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// ─── Paleta ───────────────────────────────────────────────────────────────────
const CORES_EQUIPE = [
  { bg: '#1e3a5f', borda: '#3b82f6', badge: '#3b82f6' },   // azul
  { bg: '#1a3a2a', borda: '#22c55e', badge: '#22c55e' },   // verde
  { bg: '#3a1e1e', borda: '#ef4444', badge: '#ef4444' },   // vermelho
  { bg: '#2e1e3a', borda: '#a855f7', badge: '#a855f7' },   // roxo
  { bg: '#3a2e1e', borda: '#f59e0b', badge: '#f59e0b' },   // âmbar
  { bg: '#1e3a3a', borda: '#06b6d4', badge: '#06b6d4' },   // ciano
  { bg: '#3a1e2e', borda: '#ec4899', badge: '#ec4899' },   // rosa
  { bg: '#2e3a1e', borda: '#84cc16', badge: '#84cc16' },   // lima
]

// Embaralha array (Fisher-Yates)
function embaralhar(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Divide array em N grupos (distribui um por um em cada equipe)
function dividirEmNGrupos(arr, n) {
  const grupos = Array.from({ length: n }, () => [])
  arr.forEach((item, i) => grupos[i % n].push(item))
  return grupos
}

// Gera letra da equipe: A, B, C ... Z, AA, AB ...
function letraEquipe(idx) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (idx < 26) return letras[idx]
  return letras[Math.floor(idx / 26) - 1] + letras[idx % 26]
}

export default function DivisaoEquipes() {
  const [turmas, setTurmas]           = useState([])
  const [turmaSel, setTurmaSel]       = useState('')
  const [alunos, setAlunos]           = useState([])
  const [atividade, setAtividade]     = useState('')
  const [assunto, setAssunto]         = useState('')
  const [numEquipes, setNumEquipes]   = useState(4)
  const [equipes, setEquipes]         = useState([])
  const [carregando, setCarregando]   = useState(false)
  const [animando, setAnimando]       = useState(false)
  const [erro, setErro]               = useState('')
  const resultadoRef                  = useRef(null)

  // Carrega turmas ao montar
  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
  }, [])

  // Carrega alunos ao trocar turma
  useEffect(() => {
    if (!turmaSel) { setAlunos([]); return }
    setCarregando(true)
    api.get('/alunos')
      .then(({ data }) => {
        const filtrados = data.filter(a => String(a.turma_id) === String(turmaSel))
        setAlunos(filtrados)
      })
      .catch(() => setAlunos([]))
      .finally(() => setCarregando(false))
  }, [turmaSel])

  const turmaNome = turmas.find(t => String(t.id) === String(turmaSel))?.nome || ''

  function sortear() {
    setErro('')
    if (!turmaSel)    return setErro('Selecione uma turma.')
    if (!atividade.trim()) return setErro('Informe o nome da atividade.')
    if (alunos.length === 0) return setErro('Nenhum aluno encontrado nesta turma.')
    if (numEquipes < 1) return setErro('Mínimo de 1 equipe.')
    if (numEquipes > alunos.length) return setErro(`Não é possível criar ${numEquipes} equipes com apenas ${alunos.length} alunos.`)

    setAnimando(true)
    setEquipes([])

    // Pequena animação antes de mostrar resultado
    setTimeout(() => {
      const embaralhados = embaralhar(alunos)
      const grupos = dividirEmNGrupos(embaralhados, Number(numEquipes))
      setEquipes(grupos)
      setAnimando(false)
      setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }, 800)
  }

  function resetar() {
    setEquipes([])
    setAtividade('')
    setAssunto('')
    setNumEquipes(4)
    setTurmaSel('')
    setErro('')
  }

  function imprimir() {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Divisão de Equipes — ${atividade}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
    h1   { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 14px; margin-bottom: 24px; }
    .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card  { border: 2px solid #ccc; border-radius: 10px; padding: 16px; }
    .titulo { font-weight: bold; font-size: 15px; margin-bottom: 10px; }
    .aluno  { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }
    .aluno:last-child { border-bottom: none; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>📋 ${atividade}</h1>
  <p class="sub">${assunto ? `Assunto: ${assunto} • ` : ''}Turma: ${turmaNome} • ${alunos.length} alunos • ${equipes.length} equipes</p>
  <div class="grade">
    ${equipes.map((eq, i) => `
      <div class="card">
        <div class="titulo">Equipe ${letraEquipe(i)}</div>
        ${eq.map(a => `<div class="aluno">👤 ${a.nome}</div>`).join('')}
      </div>`).join('')}
  </div>
</body>
</html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">🎲 Divisão de Equipes</h1>
            <p className="text-gray-400 text-sm mt-1">
              Sorteio automático de equipes por turma
            </p>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* Nome da atividade */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Nome da Atividade <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={atividade}
                  onChange={e => setAtividade(e.target.value)}
                  placeholder="Ex: Projeto de Ciências"
                  className="input-field w-full"
                />
              </div>

              {/* Assunto */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Assunto / Tema
                </label>
                <input
                  type="text"
                  value={assunto}
                  onChange={e => setAssunto(e.target.value)}
                  placeholder="Ex: Energia Renovável"
                  className="input-field w-full"
                />
              </div>

              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Turma <span className="text-red-400">*</span>
                </label>
                <select
                  value={turmaSel}
                  onChange={e => { setTurmaSel(e.target.value); setEquipes([]) }}
                  className="input-field w-full"
                >
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              {/* Número de equipes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Número de equipes <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={alunos.length || 50}
                  value={numEquipes}
                  onChange={e => setNumEquipes(Number(e.target.value))}
                  className="input-field w-full"
                />
              </div>
            </div>

            {/* Info turma carregada */}
            {turmaSel && !carregando && (
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                <span className="bg-primary/10 text-primary font-medium px-3 py-1 rounded-full">
                  {alunos.length} alunos encontrados
                </span>
                {alunos.length > 0 && numEquipes > 0 && (
                  <span className="bg-gray-100 px-3 py-1 rounded-full">
                    ≈ {Math.ceil(alunos.length / numEquipes)} alunos/equipe
                  </span>
                )}
              </div>
            )}
            {carregando && (
              <p className="text-sm text-gray-400 mb-4">Carregando alunos...</p>
            )}

            {/* Erro */}
            {erro && (
              <p className="text-red-500 text-sm mb-4">⚠️ {erro}</p>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={sortear}
                disabled={animando}
                className="btn-primary flex items-center gap-2"
              >
                {animando ? (
                  <>
                    <span className="animate-spin">🎲</span> Sorteando...
                  </>
                ) : (
                  <>🎲 Sortear Equipes</>
                )}
              </button>
              {equipes.length > 0 && (
                <>
                  <button onClick={sortear} className="btn-secondary">
                    🔄 Novo Sorteio
                  </button>
                  <button onClick={imprimir} className="btn-secondary">
                    🖨️ Imprimir
                  </button>
                  <button onClick={resetar} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">
                    Limpar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Animação de sorteio */}
          {animando && (
            <div className="text-center py-16">
              <div className="text-6xl animate-bounce mb-4">🎲</div>
              <p className="text-gray-400 text-lg font-medium animate-pulse">Sorteando equipes...</p>
            </div>
          )}

          {/* Resultado */}
          {equipes.length > 0 && !animando && (
            <div ref={resultadoRef}>
              {/* Resumo */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-textMain">{atividade}</h2>
                  {assunto && <p className="text-sm text-gray-400">{assunto}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {turmaNome} • {alunos.length} alunos • {equipes.length} equipes
                  </p>
                </div>
                <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                  ✓ Sorteio concluído
                </span>
              </div>

              {/* Grade de equipes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipes.map((equipe, idx) => {
                  const cor = CORES_EQUIPE[idx % CORES_EQUIPE.length]
                  return (
                    <div
                      key={idx}
                      className="rounded-xl p-4 border-2 transition-all hover:scale-[1.02]"
                      style={{
                        background: cor.bg,
                        borderColor: cor.borda,
                      }}
                    >
                      {/* Título da equipe */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="text-white font-bold text-lg w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: cor.badge }}
                        >
                          {letraEquipe(idx)}
                        </span>
                        <div>
                          <p className="font-bold text-white text-sm">
                            Equipe {letraEquipe(idx)}
                          </p>
                          <p className="text-xs" style={{ color: cor.borda }}>
                            {equipe.length} {equipe.length === 1 ? 'aluno' : 'alunos'}
                          </p>
                        </div>
                      </div>

                      {/* Lista de alunos */}
                      <div className="space-y-2">
                        {equipe.map((aluno, ai) => (
                          <div
                            key={aluno.id}
                            className="flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                              style={{ background: cor.badge + '33', color: cor.badge }}>
                              {ai + 1}
                            </span>
                            <span className="text-white text-sm truncate">{aluno.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Nota sobre distribuição desigual */}
              {alunos.length % numEquipes !== 0 && (
                <p className="text-center text-xs text-gray-400 mt-4">
                  * {alunos.length % numEquipes} {alunos.length % numEquipes === 1 ? 'equipe tem' : 'equipes têm'} 1 aluno a mais para completar a divisão
                </p>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
