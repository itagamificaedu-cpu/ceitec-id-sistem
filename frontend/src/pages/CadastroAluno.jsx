import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

export default function CadastroAluno() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id
  const fotoRef = useRef()

  const [form, setForm] = useState({
    nome: '', turma: '', curso: '',
    email_responsavel: '', telefone_responsavel: '',
    data_matricula: new Date().toISOString().split('T')[0]
  })
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [alunoSalvo, setAlunoSalvo] = useState(null)

  useEffect(() => {
    if (editando) {
      api.get(`/alunos/${id}`).then(({ data }) => {
        setForm({
          nome: data.nome || '',
          turma: data.turma || '',
          curso: data.curso || '',
          email_responsavel: data.email_responsavel || '',
          telefone_responsavel: data.telefone_responsavel || '',
          data_matricula: data.data_matricula || new Date().toISOString().split('T')[0]
        })
        if (data.foto_path) setFotoPreview(data.foto_path)
      })
    }
  }, [id])

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function formatarTelefone(v) {
    const num = v.replace(/\D/g, '')
    return num
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      let aluno
      if (editando) {
        const { data } = await api.put(`/alunos/${id}`, form)
        aluno = data
      } else {
        const { data } = await api.post('/alunos', form)
        aluno = data
      }

      if (fotoFile) {
        const fd = new FormData()
        fd.append('foto', fotoFile)
        await api.post(`/alunos/${aluno.id}/foto`, fd)
      }

      if (!editando) {
        setAlunoSalvo(aluno)
      } else {
        navigate('/alunos')
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar aluno')
    } finally {
      setSalvando(false)
    }
  }

  if (alunoSalvo) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-success mb-2">Aluno cadastrado!</h2>
            <p className="text-gray-600 mb-1">{alunoSalvo.nome}</p>
            <p className="text-secondary font-bold font-mono text-lg mb-6">{alunoSalvo.codigo}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to={`/alunos/${alunoSalvo.id}/carteirinha`} className="btn-primary">
                Ver Carteirinha
              </Link>
              <button onClick={() => { setAlunoSalvo(null); setForm({ nome:'',turma:'',curso:'',email_responsavel:'',telefone_responsavel:'',data_matricula:new Date().toISOString().split('T')[0]}); setFotoPreview(null); setFotoFile(null) }} className="btn-secondary">
                Cadastrar Outro
              </button>
              <Link to="/alunos" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Ver Lista
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/alunos" className="text-gray-500 hover:text-primary">← Voltar</Link>
            <h1 className="text-2xl font-bold text-textMain">{editando ? 'Editar Aluno' : 'Cadastrar Aluno'}</h1>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-danger rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4">
            {/* Foto */}
            <div className="flex flex-col items-center gap-3">
              <div
                onClick={() => fotoRef.current?.click()}
                className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📷</span>
                )}
              </div>
              <button type="button" onClick={() => fotoRef.current?.click()} className="text-sm text-primary hover:underline">
                {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nome Completo *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="input-field" required />
              </div>

              <div>
                <label className="label">Turma *</label>
                <input type="text" value={form.turma} onChange={e => setForm({...form, turma: e.target.value})} className="input-field" placeholder="Ex: Turma Robótica A" required />
              </div>

              <div>
                <label className="label">Curso *</label>
                <input type="text" value={form.curso} onChange={e => setForm({...form, curso: e.target.value})} className="input-field" placeholder="Ex: Robótica Educacional" required />
              </div>

              <div>
                <label className="label">Email do Responsável</label>
                <input type="email" value={form.email_responsavel} onChange={e => setForm({...form, email_responsavel: e.target.value})} className="input-field" />
              </div>

              <div>
                <label className="label">WhatsApp do Responsável</label>
                <input
                  type="text"
                  value={form.telefone_responsavel}
                  onChange={e => setForm({...form, telefone_responsavel: formatarTelefone(e.target.value)})}
                  className="input-field"
                  placeholder="5585999999999"
                  maxLength={15}
                />
                <p className="text-xs text-gray-400 mt-1">Formato: 5585999999999 (com DDI+DDD)</p>
              </div>

              <div>
                <label className="label">Data de Matrícula</label>
                <input type="date" value={form.data_matricula} onChange={e => setForm({...form, data_matricula: e.target.value})} className="input-field" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-60">
                {salvando ? '⏳ Salvando...' : (editando ? 'Salvar Alterações' : 'Cadastrar Aluno')}
              </button>
              <Link to="/alunos" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
