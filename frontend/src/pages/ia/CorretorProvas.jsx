import React, { useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function CorretorProvas() {
  const [form, setForm] = useState({ gabarito: '', respostas: '', aluno_nome: '' })
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [corrigindo, setCorrigindo] = useState(false)
  const [erro, setErro] = useState('')
  const [modo, setModo] = useState('texto')

  async function corrigir(e) {
    e.preventDefault()
    setErro(''); setResultado(null); setCorrigindo(true)
    try {
      if (modo === 'imagem' && imagem) {
        const fd = new FormData()
        fd.append('imagem', imagem)
        fd.append('gabarito', form.gabarito)
        fd.append('aluno_nome', form.aluno_nome)
        const { data } = await api.post('/ia/corrigir-prova', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setResultado(data)
      } else {
        if (!form.gabarito || !form.respostas) return setErro('Preencha gabarito e respostas')
        const { data } = await api.post('/ia/corrigir-prova', form)
        setResultado(data)
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro na correção')
    } finally {
      setCorrigindo(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">✅ Corretor de Provas com IA</h1>
            <p className="text-gray-500 text-sm mt-1">Corrija provas automaticamente por gabarito ou análise de imagem</p>
          </div>

          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex rounded-lg overflow-hidden border mb-4">
                  <button onClick={() => setModo('texto')} className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'texto' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Texto</button>
                  <button onClick={() => setModo('imagem')} className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'imagem' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Imagem</button>
                </div>

                <form onSubmit={corrigir} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno</label>
                    <input className="input-field" value={form.aluno_nome} onChange={e => setForm(f => ({ ...f, aluno_nome: e.target.value }))} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gabarito *</label>
                    <input className="input-field" value={form.gabarito} onChange={e => setForm(f => ({ ...f, gabarito: e.target.value }))} placeholder="Ex: ABCDA BCDAB" />
                    <p className="text-xs text-gray-400 mt-1">Letras das respostas corretas em ordem</p>
                  </div>

                  {modo === 'texto' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Respostas do Aluno *</label>
                      <input className="input-field" value={form.respostas} onChange={e => setForm(f => ({ ...f, respostas: e.target.value }))} placeholder="Ex: ABCDB BCDAB" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Foto do gabarito</label>
                      {preview && <img src={preview} alt="preview" className="w-full rounded-lg mb-2 max-h-40 object-contain border" />}
                      <input type="file" accept="image/*" onChange={e => { setImagem(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0])) }} className="text-sm text-gray-500" />
                    </div>
                  )}

                  {erro && <p className="text-danger text-sm">{erro}</p>}
                  <button type="submit" disabled={corrigindo} className="btn-primary w-full">{corrigindo ? '⏳ Corrigindo...' : '✅ Corrigir'}</button>
                </form>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="bg-white rounded-xl shadow-md p-5 min-h-[300px]">
                <h3 className="font-semibold text-textMain mb-4">Resultado</h3>
                {corrigindo ? (
                  <div className="flex flex-col items-center justify-center h-48 text-purple-500">
                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-3" />
                    <p className="text-sm">Corrigindo...</p>
                  </div>
                ) : resultado ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-4xl font-bold" style={{ color: resultado.percentual >= 70 ? '#27ae60' : resultado.percentual >= 50 ? '#e67e22' : '#e74c3c' }}>{resultado.percentual}%</p>
                        <p className="text-xs text-gray-400">Acertos</p>
                      </div>
                      <div>
                        <p className="text-sm"><span className="font-medium">Acertos:</span> {resultado.acertos} / {resultado.total}</p>
                        {resultado.nota && <p className="text-sm"><span className="font-medium">Nota:</span> {resultado.nota}</p>}
                        <p className={`text-sm font-bold mt-1 ${resultado.percentual >= 60 ? 'text-success' : 'text-danger'}`}>{resultado.percentual >= 60 ? '✅ Aprovado' : '❌ Reprovado'}</p>
                      </div>
                    </div>
                    {resultado.detalhes?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Questão a questão:</p>
                        <div className="flex flex-wrap gap-1">
                          {resultado.detalhes.map((d, i) => (
                            <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${d.acertou ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`} title={`Q${i + 1}: esperado ${d.esperado}, respondido ${d.respondido}`}>
                              {i + 1}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {resultado.analise && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700 leading-relaxed">{resultado.analise}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                    <span className="text-5xl mb-3">📝</span>
                    <p className="text-sm">O resultado aparecerá aqui</p>
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
