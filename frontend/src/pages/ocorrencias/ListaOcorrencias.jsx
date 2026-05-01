import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const TIPO_COR = {
  advertencia: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  suspensao: 'bg-red-50 border-red-200 text-red-800',
  elogio: 'bg-green-50 border-green-200 text-green-800',
  ocorrencia: 'bg-orange-50 border-orange-200 text-orange-800',
}

const TIPO_ICONE = {
  advertencia: '⚠️',
  suspensao: '🚫',
  elogio: '🌟',
  ocorrencia: '📋',
}

export default function ListaOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [ocRes, dashRes] = await Promise.all([
          api.get('/ocorrencias'),
          api.get('/ocorrencias/dashboard')
        ])
        setOcorrencias(ocRes.data)
        setDashboard(dashRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [])

  const filtradas = ocorrencias.filter(o => {
    const matchTipo = filtroTipo === 'todos' || o.tipo === filtroTipo
    const matchBusca = !busca || o.aluno_nome?.toLowerCase().includes(busca.toLowerCase()) || o.descricao?.toLowerCase().includes(busca.toLowerCase())
    return matchTipo && matchBusca
  })

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-textMain">Ocorrências</h1>
            <div className="flex gap-2">
              <button onClick={() => {
                const header = ['Data', 'Aluno', 'Turma', 'Tipo', 'Gravidade', 'Descrição']
                const rows = ocorrencias.map(o => [o.data, o.aluno_nome, o.turma_nome || '', o.tipo, o.gravidade || '', o.descricao])
                const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ocorrencias.csv'; a.click()
              }} className="btn-secondary text-sm">📥 Exportar CSV</button>
              <Link to="/ocorrencias/nova" className="btn-primary text-sm">+ Nova Ocorrência</Link>
            </div>
          </div>

          {/* Dashboard stats */}
          {dashboard && (
            <div className="grid grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total', valor: dashboard.total, cor: 'text-primary' },
                { label: 'Advertências', valor: dashboard.por_tipo?.advertencia || 0, cor: 'text-yellow-600' },
                { label: 'Suspensões', valor: dashboard.por_tipo?.suspensao || 0, cor: 'text-danger' },
                { label: 'Elogios', valor: dashboard.por_tipo?.elogio || 0, cor: 'text-success' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className={`text-2xl font-bold ${s.cor}`}>{s.valor}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <input className="input-field flex-1 min-w-48" placeholder="🔍 Buscar aluno ou descrição..." value={busca} onChange={e => setBusca(e.target.value)} />
            <div className="flex rounded-lg overflow-hidden border bg-white">
              {['todos', 'advertencia', 'suspensao', 'elogio', 'ocorrencia'].map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)} className={`px-3 py-2 text-sm transition-colors ${filtroTipo === t ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhuma ocorrência encontrada</div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(o => (
                <div key={o.id} className={`rounded-xl border p-4 ${TIPO_COR[o.tipo] || 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{TIPO_ICONE[o.tipo] || '📋'}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{o.aluno_nome}</p>
                          <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full border capitalize">{o.tipo}</span>
                          {o.gravidade && <span className={`text-xs px-2 py-0.5 rounded-full ${o.gravidade === 'alta' ? 'bg-red-100 text-danger' : o.gravidade === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{o.gravidade}</span>}
                        </div>
                        <p className="text-sm mt-1 opacity-80">{o.descricao}</p>
                        {o.turma_nome && <p className="text-xs opacity-60 mt-0.5">{o.turma_nome}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-60">{new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      {o.registrado_por_nome && <p className="text-xs opacity-60">por {o.registrado_por_nome}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
