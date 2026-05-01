import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function PlanoDeAula() {
  const [form, setForm] = useState({ disciplina: '', tema: '', nivel: 'fundamental', duracao: '50', objetivos: '' })
  const [resultado, setResultado] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar(e) {
    e.preventDefault()
    if (!form.disciplina || !form.tema) return setErro('Preencha disciplina e tema')
    setErro(''); setGerando(true); setResultado('')
    try {
      const { data } = await api.post('/ia/plano-aula', form)
      setResultado(data.plano || data.texto)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar plano')
    } finally {
      setGerando(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(resultado)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">📚 Plano de Aula com IA</h1>
            <p className="text-gray-500 text-sm mt-1">Gere planos de aula completos e estruturados com inteligência artificial</p>
          </div>

          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-2">
              <form onSubmit={gerar} className="bg-white rounded-xl shadow-md p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina *</label>
                  <input className="input-field" value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Ex: Matemática" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Conteúdo *</label>
                  <input className="input-field" value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Frações e decimais" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Ensino</label>
                  <select className="input-field" value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                    <option value="tecnico">Ensino Técnico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
                  <input className="input-field" type="number" min={30} max={240} value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objetivos específicos</label>
                  <textarea className="input-field resize-none" rows={3} value={form.objetivos} onChange={e => setForm(f => ({ ...f, objetivos: e.target.value }))} placeholder="O que os alunos devem aprender..." />
                </div>
                {erro && <p className="text-danger text-sm">{erro}</p>}
                <button type="submit" disabled={gerando} className="btn-primary w-full">{gerando ? '⏳ Gerando...' : '✨ Gerar Plano de Aula'}</button>
              </form>
            </div>

            <div className="md:col-span-3">
              <div className="bg-white rounded-xl shadow-md p-5 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-textMain">Resultado</h3>
                  {resultado && <button onClick={copiar} className="text-sm text-primary hover:underline">📋 Copiar</button>}
                </div>
                {gerando ? (
                  <div className="flex flex-col items-center justify-center h-64 text-purple-500">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
                    <p className="text-sm">Gerando plano de aula...</p>
                  </div>
                ) : resultado ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{resultado}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                    <span className="text-5xl mb-3">📝</span>
                    <p className="text-sm">Preencha o formulário e clique em gerar</p>
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
