import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

const NIVEIS = ['', 'Aprendiz', 'Explorador', 'Guerreiro', 'Campeão', 'Lenda']
const NIVEL_COR = ['', 'text-gray-500', 'text-blue-500', 'text-green-500', 'text-purple-600', 'text-yellow-500']
const NIVEL_BG = ['', 'bg-gray-100', 'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-yellow-50']
const MEDALHA = ['', '🥉', '🥈', '🥇', '🏆', '👑']

const TIPOS_REPO = [
  { v: 'pdf', l: '📄 PDF' },
  { v: 'video', l: '🎥 Vídeo' },
  { v: 'link', l: '🔗 Link' },
  { v: 'plano_aula', l: '📋 Plano de Aula' },
  { v: 'atividade', l: '✏️ Atividade' },
  { v: 'outro', l: '📁 Outro' },
]

function BadgeXP({ xp, nivel }) {
  const faixas = [0, 100, 300, 700, 1500, 2000]
  const pct = nivel < 5 ? Math.min(100, ((xp - faixas[nivel]) / (faixas[nivel + 1] - faixas[nivel])) * 100) : 100
  return (
    <div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1e3a5f, #f5a623)' }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{xp} XP {nivel < 5 ? `— faltam ${faixas[nivel + 1] - xp} para ${NIVEIS[nivel + 1]}` : '— Nível máximo!'}</p>
    </div>
  )
}

