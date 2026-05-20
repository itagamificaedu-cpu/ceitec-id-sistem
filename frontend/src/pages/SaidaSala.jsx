import React, { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

const MOTIVOS = [
  { value: 'banheiro',   label: '🚻 Banheiro' },
  { value: 'secretaria', label: '📋 Secretaria' },
  { value: 'enfermaria', label: '🏥 Enfermaria' },
  { value: 'bebedouro',  label: '💧 Bebedouro' },
  { value: 'outro',      label: '📌 Outro' },
]

const ALERTA_MINUTOS = 10 // minutos para destacar em vermelho

function tempoDecorrido(horaSaida) {
  if (!horaSaida) return '—'
  const diff = Math.floor((Date.now() - new Date(horaSaida)) / 60000)
  if (diff < 1) return 'Agora'
  if (diff === 1) return '1 min'
  return `${diff} min`
}

function minutosDecorridos(horaSaida) {
  if (!horaSaida) return 0
  return Math.floor((Date.now() - new Date(horaSaida)) / 60000)
}

export default function SaidaSala() {
  const [fora, setFora] = useState([])
  const [historico, setHistorico] = useState([])
  const [resumo, setResumo] = useState({ total_saidas: 0, fora_agora: 0, voltaram: 0 })
  const [motivo, setMotivo] = useState('banheiro')
  const [resultado, setResultado] = useState(null) // { tipo, aluno, mensagem, minutos }
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [aba, setAba] = useState('scanner') // 'scanner' | 'historico'
  const [tick, setTick] = useState(0) // força re-render a cada segundo

  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const timeoutRef = useRef(null)
  const tickRef = useRef(null)

  // Atualiza cronômetros a cada 10 segundos
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
    carregarDados()
    // Recarrega "fora" a cada 30s
    const iv = setInterval(carregarFora, 30000)
    return () => {
      clearInterval(iv)
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (aba === 'scanner') iniciarScanner()
    else pararScanner()
  }, [aba])

  useEffect(() => {
    carregarHistorico()
  }, [turmaSel])

  async function carregarDados() {
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

  async function iniciarScanner() {
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      if (html5QrRef.current) return // já iniciado

      const scanner = new Html5QrcodeScanner('qr-saida', {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      }, false)

      scanner.render(
        (codigo) => onScan(codigo, scanner),
        () => {}
      )
      html5QrRef.current = scanner
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err)
    }
  }

  async function pararScanner() {
    if (html5QrRef.current) {
      try { await html5QrRef.current.clear() } catch {}
      html5QrRef.current = null
    }
  }

  async function onScan(codigo, scanner) {
    await pararScanner()
    try {
      const { data } = await api.post('/saida-sala/scanner', { codigo, motivo })
      setResultado({ tipo: data.tipo, aluno: data.aluno, mensagem: data.mensagem, minutos: data.minutos })
      tocarBeep(data.tipo === 'retorno' ? 'retorno' : 'saida')
      carregarDados()
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao registrar'
      const tipo = err.response?.data?.tipo || 'erro'
      setResultado({ tipo, mensagem: msg })
      tocarBeep('erro')
    }

    // Limpa resultado e reinicia scanner após 4 s
    timeoutRef.current = setTimeout(() => {
      setResultado(null)
      iniciarScanner()
    }, 4000)
  }

  async function retornarManual(id) {
    try {
      await api.post(`/saida-sala/${id}/retornar`)
      carregarDados()
    } catch {}
  }

  async function excluirRegistro(id) {
    if (!confirm('Excluir este registro?')) return
    try {
      await api.delete(`/saida-sala/${id}`)
      carregarDados()
    } catch {}
  }

  function tocarBeep(tipo) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      if (tipo === 'saida') {
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(); osc.stop(ctx.currentTime + 0.3)
      } else if (tipo === 'retorno') {
        osc.frequency.setValueAtTime(660, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(); osc.stop(ctx.currentTime + 0.4)
      } else {
        osc.type = 'sawtooth'; osc.frequency.value = 220
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start(); osc.stop(ctx.currentTime + 0.25)
      }
    } catch {}
  }

  const labelMotivo = MOTIVOS.find(m => m.value === motivo)?.label || motivo

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-textMain">🚪 Controle de Saída de Sala</h1>
            <p className="text-gray-500 text-sm mt-0.5">Escaneie o crachá do aluno para registrar saída ou retorno</p>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{fora.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Fora agora</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{resumo.voltaram}</p>
              <p className="text-xs text-gray-500 mt-0.5">Retornaram</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{resumo.total_saidas}</p>
              <p className="text-xs text-gray-500 mt-0.5">Saídas hoje</p>
            </div>
          </div>

          {/* Layout principal: scanner + painel ao lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── COLUNA ESQUERDA: SCANNER + HISTÓRICO ── */}
            <div className="space-y-4">

              {/* Abas */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {[{ id: 'scanner', label: '📷 Scanner' }, { id: 'historico', label: '📋 Histórico' }].map(a => (
                  <button key={a.id} onClick={() => setAba(a.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${aba === a.id ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
                    {a.label}
                  </button>
                ))}
              </div>

              {aba === 'scanner' && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold text-textMain mb-3">Motivo da saída</h2>
                    <div className="flex flex-wrap gap-2">
                      {MOTIVOS.map(m => (
                        <button key={m.value} onClick={() => setMotivo(m.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${motivo === m.value
                            ? 'bg-primary text-white border-primary'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary'}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resultado do scan */}
                  {resultado && (
                    <div className={`mx-4 mt-4 p-4 rounded-xl border-2 text-center transition-all ${
                      resultado.tipo === 'saida'    ? 'border-orange-400 bg-orange-50' :
                      resultado.tipo === 'retorno'  ? 'border-green-500 bg-green-50'  :
                      resultado.tipo === 'nao_encontrado' ? 'border-red-400 bg-red-50' :
                      'border-red-400 bg-red-50'}`}>
                      <div className="text-3xl mb-1">
                        {resultado.tipo === 'saida'   ? '🚶' :
                         resultado.tipo === 'retorno' ? '✅' : '❌'}
                      </div>
                      {resultado.aluno && (
                        <p className="font-bold text-gray-800 text-base">{resultado.aluno.nome}</p>
                      )}
                      {resultado.aluno && (
                        <p className="text-xs text-gray-500">{resultado.aluno.turma}</p>
                      )}
                      <p className={`font-semibold mt-1 text-sm ${
                        resultado.tipo === 'saida'   ? 'text-orange-600' :
                        resultado.tipo === 'retorno' ? 'text-green-700'  : 'text-red-600'}`}>
                        {resultado.tipo === 'saida'   ? `⬆️ Saída — ${labelMotivo}` :
                         resultado.tipo === 'retorno' ? `⬇️ Retorno após ${resultado.minutos} min` :
                         resultado.mensagem}
                      </p>
                    </div>
                  )}

                  {/* Scanner QR */}
                  <div className="p-4">
                    <div id="qr-saida" ref={scannerRef} className="w-full" />
                  </div>
                </div>
              )}

              {aba === 'historico' && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b flex items-center gap-3 flex-wrap">
                    <h2 className="font-semibold text-textMain">Histórico do dia</h2>
                    <select className="input-field w-auto text-sm ml-auto" value={turmaSel}
                      onChange={e => setTurmaSel(e.target.value)}>
                      <option value="">Todas as turmas</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  {historico.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">Nenhuma saída registrada hoje</div>
                  ) : (
                    <div className="divide-y max-h-[450px] overflow-y-auto">
                      {historico.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {r.foto_path ? <img src={r.foto_path} alt="" className="w-full h-full object-cover" /> : '👤'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-textMain text-sm truncate">{r.nome}</p>
                            <p className="text-xs text-gray-400">{r.turma} · {MOTIVOS.find(m => m.value === r.motivo)?.label || r.motivo}</p>
                            <p className="text-xs text-gray-400">
                              Saiu: {r.hora_saida ? new Date(r.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              {r.hora_retorno && ` · Voltou: ${new Date(r.hora_retorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {r.status === 'fora' ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                                Fora {tempoDecorrido(r.hora_saida)}
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                                ✅ {r.duracao_minutos || r.minutos || '?'} min
                              </span>
                            )}
                          </div>
                          <button onClick={() => excluirRegistro(r.id)}
                            className="text-red-300 hover:text-red-500 ml-1 flex-shrink-0">🗑</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── COLUNA DIREITA: FORA DA SALA AGORA ── */}
            <div>
              <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-6">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-textMain">🚶 Fora da sala agora</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{fora.length} aluno{fora.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={carregarFora}
                    className="text-xs text-primary hover:underline">↻ Atualizar</button>
                </div>

                {fora.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-4xl mb-2">✅</p>
                    <p className="text-gray-400 text-sm">Todos os alunos estão em sala</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {fora.map(r => {
                      const mins = minutosDecorridos(r.hora_saida)
                      const alerta = mins >= ALERTA_MINUTOS
                      return (
                        <div key={r.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-all ${alerta ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          {/* Foto / avatar */}
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 ${alerta ? 'border-red-400' : 'border-gray-200'}`}>
                            {r.foto_path
                              ? <img src={r.foto_path} alt="" className="w-full h-full object-cover" />
                              : <span className="text-xl">👤</span>}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm truncate ${alerta ? 'text-red-700' : 'text-textMain'}`}>
                              {r.nome}
                            </p>
                            <p className="text-xs text-gray-500">{r.turma}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                {MOTIVOS.find(m => m.value === r.motivo)?.label || r.motivo}
                              </span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-400">
                                {r.hora_saida ? new Date(r.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>

                          {/* Tempo + botão retorno manual */}
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${alerta
                              ? 'bg-red-100 text-red-600 animate-pulse'
                              : 'bg-orange-100 text-orange-600'}`}>
                              {mins === 0 ? 'Agora' : `${mins} min`}
                            </span>
                            <button onClick={() => retornarManual(r.id)}
                              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded-full font-medium transition-all">
                              ↩ Retornou
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Legenda de alerta */}
                {fora.some(r => minutosDecorridos(r.hora_saida) >= ALERTA_MINUTOS) && (
                  <div className="p-3 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-600 font-medium">
                      🔴 Alunos destacados estão fora há mais de {ALERTA_MINUTOS} minutos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
