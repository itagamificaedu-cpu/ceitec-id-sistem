import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

const TIPOS = ['Resumo', 'Mapa Mental', 'Ficha de Revisão', 'Exercícios', 'Slides', 'Infográfico']

export default function CriadorConteudo() {
  const [form, setForm] = useState({ tema: '', disciplina: '', tipo: 'Resumo', nivel: 'fundamental', extensao: 'medio' })
  const [resultado, setResultado] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar(e) {
    e.preventDefault()
    if (!form.tema) return setErro('Informe o tema')
    setErro(''); setGerando(true); setResultado('')
    try {
      const { data } = await api.post('/ia/conteudo', form)
      setResultado(data.conteudo || data.texto)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar conteúdo')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">📄 Criador de Conteúdo com IA</h1>
            <p className="text-gray-500 text-sm mt-1">Gere resumos, mapas mentais, fichas de revisão e muito mais</p>
          </div>

          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-2">
              <form onSubmit={gerar} className="bg-white rounded-xl shadow-md p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Assunto *</label>
                  <input className="input-field" value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Segunda Guerra Mundial" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                  <input className="input-field" value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Ex: História" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conteúdo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIPOS.map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))} className={`py-1.5 text-sm rounded-lg border transition-colors ${form.tipo === t ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                  <select className="input-field" value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                    <option value="tecnico">Ensino Técnico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extensão</label>
                  <select className="input-field" value={form.extensao} onChange={e => setForm(f => ({ ...f, extensao: e.target.value }))}>
                    <option value="curto">Curto</option>
                    <option value="medio">Médio</option>
                    <option value="longo">Detalhado</option>
                  </select>
                </div>
                {erro && <p className="text-danger text-sm">{erro}</p>}
                <button type="submit" disabled={gerando} className="btn-primary w-full">{gerando ? '⏳ Gerando...' : '✨ Gerar Conteúdo'}</button>
              </form>
            </div>

            <div className="md:col-span-3">
              <div className="bg-white rounded-xl shadow-md p-5 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-textMain">Resultado — {form.tipo}</h3>
                  {resultado && <button onClick={() => navigator.clipboard.writeText(resultado)} className="text-sm text-primary hover:underline">📋 Copiar</button>}
                </div>
                {gerando ? (
                  <div className="flex flex-col items-center justify-center h-64 text-purple-500">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4" />
                    <p className="text-sm">Gerando {form.tipo.toLowerCase()}...</p>
                  </div>
                ) : resultado ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{resultado}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                    <span className="text-5xl mb-3">📄</span>
                    <p className="text-sm">O conteúdo gerado aparecerá aqui</p>
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
