import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function CriadorAvaliacao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [turmas, setTurmas] = useState([])
  const [form, setForm] = useState({ titulo: '', disciplina: '', tipo: 'prova', turma_id: '', data_aplicacao: '', instrucoes: '' })
  const [questoes, setQuestoes] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // IA
  const [iaAberto, setIaAberto] = useState(false)
  const [iaTema, setIaTema] = useState('')
  const [iaNivel, setIaNivel] = useState('médio')
  const [iaQtd, setIaQtd] = useState(5)
  const [iaGerando, setIaGerando] = useState(false)
  const [iaErro, setIaErro] = useState('')

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
    if (editando) {
      api.get(`/avaliacoes/${id}`).then(({ data }) => {
        setForm({ titulo: data.titulo || '', disciplina: data.disciplina || '', tipo: data.tipo || 'prova', turma_id: data.turma_id || '', data_aplicacao: data.data_aplicacao || '', instrucoes: data.instrucoes || '' })
        setQuestoes(data.questoes || [])
      })
    }
  }, [id])

  function addQuestao() {
    setQuestoes(q => [...q, { enunciado: '', alternativas: ['', '', '', ''], resposta_correta: 0, pontos: 1 }])
  }

  function updateQuestao(idx, campo, valor) {
    setQuestoes(q => q.map((x, i) => i === idx ? { ...x, [campo]: valor } : x))
  }

  function updateAlternativa(qIdx, aIdx, valor) {
    setQuestoes(q => q.map((x, i) => i === qIdx ? { ...x, alternativas: x.alternativas.map((a, j) => j === aIdx ? valor : a) } : x))
  }

  function removeQuestao(idx) {
    setQuestoes(q => q.filter((_, i) => i !== idx))
  }

  async function gerarComIA() {
    if (!iaTema) return setIaErro('Informe o tema')
    setIaErro(''); setIaGerando(true)
    try {
      const { data } = await api.post('/ia/questoes', { tema: iaTema, nivel: iaNivel, quantidade: iaQtd, disciplina: form.disciplina })
      const novas = data.questoes.map(q => ({ enunciado: q.enunciado, alternativas: q.alternativas, resposta_correta: q.resposta_correta ?? 0, pontos: 1 }))
      setQuestoes(prev => [...prev, ...novas])
      setIaAberto(false)
    } catch (err) {
      setIaErro(err.response?.data?.erro || 'Erro ao gerar questões')
    } finally {
      setIaGerando(false)
    }
  }

  async function salvar() {
    setErro('')
    if (!form.titulo || !form.turma_id) return setErro('Título e turma são obrigatórios')
    if (questoes.length === 0) return setErro('Adicione pelo menos uma questão')
    setSalvando(true)
    try {
      if (editando) await api.put(`/avaliacoes/${id}`, { ...form, questoes })
      else await api.post('/avaliacoes', { ...form, questoes })
      navigate('/avaliacoes')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/avaliacoes" className="text-gray-500 hover:text-primary text-sm">← Avaliações</Link>
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-6">{editando ? 'Editar Avaliação' : 'Nova Avaliação'}</h1>

          {/* Dados gerais */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-5 space-y-4">
            <h3 className="font-semibold text-textMain">Dados Gerais</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input className="input-field" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Prova 1 — Bimestre 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <input className="input-field" value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Matemática" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="prova">Prova</option>
                  <option value="simulado">Simulado</option>
                  <option value="exercicio">Exercício</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label>
                <select className="input-field" value={form.turma_id} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Aplicação</label>
                <input className="input-field" type="date" value={form.data_aplicacao} onChange={e => setForm(f => ({ ...f, data_aplicacao: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instruções</label>
              <textarea className="input-field resize-none" rows={2} value={form.instrucoes} onChange={e => setForm(f => ({ ...f, instrucoes: e.target.value }))} placeholder="Instruções para os alunos..." />
            </div>
          </div>

          {/* Questões */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-textMain">Questões ({questoes.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => setIaAberto(true)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">🤖 Gerar com IA</button>
                <button onClick={addQuestao} className="btn-primary text-sm">+ Adicionar</button>
              </div>
            </div>

            {/* Modal IA */}
            {iaAberto && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-textMain mb-4">🤖 Gerar Questões com IA</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Conteúdo *</label>
                      <input className="input-field" value={iaTema} onChange={e => setIaTema(e.target.value)} placeholder="Ex: Equações do 2º grau" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                        <select className="input-field" value={iaNivel} onChange={e => setIaNivel(e.target.value)}>
                          <option value="fácil">Fácil</option>
                          <option value="médio">Médio</option>
                          <option value="difícil">Difícil</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                        <input className="input-field" type="number" min={1} max={20} value={iaQtd} onChange={e => setIaQtd(Number(e.target.value))} />
                      </div>
                    </div>
                    {iaErro && <p className="text-danger text-sm">{iaErro}</p>}
                    <div className="flex gap-2 pt-2">
                      <button onClick={gerarComIA} disabled={iaGerando} className="btn-primary flex-1">{iaGerando ? '⏳ Gerando...' : '✨ Gerar'}</button>
                      <button onClick={() => setIaAberto(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {questoes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhuma questão adicionada</p>
            ) : (
              <div className="space-y-5">
                {questoes.map((q, qi) => (
                  <div key={qi} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-gray-600">Questão {qi + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Pontos:</label>
                        <input className="w-16 text-center border rounded-lg px-2 py-1 text-sm" type="number" min={0.5} step={0.5} value={q.pontos} onChange={e => updateQuestao(qi, 'pontos', Number(e.target.value))} />
                        <button onClick={() => removeQuestao(qi)} className="text-danger hover:text-red-700 text-sm">✕</button>
                      </div>
                    </div>
                    <textarea className="input-field resize-none mb-3" rows={2} placeholder="Enunciado da questão..." value={q.enunciado} onChange={e => updateQuestao(qi, 'enunciado', e.target.value)} />
                    <div className="space-y-2">
                      {q.alternativas.map((alt, ai) => (
                        <div key={ai} className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQuestao(qi, 'resposta_correta', ai)} className={`w-7 h-7 rounded-full flex-shrink-0 text-sm font-bold transition-colors ${q.resposta_correta === ai ? 'bg-success text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {String.fromCharCode(65 + ai)}
                          </button>
                          <input className="input-field flex-1" placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`} value={alt} onChange={e => updateAlternativa(qi, ai, e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Clique na letra para marcar como correta</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {erro && <p className="text-danger text-sm text-center mb-4">{erro}</p>}

          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando} className="btn-primary flex-1">{salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Avaliação'}</button>
            <Link to="/avaliacoes" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
