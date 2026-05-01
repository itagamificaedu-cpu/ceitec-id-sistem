import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const DISCIPLINAS_OPCOES = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Física', 'Química', 'Biologia', 'Inglês', 'Artes', 'Educação Física', 'Filosofia', 'Sociologia', 'Informática']

export default function CadastroProfessor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [form, setForm] = useState({ nome: '', email: '', telefone: '', especialidade: '', formacao: '', disciplinas: [] })
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (editando) {
      api.get(`/professores/${id}`).then(({ data }) => {
        setForm({ nome: data.nome || '', email: data.email || '', telefone: data.telefone || '', especialidade: data.especialidade || '', formacao: data.formacao || '', disciplinas: data.disciplinas || [] })
        if (data.foto_path) setPreview(data.foto_path)
      })
    }
  }, [id])

  function toggleDisciplina(d) {
    setForm(f => ({ ...f, disciplinas: f.disciplinas.includes(d) ? f.disciplinas.filter(x => x !== d) : [...f.disciplinas, d] }))
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome || !form.email) return setErro('Nome e e-mail são obrigatórios')
    setSalvando(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? JSON.stringify(v) : v))
      if (foto) fd.append('foto', foto)
      if (editando) await api.put(`/professores/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      else await api.post('/professores', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/professores')
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
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/professores" className="text-gray-500 hover:text-primary text-sm">← Professores</Link>
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-6">{editando ? 'Editar Professor' : 'Novo Professor'}</h1>

          <form onSubmit={salvar} className="space-y-5">
            {/* Foto */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-4">Foto</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <span className="text-3xl">👨‍🏫</span>}
                </div>
                <input type="file" accept="image/*" onChange={e => { setFoto(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0])) }} className="text-sm text-gray-500" />
              </div>
            </div>

            {/* Dados pessoais */}
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <h3 className="font-semibold text-textMain">Dados Pessoais</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do professor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                  <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@escola.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input className="input-field" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
                <input className="input-field" value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} placeholder="Ex: Matemática e Física" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formação</label>
                <input className="input-field" value={form.formacao} onChange={e => setForm(f => ({ ...f, formacao: e.target.value }))} placeholder="Ex: Licenciatura em Matemática — UNICAMP" />
              </div>
            </div>

            {/* Disciplinas */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3">Disciplinas que leciona</h3>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINAS_OPCOES.map(d => (
                  <button key={d} type="button" onClick={() => toggleDisciplina(d)} className={`px-3 py-1 rounded-full text-sm transition-colors ${form.disciplinas.includes(d) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {erro && <p className="text-danger text-sm text-center">{erro}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={salvando} className="btn-primary flex-1">{salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Professor'}</button>
              <Link to="/professores" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
