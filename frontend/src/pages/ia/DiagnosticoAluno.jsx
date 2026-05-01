import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function DiagnosticoAluno() {
  const [alunos, setAlunos] = useState([])
  const [alunoSel, setAlunoSel] = useState('')
  const [resultado, setResultado] = useState(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    api.get('/alunos').then(({ data }) => setAlunos(data))
  }, [])

  async function gerar() {
    if (!alunoSel) return setErro('Selecione um aluno')
    setErro(''); setResultado(null); setGerando(true)
    try {
      const { data } = await api.get(`/ia/diagnostico/${alunoSel}`)
      setResultado(data)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar diagnóstico')
    } finally {
      setGerando(false)
    }
  }

  const filtrados = alunos.filter(a => a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.codigo?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">🎯 Diagnóstico Pedagógico com IA</h1>
            <p className="text-gray-500 text-sm mt-1">Análise completa do perfil de aprendizagem e recomendações personalizadas</p>
          </div>

          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-textMain mb-3">Selecionar Aluno</h3>
                <input className="input-field mb-3" placeholder="🔍 Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} />
                <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
                  {filtrados.map(a => (
                    <button key={a.id} onClick={() => setAlunoSel(a.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${alunoSel == a.id ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <span className="font-medium">{a.nome}</span>
                      <span className={`block text-xs ${alunoSel == a.id ? 'text-white/70' : 'text-gray-400'}`}>{a.codigo} • {a.turma}</span>
                    </button>
                  ))}
                </div>
                {erro && <p className="text-danger text-sm mb-2">{erro}</p>}
                <button onClick={gerar} disabled={gerando || !alunoSel} className="btn-primary w-full">{gerando ? '⏳ Analisando...' : '🎯 Gerar Diagnóstico'}</button>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="bg-white rounded-xl shadow-md p-5 min-h-[400px]">
                <h3 className="font-semibold text-textMain mb-4">Diagnóstico</h3>
                {gerando ? (
                  <div className="flex flex-col items-center justify-center h-64 text-purple-500">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
                    <p className="text-sm">Analisando desempenho do aluno...</p>
                    <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
                  </div>
                ) : resultado ? (
                  <div className="space-y-4">
                    {resultado.aluno && (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                        <span className="text-2xl">👤</span>
                        <div>
                          <p className="font-medium">{resultado.aluno.nome}</p>
                          <p className="text-xs text-gray-500">{resultado.aluno.turma} • Média: {resultado.aluno.media_geral ?? '—'}</p>
                        </div>
                      </div>
                    )}

                    {resultado.diagnostico && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">📊 Análise</h4>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{resultado.diagnostico}</pre>
                        </div>
                      </div>
                    )}

                    {resultado.recomendacoes?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">💡 Recomendações</h4>
                        <ul className="space-y-1">
                          {resultado.recomendacoes.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-success mt-0.5">✓</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultado.plano_recuperacao && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">🎯 Plano de Recuperação</h4>
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <pre className="whitespace-pre-wrap text-sm text-yellow-800 font-sans leading-relaxed">{resultado.plano_recuperacao}</pre>
                        </div>
                      </div>
                    )}

                    <button onClick={() => navigator.clipboard.writeText(JSON.stringify(resultado, null, 2))} className="text-xs text-primary hover:underline">📋 Copiar diagnóstico</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                    <span className="text-5xl mb-3">🎯</span>
                    <p className="text-sm">Selecione um aluno e gere o diagnóstico</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
