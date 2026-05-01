import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

export default function Justificativas() {
  const [pendentes, setPendentes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [faltaSel, setFaltaSel] = useState(null)
  const [form, setForm] = useState({ descricao: '', tipo: 'justificada' })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const arquivoRef = useRef()

  async function carregar() {
    try {
      const { data } = await api.get('/justificativas/pendentes')
      setPendentes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirModal(falta) {
    setFaltaSel(falta)
    setForm({ descricao: '', tipo: 'justificada' })
    setArquivo(null)
    setModalAberto(true)
  }

  async function salvarJustificativa() {
    if (!faltaSel) return
    setSalvando(true)
    try {
      const fd = new FormData()
      fd.append('presenca_id', faltaSel.id)
      fd.append('aluno_id', faltaSel.aluno_id)
      fd.append('data_falta', faltaSel.data)
      fd.append('descricao', form.descricao)
      fd.append('tipo', form.tipo)
      if (arquivo) fd.append('arquivo', arquivo)

      await api.post('/justificativas', fd)
      setModalAberto(false)
      carregar()
    } catch (err) {
      alert('Erro ao salvar justificativa: ' + (err.response?.data?.erro || err.message))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-textMain mb-6">Justificativas de Falta</h1>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : pendentes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-gray-500">Nenhuma falta pendente de justificativa!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{pendentes.length} falta(s) sem justificativa</span>
              </div>
              <div className="divide-y">
                {pendentes.map(falta => (
                  <div key={falta.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {falta.foto_path ? (
                        <img src={falta.foto_path} alt={falta.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-textMain">{falta.nome}</p>
                      <p className="text-xs text-gray-500">{falta.turma}</p>
                      <p className="text-xs font-mono text-secondary">{falta.codigo}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">{new Date(falta.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-danger mt-0.5">❌ Ausente</p>
                    </div>
                    <button
                      onClick={() => abrirModal(falta)}
                      className="btn-secondary text-sm"
                    >
                      Justificar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modalAberto && faltaSel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-textMain">Justificar Falta</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{faltaSel.nome}</p>
                <p className="text-gray-500 text-xs">{faltaSel.turma} • {new Date(faltaSel.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>

              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-3">
                  {['justificada', 'injustificada'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({...form, tipo: t})}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors
                        ${form.tipo === t
                          ? t === 'justificada' ? 'border-success bg-green-50 text-success' : 'border-danger bg-red-50 text-danger'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {t === 'justificada' ? '✅ Justificada' : '❌ Injustificada'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Descreva o motivo da falta..."
                />
              </div>

              <div>
                <label className="label">Arquivo (PDF ou imagem, máx 2MB)</label>
                <div
                  onClick={() => arquivoRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {arquivo ? (
                    <p className="text-sm text-success font-medium">📎 {arquivo.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Clique para anexar arquivo</p>
                  )}
                </div>
                <input
                  ref={arquivoRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={e => setArquivo(e.target.files[0] || null)}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={salvarJustificativa}
                  disabled={salvando}
                  className="btn-primary flex-1 disabled:opacity-60"
                >
                  {salvando ? '⏳ Salvando...' : 'Salvar Justificativa'}
                </button>
                <button onClick={() => setModalAberto(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
