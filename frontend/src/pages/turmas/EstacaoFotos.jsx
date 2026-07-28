import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

// Proporção padrão de foto 3x4 (largura x altura)
const RAZAO_3X4 = 3 / 4

export default function EstacaoFotos() {
  const { id } = useParams()
  const videoRef = useRef()
  const streamRef = useRef(null)
  const canvasRef = useRef()

  const [turma, setTurma] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [indice, setIndice] = useState(0)
  const [concluidos, setConcluidos] = useState({}) // { alunoId: true }
  const [foto, setFoto] = useState(null) // dataURL da foto capturada (antes de confirmar)
  const [enviando, setEnviando] = useState(false)
  const [erroCamera, setErroCamera] = useState('')
  const [facingMode, setFacingMode] = useState('environment')
  const [camerasDisponiveis, setCamerasDisponiveis] = useState(false)

  useEffect(() => {
    api.get(`/turmas/${id}`).then(r => setTurma(r.data)).catch(() => {}).finally(() => setCarregando(false))
  }, [id])

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput')
      setCamerasDisponiveis(cams.length > 1)
    }).catch(() => {})
  }, [])

  const iniciarCamera = useCallback(async () => {
    setErroCamera('')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      setErroCamera('Não foi possível acessar a câmera. Verifique se você permitiu o acesso no navegador.')
    }
  }, [facingMode])

  useEffect(() => {
    if (!foto) iniciarCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [iniciarCamera, foto])

  const alunos = turma?.alunos || []
  const alunoAtual = alunos[indice]

  function capturar() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const vw = video.videoWidth, vh = video.videoHeight
    // recorta no centro do vídeo mantendo a proporção 3x4
    let cropW, cropH
    if (vw / vh > RAZAO_3X4) {
      cropH = vh
      cropW = vh * RAZAO_3X4
    } else {
      cropW = vw
      cropH = vw / RAZAO_3X4
    }
    const sx = (vw - cropW) / 2
    const sy = (vh - cropH) / 2

    const canvas = canvasRef.current
    canvas.width = 600
    canvas.height = 600 / RAZAO_3X4
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
    setFoto(canvas.toDataURL('image/jpeg', 0.92))
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function repetir() {
    setFoto(null)
  }

  async function confirmar() {
    if (!alunoAtual || !foto) return
    setEnviando(true)
    try {
      const blob = await (await fetch(foto)).blob()
      const fd = new FormData()
      fd.append('foto', blob, `foto_${alunoAtual.codigo}.jpg`)
      await api.post(`/alunos/${alunoAtual.id}/foto`, fd)
      setConcluidos(prev => ({ ...prev, [alunoAtual.id]: true }))
      proximo()
    } catch (err) {
      alert('Erro ao salvar a foto: ' + (err.response?.data?.erro || err.message))
    } finally {
      setEnviando(false)
    }
  }

  function proximo() {
    setFoto(null)
    setIndice(i => Math.min(i + 1, alunos.length))
  }

  function anterior() {
    setFoto(null)
    setIndice(i => Math.max(i - 1, 0))
  }

  function alternarCamera() {
    setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))
  }

  if (carregando) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </main>
    </div>
  )

  if (!turma) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <p className="text-danger">Turma não encontrada</p>
      </main>
    </div>
  )

  const concluido = indice >= alunos.length

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to={`/turmas/${id}`} className="text-gray-500 hover:text-primary text-sm">← {turma.nome}</Link>
          </div>

          <h1 className="text-xl font-bold text-textMain mb-1">📸 Estação de Fotos</h1>
          <p className="text-sm text-gray-500 mb-4">
            {concluido ? 'Turma concluída' : `Aluno ${indice + 1} de ${alunos.length}`}
          </p>

          {concluido ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-medium text-textMain mb-1">Fotos concluídas!</p>
              <p className="text-sm text-gray-500 mb-4">
                {Object.keys(concluidos).length} de {alunos.length} aluno(s) fotografado(s).
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setIndice(0)} className="btn-secondary text-sm">↺ Revisar turma</button>
                <Link to={`/turmas/${id}`} className="btn-primary text-sm">Voltar pra turma</Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {alunoAtual.foto_path
                    ? <img src={alunoAtual.foto_path} alt="" className="w-full h-full object-cover" />
                    : <span>👤</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-textMain truncate">{alunoAtual.nome}</p>
                  <p className="text-xs text-secondary font-mono">{alunoAtual.codigo}</p>
                </div>
                {concluidos[alunoAtual.id] && <span className="ml-auto text-success text-sm">✓ feita</span>}
              </div>

              <div
                className="relative bg-black rounded-lg overflow-hidden mx-auto"
                style={{ width: '100%', aspectRatio: RAZAO_3X4 }}
              >
                {erroCamera ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-white text-sm text-center">{erroCamera}</p>
                  </div>
                ) : foto ? (
                  <img src={foto} alt="Foto capturada" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-2 mt-4">
                {!foto ? (
                  <>
                    <button onClick={anterior} disabled={indice === 0} className="btn-secondary text-sm disabled:opacity-40">← Voltar</button>
                    <button onClick={capturar} disabled={!!erroCamera} className="btn-primary flex-1 text-sm disabled:opacity-40">📷 Capturar</button>
                    {camerasDisponiveis && (
                      <button onClick={alternarCamera} className="btn-secondary text-sm" title="Trocar câmera">🔄</button>
                    )}
                    <button onClick={proximo} className="text-sm text-gray-400 hover:text-gray-600 px-2">Pular →</button>
                  </>
                ) : (
                  <>
                    <button onClick={repetir} disabled={enviando} className="btn-secondary flex-1 text-sm">🔄 Repetir</button>
                    <button onClick={confirmar} disabled={enviando} className="btn-primary flex-1 text-sm">
                      {enviando ? 'Salvando...' : '✅ Usar essa foto'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
