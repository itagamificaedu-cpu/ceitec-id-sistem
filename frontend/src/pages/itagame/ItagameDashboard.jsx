import React, { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api'

const NIVEIS = ['', 'Aprendiz', 'Explorador', 'Guerreiro', 'Campeão', 'Lenda']
const NIVEL_COR = ['', 'text-gray-500', 'text-blue-500', 'text-green-500', 'text-purple-600', 'text-yellow-500']
const NIVEL_BG = ['', 'bg-gray-100', 'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-yellow-50']
const MEDALHA = ['', '🥉', '🥈', '🥇', '🏆', '👑']

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
  const [ranking, setRanking] = useState([])
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAtribuir, setModalAtribuir] = useState(null)
  const [xpForm, setXpForm] = useState({ xp: 10, motivo: '', tipo: 'bonus' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
  }, [])

  useEffect(() => {
    setCarregando(true)
    const url = turmaSel ? `/itagame/ranking?turma_id=${turmaSel}` : '/itagame/ranking'
    api.get(url).then(({ data }) => setRanking(data)).finally(() => setCarregando(false))
  }, [turmaSel])

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

  const top3 = ranking.slice(0, 3)

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-textMain">🎮 ItagGame</h1>
              <p className="text-gray-500 text-sm mt-0.5">Sistema de gamificação educacional</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={() => {
                const header = ['#', 'Nome', 'Turma', 'XP', 'Nível']
                const rows = ranking.map((a, i) => [i + 1, a.nome, a.turma_nome || '', a.xp_total, `${a.nivel} - ${NIVEIS[a.nivel]}`])
                const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ranking_itagame.csv'; a.click()
              }} className="btn-secondary text-sm">📥 Exportar CSV</button>
            <select className="input-field w-auto" value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
              <option value="">Todas as turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            </div>
          </div>

          {/* Pódio Top 3 */}
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

          {/* Ranking completo */}
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
                    <button onClick={() => setModalAtribuir(a)} className="ml-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-xs font-medium hover:bg-secondary/20 flex-shrink-0">
                      + XP
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