export default function ItagameDashboard() {
  const [aba, setAba] = useState('ranking')

  // Ranking
  const [ranking, setRanking] = useState([])
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAtribuir, setModalAtribuir] = useState(null)
  const [xpForm, setXpForm] = useState({ xp: 10, motivo: '', tipo: 'bonus' })
  const [salvando, setSalvando] = useState(false)

  // Missões
  const [missoes, setMissoes] = useState([])
  const [missaoForm, setMissaoForm] = useState({ titulo: '', descricao: '', xp_recompensa: 100, codigo_secreto: '', turma_id: '' })
  const [criandoMissao, setCriandoMissao] = useState(false)

  // Recados
  const [recados, setRecados] = useState([])
  const [recadoForm, setRecadoForm] = useState({ titulo: '', mensagem: '', turma_id: '' })
  const [criandoRecado, setCriandoRecado] = useState(false)

  // Provas gamificadas
  const [provas, setProvas] = useState([])
  const [provaForm, setProvaForm] = useState({ titulo: '', disciplina: '', descricao: '', xp_por_acerto: 50, turma_id: '' })
  const [criandoProva, setCriandoProva] = useState(false)

  // Histórico XP
  const [historico, setHistorico] = useState([])
  const [historicoTurma, setHistoricoTurma] = useState('')
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Repositório
  const [repositorio, setRepositorio] = useState([])
  const [repoForm, setRepoForm] = useState({ titulo: '', descricao: '', link_url: '', tipo: 'outro' })
  const [criandoRepo, setCriandoRepo] = useState(false)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
  }, [])

  useEffect(() => {
    setCarregando(true)
    const url = turmaSel ? `/itagame/ranking?turma_id=${turmaSel}` : '/itagame/ranking'
    api.get(url).then(({ data }) => setRanking(data)).finally(() => setCarregando(false))
  }, [turmaSel])

  useEffect(() => {
    if (aba === 'missoes') api.get('/itagame/missoes').then(({ data }) => setMissoes(data))
    if (aba === 'recados') api.get('/itagame/recados').then(({ data }) => setRecados(data))
    if (aba === 'provas') api.get('/itagame/provas').then(({ data }) => setProvas(data))
    if (aba === 'repositorio') api.get('/itagame/repositorio').then(({ data }) => setRepositorio(data))
    if (aba === 'historico') carregarHistorico()
  }, [aba])

  async function carregarHistorico(turma) {
    setCarregandoHistorico(true)
    const url = turma ? `/itagame/historico?turma_id=${turma}` : '/itagame/historico'
    api.get(url).then(({ data }) => setHistorico(data)).finally(() => setCarregandoHistorico(false))
  }

  async function atribuirXP() {
    if (!modalAtribuir || !xpForm.motivo) return
    setSalvando(true)
    try {
      await api.post('/itagame/atribuir', { aluno_id: modalAtribuir.id, ...xpForm })
      const { data } = await api.get(turmaSel ? `/itagame/ranking?turma_id=${turmaSel}` : '/itagame/ranking')
      setRanking(data)
      setModalAtribuir(null)
    } catch { }
    finally { setSalvando(false) }
  }

  async function criarMissao() {
    if (!missaoForm.titulo) return
    setCriandoMissao(true)
    try {
      await api.post('/itagame/missoes', missaoForm)
      const { data } = await api.get('/itagame/missoes')
      setMissoes(data)
      setMissaoForm({ titulo: '', descricao: '', xp_recompensa: 100, codigo_secreto: '', turma_id: '' })
    } catch { alert('Erro ao criar missão') }
    finally { setCriandoMissao(false) }
  }

  async function excluirMissao(id) {
    if (!confirm('Excluir esta missão?')) return
    await api.delete(`/itagame/missoes/${id}`)
    setMissoes(prev => prev.filter(m => m.id !== id))
  }

  async function publicarRecado() {
    if (!recadoForm.titulo || !recadoForm.mensagem) return
    setCriandoRecado(true)
    try {
      await api.post('/itagame/recados', recadoForm)
      const { data } = await api.get('/itagame/recados')
      setRecados(data)
      setRecadoForm({ titulo: '', mensagem: '', turma_id: '' })
    } catch { alert('Erro ao publicar recado') }
    finally { setCriandoRecado(false) }
  }

  async function excluirRecado(id) {
    if (!confirm('Excluir este recado?')) return
    await api.delete(`/itagame/recados/${id}`)
    setRecados(prev => prev.filter(r => r.id !== id))
  }

  async function criarProva() {
    if (!provaForm.titulo) return
    setCriandoProva(true)
    try {
      await api.post('/itagame/provas', provaForm)
      const { data } = await api.get('/itagame/provas')
      setProvas(data)
      setProvaForm({ titulo: '', disciplina: '', descricao: '', xp_por_acerto: 50, turma_id: '' })
    } catch { alert('Erro ao criar prova') }
    finally { setCriandoProva(false) }
  }

  async function excluirProva(id) {
    if (!confirm('Excluir esta prova?')) return
    await api.delete(`/itagame/provas/${id}`)
    setProvas(prev => prev.filter(p => p.id !== id))
  }

  async function adicionarMaterial() {
    if (!repoForm.titulo) return
    setCriandoRepo(true)
    try {
      await api.post('/itagame/repositorio', repoForm)
      const { data } = await api.get('/itagame/repositorio')
      setRepositorio(data)
      setRepoForm({ titulo: '', descricao: '', link_url: '', tipo: 'outro' })
    } catch { alert('Erro ao adicionar material') }
    finally { setCriandoRepo(false) }
  }

  async function excluirMaterial(id) {
    if (!confirm('Excluir este material?')) return
    await api.delete(`/itagame/repositorio/${id}`)
    setRepositorio(prev => prev.filter(r => r.id !== id))
  }

  const top3 = ranking.slice(0, 3)
  const ABAS = [
    { id: 'ranking',    label: '🏆 Ranking' },
    { id: 'missoes',    label: '🎯 Missões' },
    { id: 'recados',    label: '💬 Recados' },
    { id: 'provas',     label: '📝 Provas' },
    { id: 'historico',  label: '📋 Histórico XP' },
    { id: 'repositorio',label: '📚 Repositório' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">🎮 ItagGame</h1>
            <p className="text-gray-500 text-sm mt-0.5">Painel do Professor</p>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl flex-wrap">
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${aba === a.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                {a.label}
              </button>
            ))}
          </div>

          {/* ===== RANKING ===== */}
          {aba === 'ranking' && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex gap-2 items-center flex-wrap">
                  <button onClick={() => {
                    const header = ['#', 'Nome', 'Turma', 'XP', 'Nível']
                    const rows = ranking.map((a, i) => [i + 1, a.nome, a.turma_nome || '', a.xp_total, `${a.nivel} - ${NIVEIS[a.nivel]}`])
                    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ranking_itagame.csv'; a.click()
                  }} className="btn-secondary text-sm">📥 Exportar CSV</button>
                  <select className="input-field w-auto" value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
                    <option value="">Todas as turmas</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              {top3.length >= 3 && (
                <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 mb-6 text-white">
                  <h2 className="text-center font-bold mb-4 text-lg">🏆 Pódio</h2>
                  <div className="flex items-end justify-center gap-4">
                    {[top3[1], top3[0], top3[2]].map((a, posIdx) => {
                      const altura = posIdx === 1 ? 'h-28' : 'h-20'
                      const pos = posIdx === 1 ? 1 : posIdx === 0 ? 2 : 3
                      return (
                        <div key={a.id} className="flex flex-col items-center gap-1">
                          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden text-2xl border-2 border-white/40">
                            {a.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : '👤'}
                          </div>
                          <p className="text-xs font-bold text-center max-w-[80px] truncate">{a.nome.split(' ')[0]}</p>
                          <p className="text-xs opacity-80">{a.xp_total} XP</p>
                          <div className={`${altura} w-20 bg-white/20 rounded-t-lg flex items-center justify-center font-bold text-2xl`}>{MEDALHA[pos]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">Ranking Completo</h2>
                </div>
                {carregando ? (
                  <div className="p-10 text-center text-gray-400">Carregando...</div>
                ) : ranking.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhum dado disponível</div>
                ) : (
                  <div className="divide-y">
                    {ranking.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                          {i < 3 ? MEDALHA[i + 1] : i + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {a.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-lg">👤</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-textMain truncate">{a.nome}</p>
                          <p className="text-xs text-gray-400">{a.turma_nome}</p>
                          <BadgeXP xp={a.xp_total} nivel={a.nivel} />
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${NIVEL_BG[a.nivel]} ${NIVEL_COR[a.nivel]}`}>
                            Nível {a.nivel} — {NIVEIS[a.nivel]}
                          </span>
                          <p className="text-lg font-bold text-secondary mt-1">{a.xp_total} XP</p>
                        </div>
                        {a.id && (
                          <button onClick={() => setModalAtribuir(a)} className="ml-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-xs font-medium hover:bg-secondary/20 flex-shrink-0">
                            + XP
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== MISSÕES ===== */}
          {aba === 'missoes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-textMain mb-4">🎯 Nova Missão</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input className="input-field" value={missaoForm.titulo} onChange={e => setMissaoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Resolver 10 exercícios de lógica" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select className="input-field" value={missaoForm.turma_id} onChange={e => setMissaoForm(f => ({ ...f, turma_id: e.target.value }))}>
                      <option value="">Todas as turmas</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea className="input-field" rows={2} value={missaoForm.descricao} onChange={e => setMissaoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva a missão para os alunos..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">XP de Recompensa</label>
                    <input className="input-field" type="number" min={10} max={500} value={missaoForm.xp_recompensa} onChange={e => setMissaoForm(f => ({ ...f, xp_recompensa: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Secreto (opcional)</label>
                    <input className="input-field" value={missaoForm.codigo_secreto} onChange={e => setMissaoForm(f => ({ ...f, codigo_secreto: e.target.value.toUpperCase() }))} placeholder="Ex: ROBO2026" />
                  </div>
                </div>
                <button onClick={criarMissao} disabled={criandoMissao || !missaoForm.titulo} className="btn-primary mt-4">
                  {criandoMissao ? '⏳ Criando...' : '🎯 Criar Missão'}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">Missões Ativas ({missoes.length})</h2>
                </div>
                {missoes.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhuma missão criada ainda</div>
                ) : (
                  <div className="divide-y">
                    {missoes.map(m => (
                      <div key={m.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
                        <div className="flex-1">
                          <p className="font-medium text-textMain">{m.titulo}</p>
                          {m.descricao && <p className="text-sm text-gray-500 mt-0.5">{m.descricao}</p>}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⭐ {m.xp_recompensa} XP</span>
                            {m.turma_nome && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{m.turma_nome}</span>}
                            {m.codigo_secreto && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-mono">🔑 {m.codigo_secreto}</span>}
                          </div>
                        </div>
                        <button onClick={() => excluirMissao(m.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded flex-shrink-0">🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== RECADOS ===== */}
          {aba === 'recados' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-textMain mb-4">💬 Novo Recado</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                      <input className="input-field" value={recadoForm.titulo} onChange={e => setRecadoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do recado" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                      <select className="input-field" value={recadoForm.turma_id} onChange={e => setRecadoForm(f => ({ ...f, turma_id: e.target.value }))}>
                        <option value="">Todas as turmas</option>
                        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                    <textarea className="input-field" rows={3} value={recadoForm.mensagem} onChange={e => setRecadoForm(f => ({ ...f, mensagem: e.target.value }))} placeholder="Mensagem para os alunos..." />
                  </div>
                  <button onClick={publicarRecado} disabled={criandoRecado || !recadoForm.titulo || !recadoForm.mensagem} className="btn-primary">
                    {criandoRecado ? '⏳ Publicando...' : '💬 Publicar Recado'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">Recados Publicados ({recados.length})</h2>
                </div>
                {recados.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhum recado publicado ainda</div>
                ) : (
                  <div className="divide-y">
                    {recados.map(r => (
                      <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">💬</div>
                        <div className="flex-1">
                          <p className="font-medium text-textMain">{r.titulo}</p>
                          <p className="text-sm text-gray-600 mt-1">{r.mensagem}</p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-400">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
                            {r.turma_nome && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.turma_nome}</span>}
                          </div>
                        </div>
                        <button onClick={() => excluirRecado(r.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded flex-shrink-0">🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== PROVAS GAMIFICADAS ===== */}
          {aba === 'provas' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-textMain mb-1">📝 Nova Prova Gamificada</h2>
                <p className="text-sm text-gray-500 mb-4">Crie desafios/quizzes para os alunos. Cada acerto vale XP no jogo.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input className="input-field" value={provaForm.titulo} onChange={e => setProvaForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Quiz de Robótica — Sensores" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                    <input className="input-field" value={provaForm.disciplina} onChange={e => setProvaForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Ex: Robótica, Programação" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select className="input-field" value={provaForm.turma_id} onChange={e => setProvaForm(f => ({ ...f, turma_id: e.target.value }))}>
                      <option value="">Todas as turmas</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">XP por Acerto</label>
                    <input className="input-field" type="number" min={10} max={500} value={provaForm.xp_por_acerto} onChange={e => setProvaForm(f => ({ ...f, xp_por_acerto: Number(e.target.value) }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Instruções</label>
                    <textarea className="input-field" rows={2} value={provaForm.descricao} onChange={e => setProvaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Instruções para os alunos..." />
                  </div>
                </div>
                <button onClick={criarProva} disabled={criandoProva || !provaForm.titulo} className="btn-primary mt-4">
                  {criandoProva ? '⏳ Criando...' : '📝 Criar Prova'}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">Provas Cadastradas ({provas.length})</h2>
                </div>
                {provas.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhuma prova criada ainda</div>
                ) : (
                  <div className="divide-y">
                    {provas.map(p => (
                      <div key={p.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0">📝</div>
                        <div className="flex-1">
                          <p className="font-medium text-textMain">{p.titulo}</p>
                          {p.descricao && <p className="text-sm text-gray-500 mt-0.5">{p.descricao}</p>}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">⭐ {p.xp_por_acerto} XP/acerto</span>
                            {p.disciplina && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.disciplina}</span>}
                            {p.turma_nome && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.turma_nome}</span>}
                            {p.codigo_acesso && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-mono">🔑 {p.codigo_acesso}</span>
                            )}
                            <span className="text-xs text-gray-400">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <button onClick={() => excluirProva(p.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded flex-shrink-0">🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== HISTÓRICO XP ===== */}
          {aba === 'historico' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select className="input-field w-auto" value={historicoTurma} onChange={e => {
                  setHistoricoTurma(e.target.value)
                  carregarHistorico(e.target.value)
                }}>
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <span className="text-sm text-gray-500">{historico.length} registros</span>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">📋 Histórico de XP</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Todas as ações de XP registradas no jogo</p>
                </div>
                {carregandoHistorico ? (
                  <div className="p-10 text-center text-gray-400">Carregando...</div>
                ) : historico.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhum registro encontrado</div>
                ) : (
                  <div className="divide-y">
                    {historico.map(h => (
                      <div key={h.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                        <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-lg flex-shrink-0">
                          {h.tipo === 'avaliacao' ? '📝' : h.tipo === 'badge' ? '🏅' : h.tipo === 'participacao' ? '🙋' : h.tipo === 'comportamento' ? '⭐' : '🎮'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-textMain text-sm truncate">{h.aluno_nome || 'Aluno'}</p>
                          <p className="text-xs text-gray-500 truncate">{h.descricao}</p>
                          <div className="flex gap-2 mt-0.5 flex-wrap">
                            {h.aluno_turma && <span className="text-xs text-gray-400">{h.aluno_turma}</span>}
                            <span className="text-xs text-gray-400">{new Date(h.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-sm font-bold ${h.xp_ganho > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {h.xp_ganho > 0 ? `+${h.xp_ganho}` : h.xp_ganho} XP
                          </span>
                          <p className="text-xs text-gray-400 capitalize">{h.tipo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== REPOSITÓRIO ===== */}
          {aba === 'repositorio' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-textMain mb-1">📚 Adicionar Material</h2>
                <p className="text-sm text-gray-500 mb-4">Compartilhe links de PDFs, vídeos, planos de aula e atividades com os alunos.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input className="input-field" value={repoForm.titulo} onChange={e => setRepoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Plano de Aula — Sensores Arduino" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select className="input-field" value={repoForm.tipo} onChange={e => setRepoForm(f => ({ ...f, tipo: e.target.value }))}>
                      {TIPOS_REPO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link (URL)</label>
                    <input className="input-field" type="url" value={repoForm.link_url} onChange={e => setRepoForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://drive.google.com/..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea className="input-field" rows={2} value={repoForm.descricao} onChange={e => setRepoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição do material..." />
                  </div>
                </div>
                <button onClick={adicionarMaterial} disabled={criandoRepo || !repoForm.titulo} className="btn-primary mt-4">
                  {criandoRepo ? '⏳ Salvando...' : '📚 Adicionar Material'}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="font-semibold text-textMain">Materiais Disponíveis ({repositorio.length})</h2>
                </div>
                {repositorio.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">Nenhum material adicionado ainda</div>
                ) : (
                  <div className="divide-y">
                    {repositorio.map(r => {
                      const tipoInfo = TIPOS_REPO.find(t => t.v === r.tipo) || TIPOS_REPO[TIPOS_REPO.length - 1]
                      return (
                        <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0">
                            {tipoInfo.l.split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-textMain">{r.titulo}</p>
                            {r.descricao && <p className="text-sm text-gray-500 mt-0.5">{r.descricao}</p>}
                            <div className="flex gap-2 mt-1 flex-wrap items-center">
                              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{tipoInfo.l}</span>
                              <span className="text-xs text-gray-400">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
                              {r.link_url && (
                                <a href={r.link_url} target="_blank" rel="noreferrer"
                                  className="text-xs text-primary hover:underline font-medium">
                                  🔗 Abrir material
                                </a>
                              )}
                            </div>
                          </div>
                          <button onClick={() => excluirMaterial(r.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded flex-shrink-0">🗑</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal atribuir XP */}
        {modalAtribuir && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="font-bold text-textMain mb-1">Atribuir XP</h3>
              <p className="text-sm text-gray-500 mb-4">para {modalAtribuir.nome}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de XP</label>
                  <input className="input-field" type="number" min={1} max={500} value={xpForm.xp} onChange={e => setXpForm(f => ({ ...f, xp: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="input-field" value={xpForm.tipo} onChange={e => setXpForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="bonus">Bônus</option>
                    <option value="participacao">Participação</option>
                    <option value="desempenho">Desempenho</option>
                    <option value="comportamento">Comportamento</option>
                    <option value="avaliacao">Avaliação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                  <input className="input-field" value={xpForm.motivo} onChange={e => setXpForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex: Excelente participação em aula" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={atribuirXP} disabled={salvando || !xpForm.motivo} className="btn-primary flex-1">{salvando ? 'Salvando...' : '⭐ Atribuir'}</button>
                  <button onClick={() => setModalAtribuir(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
