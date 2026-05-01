import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Scanner() {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [resultado, setResultado] = useState(null)
  const [iniciado, setIniciado] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    iniciarScanner()
    return () => {
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function iniciarScanner() {
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      }, false)

      scanner.render(
        (decodedText) => onScanSuccess(decodedText, scanner),
        () => {}
      )

      html5QrRef.current = scanner
      setIniciado(true)
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

  async function onScanSuccess(codigo, scanner) {
    await pararScanner()
    try {
      const { data } = await api.post('/presenca/scanner', { codigo })
      setResultado({ tipo: data.tipo, aluno: data.aluno, presenca: data.presenca, mensagem: data.mensagem })
      tocarBeep(data.tipo)
    } catch (err) {
      if (err.response?.data?.tipo === 'nao_encontrado') {
        setResultado({ tipo: 'nao_encontrado', mensagem: 'Aluno não encontrado no sistema' })
        tocarBeepErro()
      } else {
        setResultado({ tipo: 'erro', mensagem: err.response?.data?.erro || 'Erro ao registrar presença' })
      }
    }

    timeoutRef.current = setTimeout(() => {
      setResultado(null)
      iniciarScanner()
    }, 3000)
  }

  function tocarBeep(tipo) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = tipo === 'sucesso' ? 880 : tipo === 'duplicado' ? 440 : 220
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }

  function tocarBeepErro() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 200
      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  function corCard() {
    if (!resultado) return ''
    if (resultado.tipo === 'sucesso') return 'border-success bg-green-50'
    if (resultado.tipo === 'duplicado') return 'border-yellow-400 bg-yellow-50'
    return 'border-danger bg-red-50'
  }

  function iconeStatus() {
    if (!resultado) return ''
    if (resultado.tipo === 'sucesso') return '✅'
    if (resultado.tipo === 'duplicado') return '⚠️'
    return '❌'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary">
        <Link to="/dashboard" className="text-white/80 hover:text-white flex items-center gap-2">
          ← Voltar
        </Link>
        <h1 className="font-bold text-lg">📷 Scanner de Presença</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Card de resultado */}
        {resultado && (
          <div className={`w-full max-w-sm mb-6 border-2 rounded-xl p-4 ${corCard()} text-gray-800 animate-pulse`}
            style={{ animation: 'none' }}>
            <div className="flex items-center gap-3">
              {resultado.aluno?.foto_path && (
                <img src={resultado.aluno.foto_path} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
              )}
              {!resultado.aluno?.foto_path && resultado.aluno && (
                <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-2xl border-2 border-white">👤</div>
              )}
              <div className="flex-1">
                <p className="text-xl">{iconeStatus()}</p>
                {resultado.aluno && (
                  <>
                    <p className="font-bold text-sm">{resultado.aluno.nome}</p>
                    <p className="text-xs text-gray-500">{resultado.aluno.turma}</p>
                    <p className="text-xs font-mono text-secondary">{resultado.aluno.codigo}</p>
                  </>
                )}
                <p className="text-sm font-medium mt-1">{resultado.mensagem}</p>
                {resultado.presenca?.hora_entrada && (
                  <p className="text-xs text-gray-500">Horário: {resultado.presenca.hora_entrada}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner */}
        <div className="w-full max-w-sm">
          <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden" />
        </div>

        <p className="text-white/50 text-sm mt-4 text-center">
          Aponte a câmera para o QR Code da carteirinha
        </p>
      </div>

      <style>{`
        #qr-reader { background: #1a1a1a !important; }
        #qr-reader video { border-radius: 8px; }
        #qr-reader__scan_region { border-radius: 8px; }
        #qr-reader__dashboard { background: #1a1a1a !important; padding: 8px; }
        #qr-reader__dashboard button { background: #1e3a5f !important; color: white !important; border-radius: 6px !important; border: none !important; padding: 6px 12px !important; }
        #qr-reader__status_span { color: #999 !important; }
        #qr-reader__camera_selection { background: #2a2a2a !important; color: white !important; border: 1px solid #444 !important; border-radius: 6px !important; padding: 4px !important; }
      `}</style>
    </div>
  )
}
