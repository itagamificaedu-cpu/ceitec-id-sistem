import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function CriadorQuestoes() {
  const [form, setForm] = useState({ tema: '', disciplina: '', nivel: 'médio', quantidade: 5 })
  const [questoes, setQuestoes] = useState([])
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar(e) {
    e.preventDefault()
    if (!form.tema) return setErro('Informe o tema')
    setErro(''); setGerando(true); setQuestoes([])
    try {
      const { data } = await api.post('/ia/questoes', form)
      setQuestoes(data.questoes || [])
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar questões')
    } finally {
      setGerando(false)
    }
  }

  function copiarTodas() {
    const txt = questoes.map((q, i) => {
      const alts = q.alternativas.map((a, j) => `${String.fromCharCode(65 + j)}) ${a}`).join('\n')
      return `${i + 1}. ${q.enunciado}\n${alts}\n✓ Gabarito: ${String.fromCharCode(65 + q.resposta_correta)}`
    }).join('\n\n')
    navigator.clipboard.writeText(txt)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">🤖 Criador de Questões com IA</h1>
            <p className="text-gray-500 text-sm mt-1">Gere questões de múltipla escolha automaticamente com gabarito</p>
          </div>

          <form onSubmit={gerar} className="bg-white rounded-xl shadow-md p-5 mb-5">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Conteúdo *</label>
                <input className="input-field" value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Revolução Industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <input className="input-field" value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Ex: História" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                <select className="input-field" value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
                  <option value="fácil">Fácil</option>
                  <option value="médio">Médio</option>
                  <option value="difícil">Difícil</option>
                </select>
              </div>
            </div>
            <div className="flex items-end gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input className="input-field w-24" type="number" min={1} max={20} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))} />
              </div>
              <button type="submit" disabled={gerando} className="btn-primary">{gerando ? '⏳ Gerando...' : '✨ Gerar Questões'}</button>
              {questoes.length > 0 && <button type="button" onClick={copiarTodas} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📋 Copiar todas</button>}
            </div>
            {erro && <p className="text-danger text-sm mt-2">{erro}</p>}
          </form>

          {gerando ? (
            <div className="bg-white rounded-xl shadow-md p-10 flex flex-col items-center text-purple-500">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
              <p className="text-sm">Gerando {form.quantidade} questões...</p>
            </div>
          ) : questoes.length > 0 ? (
            <div className="space-y-4">
              {questoes.map((q, qi) => (
                <div key={qi} className="bg-white rounded-xl shadow-md p-5">
                  <p className="font-medium text-textMain mb-3">{qi + 1}. {q.enunciado}</p>
                  <div className="space-y-2">
                    {q.alternativas.map((alt, ai) => (
                      <div key={ai} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${ai === q.resposta_correta ? 'bg-green-50 border border-success text-success font-medium' : 'bg-gray-50 text-gray-600'}`}>
                        <span className="font-bold flex-shrink-0">{String.fromCharCode(65 + ai)})</span>
                        <span>{alt}</span>
                        {ai === q.resposta_correta && <span className="ml-auto text-xs">✓ Correta</span>}
                      </div>
                    ))}
                  </div>
                  {q.explicacao && <p className="text-xs text-gray-500 mt-3 p-2 bg-blue-50 rounded-lg">💡 {q.explicacao}</p>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
