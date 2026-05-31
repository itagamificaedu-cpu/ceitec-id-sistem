import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { GraficoRadar } from '../../components/GraficoDesempenho'
import api from '../../api'

const NIVEIS = ['', 'Aprendiz', 'Explorador', 'Guerreiro', 'Campeão', 'Lenda']

export default function PerfilAluno() {
  const { id } = useParams()
  const [dados,         setDados]         = useState(null)
  const [itagame,       setItagame]       = useState(null)
  const [carregando,    setCarregando]    = useState(true)
  const [aluno,         setAluno]         = useState(null)
  // Transferência de turma
  const [modalTransf,   setModalTransf]   = useState(false)
  const [turmas,        setTurmas]        = useState([])
  const [turmaSel,      setTurmaSel]      = useState('')
  const [transferindo,  setTransferindo]  = useState(false)
  const [msgTransf,     setMsgTransf]     = useState(null) // { tipo:'ok'|'erro', texto }

  useEffect(() => {
    async function carregar() {
      try {
        const [desempRes, itaRes, alunoRes] = await Promise.all([
          api.get(`/desempenho/aluno/${id}`),
          api.get(`/itagame/aluno/${id}`),
          api.get(`/alunos/${id}`)
        ])
        setDados(desempRes.data)
        setItagame(itaRes.data)
        setAluno(alunoRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  async function abrirTransferencia() {
    setMsgTransf(null); setTurmaSel('')
    if (turmas.length === 0) {
      const { data } = await api.get('/turmas')
      setTurmas(data)
    }
    setModalTransf(true)
  }

  async function confirmarTransferencia() {
    if (!turmaSel) return
    setTransferindo(true); setMsgTransf(null)
    try {
      const { data } = await api.patch(`/alunos/${id}/transferir`, { turma_id: parseInt(turmaSel) })
      setAluno(prev => ({ ...prev, turma: data.aluno.turma, turma_id: data.aluno.turma_id }))
      setMsgTransf({ tipo: 'ok', texto: data.mensagem })
      setTimeout(() => setModalTransf(false), 2500)
    } catch (err) {
      setMsgTransf({ tipo: 'erro', texto: err.response?.data?.erro || 'Erro ao transferir' })
    } finally { setTransferindo(false) }
  }

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!dados) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20"><p className="text-danger">Aluno não encontrado</p></main></div>

  const a = aluno || dados.aluno
  const xpPct = itagame ? Math.min(100, (itagame.xp_total / (itagame.nivel_info?.proximo || itagame.xp_total)) * 100) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/turmas" className="text-gray-500 hover:text-primary text-sm">← Turmas</Link>
          </div>

          {/* Header do aluno */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-5">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-secondary/30">
                {a?.foto_path ? <img src={a.foto_path} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-3xl">👤</span>}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-textMain">{a?.nome}</h1>
                <p className="text-secondary font-mono font-bold">{a?.codigo}</p>
                <p className="text-gray-500 text-sm">{a?.turma} • {a?.curso}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link to={`/alunos/${id}/carteirinha`} className="btn-primary text-sm">🎫 Carteirinha</Link>
                <button
                  onClick={abrirTransferencia}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:700, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(29,78,216,.35)' }}
                >
                  🔄 Transferir Turma
                </button>
                <Link to={`/alunos/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">✏️ Editar</Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {/* Frequência */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">📅 Frequência</h3>
              {dados.notas?.length === 0 ? (
                <p className="text-gray-400 text-sm">Sem registros</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Média</span><span className="font-bold text-primary text-lg">{dados.media_geral ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Melhor disciplina</span><span className="font-medium text-success text-xs">{dados.melhor_disciplina?.disciplina || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Atenção em</span><span className="font-medium text-danger text-xs">{dados.disciplina_critica?.disciplina || '—'}</span></div>
                </div>
              )}
            </div>

            {/* ItagGame */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">🎮 ItagGame</h3>
              {itagame ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-secondary">{itagame.xp_total} XP</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">Nível {itagame.nivel}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{NIVEIS[itagame.nivel]}</p>
                  {itagame.nivel_info?.proximo && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div className="h-2 bg-secondary rounded-full" style={{ width: `${xpPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">{itagame.nivel_info.xp_proximo} XP para o próximo nível</p>
                    </>
                  )}
                  {itagame.badges?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {itagame.badges.map((b, i) => <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">{b}</span>)}
                    </div>
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Sem dados</p>}
            </div>

            {/* Ocorrências */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">⚠️ Ocorrências</h3>
              {dados.ocorrencias?.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma ocorrência</p>
              ) : (
                <div className="space-y-2">
                  {dados.ocorrencias.slice(0, 3).map(o => (
                    <div key={o.id} className="text-xs border rounded-lg p-2">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{o.tipo}</span>
                        <span className={`px-1 rounded ${o.gravidade === 'alta' ? 'bg-red-100 text-danger' : o.tipo === 'elogio' ? 'bg-green-100 text-success' : 'bg-yellow-100 text-yellow-700'}`}>{o.gravidade}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5 truncate">{o.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gráfico radar por disciplina */}
          {dados.mediasPorDisc?.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-textMain mb-3">Desempenho por Disciplina</h3>
                <GraficoRadar dados={dados.mediasPorDisc} />
              </div>

              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-textMain mb-3">Médias por Disciplina</h3>
                <div className="space-y-3">
                  {dados.mediasPorDisc.map(d => (
                    <div key={d.disciplina}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{d.disciplina}</span>
                        <span className="font-bold" style={{ color: d.media >= 7 ? '#27ae60' : d.media >= 5 ? '#e67e22' : '#e74c3c' }}>{d.media}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${(d.media / 10) * 100}%`, backgroundColor: d.media >= 7 ? '#27ae60' : d.media >= 5 ? '#e67e22' : '#e74c3c' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Histórico de avaliações */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-textMain mb-4">Histórico de Avaliações</h3>
            {dados.notas?.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma avaliação registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Avaliação</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Disciplina</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Nota</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.notas.map(n => (
                      <tr key={n.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{n.titulo || 'Avaliação'}</td>
                        <td className="px-3 py-2 text-gray-500">{n.disciplina}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: n.nota_final >= 7 ? '#27ae60' : n.nota_final >= 5 ? '#e67e22' : '#e74c3c' }}>{n.nota_final}</td>
                        <td className="px-3 py-2 text-gray-500">{n.percentual_acerto}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── MODAL TRANSFERIR TURMA ── */}
      {modalTransf && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:440, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>

            {/* Header */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔄</div>
              <h2 style={{ fontWeight:800, fontSize:18, color:'#111827', marginBottom:4 }}>
                Transferir para nova turma
              </h2>
              <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
                O aluno <strong style={{ color:'#1d4ed8' }}>{aluno?.nome || dados?.aluno?.nome}</strong> está atualmente na turma{' '}
                <strong style={{ color:'#1d4ed8' }}>{aluno?.turma || dados?.aluno?.turma || '—'}</strong>.
              </p>
              <div style={{ marginTop:10, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#1d4ed8' }}>
                ✅ <strong>Todos os dados são preservados:</strong> XP, missões, presenças, notas, álbum de figurinhas — tudo vai junto com o aluno.
              </div>
            </div>

            {/* Select de turma */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>
                Selecione a nova turma
              </label>
              <select
                value={turmaSel}
                onChange={e => setTurmaSel(e.target.value)}
                style={{ width:'100%', height:46, padding:'0 14px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:10, fontSize:14, color:'#111827', outline:'none', cursor:'pointer' }}
              >
                <option value="">Escolha a turma de destino...</option>
                {turmas
                  .filter(t => t.id !== (aluno?.turma_id || dados?.aluno?.turma_id))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))
                }
              </select>
            </div>

            {/* Feedback */}
            {msgTransf && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: msgTransf.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${msgTransf.tipo === 'ok' ? '#86efac' : '#fca5a5'}`,
                color: msgTransf.tipo === 'ok' ? '#15803d' : '#dc2626',
              }}>
                {msgTransf.tipo === 'ok' ? '✅' : '❌'} {msgTransf.texto}
              </div>
            )}

            {/* Botões */}
            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={confirmarTransferencia}
                disabled={!turmaSel || transferindo}
                style={{
                  flex:1, height:46, borderRadius:12, fontSize:14, fontWeight:700,
                  background: !turmaSel || transferindo ? '#e5e7eb' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                  border:'none', color: !turmaSel || transferindo ? '#9ca3af' : '#fff',
                  cursor: !turmaSel || transferindo ? 'not-allowed' : 'pointer',
                  boxShadow: !turmaSel || transferindo ? 'none' : '0 4px 16px rgba(29,78,216,.35)',
                  transition:'all .2s'
                }}
              >
                {transferindo ? '⏳ Transferindo...' : '🔄 Confirmar Transferência'}
              </button>
              <button
                onClick={() => setModalTransf(false)}
                style={{ padding:'0 20px', height:46, borderRadius:12, fontSize:14, fontWeight:600, background:'#fff', border:'1.5px solid #e5e7eb', color:'#374151', cursor:'pointer' }}
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
