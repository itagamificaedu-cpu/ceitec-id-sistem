// Dashboard de Rastreamento GPS de Alunos — Mobile Tracker
// Acesso: admin e secretaria apenas (professor bloqueado na rota e no backend)
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import api from '../api'

// Leaflet via CDN — carregado dinamicamente para não precisar de pacote npm
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

const CEITEC_LAT = -3.4970
const CEITEC_LNG = -39.5785

const STATUS_CONFIG = {
  na_escola:    { cor: '#00e676', label: 'Na Escola',      icone: '🟢' },
  a_caminho:    { cor: '#2196F3', label: 'A Caminho',      icone: '🔵' },
  em_casa:      { cor: '#ffd600', label: 'Em Casa',         icone: '🟡' },
  retornando:   { cor: '#2196F3', label: 'Retornando',      icone: '🔵' },
  offline:      { cor: '#ff1744', label: 'Offline',         icone: '🔴' },
  sem_celular:  { cor: '#757575', label: 'Sem Celular',     icone: '⚫' },
  desconhecido: { cor: '#ff9800', label: 'Desconhecido',    icone: '🟠' },
}

function tempoRelativo(iso) {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'agora'
  if (min < 60) return `há ${min}min`
  return `há ${Math.floor(min / 60)}h`
}

function horaFormatada(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function MobileTracker() {
  const [alunos, setAlunos]           = useState([])
  const [contagens, setContagens]     = useState({})
  const [alertas, setAlertas]         = useState([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [carregando, setCarregando]   = useState(true)
  const [abaAtiva, setAbaAtiva]       = useState('mapa') // 'mapa' | 'lista' | 'perfis'
  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [trajetoria, setTrajetoria]   = useState(null)
  const [dataHistorico, setDataHistorico] = useState(new Date().toISOString().split('T')[0])
  const [perfis, setPerfis]           = useState([])
  const [editandoPerfil, setEditandoPerfil] = useState(null)
  const [linkPwa, setLinkPwa]         = useState(null)
  const [salvando, setSalvando]       = useState(false)
  const [msgPerfil, setMsgPerfil]     = useState('')

  const mapRef     = useRef(null)
  const mapaObj    = useRef(null)
  const marcadores = useRef({})
  const socketRef  = useRef(null)
  const usuario    = JSON.parse(localStorage.getItem('usuario') || '{}')

  // Carrega Leaflet via CDN e inicializa o mapa
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = LEAFLET_CSS
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.onload = () => inicializarMapa()
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  function inicializarMapa() {
    if (!mapRef.current || mapaObj.current) return
    const L = window.L
    const mapa = L.map(mapRef.current, { zoomControl: true }).setView([CEITEC_LAT, CEITEC_LNG], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa)

    // Marcador fixo do CEITEC
    const iconCeitec = L.divIcon({
      className: '',
      html: `<div style="background:#f5a623;border:3px solid #0d1b2e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏫</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
    L.marker([CEITEC_LAT, CEITEC_LNG], { icon: iconCeitec })
      .addTo(mapa)
      .bindPopup('<b>CEITEC</b><br>Centro Educacional de Inovação e Tecnologia')

    // Geofence da escola (100m)
    L.circle([CEITEC_LAT, CEITEC_LNG], {
      radius: 100, color: '#00e676', fillColor: '#00e676',
      fillOpacity: 0.08, weight: 2, dashArray: '6,4',
    }).addTo(mapa)

    mapaObj.current = mapa
  }

  // Busca status geral e alertas
  const carregarStatus = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get('/mobile-tracker/status-geral'),
        api.get('/mobile-tracker/alertas'),
      ])
      setAlunos(r1.data.alunos)
      setContagens(r1.data.contagens)
      setAlertas(r2.data.alertas)
      atualizarMarcadores(r1.data.alunos)
    } catch (err) {
      console.error('Erro ao carregar tracker:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarStatus()
    const intervalo = setInterval(carregarStatus, 60000) // atualiza a cada 1 min como fallback
    return () => clearInterval(intervalo)
  }, [carregarStatus])

  // Carrega perfis quando aba muda
  useEffect(() => {
    if (abaAtiva === 'perfis') {
      api.get('/mobile-tracker/perfis').then(r => setPerfis(r.data)).catch(() => {})
    }
  }, [abaAtiva])

  // Conecta Socket.io para tempo real
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const socket = io(apiUrl, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('tracker:entrar', { escola_id: usuario.escola_id })
    })

    socket.on('tracker:localizacao', (dados) => {
      // Atualiza o aluno em tempo real na lista
      setAlunos(prev => prev.map(a =>
        a.id === dados.aluno_id
          ? { ...a, status_atual: dados.status, ultima_lat: dados.lat, ultima_lng: dados.lng,
              bateria_atual: dados.bateria, ultima_atualizacao: dados.timestamp }
          : a
      ))
      // Atualiza marcador no mapa
      atualizarMarcadorUnico(dados)
    })

    return () => socket.disconnect()
  }, [])

  // Atualiza todos os marcadores no mapa
  function atualizarMarcadores(lista) {
    if (!mapaObj.current) return
    lista.forEach(a => {
      if (a.ultima_lat && a.ultima_lng) {
        atualizarMarcadorUnico({
          aluno_id: a.id,
          nome: a.nome,
          turma: a.turma,
          lat: parseFloat(a.ultima_lat),
          lng: parseFloat(a.ultima_lng),
          status: a.status_atual,
          bateria: a.bateria_atual,
          timestamp: a.ultima_atualizacao,
          chegou_escola_hoje: a.chegou_escola_hoje,
          horario_chegada: a.horario_chegada,
        })
      }
      // Marcador da casa
      if (a.lat_casa && a.lng_casa && !marcadores.current[`casa-${a.id}`]) {
        const L = window.L
        const iconCasa = L.divIcon({
          className: '',
          html: `<div style="font-size:18px;opacity:0.6">🏠</div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        })
        const mc = L.marker([parseFloat(a.lat_casa), parseFloat(a.lng_casa)], { icon: iconCasa })
          .addTo(mapaObj.current)
          .bindPopup(`<b>Casa</b><br>${a.nome}<br>${a.bairro || ''}`)
        L.circle([parseFloat(a.lat_casa), parseFloat(a.lng_casa)], {
          radius: 50, color: '#2196F3', fillColor: '#2196F3',
          fillOpacity: 0.06, weight: 1, dashArray: '4,4',
        }).addTo(mapaObj.current)
        marcadores.current[`casa-${a.id}`] = mc
      }
    })
  }

  function atualizarMarcadorUnico(dados) {
    if (!mapaObj.current || !window.L) return
    const L = window.L
    const cfg = STATUS_CONFIG[dados.status] || STATUS_CONFIG.desconhecido

    const iconHtml = `<div style="background:${cfg.cor};border:2px solid #0d1b2e;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.5)">📱</div>`
    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14] })

    const popup = `
      <div style="min-width:160px;font-family:sans-serif">
        <b style="font-size:14px">${dados.nome}</b><br>
        <span style="color:#666;font-size:12px">${dados.turma || ''}</span><br>
        <span style="color:${cfg.cor};font-weight:600">${cfg.icone} ${cfg.label}</span><br>
        ${dados.chegou_escola_hoje ? `<span style="font-size:12px">Chegou: ${horaFormatada(dados.horario_chegada)}</span><br>` : ''}
        ${dados.bateria != null ? `<span style="font-size:12px">🔋 ${dados.bateria}%</span><br>` : ''}
        <span style="font-size:11px;color:#999">${tempoRelativo(dados.timestamp)}</span>
      </div>`

    if (marcadores.current[dados.aluno_id]) {
      marcadores.current[dados.aluno_id].setLatLng([dados.lat, dados.lng])
      marcadores.current[dados.aluno_id].setIcon(icon)
      marcadores.current[dados.aluno_id].getPopup().setContent(popup)
    } else {
      marcadores.current[dados.aluno_id] = L.marker([dados.lat, dados.lng], { icon })
        .addTo(mapaObj.current)
        .bindPopup(popup)
    }
  }

  // Carrega trajetória histórica de um aluno
  async function verTrajetoria(aluno) {
    setAlunoSelecionado(aluno)
    try {
      const r = await api.get(`/mobile-tracker/trajetoria/${aluno.id}?data=${dataHistorico}`)
      setTrajetoria(r.data)
      desenharTrajetoria(r.data.pontos)
    } catch (err) {
      console.error(err)
    }
  }

  function desenharTrajetoria(pontos) {
    if (!mapaObj.current || !window.L || !pontos?.length) return
    const L = window.L
    const coords = pontos.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)])
    L.polyline(coords, { color: '#f5a623', weight: 3, opacity: 0.8 }).addTo(mapaObj.current)
    mapaObj.current.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
  }

  // Salva perfil do aluno
  async function salvarPerfil(e) {
    e.preventDefault()
    setSalvando(true)
    setMsgPerfil('')
    const form = new FormData(e.target)
    const dados = Object.fromEntries(form.entries())
    dados.tem_celular = dados.tem_celular === 'on' ? true : false
    dados.consentimento_aceito = dados.consentimento_aceito === 'on' ? true : false
    try {
      await api.put(`/mobile-tracker/perfis/${editandoPerfil.id}`, dados)
      setMsgPerfil('Salvo com sucesso!')
      setEditandoPerfil(null)
      const r = await api.get('/mobile-tracker/perfis')
      setPerfis(r.data)
    } catch (err) {
      setMsgPerfil(err.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  // Gera link PWA para o aluno
  async function gerarLinkPwa(aluno_id) {
    try {
      const r = await api.get(`/mobile-tracker/link-pwa/${aluno_id}`)
      setLinkPwa(r.data)
    } catch (err) {
      alert('Erro ao gerar link')
    }
  }

  const alunosFiltrados = alunos.filter(a => {
    if (filtroStatus !== 'todos' && a.status_atual !== filtroStatus) return false
    if (filtroBusca && !a.nome.toLowerCase().includes(filtroBusca.toLowerCase()) &&
        !a.turma?.toLowerCase().includes(filtroBusca.toLowerCase())) return false
    return true
  })

  // ──────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────
  return (
    <div className="flex min-h-screen" style={{ background: '#0d1b2e', color: '#fff' }}>
      <Navbar />

      <main className="flex-1 lg:ml-64 flex flex-col" style={{ minHeight: '100vh' }}>

        {/* Header */}
        <div className="flex flex-col gap-2 px-4 pt-20 pb-3 lg:pt-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-black" style={{ color: '#f5a623' }}>📍 CEITEC MOBILE TRACKER</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Monitoramento GPS de alunos em tempo real</p>
            </div>
            <div className="flex gap-2">
              {['mapa','lista','perfis'].map(aba => (
                <button key={aba} onClick={() => setAbaAtiva(aba)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: abaAtiva === aba ? '#f5a623' : 'rgba(255,255,255,0.08)',
                    color: abaAtiva === aba ? '#0d1b2e' : 'rgba(255,255,255,0.7)',
                  }}>
                  {aba === 'mapa' ? '🗺️ Mapa' : aba === 'lista' ? '📋 Lista' : '⚙️ Perfis'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            {[
              { label: 'Cadastrados', valor: contagens.total || 0, cor: '#fff' },
              { label: 'Online', valor: contagens.online || 0, cor: '#00e676' },
              { label: 'Na Escola', valor: contagens.na_escola || 0, cor: '#00e676' },
              { label: 'Offline', valor: contagens.offline || 0, cor: '#ff1744' },
            ].map(m => (
              <div key={m.label} className="rounded-xl px-3 py-2 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-2xl font-black" style={{ color: m.cor }}>{m.valor}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {alertas.map((al, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(255,23,68,0.15)', border: '1px solid rgba(255,23,68,0.3)', color: '#ff6b6b' }}>
                  ⚠️ {al.mensagem}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ABA MAPA ── */}
        {abaAtiva === 'mapa' && (
          <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Painel lateral */}
            <div className="w-72 flex flex-col overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                  placeholder="Buscar aluno ou turma..."
                  className="w-full px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {['todos','na_escola','a_caminho','em_casa','offline'].map(s => (
                    <button key={s} onClick={() => setFiltroStatus(s)}
                      className="px-2 py-0.5 rounded-full text-xs transition-all"
                      style={{
                        background: filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') + '33' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') : 'rgba(255,255,255,0.1)'}`,
                        color: filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') : 'rgba(255,255,255,0.5)',
                      }}>
                      {s === 'todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {carregando ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando...</div>
                ) : alunosFiltrados.map(a => {
                  const cfg = STATUS_CONFIG[a.status_atual] || STATUS_CONFIG.desconhecido
                  return (
                    <div key={a.id}
                      onClick={() => {
                        if (a.ultima_lat && mapaObj.current) {
                          mapaObj.current.setView([parseFloat(a.ultima_lat), parseFloat(a.ultima_lng)], 16)
                          marcadores.current[a.id]?.openPopup()
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{ background: cfg.cor + '22', border: `1px solid ${cfg.cor}`, color: cfg.cor }}>
                        {a.nome?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{a.nome}</div>
                        <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {a.turma} • {tempoRelativo(a.ultima_atualizacao)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-semibold" style={{ color: cfg.cor }}>{cfg.icone}</div>
                        {a.bateria_atual != null && (
                          <div className="text-xs" style={{ color: a.bateria_atual < 20 ? '#ff1744' : 'rgba(255,255,255,0.3)' }}>
                            🔋{a.bateria_atual}%
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
                <div className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>LEGENDA</div>
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'retornando').map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: v.cor }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 relative">
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

              {/* Controles de histórico */}
              <div className="absolute top-3 right-3 z-50 flex flex-col gap-2">
                <div className="rounded-xl p-3 text-sm" style={{ background: '#0d1b2e', border: '1px solid rgba(255,165,35,0.3)' }}>
                  <div className="font-semibold mb-1" style={{ color: '#f5a623', fontSize: '11px' }}>HISTÓRICO</div>
                  <input type="date" value={dataHistorico} onChange={e => setDataHistorico(e.target.value)}
                    className="block w-full px-2 py-1 rounded text-xs mb-1"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
                  {alunoSelecionado && (
                    <button onClick={() => verTrajetoria(alunoSelecionado)}
                      className="w-full py-1 rounded text-xs font-semibold"
                      style={{ background: '#f5a623', color: '#0d1b2e' }}>
                      Ver trajeto de {alunoSelecionado.nome.split(' ')[0]}
                    </button>
                  )}
                  {!alunoSelecionado && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Clique num aluno para ver trajeto</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA LISTA ── */}
        {abaAtiva === 'lista' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-2 mb-4 flex-wrap">
                <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                  placeholder="Buscar aluno ou turma..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm min-w-48"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                {['todos','na_escola','a_caminho','em_casa','offline'].map(s => (
                  <button key={s} onClick={() => setFiltroStatus(s)}
                    className="px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') + '22' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') : 'rgba(255,255,255,0.1)'}`,
                      color: filtroStatus === s ? (STATUS_CONFIG[s]?.cor || '#f5a623') : 'rgba(255,255,255,0.5)',
                    }}>
                    {s === 'todos' ? 'Todos' : STATUS_CONFIG[s]?.icone + ' ' + STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2">
                {alunosFiltrados.map(a => {
                  const cfg = STATUS_CONFIG[a.status_atual] || STATUS_CONFIG.desconhecido
                  return (
                    <div key={a.id} className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
                        style={{ background: cfg.cor + '22', border: `2px solid ${cfg.cor}`, color: cfg.cor }}>
                        {a.nome?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{a.nome}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {a.turma} • {a.bairro || 'Bairro não cadastrado'}
                        </div>
                        {a.chegou_escola_hoje ? (
                          <div className="text-xs mt-0.5" style={{ color: '#00e676' }}>
                            Chegou {horaFormatada(a.horario_chegada)} {a.horario_saida ? `• Saiu ${horaFormatada(a.horario_saida)}` : ''}
                          </div>
                        ) : (
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Não chegou hoje</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: cfg.cor + '22', color: cfg.cor, border: `1px solid ${cfg.cor}` }}>
                          {cfg.icone} {cfg.label}
                        </span>
                        {a.bateria_atual != null && (
                          <span className="text-xs" style={{ color: a.bateria_atual < 20 ? '#ff1744' : 'rgba(255,255,255,0.3)' }}>
                            🔋 {a.bateria_atual}%
                          </span>
                        )}
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {tempoRelativo(a.ultima_atualizacao)}
                        </span>
                      </div>
                      <button onClick={() => { setAlunoSelecionado(a); verTrajetoria(a); setAbaAtiva('mapa') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold ml-2"
                        style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)' }}>
                        Ver mapa
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA PERFIS ── */}
        {abaAtiva === 'perfis' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#f5a623' }}>Cadastro de Perfis de Rastreamento</h2>

              {/* Modal de edição de perfil */}
              {editandoPerfil && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto max-h-screen"
                    style={{ background: '#0d1b2e', border: '1px solid rgba(245,166,35,0.3)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg" style={{ color: '#f5a623' }}>Perfil — {editandoPerfil.nome}</h3>
                      <button onClick={() => setEditandoPerfil(null)} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '20px' }}>×</button>
                    </div>
                    <form onSubmit={salvarPerfil} className="flex flex-col gap-3">
                      {[
                        { name: 'endereco_residencia', label: 'Endereço da residência', defaultValue: editandoPerfil.endereco_residencia },
                        { name: 'bairro', label: 'Bairro', defaultValue: editandoPerfil.bairro },
                        { name: 'referencia_local', label: 'Ponto de referência', defaultValue: editandoPerfil.referencia_local },
                        { name: 'lat_casa', label: 'Latitude da casa (ex: -3.4970)', defaultValue: editandoPerfil.lat_casa },
                        { name: 'lng_casa', label: 'Longitude da casa (ex: -39.5785)', defaultValue: editandoPerfil.lng_casa },
                        { name: 'numero_celular', label: 'Número do celular', defaultValue: editandoPerfil.numero_celular },
                        { name: 'modelo_celular', label: 'Modelo do celular', defaultValue: editandoPerfil.modelo_celular },
                        { name: 'tempo_medio_trajeto_minutos', label: 'Tempo médio de trajeto (minutos)', defaultValue: editandoPerfil.tempo_medio_trajeto_minutos || 30 },
                      ].map(campo => (
                        <div key={campo.name}>
                          <label className="text-xs block mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{campo.label}</label>
                          <input name={campo.name} defaultValue={campo.defaultValue || ''}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs block mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Meio de transporte</label>
                        <select name="meio_transporte" defaultValue={editandoPerfil.meio_transporte || 'a_pe'}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: '#1a2a40', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                          <option value="a_pe">A pé</option>
                          <option value="bicicleta">Bicicleta</option>
                          <option value="moto">Moto</option>
                          <option value="carro">Carro/Carona</option>
                          <option value="onibus">Ônibus</option>
                          <option value="van_escolar">Van Escolar</option>
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" name="tem_celular" defaultChecked={editandoPerfil.tem_celular !== 0} />
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Tem celular</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" name="consentimento_aceito" defaultChecked={!!editandoPerfil.consentimento_aceito} />
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Consentimento aceito</span>
                        </label>
                      </div>
                      {msgPerfil && (
                        <div className="text-sm py-2 px-3 rounded-lg"
                          style={{ background: msgPerfil.includes('ucesso') ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
                                   color: msgPerfil.includes('ucesso') ? '#00e676' : '#ff6b6b' }}>
                          {msgPerfil}
                        </div>
                      )}
                      <button type="submit" disabled={salvando}
                        className="py-2.5 rounded-xl font-semibold text-sm"
                        style={{ background: '#f5a623', color: '#0d1b2e', opacity: salvando ? 0.6 : 1 }}>
                        {salvando ? 'Salvando...' : 'Salvar Perfil'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal link PWA */}
              {linkPwa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <div className="w-full max-w-sm rounded-2xl p-6 text-center"
                    style={{ background: '#0d1b2e', border: '1px solid rgba(245,166,35,0.3)' }}>
                    <div className="text-4xl mb-3">📱</div>
                    <h3 className="font-bold text-lg mb-1" style={{ color: '#f5a623' }}>Link do App — {linkPwa.aluno}</h3>
                    <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Envie este link para o aluno. Ele deve abrir no celular Android via Chrome.</p>
                    <div className="rounded-lg p-3 mb-3 text-left break-all text-xs"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#00e676' }}>
                      {linkPwa.link}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(linkPwa.link)}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm mb-2"
                      style={{ background: '#f5a623', color: '#0d1b2e' }}>
                      Copiar Link
                    </button>
                    <button onClick={() => setLinkPwa(null)}
                      className="w-full py-2 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabela de perfis */}
              <div className="grid gap-3">
                {perfis.map(p => (
                  <div key={p.id} className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg"
                      style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623' }}>
                      {p.nome?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{p.nome}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {p.turma} • {p.bairro || 'Bairro não cadastrado'}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: p.tem_celular ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
                                   color: p.tem_celular ? '#00e676' : '#ff6b6b' }}>
                          {p.tem_celular ? '📱 Com celular' : '❌ Sem celular'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: p.consentimento_aceito ? 'rgba(0,230,118,0.1)' : 'rgba(255,214,0,0.1)',
                                   color: p.consentimento_aceito ? '#00e676' : '#ffd600' }}>
                          {p.consentimento_aceito ? '✅ Consentiu' : '⏳ Sem consentimento'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => setEditandoPerfil(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)' }}>
                        Editar Perfil
                      </button>
                      <button onClick={() => gerarLinkPwa(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' }}>
                        Gerar Link PWA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
