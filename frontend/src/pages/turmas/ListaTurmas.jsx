import React, { useEffect, useState, useRef } from 'react'
import Navbar from '../../components/Navbar'
import CardTurma from '../../components/CardTurma'
import api from '../../api'

const TURMA_VAZIA = { nome: '', curso: '', turno: 'manhã', ano_letivo: new Date().getFullYear().toString(), max_alunos: 30 }

export default function ListaTurmas() {
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [criando, setCriando] = useState(false)
  const [novaTurma, setNovaTurma] = useState(TURMA_VAZIA)
  const [salvando, setSalvando] = useState(false)
  const [modalImport, setModalImport] = useState(null) // turma selecionada
  const [csvLinhas, setCsvLinhas] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultImport, setResultImport] = useState(null)
  const fileRef = useRef()

  function carregar() {
    api.get('/turmas').then(({ data }) => setTurmas(data)).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  async function criarTurma(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/turmas', novaTurma)
      setCriando(false)
      setNovaTurma(TURMA_VAZIA)
      carregar()
    } catch { } finally { setSalvando(false) }
  }

  async function salvarEdicao(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.put(`/turmas/${editando.id}`, editando)
      setEditando(null)
      carregar()
    } catch { } finally { setSalvando(false) }
  }

  async function confirmarExclusao() {
    try {
      await api.delete(`/turmas/${confirmando.id}`)
      setConfirmando(null)
      carregar()
    } catch { }
  }

  function parseCsv(texto) {
    const linhas = texto.trim().split('\n').filter(l => l.trim())
    if (linhas.length < 2) return []
    const cabecalho = linhas[0].split(',').map(c => c.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    return linhas.slice(1).map(linha => {
      const cols = linha.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const obj = {}
      cabecalho.forEach((h, i) => { obj[h] = cols[i] || '' })
      return obj
    }).filter(a => a.nome)
  }

  function onCsvFile(e) {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      const linhas = parseCsv(ev.target.result)
      setCsvLinhas(linhas)
      setResultImport(null)
    }
    reader.readAsText(f, 'UTF-8')
  }

  function baixarModelo() {
    const conteudo = 'nome,serie\nJoão da Silva,1º Ano\nMaria Souza,2º Ano\n'
    const blob = new Blob([conteudo], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modelo_importacao_alunos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function executarImport() {
    if (!csvLinhas.length || !modalImport) return
    setImportando(true)
    try {
      const alunosFormatados = csvLinhas.map(a => ({ ...a, curso: a.serie || a.curso || '' }))
      const { data } = await api.post('/alunos/importar', { alunos: alunosFormatados, turma_id: modalImport.id })
      setResultImport(data)
      setCsvLinhas([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setResultImport({ erro: err.response?.data?.erro || 'Erro ao importar' })
    } finally { setImportando(false) }
  }

  function fecharImport() {
    setModalImport(null)
    setCsvLinhas([])
    setResultImport(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const camposForm = (dados, setDados) => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nome da Turma *</label>
        <input className="input-field" value={dados.nome} onChange={e => setDados(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: 1º Ano A" required />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Curso *</label>
        <input className="input-field" value={dados.curso} onChange={e => setDados(p => ({ ...p, curso: e.target.value }))} placeholder="Ex: Ensino Médio" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Turno</label>
          <select className="input-field" value={dados.turno} onChange={e => setDados(p => ({ ...p, turno: e.target.value }))}>
            <option value="manhã">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
            <option value="integral">Tempo Integral</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ano Letivo</label>
          <input className="input-field" value={dados.ano_letivo} onChange={e => setDados(p => ({ ...p, ano_letivo: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Máx. Alunos</label>
        <input type="number" className="input-field" value={dados.max_alunos} onChange={e => setDados(p => ({ ...p, max_alunos: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textMain">Turmas e Alunos</h1>
            <button
              onClick={() => setCriando(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <span className="text-lg">+</span> Nova Turma
            </button>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏫</div>
              <p className="text-gray-400 mb-4">Nenhuma turma cadastrada</p>
              <button onClick={() => setCriando(true)} className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90">
                + Criar primeira turma
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {turmas.map(t => (
                <div key={t.id} className="relative group">
                  <CardTurma turma={t} onEditar={setEditando} onExcluir={setConfirmando} />
                  <button
                    onClick={() => { setModalImport(t); setResultImport(null); setCsvLinhas([]) }}
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary text-primary text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-yellow-400"
                  >
                    📥 Importar Alunos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nova Turma */}
      {criando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-textMain mb-4">🏫 Nova Turma</h2>
            <form onSubmit={criarTurma}>
              {camposForm(novaTurma, setNovaTurma)}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setCriando(false); setNovaTurma(TURMA_VAZIA) }} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-textMain mb-4">✏️ Editar Turma</h2>
            <form onSubmit={salvarEdicao}>
              {camposForm(editando, setEditando)}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setEditando(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-textMain mb-2">Excluir Turma</h2>
            <p className="text-gray-500 text-sm mb-1">Tem certeza que deseja excluir</p>
            <p className="font-bold text-red-600 mb-1">"{confirmando.nome}"?</p>
            <p className="text-xs text-gray-400 mb-5">Todos os alunos e presenças desta turma serão excluídos.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(null)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarExclusao} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Alunos */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-textMain">📥 Importar Alunos</h2>
                <p className="text-xs text-gray-500 mt-0.5">Turma: <strong>{modalImport.nome}</strong></p>
              </div>
              <button onClick={fecharImport} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            {!resultImport ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">
                  <p className="font-semibold mb-1">Formato do arquivo CSV:</p>
                  <code className="block bg-white border border-blue-200 rounded px-2 py-1 text-xs">
                    nome, serie
                  </code>
                  <button onClick={baixarModelo} className="mt-2 text-blue-600 underline font-medium">
                    ⬇ Baixar modelo CSV
                  </button>
                </div>

                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors mb-4">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-gray-600 font-medium">Clique para selecionar o arquivo CSV</p>
                  <p className="text-xs text-gray-400 mt-1">Somente arquivos .csv</p>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onCsvFile} />
                </label>

                {csvLinhas.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {csvLinhas.length} aluno(s) encontrado(s) — prévia:
                    </p>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600">Nome</th>
                            <th className="text-left px-3 py-2 text-gray-600">Série</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvLinhas.slice(0, 10).map((a, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-1.5">{a.nome}</td>
                              <td className="px-3 py-1.5 text-gray-500">{a.serie || '—'}</td>
                            </tr>
                          ))}
                          {csvLinhas.length > 10 && (
                            <tr><td colSpan={3} className="px-3 py-1.5 text-gray-400 text-center">+{csvLinhas.length - 10} mais...</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={fecharImport} className="flex-1 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={executarImport}
                    disabled={!csvLinhas.length || importando}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {importando ? 'Importando...' : `Importar ${csvLinhas.length} aluno(s)`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                {resultImport.erro ? (
                  <>
                    <div className="text-4xl mb-3">❌</div>
                    <p className="text-red-500 font-semibold">{resultImport.erro}</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-green-600 font-bold text-lg mb-1">{resultImport.importados} aluno(s) importado(s)</p>
                    {resultImport.erros?.length > 0 && (
                      <p className="text-orange-500 text-sm mb-2">{resultImport.erros.length} erro(s) ignorados</p>
                    )}
                    <p className="text-gray-400 text-xs mb-4">Os alunos já estão disponíveis na turma <strong>{modalImport.nome}</strong>.</p>
                  </>
                )}
                <button
                  onClick={fecharImport}
                  className="mt-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
