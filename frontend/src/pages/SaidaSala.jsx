import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const MOTIVOS = [
  { value: 'banheiro',   label: '🚻 Banheiro',   cor: '#0ea5e9' },
  { value: 'secretaria', label: '📋 Secretaria',  cor: '#8b5cf6' },
  { value: 'enfermaria', label: '🏥 Enfermaria',  cor: '#ef4444' },
  { value: 'bebedouro',  label: '💧 Bebedouro',   cor: '#10b981' },
  { value: 'outro',      label: '📌 Outro',       cor: '#f59e0b' },
]

const ALERTA_MIN = 10

function minutosDecorridos(horaSaida) {
  if (!horaSaida) return 0
  return Math.floor((Date.now() - new Date(horaSaida)) / 60000)
}

export default function SaidaSala() {
  const scannerRef  = useRef(null)
  const html5QrRef  = useRef(null)
  const timeoutRef  = useRef(null)
  const tickRef     = useRef(null)

  const [resultado,  setResultado]  = useState(null)
  const [motivo,     setMotivo]     = useState('banheiro')
  const [fora,       setFora]       = useState([])
  const [tick,       setTick]       = useState(0)
  const [foraAberto, setForaAberto] = useState(false)

  // Cronômetro — atualiza a cada 30 s
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    carregarFora()
    iniciarScanner()
    const iv = setInterval(carregarFora, 30000)
    return () => {
      clearInterval(iv)
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function carregarFora() {
    try {
      const { data } = await api.get('/saida-sala/fora')
      setFora(data)
    } catch {}
  }

  async function iniciarScanner() {
    if (html5QrRef.current) return
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner('qr-saida-tablet', {
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

  async function onScan(codigo) {
    await pararScanner()
    try {
      const { data } = await api.post('/saida-sala/scanner', { codigo, motivo })
      setResultado({
        tipo:    data.tipo,
        aluno:   data.aluno,
        mensagem: data.mensagem,
        minutos: data.minutos,
      })
      tocarBeep(data.tipo === 'retorno' ? 'retorno' : 'saida')
      carregarFora()
    } catch (err) {
      const tipo = err.response?.data?.tipo || 'erro'
      setResultado({ tipo, mensagem: err.response?.data?.erro || 'Aluno não encontrado' })
      tocarBeep('erro')
    }

    timeoutRef.current = setTimeout(() => {
      setResultado(null)
      iniciarScanner()
    }, 3500)
  }

  async function retornarManual(id) {
    try {
      await api.post(`/saida-sala/${id}/retornar`)
      carregarFora()
    } catch {}
  }

  function tocarBeep(tipo) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      if (tipo === 'saida') {
        o.frequency.value = 880
        g.gain.setValueAtTime(0.3, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        o.start(); o.stop(ctx.currentTime + 0.3)
      } else if (tipo === 'retorno') {
        o.frequency.setValueAtTime(660, ctx.currentTime)
        o.frequency.setValueAtTime(990, ctx.currentTime + 0.15)
        g.gain.setValueAtTime(0.3, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        o.start(); o.stop(ctx.currentTime + 0.4)
      } else {
        o.type = 'sawtooth'; o.frequency.value = 220
        g.gain.setValueAtTime(0.25, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        o.start(); o.stop(ctx.currentTime + 0.35)
      }
    } catch {}
  }

  const motivoAtual  = MOTIVOS.find(m => m.value === motivo)
  const corMotivo    = motivoAtual?.cor || '#0ea5e9'
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  /* ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1e' }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: '#111827', borderBottom: '1px solid #1f2937' }}>

        {/* Voltar */}
        <Link to="/dashboard"
          className="text-white/60 hover:text-white flex items-center gap-1 text-sm">
          ← Painel
        </Link>

        {/* Título */}
        <div className="text-center">
          <h1 className="font-bold text-base text-white">🚪 Saída de Sala</h1>
          <p className="text-white/50 text-xs capitalize">{hoje}</p>
        </div>

        {/* Badge "fora agora" */}
        <button
          onClick={() => setForaAberto(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
          style={{
            background: fora.length > 0 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.15)',
            color:      fora.length > 0 ? '#fb923c' : '#34d399',
            border:     `1px solid ${fora.length > 0 ? '#f97316' : '#10b981'}44`,
          }}>
          {fora.length > 0 ? `🚶 ${fora.length} fora` : '✅ Todos em sala'}
        </button>
      </div>

      {/* ── PAINEL "FORA AGORA" (colapsável) ───────────────── */}
      {foraAberto && fora.length > 0 && (
        <div style={{ background: '#111827', borderBottom: '1px solid #1f2937' }}>
          <div className="px-4 py-2 max-h-44 overflow-y-auto divide-y divide-white/5">
            {fora.map(r => {
              const mins    = minutosDecorridos(r.hora_saida)
              const alerta  = mins >= ALERTA_MIN
              return (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
                    style={{ border: `2px solid ${alerta ? '#ef4444' : '#374151'}` }}>
                    {r.foto_path
                      ? <img src={r.foto_path} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-sm">👤</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{r.nome}</p>
                    <p className="text-white/40 text-xs">{r.turma}</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    alerta ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-orange-900/40 text-orange-400'}`}>
                    {mins === 0 ? 'Agora' : `${mins}min`}
                  </span>
                  <button onClick={() => retornarManual(r.id)}
                    className="text-xs px-2 py-1 rounded-full flex-shrink-0 font-medium"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid #10b98144' }}>
                    ↩ Voltou
                  </button>
                </div>
              )
            })}
          </div>
          {fora.some(r => minutosDecorridos(r.hora_saida) >= ALERTA_MIN) && (
            <div className="px-4 pb-2">
              <p className="text-xs text-red-400">🔴 Aluno(s) fora há mais de {ALERTA_MIN} minutos</p>
            </div>
          )}
        </div>
      )}

      {/* ── SELETOR DE MOTIVO ───────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0"
        style={{ background: '#0d1320' }}>
        {MOTIVOS.map(m => (
          <button key={m.value} onClick={() => setMotivo(m.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: motivo === m.value ? m.cor + '30' : 'rgba(255,255,255,0.05)',
              color:      motivo === m.value ? m.cor : 'rgba(255,255,255,0.45)',
              border:     `1.5px solid ${motivo === m.value ? m.cor : 'transparent'}`,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── ÁREA CENTRAL ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-4">

        {/* Card de resultado */}
        {resultado && (
          <div className="w-full max-w-sm rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: resultado.tipo === 'saida'   ? 'rgba(249,115,22,0.12)'  :
                          resultado.tipo === 'retorno' ? 'rgba(16,185,129,0.12)'  :
                          'rgba(239,68,68,0.12)',
              border: `2px solid ${
                resultado.tipo === 'saida'   ? '#f97316' :
                resultado.tipo === 'retorno' ? '#10b981' : '#ef4444'}`,
            }}>

            {/* Foto / avatar */}
            {resultado.aluno ? (
              <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden border-2"
                style={{ borderColor: resultado.tipo === 'retorno' ? '#10b981' : '#f97316' }}>
                {resultado.aluno.foto_path
                  ? <img src={resultado.aluno.foto_path} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-3xl">👤</div>}
              </div>
            ) : (
              <div className="text-4xl flex-shrink-0">
                {resultado.tipo === 'nao_encontrado' ? '❌' : '⚠️'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {resultado.aluno && (
                <>
                  <p className="font-bold text-white text-base truncate">{resultado.aluno.nome}</p>
                  <p className="text-white/50 text-xs mb-1">{resultado.aluno.turma}</p>
                </>
              )}
              <p className="font-semibold text-sm"
                style={{ color: resultado.tipo === 'saida'   ? '#fb923c' :
                                resultado.tipo === 'retorno' ? '#34d399' : '#f87171' }}>
                {resultado.tipo === 'saida'   ? `⬆️ Saiu — ${motivoAtual?.label}` :
                 resultado.tipo === 'retorno' ? `⬇️ Voltou após ${resultado.minutos} min` :
                 resultado.mensagem}
              </p>
            </div>
          </div>
        )}

        {/* Scanner QR */}
        <div className="w-full max-w-sm">
          <div id="qr-saida-tablet" ref={scannerRef} className="rounded-2xl overflow-hidden" />
        </div>

        <p className="text-white/30 text-sm text-center">
          Aponte o QR Code do crachá para a câmera
        </p>
      </div>

      {/* ── ESTILOS DO SCANNER ─────────────────────────────── */}
      <style>{`
        #qr-saida-tablet { background: #0a0f1e !important; }
        #qr-saida-tablet video { border-radius: 12px; }
        #qr-saida-tablet__scan_region { border-radius: 12px; }
        #qr-saida-tablet__dashboard { background: #0a0f1e !important; padding: 8px; }
        #qr-saida-tablet__dashboard button {
          background: ${corMotivo} !important;
          color: white !important;
          border-radius: 8px !important;
          border: none !important;
          padding: 6px 14px !important;
          font-weight: 600 !important;
        }
        #qr-saida-tablet__status_span { color: #4b5563 !important; }
        #qr-saida-tablet__camera_selection {
          background: #111827 !important;
          color: #d1d5db !important;
          border: 1px solid #374151 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
        }
        #qr-saida-tablet__header_message { display: none !important; }
      `}</style>
    </div>
  )
}
