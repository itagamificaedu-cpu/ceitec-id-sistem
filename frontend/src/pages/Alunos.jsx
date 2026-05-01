import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CardAluno from '../components/CardAluno'
import api from '../api'

function parseCSV(texto) {
  const linhas = texto.trim().split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
  if (linhas.length < 2) return []
  const headers = linhas[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
  return linhas.slice(1).filter(l => l.some(c => c)).map(l => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = l[i] || '' })
    return obj
  })
}

function exportarCSV(alunos) {
  const header = ['Código', 'Nome', 'Turma', 'Curso', 'Email Responsável', 'Telefone Responsável', 'Data Matrícula']
  const rows = alunos.map(a => [a.codigo, a.nome, a.turma, a.curso, a.email_responsavel || '', a.telefone_responsavel || '', a.data_matricula || ''])
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'alunos.csv'; a.click()
}

function baixarTemplate() {
  const csv = 'nome,turma,curso,email_responsavel,telefone_responsavel\nJoão Silva,,, ,\nMaria Souza,,,,'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'template_importacao.csv'; a.click()
}

export default function Alunos() {
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalImport, setModalImport] = useState(false)
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [preview, setPreview] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState(null)
  const fileRef = useRef()

  async function carregar() {
    try {
      const { data } = await api.get('/alunos')
      setAlunos(data)
    } catch { }
    finally { setCarregando(false) }
  }

  useEffect(() => {
    carregar()
    api.get('/turmas').then(({ data }) => setTurmas(data))
  }, [])

  async function desativar(id) {
    if (!confirm('Desativar este aluno?')) return
    try {
      await api.delete(`/alunos/${id}`)
      setAlunos(prev => prev.filter(a => a.id !== id))
    } catch { alert('Erro ao desativar aluno') }
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dados = parseCSV(ev.target.result)
      setPreview(dados)
      setResultadoImport(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function importar() {
    if (preview.length === 0) return
    setImportando(true)
    try {
      const { data } = await api.post('/alunos/importar', {
        alunos: preview,
        turma_id: turmaSel || null
      })
      setResultadoImport(data)
      if (data.importados > 0) carregar()
    } catch (err) {
      setResultadoImport({ importados: 0, erros: [{ erro: err.response?.data?.erro || 'Erro ao importar' }] })
    } finally {
      setImportando(false)
    }
  }

  const filtrados = alunos.filter(a =>
    (a.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (a.codigo || '').toLowerCase().includes(busca.toLowerCase()) ||
    (a.turma || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">Alunos</h1>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => exportarCSV(filtrados)} className="btn-secondary text-sm">📥 Exportar CSV</button>
              <button onClick={() => { setModalImport(true); setPreview([]); setResultadoImport(null) }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">📤 Importar CSV</button>
              <Link to="/alunos/novo" className="btn-primary text-sm">+ Cadastrar</Link>
            </div>
          </div>

          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} className="input-field mb-4" placeholder="Buscar por nome, código ou turma..." />

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-20 text-gray-400">{busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</div>
          ) : (
            <div className="grid gap-3">
              {filtrados.map(aluno => <CardAluno key={aluno.id} aluno={aluno} onDesativar={desativar} />)}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">{filtrados.length} aluno(s)</p>
        </div>
      </main>

      {/* Modal Importar CSV */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-textMain text-lg">📤 Importar Alunos via CSV</h3>
              <button onClick={() => setModalImport(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vincular à Turma</label>
                <select className="input-field" value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
                  <option value="">Nenhuma (usar coluna "turma" do CSV)</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.curso}</option>)}
                </select>
              </div>

              {/* Template e Upload */}
              <div className="flex gap-3 items-center flex-wrap">
                <button onClick={baixarTemplate} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📄 Baixar Template CSV</button>
                <label className="px-3 py-2 bg-primary text-white rounded-lg text-sm cursor-pointer hover:opacity-90">
                  📁 Selecionar arquivo CSV
                  <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />
                </label>
                {preview.length > 0 && <span className="text-sm text-success font-medium">✓ {preview.length} aluno(s) detectados</span>}
              </div>

              {/* Colunas aceitas */}
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                <p className="font-medium mb-1">Colunas aceitas no CSV:</p>
                <p><span className="font-mono bg-white px-1 rounded">nome</span> (obrigatório) • <span className="font-mono bg-white px-1 rounded">turma</span> • <span className="font-mono bg-white px-1 rounded">curso</span> • <span className="font-mono bg-white px-1 rounded">email_responsavel</span> • <span className="font-mono bg-white px-1 rounded">telefone_responsavel</span></p>
              </div>

              {/* Preview */}
              {preview.length > 0 && !resultadoImport && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">Prévia dos dados</div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>{Object.keys(preview[0]).map(k => <th key={k} className="px-3 py-1.5 text-left text-gray-500">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            {Object.values(r).map((v, j) => <td key={j} className="px-3 py-1.5 text-gray-700">{v || '—'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.length > 10 && <p className="px-4 py-2 text-xs text-gray-400">... e mais {preview.length - 10} registro(s)</p>}
                </div>
              )}

              {/* Resultado */}
              {resultadoImport && (
                <div className={`rounded-lg p-4 ${resultadoImport.importados > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="font-semibold text-sm mb-1">{resultadoImport.importados > 0 ? '✅' : '❌'} {resultadoImport.importados} aluno(s) importado(s)</p>
                  {resultadoImport.erros?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {resultadoImport.erros.map((e, i) => <p key={i} className="text-xs text-danger">{e.nome ? `${e.nome}: ` : ''}{e.erro}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-2 justify-end">
              {!resultadoImport && preview.length > 0 && (
                <button onClick={importar} disabled={importando} className="btn-primary">
                  {importando ? '⏳ Importando...' : `✅ Importar ${preview.length} aluno(s)`}
                </button>
              )}
              <button onClick={() => setModalImport(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                {resultadoImport ? 'Fechar' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
