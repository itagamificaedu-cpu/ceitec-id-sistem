import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

const MOTIVOS = [
  { value: 'banheiro',   label: '🚻 Banheiro' },
  { value: 'secretaria', label: '📋 Secretaria' },
  { value: 'enfermaria', label: '🏥 Enfermaria' },
  { value: 'bebedouro',  label: '💧 Bebedouro' },
  { value: 'outro',      label: '📌 Outro' },
]

const ALERTA_MIN = 10

function minutosDecorridos(horaSaida) {
  if (!horaSaida) return 0
  return Math.floor((Date.now() - new Date(horaSaida)) / 60000)
}

function tempoTexto(mins) {
  if (mins === 0) return 'Agora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

export default function PainelSaidaSala() {
  const [fora,     setFora]     = useState([])
  const [historico, setHistorico] = useState([])
  const [resumo,   setResumo]   = useState({ total_saidas: 0, fora_agora: 0, voltaram: 0 })
  const [turmas,   setTurmas]   = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [tick,     setTick]     = useState(0)
  const tickRef = useRef(null)

  // Atualiza cronômetros a cada 30s
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
    carregarTudo()
    const iv = setInterval(carregarFora, 30000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { carregarHistorico() }, [turmaSel])

  async function carregarTudo() {
    await Promise.all([carregarFora(), carregarHistorico()])
  }

  async function carregarFora() {
    try {
      const { data } = await api.get('/saida-sala/fora')
      setFora(data)
    } catch {}
  }

  async function carregarHistorico() {
    try {
      const url = turmaSel ? `/saida-sala/hoje?turma_id=${turmaSel}` : '/saida-sala/hoje'
      const { data } = await api.get(url)
      setHistorico(data.registros || [])
      setResumo({ total_saidas: data.total_saidas, fora_agora: data.fora_agora, voltaram: data.voltaram })
    } catch {}
  }

  async function retornarManual(id) {
    try {
      await api.post(`/saida-sala/${id}/retornar`)
      carregarTudo()
    } catch {}
  }

  async function excluirRegistro(id) {
    if (!confirm('Excluir este registro?')) return
    try {
      await api.delete(`/saida-sala/${id}`)
      carregarTudo()
    } catch {}
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-textMain">🚪 Saída de Sala — Painel</h1>
              <p className="text-gray-500 text-sm mt-0.5">Monitore em tempo real quem está fora da sala</p>
            </div>
            <a href="/saida-sala"
              className="btn-secondary text-sm flex items-center gap-2">
              📷 Abrir Scanner (Tablet)
            </a>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">{fora.length}</p>
              <p className="text-xs text-gray-500 mt-1">Fora agora</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{resumo.voltaram}</p>
              <p className="text-xs text-gray-500 mt-1">Retornaram hoje</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{resumo.total_saidas}</p>
              <p className="text-xs text-gray-500 mt-1">Saídas hoje</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── FORA AGORA ── */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-textMain">🚶 Fora da sala agora</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{fora.length} aluno{fora.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={carregarFora}
                  className="text-xs text-primary hover:underline font-medium">
                  ↻ Atualizar
                </button>
              </div>

              {fora.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-gray-400 text-sm">Todos os alunos estão em sala</p>
                </div>
              ) : (
                <div className="divide-y">
                  {fora.map(r => {
                    const mins   = minutosDecorridos(r.hora_saida)
                    const alerta = mins >= ALERTA_MIN
                    return (
                      <div key={r.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-all ${alerta ? 'bg-red-50' : 'hover:bg-gray-50'}`}>

                        {/* Foto */}
                        <div className={`w-11 h-11 rounded-full flex-shrink-0 overflow-hidden border-2 ${alerta ? 'border-red-400' : 'border-gray-200'}`}>
                          {r.foto_path
                            ? <img src={r.foto_path} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xl">👤</div>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${alerta ? 'text-red-700' : 'text-textMain'}`}>
                            {r.nome}
                          </p>
                          <p className="text-xs text-gray-400">{r.turma}</p>
                          <p className="text-xs text-gray-400">
                            {MOTIVOS.find(m => m.value === r.motivo)?.label || r.motivo}
                            {' · '}
                            {r.hora_saida ? new Date(r.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>

                        {/* Cronômetro */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                            alerta
                              ? 'bg-red-100 text-red-600 animate-pulse'
                              : 'bg-orange-100 text-orange-600'}`}>
                            {tempoTexto(mins)}
                          </span>
                          <button onClick={() => retornarManual(r.id)}
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded-full font-medium transition-all">
                            ↩ Voltou
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Aviso alerta */}
              {fora.some(r => minutosDecorridos(r.hora_saida) >= ALERTA_MIN) && (
                <div className="px-4 py-2.5 bg-red-50 border-t border-red-100">
                  <p className="text-xs text-red-600 font-medium">
                    🔴 Aluno(s) fora há mais de {ALERTA_MIN} minutos
                  </p>
                </div>
              )}
            </div>

            {/* ── HISTÓRICO DO DIA ── */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b flex items-center gap-3 flex-wrap">
                <h2 className="font-semibold text-textMain">📋 Histórico do dia</h2>
                <select className="input-field w-auto text-sm ml-auto"
                  value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              {historico.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">Nenhuma saída registrada hoje</div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {historico.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">

                      {/* Foto */}
                      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-primary/10">
                        {r.foto_path
                          ? <img src={r.foto_path} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">👤</div>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-textMain text-sm truncate">{r.nome}</p>
                        <p className="text-xs text-gray-400">
                          {r.turma_nome || r.turma}
                          {' · '}
                          {MOTIVOS.find(m => m.value === r.motivo)?.label || r.motivo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {r.hora_saida ? new Date(r.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {r.hora_retorno ? ` → ${new Date(r.hora_retorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {r.status === 'fora' ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            Fora {tempoTexto(minutosDecorridos(r.hora_saida))}
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            ✅ {r.duracao_minutos ?? r.minutos ?? '?'} min
                          </span>
                        )}
                        <button onClick={() => excluirRegistro(r.id)}
                          className="text-red-300 hover:text-red-500 text-xs">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
