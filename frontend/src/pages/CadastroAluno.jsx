import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

const TURMAS_FIXAS = [
  '8º A', '8º B', '8º C',
  '9º A', '9º B', '9º C', '9º D', '9º E', '9º F',
]

const DISCIPLINAS = [
  'Matemática', 'Português', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes',
  'Empreendedorismo Digital', 'Robótica Educacional',
]

export default function CadastroAluno() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const editando = !!id
  const fotoRef = useRef()

  const turmaIdParam = searchParams.get('turma_id')
  const turmaNomeParam = searchParams.get('turma_nome') || ''

  const [form, setForm] = useState({
    nome: '', turma: turmaNomeParam, turma_id: turmaIdParam ? Number(turmaIdParam) : null, curso: '',
    email_responsavel: '', telefone_responsavel: '',
    data_matricula: new Date().toISOString().split('T')[0]
  })
  const [turmasDb, setTurmasDb] = useState([])
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [alunoSalvo, setAlunoSalvo] = useState(null)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmasDb(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (editando) {
      api.get(`/alunos/${id}`).then(({ data }) => {
        setForm({
          nome: data.nome || '',
          turma: data.turma || '',
          turma_id: data.turma_id || null,
          curso: data.curso || '',
          email_responsavel: data.email_responsavel || '',
          telefone_responsavel: data.telefone_responsavel || '',
          data_matricula: data.data_matricula || new Date().toISOString().split('T')[0]
        })
        if (data.foto_path) setFotoPreview(data.foto_path)
      })
    }
  }, [id])

  function handleTurma(e) {
    const nome = e.target.value
    const turmaObj = turmasDb.find(t => t.nome === nome)
    setForm({ ...form, turma: nome, turma_id: turmaObj?.id || null })
  }

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const voltarUrl = turmaIdParam ? `/turmas/${turmaIdParam}` : '/alunos'

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome,
        turma: form.turma,
        turma_id: form.turma_id,
        curso: form.curso,
        email_responsavel: form.email_responsavel,
        telefone_responsavel: form.telefone_responsavel,
        data_matricula: form.data_matricula,
      }
      let aluno
      if (editando) {
        const { data } = await api.put(`/alunos/${id}`, payload)
        aluno = data
      } else {
        const { data } = await api.post('/alunos', payload)
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
        navigate(voltarUrl)
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar aluno')
    } finally {
      setSalvando(false)
    }
  }

  function resetForm() {
    setAlunoSalvo(null)
    setForm({ nome: '', turma: '', turma_id: null, curso: '', email_responsavel: '', telefone_responsavel: '', data_matricula: new Date().toISOString().split('T')[0] })
    setFotoPreview(null)
    setFotoFile(null)
  }

  // Monta lista de turmas: do banco + fixas que não existem no banco
  const nomesDb = turmasDb.map(t => t.nome)
  const turmasExtras = TURMAS_FIXAS.filter(n => !nomesDb.includes(n))
  const opcoesTurma = [
    ...turmasDb.map(t => ({ label: t.nome, value: t.nome })),
    ...turmasExtras.map(n => ({ label: n, value: n })),
  ]

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
              <Link to={`/alunos/${alunoSalvo.id}/carteirinha`} className="btn-primary">Ver Carteirinha</Link>
              <button onClick={resetForm} className="btn-secondary">Cadastrar Outro</button>
              <Link to="/alunos" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Ver Lista</Link>
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
            <Link to={voltarUrl} className="text-gray-500 hover:text-primary">← Voltar</Link>
            <h1 className="text-2xl font-bold text-textMain">{editando ? 'Editar Aluno' : 'Cadastrar Aluno'}</h1>
            {turmaNomeParam && !editando && <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-lg">Turma: {turmaNomeParam}</span>}
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
                {fotoPreview
                  ? <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  : <span className="text-3xl">📷</span>}
              </div>
              <button type="button" onClick={() => fotoRef.current?.click()} className="text-sm text-primary hover:underline">
                {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nome Completo *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Turma *</label>
                <select
                  value={form.turma}
                  onChange={handleTurma}
                  className="input-field"
                  required
                >
                  <option value="">Selecione a turma</option>
                  {opcoesTurma.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Disciplina *</label>
                <select
                  value={form.curso}
                  onChange={e => setForm({ ...form, curso: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Selecione a disciplina</option>
                  {DISCIPLINAS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Email do Responsável</label>
                <input
                  type="email"
                  value={form.email_responsavel}
                  onChange={e => setForm({ ...form, email_responsavel: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">WhatsApp do Responsável</label>
                <input
                  type="text"
                  value={form.telefone_responsavel}
                  onChange={e => setForm({ ...form, telefone_responsavel: e.target.value.replace(/\D/g, '') })}
                  className="input-field"
                  placeholder="5585999999999"
                  maxLength={15}
                />
                <p className="text-xs text-gray-400 mt-1">Formato: 5585999999999 (com DDI+DDD)</p>
              </div>

              <div>
                <label className="label">Data de Matrícula</label>
                <input
                  type="date"
                  value={form.data_matricula}
                  onChange={e => setForm({ ...form, data_matricula: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-60">
                {salvando ? '⏳ Salvando...' : (editando ? 'Salvar Alterações' : 'Cadastrar Aluno')}
              </button>
              <Link to={voltarUrl} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
