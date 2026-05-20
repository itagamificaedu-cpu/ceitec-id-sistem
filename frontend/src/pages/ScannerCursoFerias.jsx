import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'

const CHAVE = 'gamificaedu_secreto_2026'

const DIAS_INFO = [
  { dia: 1, icon: '🔬', titulo: 'Mundo Maker & Eletrônica Básica' },
  { dia: 2, icon: '⚡', titulo: 'Arduino na Prática' },
  { dia: 3, icon: '🤖', titulo: 'Robótica e Movimento' },
  { dia: 4, icon: '📡', titulo: 'ESP32 & Controle Sem Fio' },
  { dia: 5, icon: '🏆', titulo: 'Demo Day — Mostra Maker' },
]

export default function ScannerCursoFerias() {
  const html5QrRef = useRef(null)

  // Dia selecionado — usa ref para a callback do scanner sempre ter o valor atual
  const [diaAtual, setDiaAtual] = useState(1)
  const diaRef = useRef(1)
  function mudarDia(d) {
    setDiaAtual(d)
    diaRef.current = d
  }

  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [totalPresentes, setTotalPresentes] = useState(0)
  const timeoutRef = useRef(null)
  const processandoRef = useRef(false)

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
      const scanner = new Html5QrcodeScanner(
        'qr-scanner-curso',
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0, showTorchButtonIfSupported: true },
        false
      )
      scanner.render(onScanSuccess, () => {})
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

  async function onScanSuccess(codigo) {
    // Evita processar múltiplos scans ao mesmo tempo
    if (processandoRef.current) return
    processandoRef.current = true

    try {
      const res = await fetch(`/inscricao/api/presencas/scan/?chave=${CHAVE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, dia: diaRef.current }),
      })
      const data = await res.json()

      setResultado(data)

      if (data.tipo === 'presente') {
        setTotalPresentes(n => n + 1)
        setHistorico(h => [{
          ...data,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }, ...h.slice(0, 29)])
      } else if (data.tipo === 'ja_presente') {
        setHistorico(h => [{
          ...data,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }, ...h.slice(0, 29)])
      }

      // Limpa feedback após 3 segundos
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setResultado(null)
        processandoRef.current = false
      }, 3000)
    } catch (err) {
      setResultado({ tipo: 'erro', mensagem: '❌ Erro de conexão com o servidor' })
      setTimeout(() => {
        setResultado(null)
        processandoRef.current = false
      }, 2500)
    }
  }

  // Cores do feedback
  const estiloFeedback = {
    presente: { bg: 'bg-green-500', borda: 'border-green-600' },
    ja_presente: { bg: 'bg-yellow-500', borda: 'border-yellow-600' },
    nao_confirmado: { bg: 'bg-orange-500', borda: 'border-orange-600' },
    erro: { bg: 'bg-red-500', borda: 'border-red-600' },
  }

  const estilo = resultado ? (estiloFeedback[resultado.tipo] || estiloFeedback.erro) : null

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📷</span>
              <h1 className="text-2xl font-bold text-textMain">Scanner — Curso de Férias</h1>
            </div>
            <p className="text-sm text-gray-400">
              Aponte a câmera para o QR Code na carteirinha do aluno para registrar a presença
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">

            {/* ── Coluna esquerda: seletor de dia + câmera + feedback ── */}
            <div className="space-y-4">

              {/* Seletor de dia */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Dia do Curso</p>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {DIAS_INFO.map(d => (
                    <button key={d.dia} onClick={() => mudarDia(d.dia)}
                      className={`p-2 rounded-xl border-2 text-center transition-all ${
                        diaAtual === d.dia
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-orange-300 bg-white'
                      }`}>
                      <p className="text-xl leading-none">{d.icon}</p>
                      <p className={`text-xs font-bold mt-1.5 ${diaAtual === d.dia ? 'text-orange-500' : 'text-gray-500'}`}>
                        Dia {d.dia}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-100 text-center">
                  <p className="text-xs font-semibold text-orange-600">
                    {DIAS_INFO[diaAtual - 1].icon}&nbsp; Dia {diaAtual} — {DIAS_INFO[diaAtual - 1].titulo}
                  </p>
                </div>
              </div>

              {/* Câmera */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div id="qr-scanner-curso" className="w-full" />
              </div>

              {/* Feedback do scan */}
              {resultado && (
                <div className={`p-5 rounded-xl text-white text-center border-2 shadow-lg animate-pulse ${estilo.bg} ${estilo.borda}`}>
                  <p className="text-4xl mb-2 leading-none">
                    {resultado.tipo === 'presente'       ? '✅' :
                     resultado.tipo === 'ja_presente'    ? '🔄' :
                     resultado.tipo === 'nao_confirmado' ? '⚠️' : '❌'}
                  </p>
                  <p className="font-black text-xl leading-tight">
                    {resultado.nome || 'QR Code inválido'}
                  </p>
                  {resultado.escola && (
                    <p className="text-sm opacity-90 mt-1">
                      {resultado.escola} · {resultado.serie} · {resultado.turno}
                    </p>
                  )}
                  <p className="text-sm mt-2 font-semibold opacity-95">
                    {resultado.mensagem || resultado.erro}
                  </p>
                </div>
              )}
            </div>

            {/* ── Coluna direita: contador + histórico ── */}
            <div className="space-y-4">

              {/* Cards de resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                  <p className="text-4xl font-black text-green-600">{totalPresentes}</p>
                  <p className="text-xs text-green-500 font-semibold mt-1 uppercase tracking-wide">Entradas registradas</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                  <p className="text-4xl font-black text-blue-600">{historico.length}</p>
                  <p className="text-xs text-blue-500 font-semibold mt-1 uppercase tracking-wide">Scans realizados</p>
                </div>
              </div>

              {/* Como usar */}
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <p className="text-sm font-bold text-blue-700 mb-2">📖 Como usar</p>
                <ol className="text-xs text-blue-600 space-y-1">
                  <li>1. Selecione o dia do curso acima</li>
                  <li>2. Aponte a câmera para o QR Code na carteirinha do aluno</li>
                  <li>3. O sistema registra a presença automaticamente</li>
                  <li>4. Verde ✅ = entrada registrada · Amarelo 🔄 = já entrou</li>
                </ol>
              </div>

              {/* Histórico de scans */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">📋 Últimas entradas</h3>
                  {historico.length > 0 && (
                    <span className="text-xs text-gray-400">{historico.length} registros</span>
                  )}
                </div>

                {historico.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-3xl mb-2">📷</p>
                    <p className="text-sm">Nenhum scan ainda</p>
                    <p className="text-xs mt-1">Aponte a câmera para começar</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {historico.map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${
                        item.tipo === 'presente' ? 'hover:bg-green-50' : 'hover:bg-yellow-50'
                      } transition-colors`}>
                        <span className="text-lg flex-shrink-0">
                          {item.tipo === 'presente' ? '✅' : '🔄'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {item.escola} · {item.turno}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${
                            item.tipo === 'presente' ? 'text-orange-500 bg-orange-50' : 'text-yellow-600 bg-yellow-50'
                          }`}>
                            {item.codigo}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">{item.hora}</p>
                        </div>
                      </div>
                    ))}
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
