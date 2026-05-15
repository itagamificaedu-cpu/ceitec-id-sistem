// ============================================================
// ABA 5 — PRESENÇA NA SALA MAKER
// Scanner QR + lista manual + relatório por aluno/atividade.
// Reutiliza a lógica do Scanner de Presença existente.
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import api from '../../api'

// ── Constantes ────────────────────────────────────────────
const ABAS_PRESENCA = ['scanner', 'manual', 'relatorio']

export default function Presenca({ config, usuario }) {
  const [abaAtiva, setAbaAtiva] = useState('scanner')
  const isAdmin = usuario.perfil === 'admin'

  return (
    <div className="space-y-5">

      {/* Sub-navegação */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'scanner',   label: '📷 Scanner QR' },
          { key: 'manual',    label: '✏️ Registro Manual' },
          { key: 'relatorio', label: '📊 Relatório' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${abaAtiva === key
                ? 'border-primary text-primary bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-textMain hover:border-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da sub-aba */}
      {abaAtiva === 'scanner'   && <ScannerQR   isAdmin={isAdmin} usuario={usuario} />}
      {abaAtiva === 'manual'    && <RegistroManual isAdmin={isAdmin} usuario={usuario} />}
      {abaAtiva === 'relatorio' && <Relatorio    isAdmin={isAdmin} usuario={usuario} />}
    </div>
  )
}

// ============================================================
// SCANNER QR
// ============================================================
function ScannerQR({ isAdmin, usuario }) {
  const videoRef        = useRef(null)
  const canvasRef       = useRef(null)
  const streamRef       = useRef(null)
  const animFrameRef    = useRef(null)

  const [atividades, setAtividades]       = useState([])
  const [atividadeId, setAtividadeId]     = useState('')
  const [escaneando, setEscaneando]       = useState(false)
  const [resultado, setResultado]         = useState(null)  // { ok, mensagem, aluno }
  const [carregando, setCarregando]       = useState(false)
  const [erroCamera, setErroCamera]       = useState('')
  const [ultimosReg, setUltimosReg]       = useState([])    // últimas presenças registradas

  // Carrega atividades disponíveis (ativas ou em andamento)
  useEffect(() => {
    api.get('/sala-maker/atividades?status=em_andamento')
      .then(({ data }) => {
        setAtividades(data)
        if (data.length === 1) setAtividadeId(String(data[0].id))
      })
      .catch(() => {})
  }, [])

  // Inicia câmera
  async function iniciarCamera() {
    setErroCamera('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setEscaneando(true)
      requestAnimationFrame(varrerFrame)
    } catch {
      setErroCamera('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  // Para câmera
  function pararCamera() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setEscaneando(false)
  }

  // Loop de leitura QR
  const varrerFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(varrerFrame)
      return
    }
    const ctx = canvas.getContext('2d')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) {
      registrarQR(code.data)
    } else {
      animFrameRef.current = requestAnimationFrame(varrerFrame)
    }
  }, [atividadeId])

  // Envia QR para o backend
  async function registrarQR(qrCode) {
    if (carregando || !atividadeId) return
    pararCamera()
    setCarregando(true)
    setResultado(null)
    try {
      const { data } = await api.post('/sala-maker/presenca/scanner', {
        qr_code:      qrCode,
        atividade_id: Number(atividadeId),
      })
      setResultado({ ok: true, mensagem: data.mensagem, aluno: data.aluno_nome })
      setUltimosReg(prev => [{ aluno: data.aluno_nome, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), ok: true }, ...prev.slice(0, 9)])
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao registrar presença.'
      setResultado({ ok: false, mensagem: msg })
      setUltimosReg(prev => [{ aluno: msg, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), ok: false }, ...prev.slice(0, 9)])
    } finally {
      setCarregando(false)
    }
  }

  // Após resultado, aguarda 2,5s e reinicia scanner automaticamente
  useEffect(() => {
    if (resultado && !carregando) {
      const t = setTimeout(() => {
        setResultado(null)
        if (atividadeId) iniciarCamera()
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [resultado, carregando])

  // Limpa câmera ao desmontar
  useEffect(() => () => pararCamera(), [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Coluna principal — scanner */}
      <div className="lg:col-span-2 space-y-4">
        {/* Seleção de atividade */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <label className="label">Atividade / Projeto</label>
          <select
            className="input-field"
            value={atividadeId}
            onChange={e => { setAtividadeId(e.target.value); pararCamera(); setResultado(null) }}
          >
            <option value="">— Selecione uma atividade —</option>
            {atividades.map(a => (
              <option key={a.id} value={a.id}>{a.titulo} ({a.tipo})</option>
            ))}
          </select>
          {atividades.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Nenhuma atividade em andamento. Ative uma atividade na aba "Atividades e Projetos".</p>
          )}
        </div>

        {/* Área de scanner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-primary px-5 py-3">
            <h2 className="text-white font-bold text-sm">📷 Scanner de Presença — Sala Maker</h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Feedback de resultado */}
            {resultado && (
              <div className={`rounded-xl p-6 text-center border-2 ${resultado.ok
                ? 'bg-green-50 border-green-400 text-green-800'
                : 'bg-red-50 border-red-400 text-red-800'}`}
              >
                <div className="text-5xl mb-2">{resultado.ok ? '✅' : '❌'}</div>
                {resultado.aluno && <p className="font-bold text-xl mb-1">{resultado.aluno}</p>}
                <p className="font-medium">{resultado.mensagem}</p>
              </div>
            )}

            {carregando && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-blue-700">
                <div className="text-4xl mb-2 animate-pulse">🔍</div>
                <p>Registrando presença…</p>
              </div>
            )}

            {/* Viewfinder da câmera */}
            {!resultado && !carregando && (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay quando não está escaneando */}
                {!escaneando && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                    <div className="text-5xl mb-3">📷</div>
                    <p className="text-sm text-center px-4">
                      {!atividadeId
                        ? 'Selecione uma atividade acima para iniciar o scanner'
                        : 'Clique em "Iniciar Scanner" para abrir a câmera'}
                    </p>
                  </div>
                )}

                {/* Mira de leitura */}
                {escaneando && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-white/80 rounded-2xl animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {/* Erro de câmera */}
            {erroCamera && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{erroCamera}</p>
            )}

            {/* Botões de controle */}
            <div className="flex gap-3">
              {!escaneando ? (
                <button
                  onClick={iniciarCamera}
                  disabled={!atividadeId || carregando}
                  className="btn-primary flex-1 disabled:opacity-40"
                >
                  📷 Iniciar Scanner
                </button>
              ) : (
                <button onClick={pararCamera} className="btn-secondary flex-1">
                  ⏹ Parar Scanner
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coluna lateral — últimos registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden self-start">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
          <h3 className="font-bold text-textMain text-sm">🕐 Últimos Registros</h3>
        </div>
        {ultimosReg.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum registro ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {ultimosReg.map((r, i) => (
              <li key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${r.ok ? '' : 'opacity-60'}`}>
                <span>{r.ok ? '✅' : '❌'}</span>
                <span className="flex-1 truncate text-textMain font-medium">{r.aluno}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">{r.hora}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ============================================================
// REGISTRO MANUAL
// ============================================================
function RegistroManual({ isAdmin, usuario }) {
  const [atividades, setAtividades]   = useState([])
  const [atividadeId, setAtividadeId] = useState('')
  const [inscritos, setInscritos]     = useState([])   // lista de inscritos aprovados
  const [presencas, setPresencas]     = useState([])   // presenças já registradas hoje
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState('')
  const [sucesso, setSucesso]         = useState('')
  const [data, setData]               = useState(new Date().toISOString().split('T')[0])

  // Carrega atividades
  useEffect(() => {
    api.get('/sala-maker/atividades?status=em_andamento')
      .then(({ data }) => {
        setAtividades(data)
        if (data.length === 1) setAtividadeId(String(data[0].id))
      })
      .catch(() => {})
  }, [])

  // Ao selecionar atividade + data, carrega inscritos e presenças existentes
  useEffect(() => {
    if (!atividadeId || !data) return
    Promise.all([
      api.get('/sala-maker/inscricoes?status=aprovado'),
      api.get(`/sala-maker/presenca?atividade_id=${atividadeId}&data=${data}`),
    ])
      .then(([{ data: insc }, { data: pres }]) => {
        setInscritos(insc)
        // Monta conjunto de usuario_ids já com presença
        const jaPresentes = new Set(pres.map(p => p.usuario_id))
        setPresencas(jaPresentes)
      })
      .catch(() => {})
  }, [atividadeId, data])

  async function togglePresenca(usuarioId) {
    if (!atividadeId) return
    const jaPresente = presencas.has(usuarioId)
    if (jaPresente) {
      // Remoção de presença manual não implementada para evitar acidentes
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await api.post('/sala-maker/presenca/manual', {
        usuario_id:   usuarioId,
        atividade_id: Number(atividadeId),
        data,
      })
      setPresencas(prev => new Set([...prev, usuarioId]))
      setSucesso('Presença registrada!')
      setTimeout(() => setSucesso(''), 2000)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao registrar presença.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-4">
        <h2 className="font-bold text-textMain">✏️ Registro Manual de Presença</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Atividade</label>
            <select
              className="input-field"
              value={atividadeId}
              onChange={e => setAtividadeId(e.target.value)}
            >
              <option value="">— Selecione —</option>
              {atividades.map(a => (
                <option key={a.id} value={a.id}>{a.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data</label>
            <input
              type="date"
              className="input-field"
              value={data}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setData(e.target.value)}
            />
          </div>
        </div>

        {sucesso && <p className="text-green-700 bg-green-50 rounded-lg px-4 py-2 text-sm">{sucesso}</p>}
        {erro    && <p className="text-red-600  bg-red-50  rounded-lg px-4 py-2 text-sm">{erro}</p>}
      </div>

      {/* Lista de inscritos */}
      {atividadeId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <h3 className="font-bold text-textMain text-sm">
              Inscritos aprovados ({inscritos.length})
            </h3>
            <span className="text-xs text-gray-400">
              {presencas.size} presença{presencas.size !== 1 ? 's' : ''} registrada{presencas.size !== 1 ? 's' : ''}
            </span>
          </div>

          {inscritos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum inscrito aprovado encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {inscritos.map(ins => {
                const presente = presencas.has(ins.usuario_id)
                return (
                  <li key={ins.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${presente ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {ins.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-textMain text-sm truncate">{ins.nome}</p>
                      {ins.turma_nome && <p className="text-xs text-gray-400">{ins.turma_nome}</p>}
                    </div>
                    <button
                      onClick={() => togglePresenca(ins.usuario_id)}
                      disabled={presente || salvando}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0
                        ${presente
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-gray-100 hover:bg-primary hover:text-white text-gray-600'}`}
                    >
                      {presente ? '✅ Presente' : '+ Registrar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {!atividadeId && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">Selecione uma atividade para ver a lista de inscritos</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// RELATÓRIO DE PRESENÇA
// ============================================================
function Relatorio({ isAdmin, usuario }) {
  const [filtros, setFiltros] = useState({
    atividade_id: '',
    usuario_id:   '',
    data_inicio:  '',
    data_fim:     '',
  })
  const [atividades, setAtividades] = useState([])
  const [registros, setRegistros]   = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]             = useState('')
  const [buscado, setBuscado]       = useState(false)

  useEffect(() => {
    api.get('/sala-maker/atividades')
      .then(({ data }) => setAtividades(data))
      .catch(() => {})
  }, [])

  function atualizar(campo, valor) {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
  }

  async function buscar(e) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    setBuscado(false)
    try {
      const params = new URLSearchParams()
      if (filtros.atividade_id) params.set('atividade_id', filtros.atividade_id)
      if (filtros.usuario_id)   params.set('usuario_id',   filtros.usuario_id)
      if (filtros.data_inicio)  params.set('data_inicio',  filtros.data_inicio)
      if (filtros.data_fim)     params.set('data_fim',     filtros.data_fim)
      const { data } = await api.get(`/sala-maker/presenca?${params.toString()}`)
      setRegistros(data)
      setBuscado(true)
    } catch {
      setErro('Erro ao buscar registros.')
    } finally {
      setCarregando(false)
    }
  }

  function exportarCSV() {
    const linhas = [
      ['Aluno', 'Atividade', 'Data', 'Hora', 'Método'].join(';'),
      ...registros.map(r => [
        r.aluno_nome,
        r.atividade_titulo,
        new Date(r.registrado_em).toLocaleDateString('pt-BR'),
        new Date(r.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        r.metodo,
      ].join(';')),
    ]
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `presenca_sala_maker_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Agrupa por aluno para exibir taxa de presença
  const porAluno = registros.reduce((acc, r) => {
    const key = r.usuario_id
    if (!acc[key]) acc[key] = { nome: r.aluno_nome, total: 0 }
    acc[key].total++
    return acc
  }, {})

  return (
    <div className="space-y-5">

      {/* Filtros */}
      <form onSubmit={buscar} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-4">
        <h2 className="font-bold text-textMain">🔍 Filtrar Presenças</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Atividade</label>
            <select
              className="input-field"
              value={filtros.atividade_id}
              onChange={e => atualizar('atividade_id', e.target.value)}
            >
              <option value="">Todas</option>
              {atividades.map(a => (
                <option key={a.id} value={a.id}>{a.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data início</label>
            <input
              type="date"
              className="input-field"
              value={filtros.data_inicio}
              onChange={e => atualizar('data_inicio', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input
              type="date"
              className="input-field"
              value={filtros.data_fim}
              onChange={e => atualizar('data_fim', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={carregando} className="btn-primary w-full disabled:opacity-50">
              {carregando ? 'Buscando…' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
      </form>

      {/* Resultados */}
      {buscado && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-textMain">{registros.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total de registros</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-textMain">{Object.keys(porAluno).length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Alunos únicos</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-textMain">
                {registros.filter(r => r.metodo === 'qr').length}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Via QR Code</p>
            </div>
          </div>

          {/* Tabela */}
          {registros.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 border-2 border-dashed border-gray-200">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">Nenhum registro encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-textMain text-sm">{registros.length} registro{registros.length !== 1 ? 's' : ''}</h3>
                <button
                  onClick={exportarCSV}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  📥 Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Aluno</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Atividade</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Data / Hora</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Método</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {registros.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-textMain">{r.aluno_nome}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.atividade_titulo}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {new Date(r.registrado_em).toLocaleDateString('pt-BR')} {' '}
                          {new Date(r.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${r.metodo === 'qr' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {r.metodo === 'qr' ? '📷 QR Code' : '✏️ Manual'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!buscado && !carregando && (
        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">Use os filtros acima e clique em "Buscar" para ver os registros.</p>
        </div>
      )}
    </div>
  )
}
