import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'

const WA_NUMERO = '5588988411890'
const WA_MSG = encodeURIComponent('Olá! Quero garantir minha vaga no curso Alunos Maker Não Tiram Férias! Pode me enviar mais informações?')
const WA_LINK = `https://wa.me/${WA_NUMERO}?text=${WA_MSG}`
const CHAVE = 'gamificaedu_secreto_2026'

const URL_LANDING = window.location.origin + '/curso-ferias.html'
const URL_INSCRICAO = window.location.origin + '/inscricao/formulario/'

const DIAS_INFO = [
  { dia: 1, icon: '🔬', titulo: 'Mundo Maker & Eletrônica Básica' },
  { dia: 2, icon: '⚡', titulo: 'Arduino na Prática' },
  { dia: 3, icon: '🤖', titulo: 'Robótica e Movimento' },
  { dia: 4, icon: '📡', titulo: 'ESP32 & Controle Sem Fio' },
  { dia: 5, icon: '🏆', titulo: 'Demo Day — Mostra Maker' },
]

function InfoCard({ icon, label, valor, cor }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 flex items-center gap-3 ${cor}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-800">{valor}</p>
      </div>
    </div>
  )
}

/* ── Carteirinha impressível ──────────────────────────────────────────────── */
function Carteirinha({ aluno, onFechar }) {
  const iniciais = aluno.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const corTurno = aluno.turno_val === 'manha' ? '#F5A623' : '#6366F1'

  function imprimir() {
    const conteudo = document.getElementById('carteirinha-print').innerHTML
    const janela = window.open('', '_blank', 'width=420,height=680')
    janela.document.write(`
      <!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Carteirinha — ${aluno.nome}</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Space Grotesk', sans-serif; }
        @media print { body { min-height: unset; } }
      </style>
      </head><body>${conteudo}</body></html>
    `)
    janela.document.close()
    setTimeout(() => { janela.print(); janela.close() }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">🪪 Carteirinha do Aluno</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {/* Carteirinha visual */}
        <div className="p-6" id="carteirinha-print">
          <div style={{
            width: '340px', borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {/* Topo */}
            <div style={{
              background: 'linear-gradient(135deg, #0A0E1A 0%, #1a2040 100%)',
              padding: '16px 20px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ color: '#F5A623', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  ITA Tecnologia Educacional
                </p>
                <p style={{ color: '#C8D0E8', fontSize: '11px', marginTop: '2px' }}>
                  Alunos Maker Não Tiram Férias
                </p>
              </div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px',
              }}>🤖</div>
            </div>

            {/* Corpo */}
            <div style={{ background: '#fff', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                {/* Avatar */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '12px',
                  background: corTurno + '22',
                  border: `2px solid ${corTurno}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 800, color: corTurno, flexShrink: 0,
                }}>
                  {iniciais}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: '15px', color: '#0A0E1A', lineHeight: 1.2 }}>
                    {aluno.nome}
                  </p>
                  <p style={{ fontSize: '11px', color: '#8A95B5', marginTop: '3px' }}>
                    {aluno.escola}
                  </p>
                  <p style={{ fontSize: '11px', color: '#8A95B5' }}>{aluno.serie}</p>
                </div>
              </div>

              {/* Linha de dados */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div style={{
                  flex: 1, background: '#F8F9FA', borderRadius: '8px', padding: '8px',
                  border: '1px solid #E5E7EB', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', color: '#8A95B5', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Turno</p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: corTurno, marginTop: '2px' }}>
                    {aluno.turno_val === 'manha' ? '☀️ Manhã' : '🌙 Tarde'}
                  </p>
                </div>
                <div style={{
                  flex: 1, background: '#F8F9FA', borderRadius: '8px', padding: '8px',
                  border: '1px solid #E5E7EB', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '9px', color: '#8A95B5', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Presenças</p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#22C55E', marginTop: '2px' }}>
                    {aluno.total_presencas}/5 dias
                  </p>
                </div>
              </div>

              {/* Código + QR Code */}
              <div style={{
                background: '#0A0E1A', borderRadius: '8px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: '9px', color: '#8A95B580', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Código de Inscrição</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: '#F5A623', letterSpacing: '3px' }}>
                    {aluno.codigo}
                  </p>
                  <p style={{ fontSize: '8px', color: '#8A95B550', marginTop: '3px' }}>Escaneie para registrar presença</p>
                </div>
                {/* QR Code gerado a partir do UUID completo */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${aluno.id}&bgcolor=0A0E1A&color=F5A623&margin=4`}
                  alt={`QR Code ${aluno.codigo}`}
                  style={{ width: '72px', height: '72px', borderRadius: '6px', border: '1px solid rgba(245,166,35,0.3)' }}
                />
              </div>
            </div>

            {/* Rodapé */}
            <div style={{
              background: '#F8F9FA', padding: '8px 20px',
              borderTop: '1px solid #E5E7EB', textAlign: 'center'
            }}>
              <p style={{ fontSize: '9px', color: '#8A95B5', letterSpacing: '1px' }}>
                itatecnologiaeducacional.tech · Julho 2026 · Itapipoca–CE
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={imprimir}
            className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            🖨️ Imprimir Carteirinha
          </button>
          <button onClick={onFechar} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function CursoFerias() {
  const [copiado, setCopiado] = useState(false)
  const [aba, setAba] = useState('inscritos')

  // ── Inscritos ──────────────────────────────────────────────────────────────
  const [inscritos, setInscritos] = useState([])
  const [statsInscritos, setStatsInscritos] = useState(null)
  const [loadingInscritos, setLoadingInscritos] = useState(false)
  const [marcandoPago, setMarcandoPago] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [editando, setEditando] = useState(null)
  const [dadosEdicao, setDadosEdicao] = useState({})
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [emitindoCert, setEmitindoCert] = useState(null)

  // ── Presença ───────────────────────────────────────────────────────────────
  const [diaPresenca, setDiaPresenca] = useState(1)
  const [turnoPresenca, setTurnoPresenca] = useState('')
  const [alunosPresenca, setAlunosPresenca] = useState([])
  const [resumoPresenca, setResumoPresenca] = useState(null)
  const [loadingPresenca, setLoadingPresenca] = useState(false)
  const [marcandoPresenca, setMarcandoPresenca] = useState({}) // { id: true }
  const [resumoDias, setResumoDias] = useState([])

  // ── Carteirinhas ───────────────────────────────────────────────────────────
  const [carteirinhas, setCarteirinhas] = useState([])
  const [loadingCarteirinhas, setLoadingCarteirinhas] = useState(false)
  const [carteirinhaSelecionada, setCarteirinhaSelecionada] = useState(null)
  const [filtroTurnoCart, setFiltroTurnoCart] = useState('')

  // ── Funções: Inscritos ─────────────────────────────────────────────────────
  async function carregarInscritos() {
    setLoadingInscritos(true)
    try {
      const res = await fetch(`/inscricao/api/inscricoes/?chave=${CHAVE}`)
      const data = await res.json()
      setInscritos(data.inscricoes || [])
      setStatsInscritos(data.stats || null)
    } catch (e) { console.error(e) }
    finally { setLoadingInscritos(false) }
  }

  async function marcarComoPago(id) {
    setMarcandoPago(id)
    try {
      await fetch(`/inscricao/api/inscricao/${id}/pagar/?chave=${CHAVE}`, { method: 'POST' })
      await carregarInscritos()
    } catch (e) { console.error(e) }
    setMarcandoPago(null)
  }

  async function excluirInscricao(id, nome) {
    if (!window.confirm(`Excluir a inscrição de ${nome}? Esta ação não pode ser desfeita.`)) return
    try {
      await fetch(`/inscricao/api/inscricao/${id}/excluir/?chave=${CHAVE}`, { method: 'DELETE' })
      await carregarInscritos()
    } catch (e) { console.error(e) }
  }

  async function emitirCertificado(id, nome) {
    if (!window.confirm(`Emitir e enviar certificado para ${nome}?`)) return
    setEmitindoCert(id)
    try {
      const res = await fetch(`/inscricao/api/inscricao/${id}/certificado/?chave=${CHAVE}`, { method: 'POST' })
      const data = await res.json()
      if (data.url_download) {
        window.open(data.url_download, '_blank')
        await carregarInscritos()
      }
    } catch (e) { console.error(e) }
    setEmitindoCert(null)
  }

  function abrirEdicao(inscrito) {
    setEditando(inscrito.id)
    setDadosEdicao({
      nome_completo: inscrito.nome,
      escola: inscrito.escola,
      serie: inscrito.serie,
      turno: inscrito.turno === 'Manhã (8h–12h)' ? 'manha' : 'tarde',
      nome_responsavel: inscrito.responsavel,
      telefone: inscrito.telefone,
      email: inscrito.email,
      status: inscrito.status,
    })
  }

  async function salvarEdicao() {
    setSalvandoEdicao(true)
    try {
      await fetch(`/inscricao/api/inscricao/${editando}/editar/?chave=${CHAVE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosEdicao),
      })
      setEditando(null)
      await carregarInscritos()
    } catch (e) { console.error(e) }
    setSalvandoEdicao(false)
  }

  // ── Funções: Presença ──────────────────────────────────────────────────────
  async function carregarPresencas() {
    setLoadingPresenca(true)
    try {
      const params = new URLSearchParams({ chave: CHAVE, dia: diaPresenca })
      if (turnoPresenca) params.set('turno', turnoPresenca)
      const res = await fetch(`/inscricao/api/presencas/?${params}`)
      const data = await res.json()
      setAlunosPresenca(data.alunos || [])
      setResumoPresenca(data.resumo || null)
    } catch (e) { console.error(e) }
    finally { setLoadingPresenca(false) }
  }

  async function carregarResumoDias() {
    try {
      const res = await fetch(`/inscricao/api/presencas/resumo/?chave=${CHAVE}`)
      const data = await res.json()
      setResumoDias(data.resumo || [])
    } catch (e) { console.error(e) }
  }

  async function togglePresenca(aluno, novoStatus) {
    setMarcandoPresenca(p => ({ ...p, [aluno.id]: true }))
    try {
      await fetch(`/inscricao/api/presencas/registrar/?chave=${CHAVE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_inscricao: aluno.id,
          dia: diaPresenca,
          presente: novoStatus,
          registrado_por: 'painel-ita',
        }),
      })
      setAlunosPresenca(lista =>
        lista.map(a =>
          a.id === aluno.id ? { ...a, presente: novoStatus, registrado: true } : a
        )
      )
      carregarResumoDias()
    } catch (e) { console.error(e) }
    setMarcandoPresenca(p => { const n = { ...p }; delete n[aluno.id]; return n })
  }

  async function marcarTodos(presente) {
    const naoRegistrados = alunosPresenca.filter(a => a.presente === null || a.presente === !presente)
    for (const aluno of naoRegistrados) {
      await togglePresenca(aluno, presente)
    }
  }

  // ── Funções: Carteirinhas ──────────────────────────────────────────────────
  async function carregarCarteirinhas() {
    setLoadingCarteirinhas(true)
    try {
      const res = await fetch(`/inscricao/api/carteirinhas/?chave=${CHAVE}`)
      const data = await res.json()
      setCarteirinhas(data.alunos || [])
    } catch (e) { console.error(e) }
    finally { setLoadingCarteirinhas(false) }
  }

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (aba === 'inscritos') carregarInscritos()
    if (aba === 'presenca') { carregarPresencas(); carregarResumoDias() }
    if (aba === 'carteirinhas') carregarCarteirinhas()
  }, [aba])

  useEffect(() => {
    if (aba === 'presenca') carregarPresencas()
  }, [diaPresenca, turnoPresenca])

  function copiarLink() {
    navigator.clipboard.writeText(URL_LANDING).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🚀</span>
                <h1 className="text-2xl font-bold text-textMain">Curso de Férias</h1>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">● AO VIVO</span>
              </div>
              <p className="text-sm text-gray-400">Alunos Maker Não Tiram Férias — Gerenciamento completo</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={copiarLink} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {copiado ? '✅ Copiado!' : '🔗 Copiar Link'}
              </button>
              <a href={URL_INSCRICAO} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors">
                🚀 Página de Inscrição
              </a>
              <button onClick={() => window.open(WA_LINK, '_blank')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#25D366' }}>
                <span>📱</span> WhatsApp
              </button>
            </div>
          </div>

          {/* Cards de info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <InfoCard icon="📅" label="Duração" valor="5 dias" cor="border-blue-500" />
            <InfoCard icon="💰" label="Valor" valor="R$ 199" cor="border-orange-500" />
            <InfoCard icon="🎯" label="Vagas" valor="30 alunos" cor="border-red-500" />
            <InfoCard icon="📆" label="Inscrições até" valor="30/06/2026" cor="border-green-500" />
          </div>

          {/* Abas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {[
                { id: 'inscritos', label: '👥 Inscritos' },
                { id: 'presenca', label: '📋 Presença' },
                { id: 'carteirinhas', label: '🪪 Carteirinhas' },
                { id: 'preview', label: '👁️ Preview' },
                { id: 'info', label: '📋 Programa' },
                { id: 'compartilhar', label: '📤 Compartilhar' },
              ].map(a => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    aba === a.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>

            {/* ── ABA: INSCRITOS ─────────────────────────────────────────── */}
            {aba === 'inscritos' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-semibold text-textMain text-base">👥 Pessoas Inscritas</h3>
                  <button onClick={carregarInscritos}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    🔄 Atualizar
                  </button>
                </div>

                {statsInscritos && (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-600">{statsInscritos.total}</p>
                      <p className="text-xs text-blue-500 font-semibold mt-0.5">Total</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-600">{statsInscritos.pagas}</p>
                      <p className="text-xs text-green-500 font-semibold mt-0.5">Confirmadas</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-orange-500">{statsInscritos.pendentes}</p>
                      <p className="text-xs text-orange-400 font-semibold mt-0.5">Aguardando</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-red-500">{statsInscritos.vagas_restantes}</p>
                      <p className="text-xs text-red-400 font-semibold mt-0.5">Vagas Restantes</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-emerald-600">R$ {Number(statsInscritos.receita).toFixed(0)}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">Receita</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-4 flex-wrap">
                  {[
                    { v: 'todos', label: 'Todos' },
                    { v: 'pago', label: '✅ Confirmados' },
                    { v: 'aguardando_pagamento', label: '⏳ Aguardando' },
                    { v: 'cancelado', label: '❌ Cancelados' },
                  ].map(f => (
                    <button key={f.v} onClick={() => setFiltroStatus(f.v)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filtroStatus === f.v
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {loadingInscritos ? (
                  <div className="text-center py-12 text-gray-400">Carregando...</div>
                ) : inscritos.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-sm">Nenhuma inscrição ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aluno</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Escola</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Turno</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Data</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {inscritos
                          .filter(i => filtroStatus === 'todos' || i.status === filtroStatus || (filtroStatus === 'pago' && i.status === 'certificado_emitido'))
                          .map(inscrito => (
                          <tr key={inscrito.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                {inscrito.codigo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800 leading-tight">{inscrito.nome}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{inscrito.responsavel} · {inscrito.email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                              {inscrito.escola}<br/>
                              <span className="text-xs text-gray-400">{inscrito.serie}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{inscrito.turno}</td>
                            <td className="px-4 py-3">
                              {inscrito.status === 'pago' || inscrito.status === 'certificado_emitido' ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                  {inscrito.status === 'certificado_emitido' ? '🏆 Certificado' : '✅ Pago'}
                                </span>
                              ) : inscrito.status === 'aguardando_pagamento' ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">⏳ Aguardando</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">❌ {inscrito.status_display}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{inscrito.data_inscricao}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a href={`https://wa.me/55${inscrito.telefone.replace(/\D/g, '')}`}
                                  target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg text-white text-xs"
                                  style={{ backgroundColor: '#25D366' }} title="WhatsApp">
                                  📱
                                </a>
                                {inscrito.status === 'aguardando_pagamento' && (
                                  <button onClick={() => marcarComoPago(inscrito.id)} disabled={marcandoPago === inscrito.id}
                                    className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                    title="Marcar como pago">
                                    {marcandoPago === inscrito.id ? '...' : '✓ Pago'}
                                  </button>
                                )}
                                {(inscrito.status === 'pago' || inscrito.status === 'certificado_emitido') && (
                                  <button onClick={() => emitirCertificado(inscrito.id, inscrito.nome)}
                                    disabled={emitindoCert === inscrito.id}
                                    className={`px-2 py-1 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${
                                      inscrito.certificado_gerado ? 'bg-purple-500 hover:bg-purple-600' : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                                    title={inscrito.certificado_gerado ? 'Baixar certificado' : 'Emitir certificado'}>
                                    {emitindoCert === inscrito.id ? '...' : inscrito.certificado_gerado ? '📜 Baixar' : '🏆 Emitir'}
                                  </button>
                                )}
                                <button onClick={() => abrirEdicao(inscrito)}
                                  className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors" title="Editar">
                                  ✏️
                                </button>
                                <button onClick={() => excluirInscricao(inscrito.id, inscrito.nome)}
                                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors" title="Excluir">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: PRESENÇA ─────────────────────────────────────────── */}
            {aba === 'presenca' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <h3 className="font-semibold text-textMain text-base">📋 Chamada Diária</h3>
                  <button onClick={carregarPresencas}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    🔄 Atualizar
                  </button>
                </div>

                {/* Resumo dos 5 dias */}
                {resumoDias.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {resumoDias.map(d => (
                      <button key={d.dia} onClick={() => setDiaPresenca(d.dia)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          diaPresenca === d.dia
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}>
                        <p className={`text-xs font-bold uppercase tracking-wide ${diaPresenca === d.dia ? 'text-orange-500' : 'text-gray-500'}`}>
                          {DIAS_INFO[d.dia - 1].icon} Dia {d.dia}
                        </p>
                        <p className="text-xl font-black text-green-600 mt-1">{d.presentes}</p>
                        <p className="text-xs text-gray-400">/{d.total} alunos</p>
                        {d.total > 0 && (
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${d.pct}%` }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Seletor de turno e ações em lote */}
                <div className="flex gap-3 mb-5 flex-wrap items-center">
                  <div className="flex gap-2">
                    {[
                      { v: '', label: 'Todos os turnos' },
                      { v: 'manha', label: '☀️ Manhã' },
                      { v: 'tarde', label: '🌙 Tarde' },
                    ].map(t => (
                      <button key={t.v} onClick={() => setTurnoPresenca(t.v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          turnoPresenca === t.v
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => marcarTodos(true)}
                      className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
                      ✅ Todos Presentes
                    </button>
                    <button onClick={() => marcarTodos(false)}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                      ❌ Todos Ausentes
                    </button>
                  </div>
                </div>

                {/* Título do dia selecionado */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-2xl">{DIAS_INFO[diaPresenca - 1].icon}</span>
                  <div>
                    <p className="font-bold text-orange-600 text-sm">Dia {diaPresenca} — {DIAS_INFO[diaPresenca - 1].titulo}</p>
                    {resumoPresenca && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ✅ {resumoPresenca.presentes} presentes · ❌ {resumoPresenca.ausentes} ausentes · ⬜ {resumoPresenca.nao_registrados} não registrados
                      </p>
                    )}
                  </div>
                </div>

                {loadingPresenca ? (
                  <div className="text-center py-12 text-gray-400">Carregando...</div>
                ) : alunosPresenca.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">Nenhum aluno confirmado ainda.</p>
                    <p className="text-xs mt-1">Apenas alunos com pagamento confirmado aparecem aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alunosPresenca.map(aluno => (
                      <div key={aluno.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          aluno.presente === true
                            ? 'border-green-200 bg-green-50'
                            : aluno.presente === false
                              ? 'border-red-100 bg-red-50/50'
                              : 'border-gray-100 bg-white'
                        }`}>
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          aluno.turno_val === 'manha' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {aluno.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{aluno.nome}</p>
                          <p className="text-xs text-gray-400 truncate">{aluno.escola} · {aluno.serie} · {aluno.turno}</p>
                        </div>
                        {/* Badge código */}
                        <span className="font-mono text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded hidden sm:block">
                          {aluno.codigo}
                        </span>
                        {/* Botões de presença */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => togglePresenca(aluno, true)}
                            disabled={!!marcandoPresenca[aluno.id]}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                              aluno.presente === true
                                ? 'bg-green-500 text-white shadow-sm scale-105'
                                : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                            }`}>
                            {marcandoPresenca[aluno.id] ? '...' : '✅'}
                          </button>
                          <button
                            onClick={() => togglePresenca(aluno, false)}
                            disabled={!!marcandoPresenca[aluno.id]}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                              aluno.presente === false
                                ? 'bg-red-500 text-white shadow-sm scale-105'
                                : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                            }`}>
                            {marcandoPresenca[aluno.id] ? '...' : '❌'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: CARTEIRINHAS ─────────────────────────────────────── */}
            {aba === 'carteirinhas' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <h3 className="font-semibold text-textMain text-base">🪪 Carteirinhas dos Alunos</h3>
                  <div className="flex gap-2">
                    {[
                      { v: '', label: 'Todos' },
                      { v: 'manha', label: '☀️ Manhã' },
                      { v: 'tarde', label: '🌙 Tarde' },
                    ].map(t => (
                      <button key={t.v} onClick={() => setFiltroTurnoCart(t.v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          filtroTurnoCart === t.v
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Clique em um aluno para visualizar e imprimir a carteirinha individual.
                  Apenas alunos com pagamento confirmado são exibidos.
                </p>

                {loadingCarteirinhas ? (
                  <div className="text-center py-12 text-gray-400">Carregando...</div>
                ) : carteirinhas.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">🪪</p>
                    <p className="text-sm">Nenhum aluno confirmado ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {carteirinhas
                      .filter(a => !filtroTurnoCart || a.turno_val === filtroTurnoCart)
                      .map(aluno => {
                        const iniciais = aluno.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
                        const corTurno = aluno.turno_val === 'manha' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                        return (
                          <button key={aluno.id} onClick={() => setCarteirinhaSelecionada(aluno)}
                            className="text-left p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 flex-shrink-0 ${corTurno}`}>
                                {iniciais}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-sm leading-tight truncate">{aluno.nome}</p>
                                <p className="text-xs text-gray-400 truncate">{aluno.serie}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                {aluno.codigo}
                              </span>
                              <span className="text-xs text-green-600 font-semibold">
                                {aluno.total_presencas}/5 ✅
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 truncate">{aluno.escola}</p>
                            <p className="text-xs font-semibold mt-1 group-hover:text-orange-500 transition-colors text-gray-400">
                              Clique para ver carteirinha →
                            </p>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: PREVIEW ──────────────────────────────────────────── */}
            {aba === 'preview' && (
              <div>
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono border border-gray-200 truncate">
                    {URL_LANDING}
                  </div>
                  <button onClick={() => window.open(URL_LANDING, '_blank')}
                    className="text-xs text-primary font-medium hover:underline whitespace-nowrap">
                    Abrir ↗
                  </button>
                </div>
                <iframe src={URL_LANDING} title="Landing Page" className="w-full"
                  style={{ height: '700px', border: 'none' }} loading="lazy" />
              </div>
            )}

            {/* ── ABA: PROGRAMA ──────────────────────────────────────────── */}
            {aba === 'info' && (
              <div className="p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-textMain mb-4 text-base">📚 Programa do Curso</h3>
                    <div className="space-y-3">
                      {DIAS_INFO.map(m => (
                        <div key={m.dia} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xl">{m.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-orange-500 uppercase tracking-wide">Dia {m.dia}</p>
                            <p className="text-sm font-medium text-gray-800">{m.titulo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-textMain mb-4 text-base">✅ O Que Está Incluído</h3>
                    <ul className="space-y-2">
                      {[
                        '5 dias de imersão prática (25h+)',
                        'Todos os materiais e equipamentos',
                        'Apostila digital completa',
                        'Certificado impresso pelo ITA',
                        'Acesso ao Clube de Robótica',
                        'Registro fotográfico do projeto',
                        'Participação no Campeonato Demo Day',
                      ].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-500 font-bold">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 p-4 rounded-xl border-2 border-orange-200 bg-orange-50">
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-1">Preço especial</p>
                      <p className="text-sm text-gray-500 line-through">De R$ 350,00</p>
                      <p className="text-3xl font-black text-orange-500">R$ 199</p>
                      <p className="text-xs text-gray-500 mt-1">ou 3x de R$ 66,33 sem juros</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: COMPARTILHAR ──────────────────────────────────────── */}
            {aba === 'compartilhar' && (
              <div className="p-6">
                <h3 className="font-semibold text-textMain mb-6 text-base">📤 Como Divulgar o Curso</h3>
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🔗 Link da Landing Page</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={URL_LANDING}
                        className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono focus:outline-none" />
                      <button onClick={copiarLink}
                        className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 whitespace-nowrap">
                        {copiado ? '✅' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Envie este link para pais e alunos interessados</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📱 Link do WhatsApp</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={WA_LINK}
                        className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-600 font-mono focus:outline-none" />
                      <button onClick={() => navigator.clipboard.writeText(WA_LINK)}
                        className="px-3 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 whitespace-nowrap"
                        style={{ backgroundColor: '#25D366' }}>
                        Copiar
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">✍️ Texto Pronto para Divulgação</p>
                    <textarea readOnly rows={6}
                      className="w-full text-sm bg-white border border-blue-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none resize-none"
                      value={`🚀 ALUNOS MAKER NÃO TIRAM FÉRIAS!\n\n5 dias de imersão em Robótica, Arduino e Eletrônica para jovens de 11 a 17 anos — em Itapipoca, CE!\n\n✅ Projeto real + Certificado + Portfólio\n✅ ESP32, Arduino, robótica e muito mais\n✅ 30 vagas | R$ 199 (3x sem juros)\n✅ Inscrições abertas até 30 de Junho\n\n👉 Veja tudo na página: ${URL_LANDING}\n\nGaranta sua vaga pelo WhatsApp: ${WA_LINK}`}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`🚀 ALUNOS MAKER NÃO TIRAM FÉRIAS!\n\n5 dias de imersão em Robótica, Arduino e Eletrônica para jovens de 11 a 17 anos — em Itapipoca, CE!\n\n✅ Projeto real + Certificado + Portfólio\n✅ ESP32, Arduino, robótica e muito mais\n✅ 30 vagas | R$ 199 (3x sem juros)\n✅ Inscrições abertas até 30 de Junho\n\n👉 Veja tudo na página: ${URL_LANDING}\n\nGaranta sua vaga pelo WhatsApp: ${WA_LINK}`)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                      📋 Copiar Texto Completo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal: Carteirinha individual */}
      {carteirinhaSelecionada && (
        <Carteirinha aluno={carteirinhaSelecionada} onFechar={() => setCarteirinhaSelecionada(null)} />
      )}

      {/* Modal: Editar inscrição */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">✏️ Editar Inscrição</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { field: 'nome_completo', label: 'Nome do Aluno' },
                { field: 'escola', label: 'Escola' },
                { field: 'serie', label: 'Série/Ano' },
                { field: 'nome_responsavel', label: 'Nome do Responsável' },
                { field: 'telefone', label: 'Telefone/WhatsApp' },
                { field: 'email', label: 'E-mail' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                  <input type="text" value={dadosEdicao[field] || ''}
                    onChange={e => setDadosEdicao(d => ({ ...d, [field]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Turno</label>
                <select value={dadosEdicao.turno || ''}
                  onChange={e => setDadosEdicao(d => ({ ...d, turno: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400">
                  <option value="manha">Manhã (8h–12h)</option>
                  <option value="tarde">Tarde (13h–17h)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                <select value={dadosEdicao.status || ''}
                  onChange={e => setDadosEdicao(d => ({ ...d, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400">
                  <option value="pendente">Pendente</option>
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pago">Pago ✅</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="certificado_emitido">Certificado Emitido</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={salvarEdicao} disabled={salvandoEdicao}
                className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {salvandoEdicao ? 'Salvando...' : '💾 Salvar Alterações'}
              </button>
              <button onClick={() => setEditando(null)}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
