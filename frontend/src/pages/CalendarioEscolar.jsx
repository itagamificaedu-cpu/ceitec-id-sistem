/**
 * CalendarioEscolar.jsx
 * Calendário mensal visual com CRUD de eventos escolares.
 * Tipos: feriado | prova | reuniao | evento | recesso
 */
import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// ─── Configuração de tipos ────────────────────────────────────────────────────
const TIPOS = {
  feriado: { label: 'Feriado',  cor: '#dc2626', bg: '#fee2e2', icon: '🎉' },
  prova:   { label: 'Prova',    cor: '#d97706', bg: '#fef3c7', icon: '📝' },
  reuniao: { label: 'Reunião',  cor: '#2563eb', bg: '#dbeafe', icon: '👥' },
  evento:  { label: 'Evento',   cor: '#16a34a', bg: '#dcfce7', icon: '📅' },
  recesso: { label: 'Recesso',  cor: '#7c3aed', bg: '#ede9fe', icon: '🌟' },
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// Retorna YYYY-MM-DD de um Date
function toISO(d) {
  return d.toISOString().split('T')[0]
}

// Formata data ISO para DD/MM/AAAA
function formatarData(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Modal de criação/edição
function ModalEvento({ data, evento, turmas, onSalvar, onExcluir, onFechar }) {
  const [titulo,     setTitulo]     = useState(evento?.titulo     || '')
  const [descricao,  setDescricao]  = useState(evento?.descricao  || '')
  const [dataInicio, setDataInicio] = useState(evento?.data_inicio || data || '')
  const [dataFim,    setDataFim]    = useState(evento?.data_fim    || '')
  const [tipo,       setTipo]       = useState(evento?.tipo        || 'evento')
  const [turmaId,    setTurmaId]    = useState(evento?.turma_id    || '')
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')

  async function salvar() {
    setErro('')
    if (!titulo.trim()) return setErro('Título obrigatório.')
    if (!dataInicio)    return setErro('Data obrigatória.')
    setSalvando(true)
    try {
      await onSalvar({ titulo, descricao, data_inicio: dataInicio, data_fim: dataFim || null, tipo, turma_id: turmaId || null })
      onFechar()
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-textMain text-lg">
            {evento ? '✏️ Editar Evento' : '➕ Novo Evento'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Título *</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Reunião de Pais" className="input-field w-full" maxLength={100} />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Tipo *</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TIPOS).map(([k, v]) => (
                <button key={k} onClick={() => setTipo(k)}
                  className={`px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    tipo === k ? 'border-current' : 'border-gray-200 text-gray-500'
                  }`}
                  style={tipo === k ? { background: v.bg, color: v.cor, borderColor: v.cor } : {}}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data início *</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                min={dataInicio} className="input-field w-full" />
            </div>
          </div>

          {/* Turma */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Turma</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className="input-field w-full">
              <option value="">Escola toda</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              rows={2} placeholder="Detalhes opcionais..." className="input-field w-full resize-none" />
          </div>

          {erro && <p className="text-red-500 text-sm">⚠️ {erro}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          {evento && (
            <button onClick={() => onExcluir(evento.id)}
              className="px-4 py-2 rounded-lg border-2 border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors">
              🗑️ Excluir
            </button>
          )}
          <button onClick={onFechar}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="flex-1 btn-primary text-sm">
            {salvando ? '⏳ Salvando...' : '✅ Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CalendarioEscolar() {
  const hoje = new Date()
  const [mes,    setMes]    = useState(hoje.getMonth())      // 0-11
  const [ano,    setAno]    = useState(hoje.getFullYear())
  const [eventos, setEventos] = useState([])
  const [proximos, setProximos] = useState([])
  const [turmas,  setTurmas]  = useState([])
  const [modal,   setModal]   = useState(null) // null | { data?, evento? }
  const [diaAtivo, setDiaAtivo] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const podeCriar = usuario.perfil !== 'professor' // professor só lê — coord e ita_admin criam

  // Carrega eventos do mês
  const carregar = useCallback(() => {
    setCarregando(true)
    api.get(`/calendario?mes=${mes + 1}&ano=${ano}`)
      .then(({ data }) => setEventos(data))
      .catch(() => setEventos([]))
      .finally(() => setCarregando(false))
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
    api.get('/calendario/proximos').then(({ data }) => setProximos(data)).catch(() => {})
  }, [])

  // Gera grid do calendário (6 semanas × 7 dias)
  const primeiroDia = new Date(ano, mes, 1).getDay() // 0=Dom
  const diasNoMes  = new Date(ano, mes + 1, 0).getDate()
  const celulas    = Array.from({ length: 42 }, (_, i) => {
    const d = i - primeiroDia + 1
    if (d < 1 || d > diasNoMes) return null
    return new Date(ano, mes, d)
  })

  // Eventos por data ISO
  const eventosPorDia = {}
  eventos.forEach(ev => {
    const ini = new Date(ev.data_inicio + 'T00:00:00')
    const fim = ev.data_fim ? new Date(ev.data_fim + 'T00:00:00') : ini
    const cur = new Date(ini)
    while (cur <= fim) {
      const iso = toISO(cur)
      if (!eventosPorDia[iso]) eventosPorDia[iso] = []
      eventosPorDia[iso].push(ev)
      cur.setDate(cur.getDate() + 1)
    }
  })

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m - 1)
    setDiaAtivo(null)
  }
  function proximoMes() {
    if (mes === 11) { setMes(0); setAno(a => a + 1) }
    else setMes(m => m + 1)
    setDiaAtivo(null)
  }

  async function salvarEvento(dados) {
    if (modal?.evento) {
      await api.put(`/calendario/${modal.evento.id}`, dados)
    } else {
      await api.post('/calendario', dados)
    }
    carregar()
    api.get('/calendario/proximos').then(({ data }) => setProximos(data)).catch(() => {})
  }

  async function excluirEvento(id) {
    if (!window.confirm('Excluir este evento?')) return
    await api.delete(`/calendario/${id}`)
    setModal(null)
    carregar()
    api.get('/calendario/proximos').then(({ data }) => setProximos(data)).catch(() => {})
  }

  const diaAtivoISO = diaAtivo ? toISO(diaAtivo) : null
  const eventosDiaAtivo = diaAtivoISO ? (eventosPorDia[diaAtivoISO] || []) : []
  const hojeISO = toISO(hoje)

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-textMain">📅 Calendário Escolar</h1>
              <p className="text-gray-400 text-sm mt-1">Eventos, provas, feriados e reuniões</p>
            </div>
            {podeCriar && (
              <button onClick={() => setModal({ data: hojeISO })}
                className="btn-primary flex items-center gap-2">
                ➕ Novo Evento
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Calendário ────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-5">

              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={mesAnterior}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                  ‹
                </button>
                <h2 className="font-bold text-textMain text-lg">
                  {MESES[mes]} {ano}
                </h2>
                <button onClick={proximoMes}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                  ›
                </button>
              </div>

              {/* Legenda de tipos */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(TIPOS).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ background: v.bg, color: v.cor }}>
                    {v.icon} {v.label}
                  </span>
                ))}
              </div>

              {/* Grid de dias da semana */}
              <div className="grid grid-cols-7 mb-1">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className={`text-center text-xs font-semibold py-1
                    ${d === 'Dom' ? 'text-red-500' : d === 'Sáb' ? 'text-blue-500' : 'text-gray-400'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid de células */}
              {carregando ? (
                <div className="text-center py-16 text-gray-400">Carregando...</div>
              ) : (
                <div className="grid grid-cols-7 gap-0.5">
                  {celulas.map((data, i) => {
                    if (!data) return <div key={i} className="h-14 bg-gray-50 rounded" />
                    const iso = toISO(data)
                    const evs = eventosPorDia[iso] || []
                    const isHoje  = iso === hojeISO
                    const isAtivo = iso === diaAtivoISO
                    const isDom   = data.getDay() === 0
                    const isSab   = data.getDay() === 6

                    return (
                      <div key={i}
                        onClick={() => {
                          setDiaAtivo(data)
                          if (podeCriar && evs.length === 0) setModal({ data: iso })
                        }}
                        className={`h-14 rounded-lg p-1 cursor-pointer transition-all border-2 flex flex-col
                          ${isAtivo  ? 'border-primary bg-primary/5'
                          : isHoje   ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:bg-gray-50'}
                        `}
                      >
                        <span className={`text-xs font-semibold leading-none mb-1
                          ${isHoje  ? 'text-primary'
                          : isDom   ? 'text-red-500'
                          : isSab   ? 'text-blue-500'
                          : 'text-gray-700'}`}>
                          {data.getDate()}
                        </span>
                        {/* Dots de eventos */}
                        <div className="flex flex-wrap gap-0.5">
                          {evs.slice(0, 3).map((ev, ei) => {
                            const t = TIPOS[ev.tipo] || TIPOS.evento
                            return (
                              <span key={ei}
                                className="text-xs leading-none"
                                title={ev.titulo}
                                style={{ color: t.cor }}>
                                {t.icon}
                              </span>
                            )
                          })}
                          {evs.length > 3 && (
                            <span className="text-xs text-gray-400">+{evs.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Painel lateral ────────────────────────────── */}
            <div className="space-y-4">

              {/* Eventos do dia selecionado */}
              {diaAtivo && (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-textMain text-sm">
                      📆 {diaAtivo.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    {podeCriar && (
                      <button onClick={() => setModal({ data: toISO(diaAtivo) })}
                        className="text-xs text-primary hover:underline">+ Adicionar</button>
                    )}
                  </div>

                  {eventosDiaAtivo.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      {podeCriar ? 'Nenhum evento. Clique em + para adicionar.' : 'Nenhum evento neste dia.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {eventosDiaAtivo.map(ev => {
                        const t = TIPOS[ev.tipo] || TIPOS.evento
                        return (
                          <div key={ev.id}
                            onClick={() => podeCriar && setModal({ evento: ev })}
                            className={`p-3 rounded-lg border-l-4 ${podeCriar ? 'cursor-pointer hover:opacity-80' : ''}`}
                            style={{ borderColor: t.cor, background: t.bg }}>
                            <p className="font-medium text-sm" style={{ color: t.cor }}>{t.icon} {ev.titulo}</p>
                            {ev.descricao && <p className="text-xs text-gray-600 mt-0.5">{ev.descricao}</p>}
                            <p className="text-xs text-gray-500 mt-1">
                              {ev.turma_nome || 'Escola toda'}
                              {ev.data_fim && ev.data_fim !== ev.data_inicio
                                ? ` · até ${formatarData(ev.data_fim)}`
                                : ''}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Próximos eventos */}
              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="font-semibold text-textMain text-sm mb-3">📋 Próximos Eventos</h3>
                {proximos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum evento próximo.</p>
                ) : (
                  <div className="space-y-2">
                    {proximos.map(ev => {
                      const t = TIPOS[ev.tipo] || TIPOS.evento
                      return (
                        <div key={ev.id}
                          onClick={() => {
                            const d = new Date(ev.data_inicio + 'T00:00:00')
                            setMes(d.getMonth())
                            setAno(d.getFullYear())
                            setDiaAtivo(d)
                            if (podeCriar) setModal({ evento: ev })
                          }}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                            style={{ background: t.bg }}>
                            <span className="text-sm leading-none">{t.icon}</span>
                            <span className="text-xs font-bold leading-none mt-0.5"
                              style={{ color: t.cor }}>
                              {ev.data_inicio.split('-')[2]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-textMain truncate">{ev.titulo}</p>
                            <p className="text-xs text-gray-400">
                              {formatarData(ev.data_inicio)}
                              {ev.turma_nome ? ` · ${ev.turma_nome}` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal */}
      {modal && (
        <ModalEvento
          data={modal.data}
          evento={modal.evento}
          turmas={turmas}
          onSalvar={salvarEvento}
          onExcluir={excluirEvento}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  )
}
