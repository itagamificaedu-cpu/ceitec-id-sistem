import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// Motivos pré-definidos de falta
const MOTIVOS = [
  { label: '🤒 Doença / Atestado',      value: 'Doença / Atestado médico' },
  { label: '🏥 Consulta médica',         value: 'Consulta médica' },
  { label: '⚰️ Luto familiar',           value: 'Luto / Falecimento na família' },
  { label: '🚌 Problema de transporte',  value: 'Problema de transporte' },
  { label: '✈️ Viagem',                  value: 'Viagem' },
  { label: '⚖️ Questão judicial',        value: 'Questão judicial' },
  { label: '🏫 Atividade externa',       value: 'Atividade escolar externa' },
  { label: '📌 Outro',                   value: '' }, // campo livre
]

export default function Justificativas() {
  const [aba,        setAba]        = useState('pendentes') // 'pendentes' | 'historico'
  const [pendentes,  setPendentes]  = useState([])
  const [historico,  setHistorico]  = useState([])
  const [turmas,     setTurmas]     = useState([])
  const [carregando, setCarregando] = useState(true)

  // Filtros do histórico
  const [filtTurma,  setFiltTurma]  = useState('')
  const [filtInicio, setFiltInicio] = useState('')
  const [filtFim,    setFiltFim]    = useState('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [faltaSel,    setFaltaSel]    = useState(null)
  const [motivoSel,   setMotivoSel]   = useState(null)   // índice de MOTIVOS ou null
  const [outroTexto,  setOutroTexto]  = useState('')
  const [tipo,        setTipo]        = useState('justificada')
  const [arquivo,     setArquivo]     = useState(null)
  const [salvando,    setSalvando]    = useState(false)
  const arquivoRef = useRef()

  useEffect(() => {
    carregarPendentes()
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (aba === 'historico') carregarHistorico()
  }, [aba, filtTurma, filtInicio, filtFim])

  async function carregarPendentes() {
    setCarregando(true)
    try {
      const { data } = await api.get('/justificativas/pendentes')
      setPendentes(data)
    } catch {}
    finally { setCarregando(false) }
  }

  async function carregarHistorico() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtTurma)  params.append('turma_id',    filtTurma)
      if (filtInicio) params.append('data_inicio',  filtInicio)
      if (filtFim)    params.append('data_fim',     filtFim)
      const { data } = await api.get(`/justificativas/historico?${params}`)
      setHistorico(data)
    } catch {}
    finally { setCarregando(false) }
  }

  function abrirModal(falta) {
    setFaltaSel(falta)
    setMotivoSel(null)
    setOutroTexto('')
    setTipo('justificada')
    setArquivo(null)
    setModalAberto(true)
  }

  function descricaoFinal() {
    if (motivoSel === null) return outroTexto
    const m = MOTIVOS[motivoSel]
    if (m.value === '') return outroTexto   // "Outro" — usa campo livre
    return m.value
  }

  async function salvarJustificativa() {
    if (!faltaSel) return
    const descricao = descricaoFinal()
    setSalvando(true)
    try {
      const fd = new FormData()
      fd.append('presenca_id',  faltaSel.id)
      fd.append('aluno_id',     faltaSel.aluno_id)
      fd.append('data_falta',   faltaSel.data)
      fd.append('descricao',    descricao)
      fd.append('tipo',         tipo)
      if (arquivo) fd.append('arquivo', arquivo)
      await api.post('/justificativas', fd)
      setModalAberto(false)
      carregarPendentes()
    } catch (err) {
      alert('Erro: ' + (err.response?.data?.erro || err.message))
    } finally { setSalvando(false) }
  }

  const corTipo = (t) =>
    t === 'justificada' ? 'bg-green-100 text-green-700' :
    t === 'injustificada' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">

          <h1 className="text-2xl font-bold text-textMain mb-4">📋 Justificativas de Falta</h1>

          {/* Abas */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setAba('pendentes')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${aba === 'pendentes' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              ⏳ Pendentes
              {pendentes.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendentes.length}</span>
              )}
            </button>
            <button
              onClick={() => setAba('historico')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${aba === 'historico' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              📚 Histórico
            </button>
          </div>

          {/* ── ABA PENDENTES ─────────────────────────────── */}
          {aba === 'pendentes' && (
            <>
              {carregando ? (
                <div className="text-center py-20 text-gray-400">Carregando...</div>
              ) : pendentes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="text-gray-500">Nenhuma falta pendente de justificativa!</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b">
                    <span className="text-sm font-medium text-gray-600">{pendentes.length} falta(s) sem justificativa</span>
                  </div>
                  <div className="divide-y">
                    {pendentes.map(falta => (
                      <div key={falta.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {falta.foto_path
                            ? <img src={falta.foto_path} alt={falta.nome} className="w-full h-full object-cover" />
                            : <span>👤</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-textMain">{falta.nome}</p>
                          <p className="text-xs text-gray-500">{falta.turma}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-600">{new Date(falta.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-danger mt-0.5">❌ Ausente</p>
                        </div>
                        <button onClick={() => abrirModal(falta)} className="btn-secondary text-sm flex-shrink-0">
                          Justificar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ABA HISTÓRICO ─────────────────────────────── */}
          {aba === 'historico' && (
            <>
              {/* Filtros */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
                  <select className="input-field text-sm" value={filtTurma} onChange={e => setFiltTurma(e.target.value)}>
                    <option value="">Todas as turmas</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
                  <input type="date" className="input-field text-sm" value={filtInicio} onChange={e => setFiltInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
                  <input type="date" className="input-field text-sm" value={filtFim} onChange={e => setFiltFim(e.target.value)} />
                </div>
                <button onClick={() => { setFiltTurma(''); setFiltInicio(''); setFiltFim('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline pb-2">
                  Limpar
                </button>
              </div>

              {carregando ? (
                <div className="text-center py-20 text-gray-400">Carregando...</div>
              ) : historico.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">Nenhuma justificativa encontrada</div>
              ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b text-sm text-gray-500">
                    {historico.length} justificativa(s)
                  </div>
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {historico.map(j => (
                      <div key={j.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {j.foto_path
                            ? <img src={j.foto_path} alt={j.nome} className="w-full h-full object-cover" />
                            : <span className="text-sm">👤</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-textMain text-sm">{j.nome}</p>
                          <p className="text-xs text-gray-500">{j.turma}</p>
                          {j.descricao && (
                            <p className="text-xs text-gray-600 mt-0.5 italic">"{j.descricao}"</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500 mb-1">
                            {j.data_falta_real ? new Date(j.data_falta_real + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${corTipo(j.tipo)}`}>
                            {j.tipo === 'justificada' ? '✅ Justificada' : '❌ Injustificada'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* ── MODAL JUSTIFICAR ────────────────────────────── */}
      {modalAberto && faltaSel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <h2 className="font-bold text-textMain">Justificar Falta</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">

              {/* Info aluno */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{faltaSel.nome}</p>
                <p className="text-gray-500 text-xs">{faltaSel.turma} • {new Date(faltaSel.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Tipo */}
              <div>
                <label className="label mb-2">Tipo</label>
                <div className="flex gap-3">
                  {['justificada', 'injustificada'].map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors
                        ${tipo === t
                          ? t === 'justificada' ? 'border-success bg-green-50 text-success' : 'border-danger bg-red-50 text-danger'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {t === 'justificada' ? '✅ Justificada' : '❌ Injustificada'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivos rápidos */}
              <div>
                <label className="label mb-2">Motivo da falta</label>
                <div className="grid grid-cols-2 gap-2">
                  {MOTIVOS.map((m, i) => (
                    <button key={i} type="button"
                      onClick={() => { setMotivoSel(i); if (m.value !== '') setOutroTexto('') }}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-all
                        ${motivoSel === i
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo livre — aparece quando "Outro" selecionado OU nenhum motivo */}
              {(motivoSel === null || MOTIVOS[motivoSel]?.value === '') && (
                <div>
                  <label className="label">
                    {motivoSel !== null && MOTIVOS[motivoSel]?.value === ''
                      ? 'Descreva o motivo'
                      : 'Ou descreva livremente'}
                  </label>
                  <textarea
                    value={outroTexto}
                    onChange={e => setOutroTexto(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Descreva o motivo da falta..."
                  />
                </div>
              )}

              {/* Arquivo */}
              <div>
                <label className="label">Arquivo (PDF ou imagem, máx 2MB)</label>
                <div onClick={() => arquivoRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors">
                  {arquivo
                    ? <p className="text-sm text-success font-medium">📎 {arquivo.name}</p>
                    : <p className="text-sm text-gray-400">Clique para anexar arquivo opcional</p>}
                </div>
                <input ref={arquivoRef} type="file" accept=".pdf,image/*"
                  onChange={e => setArquivo(e.target.files[0] || null)} className="hidden" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={salvarJustificativa} disabled={salvando || (!descricaoFinal() && motivoSel === null)}
                  className="btn-primary flex-1 disabled:opacity-50">
                  {salvando ? '⏳ Salvando...' : 'Salvar Justificativa'}
                </button>
                <button onClick={() => setModalAberto(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
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
