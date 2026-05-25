/**
 * Scanner de Portal do Aluno
 * Professor escaneia a carteirinha → abre o portal ItagGame do aluno na tela
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

// Beep de sucesso
function tocarBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

function tocarBeepErro() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.value = 220
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

export default function ScannerPortal() {
  const navigate = useNavigate()
  const html5QrRef = useRef(null)
  const timeoutRef = useRef(null)

  // estado: 'scanning' | 'carregando' | 'confirmado' | 'erro'
  const [estado, setEstado] = useState('scanning')
  const [aluno, setAluno] = useState(null)
  const [mensagemErro, setMensagemErro] = useState('')
  const [historico, setHistorico] = useState([]) // lista de quem acessou hoje

  useEffect(() => {
    iniciarScanner()
    return () => {
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function iniciarScanner() {
    if (html5QrRef.current) return
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner('qr-portal-reader', {
        fps: 12,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      }, false)
      scanner.render(
        (decodedText) => onScanSuccess(decodedText),
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

  async function onScanSuccess(codigoRaw) {
    await pararScanner()
    const codigo = codigoRaw.trim().toUpperCase()
    setEstado('carregando')

    try {
      const { data } = await api.get(`/alunos/qr/${encodeURIComponent(codigo)}`)
      tocarBeep()
      setAluno(data)
      setEstado('confirmado')

      // Registra no histórico da sessão
      setHistorico(prev => {
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const jaExiste = prev.find(h => h.codigo === data.codigo)
        if (jaExiste) {
          return prev.map(h => h.codigo === data.codigo ? { ...h, hora, acessos: (h.acessos || 1) + 1 } : h)
        }
        return [{ id: data.id, nome: data.nome, codigo: data.codigo, turma: data.turma, foto: data.foto_path, hora, acessos: 1 }, ...prev]
      })

      // Abre o portal do aluno após 1.8s
      timeoutRef.current = setTimeout(() => {
        navigate(`/itagame/aluno?codigo=${encodeURIComponent(data.codigo)}&origem=scanner`)
      }, 1800)

    } catch {
      tocarBeepErro()
      setEstado('erro')
      setMensagemErro('Carteirinha não encontrada. Tente novamente.')
      timeoutRef.current = setTimeout(() => {
        setEstado('scanning')
        setMensagemErro('')
        iniciarScanner()
      }, 2500)
    }
  }

  function voltarScanner() {
    clearTimeout(timeoutRef.current)
    setEstado('scanning')
    setAluno(null)
    iniciarScanner()
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          {/* Título */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl">📲</div>
            <div>
              <h1 className="text-xl font-bold text-textMain">Scanner de Portal do Aluno</h1>
              <p className="text-sm text-gray-500">Aluno escaneia a carteirinha → portal abre na tela</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Coluna esquerda — Scanner / Feedback */}
            <div>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">

                {/* Estado: SCANNING — câmera aberta */}
                {estado === 'scanning' && (
                  <div>
                    <div className="bg-primary text-white text-center py-3 px-4">
                      <div className="text-sm font-bold tracking-wide">📷 APONTE A CÂMERA PARA A CARTEIRINHA</div>
                    </div>
                    <div id="qr-portal-reader" className="w-full" />
                    <div className="px-4 pb-4 pt-2 text-center text-xs text-gray-400">
                      O QR Code fica no centro da carteirinha do aluno
                    </div>
                  </div>
                )}

                {/* Estado: CARREGANDO */}
                {estado === 'carregando' && (
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
                    <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="text-primary font-bold text-lg">Identificando aluno...</div>
                  </div>
                )}

                {/* Estado: CONFIRMADO */}
                {estado === 'confirmado' && aluno && (
                  <div className="flex flex-col items-center py-10 px-6 gap-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-500 overflow-hidden flex items-center justify-center">
                      {aluno.foto_path
                        ? <img src={aluno.foto_path} alt={aluno.nome} className="w-full h-full object-cover" />
                        : <span className="text-4xl">👤</span>}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center -mt-8 ml-12 border-2 border-white z-10">
                      <span className="text-white text-xl font-bold">✓</span>
                    </div>
                    <div className="font-bold text-xl text-gray-800 -mt-2">{aluno.nome}</div>
                    <div className="font-mono text-primary font-bold text-lg">{aluno.codigo}</div>
                    <div className="text-gray-500 text-sm">{aluno.turma}</div>
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-sm font-semibold">
                      🚀 Abrindo portal em instantes...
                    </div>
                    <button
                      onClick={voltarScanner}
                      className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
                    >
                      Cancelar e voltar ao scanner
                    </button>
                  </div>
                )}

                {/* Estado: ERRO */}
                {estado === 'erro' && (
                  <div className="flex flex-col items-center py-12 px-6 gap-4 text-center">
                    <div className="text-5xl">❌</div>
                    <div className="text-red-600 font-bold text-lg">{mensagemErro}</div>
                    <div className="text-gray-400 text-sm">O scanner vai reiniciar automaticamente...</div>
                  </div>
                )}
              </div>

              {/* Instrução para o aluno */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <div className="font-bold mb-1">📋 Como usar:</div>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Aluno pega a carteirinha e aponta o QR Code para a câmera</li>
                  <li>O portal abre automaticamente na tela</li>
                  <li>Aluno acessa atividades, quizzes e seu desempenho</li>
                  <li>Ao terminar, pressione <strong>Voltar</strong> no navegador para o próximo</li>
                </ol>
              </div>
            </div>

            {/* Coluna direita — Histórico da sessão */}
            <div>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
                  <div className="font-bold text-gray-700">📋 Acessos desta sessão</div>
                  <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
                    {historico.length} aluno{historico.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {historico.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300 gap-2">
                    <div className="text-4xl">📂</div>
                    <div className="text-sm">Nenhum aluno acessou ainda</div>
                  </div>
                ) : (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {historico.map((h) => (
                      <div key={h.codigo} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {h.foto
                            ? <img src={h.foto} alt={h.nome} className="w-full h-full object-cover" />
                            : <span className="text-base">👤</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm truncate">{h.nome}</div>
                          <div className="text-xs text-gray-400 font-mono">{h.codigo} · {h.turma}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-primary">{h.hora}</div>
                          {h.acessos > 1 && (
                            <div className="text-xs text-orange-500">{h.acessos}x</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {historico.length > 0 && (
                  <div className="px-4 py-3 border-t bg-gray-50">
                    <button
                      onClick={() => setHistorico([])}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      🗑️ Limpar histórico
                    </button>
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
