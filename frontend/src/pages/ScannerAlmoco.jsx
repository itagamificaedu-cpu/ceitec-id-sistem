import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ScannerAlmoco() {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [resultado, setResultado] = useState(null)
  const [totalHoje, setTotalHoje] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    carregarTotal()
    iniciarScanner()
    return () => {
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function carregarTotal() {
    try {
      const { data } = await api.get('/almoco/hoje')
      setTotalHoje(data.total_almocos || 0)
    } catch {}
  }

  async function iniciarScanner() {
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner('qr-reader-almoco', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      }, false)

      scanner.render(
        (decodedText) => onScanSuccess(decodedText, scanner),
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

  async function onScanSuccess(codigo, scanner) {
    await pararScanner()
    try {
      const { data } = await api.post('/almoco/scanner', { codigo })
      setResultado({ tipo: data.tipo, aluno: data.aluno, registro: data.registro, mensagem: data.mensagem })
      if (data.tipo === 'sucesso') {
        setTotalHoje(prev => prev + 1)
        tocarBeep('sucesso')
      } else if (data.tipo === 'duplicado') {
        tocarBeep('duplicado')
      }
    } catch (err) {
      if (err.response?.data?.tipo === 'nao_encontrado') {
        setResultado({ tipo: 'nao_encontrado', mensagem: 'Aluno não encontrado no sistema' })
        tocarBeepErro()
      } else {
        setResultado({ tipo: 'erro', mensagem: err.response?.data?.erro || 'Erro ao registrar almoço' })
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
      osc.frequency.value = tipo === 'sucesso' ? 880 : 440
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
    if (resultado.tipo === 'sucesso') return 'border-green-500 bg-green-50'
    if (resultado.tipo === 'duplicado') return 'border-yellow-400 bg-yellow-50'
    return 'border-red-400 bg-red-50'
  }

  function iconeStatus() {
    if (!resultado) return ''
    if (resultado.tipo === 'sucesso') return '✅'
    if (resultado.tipo === 'duplicado') return '⚠️'
    return '❌'
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1200' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#b45309' }}>
        <Link to="/almoco/relatorio" className="text-white/80 hover:text-white flex items-center gap-2 text-sm">
          ← Relatório
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-lg text-white">🍽️ Controle de Almoço</h1>
          <p className="text-white/70 text-xs capitalize">{hoje}</p>
        </div>
        <div className="text-right">
          <div className="text-white font-bold text-xl">{totalHoje}</div>
          <div className="text-white/60 text-xs">almoços hoje</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Card de resultado */}
        {resultado && (
          <div
            className={`w-full max-w-sm mb-6 border-2 rounded-xl p-4 ${corCard()} text-gray-800`}
            style={{ animation: 'none' }}
          >
            <div className="flex items-center gap-3">
              {resultado.aluno?.foto_path ? (
                <img
                  src={resultado.aluno.foto_path}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-white"
                />
              ) : resultado.aluno ? (
                <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-2xl border-2 border-white">
                  👤
                </div>
              ) : null}
              <div className="flex-1">
                <p className="text-xl">{iconeStatus()}</p>
                {resultado.aluno && (
                  <>
                    <p className="font-bold text-sm">{resultado.aluno.nome}</p>
                    <p className="text-xs text-gray-500">{resultado.aluno.turma}</p>
                    <p className="text-xs font-mono" style={{ color: '#b45309' }}>{resultado.aluno.codigo}</p>
                  </>
                )}
                <p className="text-sm font-medium mt-1">{resultado.mensagem}</p>
                {resultado.registro?.hora_registro && (
                  <p className="text-xs text-gray-500">Horário: {resultado.registro.hora_registro}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner */}
        <div className="w-full max-w-sm">
          <div
            id="qr-reader-almoco"
            ref={scannerRef}
            className="rounded-xl overflow-hidden"
          />
        </div>

        <p className="text-white/50 text-sm mt-4 text-center">
          Aponte a câmera para o QR Code da carteirinha do aluno
        </p>
      </div>

      <style>{`
        #qr-reader-almoco { background: #1a1200 !important; }
        #qr-reader-almoco video { border-radius: 8px; }
        #qr-reader-almoco__scan_region { border-radius: 8px; }
        #qr-reader-almoco__dashboard { background: #1a1200 !important; padding: 8px; }
        #qr-reader-almoco__dashboard button { background: #b45309 !important; color: white !important; border-radius: 6px !important; border: none !important; padding: 6px 12px !important; }
        #qr-reader-almoco__status_span { color: #999 !important; }
        #qr-reader-almoco__camera_selection { background: #2a1800 !important; color: white !important; border: 1px solid #b45309 !important; border-radius: 6px !important; padding: 4px !important; }
      `}</style>
    </div>
  )
}
