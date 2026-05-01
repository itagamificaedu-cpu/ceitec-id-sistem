import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function NovaOcorrencia() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState([])
  const [form, setForm] = useState({ aluno_id: '', tipo: 'advertencia', gravidade: 'media', descricao: '', data: new Date().toISOString().split('T')[0], notificar_whatsapp: false })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    api.get('/alunos').then(({ data }) => setAlunos(data))
  }, [])

  async function salvar(e) {
    e.preventDefault()
    if (!form.aluno_id || !form.descricao) return setErro('Aluno e descrição são obrigatórios')
    setSalvando(true); setErro('')
    try {
      await api.post('/ocorrencias', form)
      navigate('/ocorrencias')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao registrar')
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = alunos.filter(a => a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.codigo?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/ocorrencias" className="text-gray-500 hover:text-primary text-sm">← Ocorrências</Link>
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-6">Nova Ocorrência</h1>

          <form onSubmit={salvar} className="space-y-5">
            {/* Selecionar aluno */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3">Aluno</h3>
              <input className="input-field mb-3" placeholder="🔍 Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filtrados.map(a => (
                  <button key={a.id} type="button" onClick={() => setForm(f => ({ ...f, aluno_id: a.id }))} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${form.aluno_id == a.id ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span className="font-medium">{a.nome}</span>
                    <span className={`ml-2 text-xs ${form.aluno_id == a.id ? 'text-white/70' : 'text-gray-400'}`}>{a.codigo}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalhes */}
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <h3 className="font-semibold text-textMain">Detalhes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="advertencia">Advertência</option>
                    <option value="suspensao">Suspensão</option>
                    <option value="elogio">Elogio</option>
                    <option value="ocorrencia">Ocorrência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
                  <select className="input-field" value={form.gravidade} onChange={e => setForm(f => ({ ...f, gravidade: e.target.value }))}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input className="input-field" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <textarea className="input-field resize-none" rows={4} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva a ocorrência em detalhes..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-primary" checked={form.notificar_whatsapp} onChange={e => setForm(f => ({ ...f, notificar_whatsapp: e.target.checked }))} />
                <span className="text-sm text-gray-700">📱 Notificar responsável via WhatsApp</span>
              </label>
            </div>

            {erro && <p className="text-danger text-sm text-center">{erro}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={salvando} className="btn-primary flex-1">{salvando ? 'Registrando...' : 'Registrar Ocorrência'}</button>
              <Link to="/ocorrencias" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
