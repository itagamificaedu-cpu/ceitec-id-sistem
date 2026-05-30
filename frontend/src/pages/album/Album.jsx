import React, { useState, useEffect, useCallback } from 'react'
import api from '../../api'

// ── Cores e labels de raridade ────────────────────────────────
const RAR = {
  comum:    { label: 'Comum',    cor: '#64748b', brilho: 'rgba(100,116,139,.4)',  bg: 'rgba(100,116,139,.12)' },
  rara:     { label: 'Rara',     cor: '#3b82f6', brilho: 'rgba(59,130,246,.5)',   bg: 'rgba(59,130,246,.12)'  },
  epica:    { label: 'Épica',    cor: '#a855f7', brilho: 'rgba(168,85,247,.6)',   bg: 'rgba(168,85,247,.14)'  },
  lendaria: { label: 'Lendária', cor: '#f5a623', brilho: 'rgba(245,166,35,.7)',   bg: 'rgba(245,166,35,.16)'  },
}

const CUSTO = { comum: 50, premium: 120, especial: 0 }

// ── Componente de figurinha ───────────────────────────────────
function CardFigurinha({ fig, onClick }) {
  const r = RAR[fig.raridade] || RAR.comum
  return (
    <div
      onClick={() => onClick && onClick(fig)}
      style={{
        background: fig.desbloqueada
          ? `linear-gradient(145deg, ${fig.cor_primaria}22, ${fig.cor_secundaria}44)`
          : 'rgba(255,255,255,.04)',
        border: `2px solid ${fig.desbloqueada ? r.cor : 'rgba(255,255,255,.08)'}`,
        borderRadius: 14,
        padding: '14px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: 'pointer', transition: 'all .2s',
        boxShadow: fig.desbloqueada ? `0 0 16px ${r.brilho}` : 'none',
        opacity: fig.desbloqueada ? 1 : 0.45,
        position: 'relative', overflow: 'hidden',
        minHeight: 130,
      }}
      title={fig.nome}
    >
      {/* Número */}
      <div style={{ position:'absolute', top:6, left:8, fontSize:9, color:'rgba(255,255,255,.35)', fontWeight:700, fontFamily:'monospace' }}>
        #{fig.numero}
      </div>

      {/* Badge raridade lendária */}
      {fig.raridade === 'lendaria' && fig.desbloqueada && (
        <div style={{ position:'absolute', top:4, right:4, fontSize:10, background:'rgba(245,166,35,.2)', border:'1px solid #f5a623', borderRadius:6, padding:'1px 5px', color:'#f5a623', fontWeight:900 }}>
          ★
        </div>
      )}

      {/* Emoji do personagem */}
      <div style={{
        fontSize: fig.desbloqueada ? 36 : 28,
        filter: fig.desbloqueada ? 'none' : 'grayscale(1) brightness(.4)',
        transition: 'all .3s',
        lineHeight: 1,
      }}>
        {fig.desbloqueada ? fig.icone_emoji : '❓'}
      </div>

      {/* Nome */}
      <div style={{
        fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.3,
        color: fig.desbloqueada ? '#fff' : 'rgba(255,255,255,.35)',
        maxWidth: '100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        padding: '0 4px',
      }}>
        {fig.desbloqueada ? fig.nome : '???'}
      </div>

      {/* Badge raridade */}
      <div style={{
        fontSize: 9, fontWeight: 700, padding: '2px 8px',
        borderRadius: 10,
        background: r.bg,
        color: r.cor,
        border: `1px solid ${r.cor}44`,
        letterSpacing: 1,
      }}>
        {r.label.toUpperCase()}
      </div>

      {/* Quantidade duplicata */}
      {fig.quantidade > 1 && (
        <div style={{ position:'absolute', bottom:4, right:6, fontSize:9, color:'#f5a623', fontWeight:900 }}>
          x{fig.quantidade}
        </div>
      )}
    </div>
  )
}

