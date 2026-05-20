import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Scanner() {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [resultado, setResultado] = useState(null)
  const timeoutRef = useRef(null)

  // Modo: 'scanner' | 'manual'
  const [modo, setModo] = useState('scanner')

  // Chamada manual
  const [turmas,    setTurmas]    = useState([])
  const [turmaSel,  setTurmaSel]  = useState('')
  const [alunos,    setAlunos]    = useState([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [salvando,  setSalvando]  = useState({}) // { [aluno_id]: true }
  const hoje = new Date().toISOString().split('T')[0]

  // ── Scanner ──────────────────────────────────────────────
  useEffect(() => {
    if (modo === 'scanner') {
      iniciarScanner()
    } else {
      pararScanner()
    }
    return () => {
      pararScanner()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [modo])

  // Carrega turmas ao entrar no modo manual
  useEffect(() => {
    if (modo === 'manual' && turmas.length === 0) {
      api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
    }
  }, [modo])

  // Carrega alunos quando seleciona turma
  useEffect(() => {
    if (!turmaSel) { setAlunos([]); return }
    const t = turmas.find(t => t.id === parseInt(turmaSel))
    if (!t) return
    setCarregandoAlunos(true)
    api.get(`/presenca/hoje/${encodeURIComponent(t.nome)}`)
      .then(({ data }) => setAlunos(data))
      .catch(() => {})
      .finally(() => setCarregandoAlunos(false))
  }, [turmaSel])

  async function iniciarScanner() {
    if (html5QrRef.current) return
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

  // ── Chamada manual ────────────────────────────────────────
  async function togglePresenca(aluno) {
    const novoStatus = aluno.status === 'presente' ? 'ausente' : 'presente'
    setSalvando(prev => ({ ...prev, [aluno.id]: true }))
    try {
      await api.post('/presenca/manual', {
        aluno_id: aluno.id,
        data: hoje,
        status: novoStatus,
        registrado_por: 'manual'
      })
      // Atualiza localmente sem recarregar tudo
      setAlunos(prev => prev.map(a =>
        a.id === aluno.id ? { ...a, status: novoStatus } : a
      ))
    } catch {}
    finally { setSalvando(prev => ({ ...prev, [aluno.id]: false })) }
  }

  async function marcarTodos(status) {
    if (!alunos.length) return
    const ids = alunos.filter(a => a.status !== status).map(a => a.id)
    if (ids.length === 0) return
    setSalvando(Object.fromEntries(ids.map(id => [id, true])))
    await Promise.all(ids.map(id =>
      api.post('/presenca/manual', { aluno_id: id, data: hoje, status, registrado_por: 'manual' })
    ))
    setAlunos(prev => prev.map(a => ({ ...a, status })))
    setSalvando({})
  }

  // ── Sons ──────────────────────────────────────────────────
  function tocarBeep(tipo) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = tipo === 'sucesso' ? 880 : tipo === 'duplicado' ? 440 : 220
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }
  function tocarBeepErro() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 200; osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(); osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  function corCard() {
    if (!resultado) return ''
    if (resultado.tipo === 'sucesso') return 'border-success bg-green-50'
    if (resultado.tipo === 'duplicado') return 'border-yellow-400 bg-yellow-50'
    return 'border-danger bg-red-50'
  }

  const presentes = alunos.filter(a => a.status === 'presente').length
  const ausentes  = alunos.filter(a => a.status === 'ausente').length

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary flex-shrink-0">
        <Link to="/dashboard" className="text-white/80 hover:text-white flex items-center gap-2 text-sm">
          ← Voltar
        </Link>
        <h1 className="font-bold text-base">📷 Scanner de Presença</h1>
        <div className="w-16" />
      </div>

      {/* Abas modo */}
      <div className="flex bg-gray-800 flex-shrink-0">
        <button
          onClick={() => setModo('scanner')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${modo === 'scanner' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}>
          📷 Scanner QR
        </button>
        <button
          onClick={() => setModo('manual')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${modo === 'manual' ? 'bg-secondary text-primary' : 'text-white/50 hover:text-white'}`}>
          ✍️ Chamada Manual
        </button>
      </div>

      {/* ── MODO SCANNER ─────────────────────────────────── */}
      {modo === 'scanner' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {resultado && (
            <div className={`w-full max-w-sm mb-6 border-2 rounded-xl p-4 ${corCard()} text-gray-800`}>
              <div className="flex items-center gap-3">
                {resultado.aluno?.foto_path && (
                  <img src={resultado.aluno.foto_path} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
                )}
                {!resultado.aluno?.foto_path && resultado.aluno && (
                  <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-2xl border-2 border-white">👤</div>
                )}
                <div className="flex-1">
                  <p className="text-xl">{resultado.tipo === 'sucesso' ? '✅' : resultado.tipo === 'duplicado' ? '⚠️' : '❌'}</p>
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
          <div className="w-full max-w-sm">
            <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden" />
          </div>
          <p className="text-white/50 text-sm mt-4 text-center">
            Aponte a câmera para o QR Code da carteirinha
          </p>
        </div>
      )}

      {/* ── MODO CHAMADA MANUAL ──────────────────────────── */}
      {modo === 'manual' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Seletor de turma */}
          <div className="p-4 bg-gray-800 flex-shrink-0">
            <select
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2.5 text-sm"
              value={turmaSel}
              onChange={e => setTurmaSel(e.target.value)}>
              <option value="">— Selecione a turma —</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} — {t.curso}</option>
              ))}
            </select>
          </div>

          {/* Resumo + ações rápidas */}
          {alunos.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
              <div className="flex gap-3 text-sm">
                <span className="text-green-400 font-bold">✅ {presentes}</span>
                <span className="text-red-400 font-bold">❌ {ausentes}</span>
                <span className="text-white/40 text-xs">{alunos.length} alunos</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => marcarTodos('presente')}
                  className="text-xs px-2 py-1 bg-green-700 hover:bg-green-600 rounded-full font-medium transition-colors">
                  Todos presentes
                </button>
                <button
                  onClick={() => marcarTodos('ausente')}
                  className="text-xs px-2 py-1 bg-red-800 hover:bg-red-700 rounded-full font-medium transition-colors">
                  Todos ausentes
                </button>
              </div>
            </div>
          )}

          {/* Lista de alunos */}
          <div className="flex-1 overflow-y-auto">
            {!turmaSel && (
              <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
                <span className="text-5xl">👆</span>
                <p className="text-sm">Selecione uma turma acima</p>
              </div>
            )}
            {turmaSel && carregandoAlunos && (
              <div className="flex items-center justify-center h-full text-white/40 text-sm">
                Carregando...
              </div>
            )}
            {turmaSel && !carregandoAlunos && alunos.length === 0 && (
              <div className="flex items-center justify-center h-full text-white/40 text-sm">
                Nenhum aluno nesta turma
              </div>
            )}
            {alunos.map((aluno, idx) => {
              const presente   = aluno.status === 'presente'
              const justif     = aluno.status === 'justificado'
              const carregando = salvando[aluno.id]
              return (
                <button
                  key={aluno.id}
                  onClick={() => !carregando && !justif && togglePresenca(aluno)}
                  disabled={carregando || justif}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800 transition-colors text-left
                    ${presente  ? 'bg-green-900/30 hover:bg-green-900/50' :
                      justif    ? 'bg-blue-900/20 cursor-default' :
                                  'bg-gray-900 hover:bg-gray-800'}`}>

                  {/* Foto */}
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border-2
                    ${presente ? 'border-green-500' : justif ? 'border-blue-400' : 'border-gray-600'}`}>
                    {aluno.foto_path
                      ? <img src={aluno.foto_path} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-lg">👤</div>}
                  </div>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${presente ? 'text-green-300' : justif ? 'text-blue-300' : 'text-white/80'}`}>
                      {aluno.nome}
                    </p>
                    <p className="text-white/30 text-xs">{aluno.codigo}</p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 text-xl">
                    {carregando ? (
                      <span className="text-white/30 text-sm animate-pulse">...</span>
                    ) : presente ? '✅' : justif ? '📋' : '❌'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

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