// ── Modal de figurinha ────────────────────────────────────────
function ModalFigurinha({ fig, onClose }) {
  if (!fig) return null
  const r = RAR[fig.raridade] || RAR.comum
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(145deg,#0f1929,#0a0f1e)',
        border:`2px solid ${r.cor}`,
        borderRadius:20, padding:28, maxWidth:380, width:'100%',
        boxShadow:`0 0 40px ${r.brilho}`,
        animation:'modalIn .3s ease',
      }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:72, lineHeight:1, marginBottom:12 }}>{fig.icone_emoji}</div>
          <div style={{ fontSize:11, color:r.cor, fontWeight:700, letterSpacing:2, marginBottom:4 }}>#{fig.numero} · {r.label.toUpperCase()}</div>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>{fig.nome}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginTop:4 }}>{fig.colecao_nome}</div>
        </div>
        <div style={{ background:r.bg, border:`1px solid ${r.cor}44`, borderRadius:12, padding:'12px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, color:r.cor, fontWeight:700, letterSpacing:1, marginBottom:4 }}>⚡ PODER ESPECIAL</div>
          <div style={{ fontSize:14, color:'#fff', fontWeight:700 }}>{fig.poder}</div>
        </div>
        {fig.historia && (
          <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', lineHeight:1.6, marginBottom:12 }}>{fig.historia}</div>
        )}
        {fig.xp_bonus > 0 && (
          <div style={{ fontSize:12, color:'#22c55e', fontWeight:700 }}>+{fig.xp_bonus} XP bônus desbloqueado</div>
        )}
        <button onClick={onClose} style={{ width:'100%', marginTop:16, padding:'10px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:13, fontWeight:700 }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Modal de abertura de pacote ───────────────────────────────
function ModalPacote({ resultado, onClose }) {
  const [revelando, setRevelando] = useState([])
  const [idx, setIdx]             = useState(0)

  useEffect(() => {
    if (!resultado) return
    setRevelando([])
    setIdx(0)
    const revelar = (i) => {
      if (i >= resultado.pacote.length) return
      setTimeout(() => {
        setRevelando(prev => [...prev, resultado.pacote[i]])
        setIdx(i + 1)
        revelar(i + 1)
      }, 500)
    }
    revelar(0)
  }, [resultado])

  if (!resultado) return null
  const r = RAR

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.85)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ fontSize:20, fontWeight:900, color:'#f5a623', marginBottom:24, fontFamily:'Orbitron, sans-serif', letterSpacing:2 }}>
        📦 PACOTE ABERTO!
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', maxWidth:500 }}>
        {revelando.map((fig, i) => {
          const rar = r[fig.raridade] || r.comum
          return (
            <div key={i} style={{
              width:100, background:`linear-gradient(145deg,${fig.cor_primaria}33,${fig.cor_secundaria}55)`,
              border:`2px solid ${rar.cor}`,
              borderRadius:14, padding:'14px 8px', textAlign:'center',
              boxShadow:`0 0 20px ${rar.brilho}`,
              animation:'cardReveal .5s cubic-bezier(.175,.885,.32,1.275)',
              position:'relative',
            }}>
              {fig.duplicata && (
                <div style={{ position:'absolute', top:-6, right:-6, background:'#64748b', color:'#fff', fontSize:9, borderRadius:6, padding:'2px 6px', fontWeight:900 }}>DUP</div>
              )}
              <div style={{ fontSize:36 }}>{fig.icone_emoji}</div>
              <div style={{ fontSize:9, color:'#fff', fontWeight:700, marginTop:4, lineHeight:1.3 }}>{fig.nome}</div>
              <div style={{ fontSize:8, color:rar.cor, fontWeight:700, marginTop:3, letterSpacing:1 }}>{rar.label.toUpperCase()}</div>
            </div>
          )
        })}
      </div>
      {revelando.length >= resultado.pacote.length && (
        <div style={{ marginTop:24, textAlign:'center' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:16 }}>
            ✅ {resultado.novas} nova{resultado.novas !== 1 ? 's' : ''} · {resultado.duplicatas} duplicata{resultado.duplicatas !== 1 ? 's' : ''}
          </div>
          <button onClick={onClose} style={{ padding:'12px 32px', background:'linear-gradient(135deg,#f5a623,#d97706)', border:'none', borderRadius:12, color:'#0a1628', fontWeight:900, fontSize:14, cursor:'pointer' }}>
            Ver Álbum
          </button>
        </div>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function Album() {
  const usuario    = JSON.parse(localStorage.getItem('usuario') || '{}')
  const [aba, setAba]           = useState('album')
  const [alunos, setAlunos]     = useState([])
  const [alunoSel, setAlunoSel] = useState(null)
  const [dados, setDados]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [filtro, setFiltro]     = useState('todos')
  const [busca, setBusca]       = useState('')
  const [figSel, setFigSel]     = useState(null)
  const [pacoteTipo, setPacoteTipo] = useState('comum')
  const [abrindo, setAbrindo]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [ranking, setRanking]   = useState([])
  const [erro, setErro]         = useState('')

  // Carrega lista de alunos
  useEffect(() => {
    api.get('/alunos').then(({ data }) => setAlunos(Array.isArray(data) ? data : data.alunos || [])).catch(() => {})
  }, [])

  // Carrega álbum do aluno selecionado
  const carregarAlbum = useCallback(async (aId) => {
    if (!aId) return
    setLoading(true); setErro('')
    try {
      const { data } = await api.get(`/album/meu-album/${aId}`)
      setDados(data)
    } catch { setErro('Erro ao carregar o álbum.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (alunoSel) carregarAlbum(alunoSel) }, [alunoSel, carregarAlbum])

  // Carrega ranking
  useEffect(() => {
    if (aba !== 'ranking') return
    api.get('/album/ranking').then(({ data }) => setRanking(data.ranking || [])).catch(() => {})
  }, [aba])

  // Abre pacote
  async function abrirPacote() {
    if (!alunoSel) return
    setAbrindo(true); setErro('')
    try {
      const { data } = await api.post('/album/abrir-pacote', { aluno_id: alunoSel, tipo: pacoteTipo })
      setResultado(data)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao abrir pacote.')
    } finally { setAbrindo(false) }
  }

  // Distribuir pacote especial
  async function distribuirPacote() {
    if (!alunoSel) return
    try {
      const { data } = await api.post('/album/distribuir', { aluno_id: alunoSel })
      setResultado(data)
    } catch { setErro('Erro ao distribuir pacote.') }
  }

  // Filtra figurinhas
  const figs = dados?.figurinhas?.filter(f => {
    if (filtro === 'desbloqueadas' && !f.desbloqueada) return false
    if (filtro === 'bloqueadas'    &&  f.desbloqueada) return false
    if (filtro !== 'todos' && !['desbloqueadas','bloqueadas'].includes(filtro) && f.raridade !== filtro) return false
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  }) || []

  const abas = [
    { id:'album',  label:'🎴 Álbum',       },
    { id:'pacotes',label:'📦 Pacotes',      },
    { id:'ranking',label:'🏆 Ranking',      },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;700;900&display=swap');
        @keyframes modalIn    { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        @keyframes cardReveal { from{opacity:0;transform:scale(.5) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .alb-tab-btn:hover { background:rgba(245,166,35,.08)!important; border-color:rgba(245,166,35,.4)!important; }
        .alb-aluno-sel:hover { background:rgba(245,166,35,.1)!important; }
        .alb-filtro-btn:hover { background:rgba(255,255,255,.1)!important; }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#07101e', color:'#e8eaf0', fontFamily:"'Exo 2', sans-serif", padding:'20px 16px 60px' }}>

        {/* ── Header ── */}
        <div style={{ maxWidth:1100, margin:'0 auto 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8 }}>
            <div style={{ fontSize:40 }}>🃏</div>
            <div>
              <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(18px,3vw,26px)', fontWeight:900, color:'#f5a623', textShadow:'0 0 20px rgba(245,166,35,.5)', margin:0 }}>
                Álbum dos Craques
              </h1>
              <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,.45)', letterSpacing:2, textTransform:'uppercase' }}>
                Coleção CEITEC GAME · Temporada 2026
              </p>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {abas.map(a => (
              <button key={a.id} className="alb-tab-btn" onClick={() => setAba(a.id)} style={{
                padding:'8px 18px', borderRadius:10, cursor:'pointer',
                fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13,
                background: aba===a.id ? 'rgba(245,166,35,.15)' : 'rgba(255,255,255,.04)',
                border: `1.5px solid ${aba===a.id ? '#f5a623' : 'rgba(255,255,255,.1)'}`,
                color: aba===a.id ? '#f5a623' : 'rgba(255,255,255,.6)',
                transition:'all .2s',
              }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* ── Seletor de aluno ── */}
          <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:16, marginBottom:20 }}>
            <label style={{ fontSize:11, color:'#f5a623', fontWeight:700, letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:8 }}>
              Selecionar Aluno
            </label>
            <select
              value={alunoSel || ''}
              onChange={e => setAlunoSel(e.target.value ? parseInt(e.target.value) : null)}
              style={{ width:'100%', maxWidth:400, padding:'10px 14px', background:'rgba(255,255,255,.07)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:10, color:'#fff', fontSize:14, outline:'none', fontFamily:"'Exo 2',sans-serif" }}
            >
              <option value="">— Escolha um aluno —</option>
              {alunos.map(a => (
                <option key={a.id} value={a.id}>{a.nome} · {a.turma}</option>
              ))}
            </select>
          </div>

          {/* ── ABA: ÁLBUM ── */}
          {aba === 'album' && (
            <>
              {!alunoSel && (
                <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.3)', fontSize:14 }}>
                  👆 Selecione um aluno para ver o álbum
                </div>
              )}

              {alunoSel && loading && (
                <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.4)' }}>Carregando álbum...</div>
              )}

              {alunoSel && dados && !loading && (
                <>
                  {/* Progresso geral */}
                  <div style={{ background:'rgba(245,166,35,.06)', border:'1px solid rgba(245,166,35,.2)', borderRadius:14, padding:16, marginBottom:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, color:'#f5a623' }}>
                          {dados.desbloqueadas} / {dados.total}
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:1 }}>FIGURINHAS COLETADAS</div>
                      </div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {Object.entries(dados.stats || {}).map(([rar, s]) => (
                          <div key={rar} style={{ textAlign:'center' }}>
                            <div style={{ fontSize:14, fontWeight:900, color: RAR[rar]?.cor || '#fff' }}>{s.desbloqueadas}/{s.total}</div>
                            <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', letterSpacing:1 }}>{RAR[rar]?.label || rar}</div>
                          </div>
                        ))}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:14, fontWeight:900, color:'#22c55e' }}>{dados.xp_disponivel}</div>
                          <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', letterSpacing:1 }}>XP DISPONÍVEL</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ background:'rgba(255,255,255,.08)', borderRadius:6, height:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${dados.percentual}%`, background:'linear-gradient(90deg,#f5a623,#22c55e)', borderRadius:6, transition:'width .8s ease' }} />
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:6, textAlign:'right' }}>{dados.percentual}% completo</div>
                  </div>

                  {/* Filtros */}
                  <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                    {[
                      { v:'todos',          label:'Todos'         },
                      { v:'desbloqueadas',  label:'✅ Coletadas'  },
                      { v:'bloqueadas',     label:'🔒 Faltando'   },
                      { v:'comum',          label:'⬜ Comuns'      },
                      { v:'rara',           label:'🔵 Raras'      },
                      { v:'epica',          label:'🟣 Épicas'     },
                      { v:'lendaria',       label:'⭐ Lendárias'  },
                    ].map(f => (
                      <button key={f.v} className="alb-filtro-btn" onClick={() => setFiltro(f.v)} style={{
                        padding:'6px 14px', borderRadius:8, cursor:'pointer',
                        fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11,
                        background: filtro===f.v ? 'rgba(245,166,35,.15)' : 'rgba(255,255,255,.05)',
                        border:`1px solid ${filtro===f.v ? '#f5a623' : 'rgba(255,255,255,.1)'}`,
                        color: filtro===f.v ? '#f5a623' : 'rgba(255,255,255,.5)',
                        transition:'all .15s',
                      }}>{f.label}</button>
                    ))}
                    <input
                      placeholder="Buscar..."
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      style={{ padding:'6px 12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#fff', fontSize:12, outline:'none', fontFamily:"'Exo 2',sans-serif" }}
                    />
                  </div>

                  {/* Grid de figurinhas */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:10 }}>
                    {figs.map(f => (
                      <CardFigurinha key={f.id} fig={f} onClick={f.desbloqueada ? setFigSel : null} />
                    ))}
                  </div>

                  {figs.length === 0 && (
                    <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:13 }}>
                      Nenhuma figurinha encontrada com esses filtros.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── ABA: PACOTES ── */}
          {aba === 'pacotes' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>

              {/* Pacote Comum */}
              {[
                { tipo:'comum',   emoji:'📦', nome:'Pacote Comum',   descr:'3 figurinhas · maior chance de comuns', cor:'#64748b', custo:50 },
                { tipo:'premium', emoji:'💎', nome:'Pacote Premium',  descr:'5 figurinhas · chance de épicas',        cor:'#8b5cf6', custo:120 },
                { tipo:'especial',emoji:'🏆', nome:'Pacote Especial', descr:'5 figurinhas com garantia de épica+ (professor)', cor:'#f5a623', custo:0 },
              ].map(pk => (
                <div key={pk.tipo} style={{
                  background:`linear-gradient(145deg,${pk.cor}18,${pk.cor}08)`,
                  border:`2px solid ${pk.cor}55`,
                  borderRadius:18, padding:24, textAlign:'center',
                  boxShadow:`0 0 20px ${pk.cor}22`,
                }}>
                  <div style={{ fontSize:52, marginBottom:12 }}>{pk.emoji}</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:15, fontWeight:900, color:'#fff', marginBottom:6 }}>{pk.nome}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginBottom:16, lineHeight:1.5 }}>{pk.descr}</div>
                  {pk.custo > 0 ? (
                    <div style={{ fontSize:18, fontWeight:900, color:pk.cor, marginBottom:16 }}>{pk.custo} XP</div>
                  ) : (
                    <div style={{ fontSize:13, color:pk.cor, fontWeight:700, marginBottom:16 }}>Distribuído pelo professor</div>
                  )}
                  {pk.tipo !== 'especial' ? (
                    <button
                      disabled={!alunoSel || abrindo}
                      onClick={() => { setPacoteTipo(pk.tipo); abrirPacote() }}
                      style={{
                        width:'100%', padding:'12px', borderRadius:11, border:'none', cursor:'pointer',
                        background:`linear-gradient(135deg,${pk.cor},${pk.cor}bb)`,
                        color: pk.tipo==='especial' ? '#0a1628' : '#fff',
                        fontFamily:"'Exo 2',sans-serif", fontWeight:900, fontSize:13,
                        opacity: alunoSel ? 1 : .5, transition:'all .2s',
                      }}
                    >
                      {abrindo ? 'Abrindo...' : `Abrir ${pk.nome}`}
                    </button>
                  ) : (
                    <button
                      disabled={!alunoSel}
                      onClick={distribuirPacote}
                      style={{
                        width:'100%', padding:'12px', borderRadius:11, border:'none', cursor:'pointer',
                        background:'linear-gradient(135deg,#f5a623,#d97706)',
                        color:'#0a1628',
                        fontFamily:"'Exo 2',sans-serif", fontWeight:900, fontSize:13,
                        opacity: alunoSel ? 1 : .5,
                      }}
                    >
                      Enviar para Aluno
                    </button>
                  )}
                </div>
              ))}

              {erro && (
                <div style={{ gridColumn:'1/-1', background:'rgba(231,76,60,.12)', border:'1px solid rgba(231,76,60,.3)', borderRadius:10, padding:'12px 16px', color:'#ff8a8a', fontSize:13 }}>
                  ⚠️ {erro}
                </div>
              )}

              {/* Info XP aluno */}
              {alunoSel && dados && (
                <div style={{ gridColumn:'1/-1', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12, padding:14, fontSize:13, color:'#22c55e', fontWeight:700 }}>
                  ⭐ XP disponível do aluno: <strong>{dados.xp_disponivel} XP</strong>
                </div>
              )}
            </div>
          )}

          {/* ── ABA: RANKING ── */}
          {aba === 'ranking' && (
            <div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:'#f5a623', marginBottom:16 }}>
                🏆 Ranking do Álbum
              </div>
              {ranking.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:13 }}>
                  Nenhum aluno coletou figurinhas ainda.
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ranking.map(r => (
                  <div key={r.aluno_id} style={{
                    display:'flex', alignItems:'center', gap:14,
                    background: r.posicao <= 3 ? 'rgba(245,166,35,.08)' : 'rgba(255,255,255,.03)',
                    border:`1px solid ${r.posicao <= 3 ? 'rgba(245,166,35,.3)' : 'rgba(255,255,255,.08)'}`,
                    borderRadius:12, padding:'12px 16px',
                  }}>
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, width:36, textAlign:'center',
                      color: r.posicao===1 ? '#f5a623' : r.posicao===2 ? '#94a3b8' : r.posicao===3 ? '#cd7f32' : 'rgba(255,255,255,.3)' }}>
                      {r.posicao <= 3 ? ['🥇','🥈','🥉'][r.posicao-1] : r.posicao}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{r.nome}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{r.turma}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:'#f5a623' }}>
                        {r.desbloqueadas}/{r.total}
                      </div>
                      <div style={{ background:'rgba(255,255,255,.08)', borderRadius:4, height:6, width:80, overflow:'hidden', marginTop:4 }}>
                        <div style={{ height:'100%', width:`${r.percentual}%`, background:'linear-gradient(90deg,#f5a623,#22c55e)' }} />
                      </div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:2 }}>{r.percentual}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modais */}
      <ModalFigurinha fig={figSel} onClose={() => setFigSel(null)} />
      <ModalPacote resultado={resultado} onClose={() => { setResultado(null); if (alunoSel) carregarAlbum(alunoSel) }} />
    </>
  )
}
