import React, { useState, useEffect, useCallback } from 'react'
import api from '../../api'

// ── Raridade ──────────────────────────────────────────────────
const RAR = {
  comum:    { label: 'Comum',    cor: '#94a3b8', brilho: 'rgba(148,163,184,.4)', bg: 'rgba(148,163,184,.12)' },
  rara:     { label: 'Rara',     cor: '#38bdf8', brilho: 'rgba(56,189,248,.5)',  bg: 'rgba(56,189,248,.12)'  },
  epica:    { label: 'Épica',    cor: '#c084fc', brilho: 'rgba(192,132,252,.6)', bg: 'rgba(192,132,252,.14)' },
  lendaria: { label: 'Lendária', cor: '#fbbf24', brilho: 'rgba(251,191,36,.8)', bg: 'rgba(251,191,36,.18)'  },
}

// ── SVG silhueta de jogador por posição ───────────────────────
function PlayerSilhouette({ pose = 'default', cor = '#FFE600', opacity = 0.55 }) {
  const shapes = {
    default: ( // correndo
      <g fill={cor} opacity={opacity}>
        <circle cx="40" cy="13" r="10"/>
        <path d="M28 25 Q40 21 52 25 L55 50 Q40 56 25 50 Z"/>
        <line x1="28" y1="30" x2="14" y2="20" stroke={cor} strokeWidth="8" strokeLinecap="round"/>
        <line x1="52" y1="30" x2="66" y2="42" stroke={cor} strokeWidth="8" strokeLinecap="round"/>
        <path d="M32 50 L26 74 L30 92 L38 90 L36 70 Z" stroke={cor} strokeWidth="2" fill={cor}/>
        <path d="M48 50 L58 72 L72 78 L74 70 L62 65 L54 48 Z" fill={cor}/>
      </g>
    ),
    goleiro: ( // posição de defesa com braços abertos
      <g fill={cor} opacity={opacity}>
        <circle cx="40" cy="13" r="10"/>
        <path d="M28 25 Q40 21 52 25 L54 52 Q40 58 26 52 Z"/>
        <line x1="28" y1="28" x2="6" y2="20" stroke={cor} strokeWidth="9" strokeLinecap="round"/>
        <line x1="52" y1="28" x2="74" y2="20" stroke={cor} strokeWidth="9" strokeLinecap="round"/>
        <path d="M33 52 L30 78 L36 90 L44 90 L40 76 L38 52 Z" fill={cor}/>
        <path d="M47 52 L50 78 L44 90 L36 90 L40 76 L42 52 Z" fill={cor}/>
      </g>
    ),
    chutando: ( // chute — atacante
      <g fill={cor} opacity={opacity}>
        <circle cx="38" cy="12" r="10"/>
        <path d="M26 24 Q38 20 50 24 L52 48 Q38 54 24 48 Z"/>
        <line x1="26" y1="28" x2="14" y2="38" stroke={cor} strokeWidth="8" strokeLinecap="round"/>
        <line x1="50" y1="28" x2="60" y2="18" stroke={cor} strokeWidth="8" strokeLinecap="round"/>
        <path d="M30 48 L24 72 L28 88 L36 86 L34 68 Z" fill={cor}/>
        <path d="M46 48 L60 68 L76 72 L78 64 L64 58 L52 44 Z" fill={cor}/>
        <circle cx="78" cy="74" r="7" fill={cor} opacity={opacity * 0.6}/>
      </g>
    ),
    comemorando: ( // braços levantados — lendária
      <g fill={cor} opacity={opacity}>
        <circle cx="40" cy="12" r="11"/>
        <path d="M27 26 Q40 22 53 26 L56 54 Q40 60 24 54 Z"/>
        <path d="M27 30 L12 12" stroke={cor} strokeWidth="9" strokeLinecap="round"/>
        <path d="M53 30 L68 12" stroke={cor} strokeWidth="9" strokeLinecap="round"/>
        <path d="M33 54 L28 80 L34 92 L42 92 L38 78 Z" fill={cor}/>
        <path d="M47 54 L52 80 L46 92 L38 92 L42 78 Z" fill={cor}/>
      </g>
    ),
  }
  const poseToPose = {
    'Goleiro': 'goleiro',
    'Atacante': 'chutando',
    'Ponta': 'chutando',
    'Lendária': 'comemorando',
    'lendaria': 'comemorando',
  }
  const key = poseToPose[pose] || shapes[pose] ? pose : 'default'
  return (
    <svg viewBox="0 0 80 100" width="100%" height="100%" style={{ display:'block' }}>
      {shapes[key] || shapes.default}
    </svg>
  )
}

// ── Mapa: colecao_id → imagem do mascote do país ─────────────
const COLECAO_IMG = {
  6:  '01_Brasil',
  7:  '02_Argentina',
  8:  '03_Franca',
  9:  '08_Portugal',
  10: '06_Espanha',
  11: '07_Inglaterra',
  12: '04_Alemanha',
}

function getImgSrc(fig) {
  const arquivo = COLECAO_IMG[fig.colecao_id]
  if (arquivo) return `/figurinhas/${arquivo}.png`
  return null
}

// ── Card individual ───────────────────────────────────────────
function CardFigurinha({ fig, onClick }) {
  const r          = RAR[fig.raridade] || RAR.comum
  const isLendaria = fig.raridade === 'lendaria'
  const imgSrc     = getImgSrc(fig)
  const bloqueada  = !fig.desbloqueada

  return (
    <div
      onClick={() => !bloqueada && onClick && onClick(fig)}
      style={{
        borderRadius: 14, overflow: 'hidden',
        position: 'relative',
        border: bloqueada ? '2px solid rgba(80,80,80,.5)' : `2px solid ${r.cor}`,
        boxShadow: bloqueada ? 'none' : `0 0 16px ${r.brilho}`,
        animation: (!bloqueada && isLendaria) ? 'glowLendaria 2s ease-in-out infinite' : 'none',
        transition: 'transform .2s, box-shadow .2s',
        cursor: bloqueada ? 'default' : 'pointer',
        background: '#111',
      }}
      onMouseEnter={e => { if (!bloqueada) { e.currentTarget.style.transform='translateY(-4px) scale(1.05)'; e.currentTarget.style.boxShadow=`0 8px 28px ${r.brilho}` }}}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow = bloqueada ? 'none' : `0 0 16px ${r.brilho}` }}
    >
      {/* ── Imagem do mascote (todos os cards) ── */}
      {imgSrc
        ? <img src={imgSrc} alt={fig.nome} style={{ width:'100%', display:'block',
            filter: bloqueada ? 'brightness(0.45) grayscale(0.6)' : 'brightness(1)',
            transition: 'filter .3s' }}
            onError={e => e.target.style.display='none'} />
        : <div style={{ minHeight:130, display:'flex', alignItems:'center', justifyContent:'center',
            background:`linear-gradient(160deg,${fig.cor_primaria||'#222'}cc,${fig.cor_secundaria||'#111'}ee)` }}>
            <span style={{ fontSize:36 }}>{fig.icone_emoji}</span>
          </div>
      }

      {/* ── Overlay bloqueado: cadeado central ── */}
      {bloqueada && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.35)',
          animation:'shimmerCopa 2.5s ease-in-out infinite' }}>
          <div style={{ fontSize:22, filter:'drop-shadow(0 0 6px rgba(255,220,0,.6))' }}>🔒</div>
        </div>
      )}

      {/* ── Rodapé com info (todos os cards) ── */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0,
        background:'linear-gradient(transparent, rgba(0,0,0,.92))',
        padding:'18px 5px 6px' }}>
        <div style={{ fontSize:9, fontWeight:900, color: bloqueada ? 'rgba(255,255,255,.4)' : '#fff',
          textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          textShadow:'0 1px 3px #000' }}>
          {bloqueada ? '???' : fig.nome}
        </div>
        <div style={{ fontSize:7, color: bloqueada ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.75)',
          textAlign:'center', marginTop:1 }}>
          {bloqueada ? fig.classe : fig.classe}
        </div>
        <div style={{ fontSize:7, fontWeight:900, textAlign:'center', marginTop:2,
          color: bloqueada ? 'rgba(255,255,255,.3)' : r.cor }}>
          {r.label.toUpperCase()}
        </div>
      </div>

      {/* ── Número no topo ── */}
      <div style={{ position:'absolute', top:4, left:5, fontSize:7, fontWeight:900,
        background:'rgba(0,0,0,.65)', color: bloqueada ? 'rgba(255,255,255,.4)' : '#fff',
        borderRadius:4, padding:'1px 4px', fontFamily:'monospace' }}>
        #{fig.numero}
      </div>

      {/* ── Badges extras (só desbloqueados) ── */}
      {!bloqueada && isLendaria && (
        <div style={{ position:'absolute', top:3, right:4, fontSize:11, filter:'drop-shadow(0 0 4px gold)', zIndex:5 }}>★</div>
      )}
      {!bloqueada && fig.quantidade > 1 && (
        <div style={{ position:'absolute', bottom:4, right:4, fontSize:8, color:'#fbbf24', fontWeight:900,
          background:'rgba(0,0,0,.7)', borderRadius:4, padding:'1px 5px', zIndex:5 }}>
          x{fig.quantidade}
        </div>
      )}
    </div>
  )
}

// ── Modal figurinha ───────────────────────────────────────────
function ModalFigurinha({ fig, onClose }) {
  if (!fig) return null
  const r = RAR[fig.raridade] || RAR.comum
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.82)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:`linear-gradient(145deg,${fig.cor_primaria}33,#0a0f1e)`,
        border:`2px solid ${r.cor}`,
        borderRadius:22, padding:30, maxWidth:380, width:'100%',
        boxShadow:`0 0 60px ${r.brilho}`,
        animation:'modalIn .35s cubic-bezier(.175,.885,.32,1.275)',
      }}>
        {/* Cabeçalho */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:80, lineHeight:1, marginBottom:10, filter:`drop-shadow(0 0 16px ${r.brilho})`, animation:'float 3s ease-in-out infinite' }}>
            {fig.icone_emoji}
          </div>
          <div style={{ fontSize:10, color:r.cor, fontWeight:900, letterSpacing:3, marginBottom:4 }}>
            #{fig.numero} · {r.label.toUpperCase()}
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,.5)' }}>{fig.nome}</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:8 }}>
            <span style={{ fontSize:11, background:'rgba(255,255,255,.1)', padding:'3px 12px', borderRadius:8, color:'rgba(255,255,255,.7)' }}>{fig.classe}</span>
            <span style={{ fontSize:11, background:r.bg, padding:'3px 12px', borderRadius:8, color:r.cor, border:`1px solid ${r.cor}44` }}>{fig.colecao_nome}</span>
          </div>
        </div>

        {/* Desafio */}
        <div style={{ background:'rgba(0,0,0,.35)', border:`1px solid ${r.cor}44`, borderRadius:14, padding:'14px 18px', marginBottom:14 }}>
          <div style={{ fontSize:9, color:r.cor, fontWeight:900, letterSpacing:2, marginBottom:8 }}>🧠 DESAFIO EDUCACIONAL</div>
          <div style={{ fontSize:13, color:'#fff', lineHeight:1.7 }}>{fig.poder}</div>
        </div>

        {fig.xp_bonus > 0 && (
          <div style={{ fontSize:12, color:'#22c55e', fontWeight:700, textAlign:'center', marginBottom:14 }}>
            ⭐ +{fig.xp_bonus} XP ao responder corretamente
          </div>
        )}

        <button onClick={onClose} style={{
          width:'100%', padding:'12px', marginTop:4,
          background:'rgba(255,255,255,.08)', border:`1px solid rgba(255,255,255,.15)`,
          borderRadius:12, color:'rgba(255,255,255,.75)', cursor:'pointer', fontSize:13, fontWeight:700,
          transition:'background .2s',
        }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}
           onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Modal abertura de pacote ──────────────────────────────────
function ModalPacote({ resultado, onClose }) {
  const [revelando, setRevelando] = useState([])

  useEffect(() => {
    if (!resultado) return
    setRevelando([])
    resultado.pacote.forEach((fig, i) => {
      setTimeout(() => setRevelando(prev => [...prev, fig]), i * 550)
    })
  }, [resultado])

  if (!resultado) return null
  const r = RAR

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ fontSize:22, fontWeight:900, color:'#fbbf24', marginBottom:24, letterSpacing:3, textShadow:'0 0 20px rgba(251,191,36,.6)' }}>
        ⚽ PACOTE ABERTO!
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'center', maxWidth:520 }}>
        {revelando.map((fig, i) => {
          const rar = r[fig.raridade] || r.comum
          return (
            <div key={i} style={{
              width:96, height:134,
              border:`2px solid ${rar.cor}`,
              borderRadius:14,
              boxShadow:`0 0 24px ${rar.brilho}`,
              animation:'cardReveal .6s cubic-bezier(.175,.885,.32,1.275)',
              position:'relative', overflow:'hidden',
              background: `linear-gradient(160deg, ${fig.cor_primaria}cc, ${fig.cor_secundaria}ee)`,
            }}>
              {/* Imagem do mascote */}
              {(() => { const src = getImgSrc(fig); return src ? (
                <img src={src} alt={fig.nome}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}
                  onError={e => e.target.style.display='none'}
                />
              ) : (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:32 }}>{fig.icone_emoji}</span>
                </div>
              )})()}

              {/* Overlay gradiente no rodapé */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0,
                background:'linear-gradient(transparent 35%, rgba(0,0,0,.92))', padding:'20px 5px 6px', borderRadius:'0 0 12px 12px' }}>
                <div style={{ fontSize:8, fontWeight:900, color:'#fff', textAlign:'center', lineHeight:1.2,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fig.nome}</div>
                <div style={{ fontSize:7, color:'rgba(255,255,255,.7)', textAlign:'center' }}>{fig.classe}</div>
                <div style={{ fontSize:7, fontWeight:900, textAlign:'center', color:rar.cor, marginTop:1 }}>{rar.label.toUpperCase()}</div>
              </div>

              {/* Número */}
              <div style={{ position:'absolute', top:4, left:5, fontSize:7, color:'#fff', fontWeight:900,
                background:'rgba(0,0,0,.6)', borderRadius:3, padding:'1px 3px', fontFamily:'monospace' }}>#{fig.numero}</div>

              {fig.duplicata && (
                <div style={{ position:'absolute', top:3, right:3, background:'#64748b', color:'#fff',
                  fontSize:7, borderRadius:5, padding:'1px 5px', fontWeight:900, zIndex:5 }}>DUP</div>
              )}
            </div>
          )
        })}
      </div>
      {revelando.length >= resultado.pacote.length && (
        <div style={{ marginTop:28, textAlign:'center' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:18 }}>
            ✅ {resultado.novas} nova{resultado.novas !== 1 ? 's' : ''} &nbsp;·&nbsp; {resultado.duplicatas} duplicata{resultado.duplicatas !== 1 ? 's' : ''}
          </div>
          <button onClick={onClose} style={{ padding:'13px 36px', background:'linear-gradient(135deg,#f5a623,#d97706)', border:'none', borderRadius:14, color:'#0a1628', fontWeight:900, fontSize:14, cursor:'pointer', boxShadow:'0 4px 20px rgba(245,166,35,.4)' }}>
            Ver Álbum ⚽
          </button>
        </div>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
// ── Banner Copa do Mundo 2026 (tela inicial) ─────────────────
function BannerCopa() {
  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
      minHeight: 380,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #0a2a0a 0%, #0d3d0d 30%, #0a2e1a 60%, #071a07 100%)',
      border: '2px solid rgba(0,180,0,.3)',
      boxShadow: '0 0 60px rgba(0,150,0,.2)',
    }}>
      {/* Gramado com faixas */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', opacity:.25 }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ position:'absolute', top:0, bottom:0, left:`${i*12.5}%`, width:'12.5%', background: i%2===0 ? 'rgba(0,120,0,.6)' : 'transparent' }}/>
        ))}
        {/* Linha central */}
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:2, background:'rgba(255,255,255,.4)', transform:'translateY(-50%)' }}/>
        {/* Círculo central */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:140, height:140, border:'2px solid rgba(255,255,255,.35)', borderRadius:'50%' }}/>
        {/* Arcos de gol */}
        <div style={{ position:'absolute', top:'20%', bottom:'20%', left:8, width:40, border:'2px solid rgba(255,255,255,.3)', borderRadius:4 }}/>
        <div style={{ position:'absolute', top:'20%', bottom:'20%', right:8, width:40, border:'2px solid rgba(255,255,255,.3)', borderRadius:4 }}/>
      </div>

      {/* Partículas douradas */}
      {[...Array(12)].map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          width: 4 + (i%3)*3,
          height: 4 + (i%3)*3,
          borderRadius:'50%',
          background:'#FFD700',
          top: `${10 + (i * 7.3) % 80}%`,
          left: `${5 + (i * 8.1) % 90}%`,
          opacity: .3 + (i%4)*.15,
          animation:`float ${2 + i%3}s ease-in-out infinite`,
          animationDelay:`${i * .3}s`,
        }}/>
      ))}

      {/* Conteúdo central */}
      <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'40px 20px' }}>

        {/* Troféu SVG */}
        <div style={{ fontSize:72, marginBottom:8, filter:'drop-shadow(0 0 20px rgba(255,210,0,.8))', animation:'float 3s ease-in-out infinite' }}>🏆</div>

        {/* BRASIL */}
        <div style={{
          fontFamily:"'Orbitron',sans-serif", fontWeight:900,
          fontSize:'clamp(38px,7vw,72px)',
          background:'linear-gradient(180deg,#22c55e 0%,#00ff44 40%,#FFD700 60%,#f5a000 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text',
          filter:'drop-shadow(0 4px 12px rgba(0,200,0,.5)) drop-shadow(0 0 30px rgba(255,210,0,.4))',
          lineHeight:1, marginBottom:4, letterSpacing:6,
          textShadow:'none',
        }}>
          BRASIL
        </div>

        {/* COPA DO MUNDO */}
        <div style={{
          fontFamily:"'Orbitron',sans-serif", fontWeight:700,
          fontSize:'clamp(13px,2.5vw,22px)',
          color:'#fff',
          letterSpacing:8, marginBottom:4,
          textShadow:'0 2px 10px rgba(0,0,0,.8)',
        }}>
          COPA DO MUNDO
        </div>

        {/* 2026 */}
        <div style={{
          fontFamily:"'Orbitron',sans-serif", fontWeight:900,
          fontSize:'clamp(42px,8vw,80px)',
          background:'linear-gradient(180deg,#FFD700 0%,#f5a000 50%,#cc7700 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text',
          filter:'drop-shadow(0 4px 16px rgba(255,180,0,.6))',
          lineHeight:1, letterSpacing:8,
        }}>
          2026
        </div>

        {/* Bola + bandeira */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:16, marginBottom:20 }}>
          <div style={{ fontSize:32, animation:'float 2s ease-in-out infinite', animationDelay:'.5s' }}>🇧🇷</div>
          <div style={{ fontSize:42, filter:'drop-shadow(0 0 10px rgba(255,255,255,.4))', animation:'float 2.5s ease-in-out infinite' }}>⚽</div>
          <div style={{ fontSize:32, animation:'float 2s ease-in-out infinite', animationDelay:'1s' }}>🏟️</div>
        </div>

        {/* Instrução */}
        <div style={{
          background:'rgba(0,0,0,.5)', backdropFilter:'blur(8px)',
          border:'1px solid rgba(255,210,0,.4)',
          borderRadius:12, padding:'10px 24px',
          fontSize:13, color:'rgba(255,255,255,.8)',
          fontFamily:"'Exo 2',sans-serif", fontWeight:700,
          letterSpacing:1,
        }}>
          👆 Selecione um aluno para ver o álbum
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:24, justifyContent:'center', marginTop:18 }}>
          {[{n:'50',l:'Jogadores'},{n:'8',l:'Seleções'},{n:'4',l:'Raridades'}].map(s => (
            <div key={s.l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22, fontWeight:900, color:'#FFD700' }}>{s.n}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', letterSpacing:1, textTransform:'uppercase' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Premiar alunos por nota em uma avaliação ─────────────────
function PremiarPorNota() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [avalId, setAvalId]         = useState('')
  const [notaMin, setNotaMin]       = useState(7)
  const [tipoPk, setTipoPk]         = useState('comum')
  const [loading, setLoading]       = useState(false)
  const [resultado, setResultado]   = useState(null)
  const [erro, setErro]             = useState('')

  useEffect(() => {
    api.get('/avaliacoes').then(({ data }) => setAvaliacoes(Array.isArray(data) ? data : data.avaliacoes || [])).catch(() => {})
  }, [])

  async function premiar() {
    if (!avalId) return
    setLoading(true); setErro(''); setResultado(null)
    try {
      const { data } = await api.post('/album/premiar-por-nota', {
        avaliacao_id: parseInt(avalId),
        nota_minima: parseFloat(notaMin),
        tipo: tipoPk,
      })
      setResultado(data)
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao premiar alunos.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ gridColumn:'1/-1', background:'linear-gradient(145deg,rgba(34,197,94,.08),rgba(251,191,36,.06))', border:'1px solid rgba(34,197,94,.3)', borderRadius:18, padding:22 }}>
      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:900, color:'#22c55e', marginBottom:14 }}>
        📝 Premiar Alunos por Nota
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 120px auto', gap:10, alignItems:'end', flexWrap:'wrap' }}>
        <div>
          <label style={{ fontSize:10, color:'rgba(255,255,255,.45)', letterSpacing:1, display:'block', marginBottom:5 }}>AVALIAÇÃO</label>
          <select value={avalId} onChange={e=>setAvalId(e.target.value)} style={{ width:'100%', padding:'9px 12px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:9, color:'#fff', fontSize:13, outline:'none' }}>
            <option value="">— Selecione —</option>
            {avaliacoes.map(a => <option key={a.id} value={a.id}>{a.titulo} · {a.disciplina}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:10, color:'rgba(255,255,255,.45)', letterSpacing:1, display:'block', marginBottom:5 }}>NOTA MÍN.</label>
          <input type="number" min="0" max="10" step="0.5" value={notaMin} onChange={e=>setNotaMin(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:9, color:'#fff', fontSize:13, outline:'none', textAlign:'center' }}/>
        </div>
        <div>
          <label style={{ fontSize:10, color:'rgba(255,255,255,.45)', letterSpacing:1, display:'block', marginBottom:5 }}>TIPO PACOTE</label>
          <select value={tipoPk} onChange={e=>setTipoPk(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:9, color:'#fff', fontSize:13, outline:'none' }}>
            <option value="comum">📦 Comum (3 cartas)</option>
            <option value="premium">💎 Premium (5 cartas)</option>
            <option value="especial">🏆 Especial (épicas)</option>
          </select>
        </div>
        <button disabled={!avalId||loading} onClick={premiar} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#22c55e,#15803d)', border:'none', borderRadius:9, color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer', opacity:avalId?1:.5, whiteSpace:'nowrap' }}>
          {loading ? 'Premiando...' : '⚽ Premiar'}
        </button>
      </div>
      {erro && <div style={{ marginTop:12, color:'#f87171', fontSize:12 }}>⚠️ {erro}</div>}
      {resultado && (
        <div style={{ marginTop:14, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', borderRadius:10, padding:'12px 16px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#22c55e', marginBottom:8 }}>
            ✅ {resultado.premiados} aluno{resultado.premiados!==1?'s':''} premiado{resultado.premiados!==1?'s':''}!
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {(resultado.resultados||[]).map((r,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.06)', borderRadius:7, padding:'4px 10px', fontSize:11, color:'rgba(255,255,255,.7)' }}>
                {r.aluno} · {r.nota} · +{r.cartas} carta{r.cartas!==1?'s':''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Album() {
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

  useEffect(() => {
    api.get('/alunos').then(({ data }) => setAlunos(Array.isArray(data) ? data : data.alunos || [])).catch(() => {})
  }, [])

  const carregarAlbum = useCallback(async (aId) => {
    if (!aId) return
    setLoading(true); setErro('')
    try { const { data } = await api.get(`/album/meu-album/${aId}`); setDados(data) }
    catch { setErro('Erro ao carregar o álbum.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (alunoSel) carregarAlbum(alunoSel) }, [alunoSel, carregarAlbum])

  useEffect(() => {
    if (aba !== 'ranking') return
    api.get('/album/ranking').then(({ data }) => setRanking(data.ranking || [])).catch(() => {})
  }, [aba])

  async function abrirPacote() {
    if (!alunoSel) return
    setAbrindo(true); setErro('')
    try {
      const { data } = await api.post('/album/abrir-pacote', { aluno_id: alunoSel, tipo: pacoteTipo })
      setResultado(data)
      carregarAlbum(alunoSel)
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao abrir pacote.') }
    finally { setAbrindo(false) }
  }

  async function distribuirPacote() {
    if (!alunoSel) return
    try {
      const { data } = await api.post('/album/distribuir', { aluno_id: alunoSel })
      setResultado(data)
      carregarAlbum(alunoSel)
    } catch { setErro('Erro ao distribuir pacote.') }
  }

  const figs = dados?.figurinhas?.filter(f => {
    if (filtro === 'desbloqueadas' && !f.desbloqueada) return false
    if (filtro === 'bloqueadas'    &&  f.desbloqueada) return false
    if (!['todos','desbloqueadas','bloqueadas'].includes(filtro) && f.raridade !== filtro) return false
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  }) || []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;700;900&display=swap');

        @keyframes shimmerCopa {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glowLendaria {
          0%,100% { box-shadow: 0 0 18px rgba(251,191,36,.7); }
          50%     { box-shadow: 0 0 36px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,.4); }
        }
        @keyframes cardReveal {
          from { opacity:0; transform:scale(.4) rotate(-15deg); }
          to   { opacity:1; transform:scale(1) rotate(0); }
        }
        @keyframes modalIn {
          from { opacity:0; transform:scale(.85) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes float {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:.4; }
        }
        .tab-btn:hover  { background:rgba(245,166,35,.1)!important; border-color:rgba(245,166,35,.4)!important; }
        .filt-btn:hover { background:rgba(255,255,255,.1)!important; }
      `}</style>

      {/* Fundo Copa 2026 — gramado escuro com detalhes */}
      <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
        {/* Base verde escuro */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,#031a03 0%,#062b06 35%,#041f10 65%,#031508 100%)' }}/>
        {/* Faixas de gramado */}
        {[...Array(10)].map((_,i) => (
          <div key={i} style={{ position:'absolute', top:0, bottom:0, left:`${i*10}%`, width:'10%', background: i%2===0 ? 'rgba(0,80,0,.18)' : 'transparent' }}/>
        ))}
        {/* Glow dourado superior */}
        <div style={{ position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)', width:'60%', height:300, background:'radial-gradient(ellipse,rgba(255,200,0,.12) 0%,transparent 70%)' }}/>
        {/* Glow verde inferior */}
        <div style={{ position:'absolute', bottom:-60, left:'50%', transform:'translateX(-50%)', width:'80%', height:200, background:'radial-gradient(ellipse,rgba(0,180,0,.1) 0%,transparent 70%)' }}/>
        {/* Partículas */}
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ position:'absolute', width:3+i%3*2, height:3+i%3*2, borderRadius:'50%', background:'#FFD700', top:`${8+(i*11.3)%82}%`, left:`${4+(i*12.7)%90}%`, opacity:.12+i%4*.06, animation:`float ${2+i%3}s ease-in-out infinite`, animationDelay:`${i*.4}s` }}/>
        ))}
      </div>

      <div style={{ minHeight:'100vh', position:'relative', zIndex:1, color:'#e8eaf0', fontFamily:"'Exo 2',sans-serif", padding:'20px 16px 60px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
            <div style={{ fontSize:44, filter:'drop-shadow(0 0 10px rgba(251,191,36,.5))', animation:'float 3s ease-in-out infinite' }}>⚽</div>
            <div>
              <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(18px,3vw,26px)', fontWeight:900, color:'#fbbf24', textShadow:'0 0 24px rgba(251,191,36,.5)', margin:0 }}>
                Copa do Mundo 2026
              </h1>
              <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:2, textTransform:'uppercase' }}>
                Álbum Oficial · 50 Jogadores · 8 Seleções
              </p>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            {[{id:'album',label:'🎴 Álbum'},{id:'pacotes',label:'📦 Pacotes'},{id:'ranking',label:'🏆 Ranking'}].map(a => (
              <button key={a.id} className="tab-btn" onClick={() => setAba(a.id)} style={{
                padding:'8px 18px', borderRadius:10, cursor:'pointer',
                fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:13,
                background: aba===a.id ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.04)',
                border:`1.5px solid ${aba===a.id ? '#fbbf24' : 'rgba(255,255,255,.1)'}`,
                color: aba===a.id ? '#fbbf24' : 'rgba(255,255,255,.55)', transition:'all .2s',
              }}>{a.label}</button>
            ))}
          </div>

          {/* Seletor aluno */}
          <div style={{ background:'rgba(0,0,0,.45)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,210,0,.2)', borderRadius:14, padding:16, marginBottom:20 }}>
            <label style={{ fontSize:11, color:'#fbbf24', fontWeight:700, letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:8 }}>
              Selecionar Aluno
            </label>
            <select value={alunoSel||''} onChange={e=>setAlunoSel(e.target.value?parseInt(e.target.value):null)} style={{
              width:'100%', maxWidth:420, padding:'10px 14px',
              background:'rgba(255,255,255,.07)', border:'1.5px solid rgba(255,255,255,.15)',
              borderRadius:10, color:'#fff', fontSize:14, outline:'none', fontFamily:"'Exo 2',sans-serif",
            }}>
              <option value="">— Escolha um aluno —</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} · {a.turma}</option>)}
            </select>
          </div>

          {/* ABA ÁLBUM */}
          {aba==='album' && (
            <>
              {!alunoSel && <BannerCopa />}
              {alunoSel && loading && (
                <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.4)' }}>Carregando...</div>
              )}
              {alunoSel && dados && !loading && (
                <>
                  {/* Progresso */}
                  <div style={{ background:'linear-gradient(135deg,rgba(0,60,0,.6),rgba(255,210,0,.06))', border:'1px solid rgba(255,210,0,.25)', borderRadius:16, padding:18, marginBottom:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:900, color:'#fbbf24' }}>
                          {dados.desbloqueadas} <span style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>/ {dados.total} jogadores</span>
                        </div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', letterSpacing:2, marginTop:2 }}>ÁLBUM COPA 2026</div>
                      </div>
                      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                        {Object.entries(dados.stats||{}).map(([rar,s]) => (
                          <div key={rar} style={{ textAlign:'center' }}>
                            <div style={{ fontSize:14, fontWeight:900, color:RAR[rar]?.cor||'#fff' }}>{s.desbloqueadas}/{s.total}</div>
                            <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:1 }}>{RAR[rar]?.label||rar}</div>
                          </div>
                        ))}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:14, fontWeight:900, color:'#22c55e' }}>{dados.xp_disponivel}</div>
                          <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:1 }}>XP</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:8, height:12, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${dados.percentual}%`, background:'linear-gradient(90deg,#009C3B,#FFDF00,#f5a623)', borderRadius:8, transition:'width 1s ease', boxShadow:'0 0 10px rgba(255,220,0,.4)' }}/>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:6, textAlign:'right' }}>{dados.percentual}% completo</div>
                  </div>

                  {/* Filtros */}
                  <div style={{ display:'flex', gap:7, marginBottom:16, flexWrap:'wrap' }}>
                    {[
                      {v:'todos',l:'Todos'},{v:'desbloqueadas',l:'✅ Coletados'},{v:'bloqueadas',l:'🔒 Faltando'},
                      {v:'comum',l:'⬜ Comuns'},{v:'rara',l:'🔵 Raras'},{v:'epica',l:'🟣 Épicas'},{v:'lendaria',l:'⭐ Lendárias'},
                    ].map(f => (
                      <button key={f.v} className="filt-btn" onClick={()=>setFiltro(f.v)} style={{
                        padding:'6px 13px', borderRadius:8, cursor:'pointer',
                        fontFamily:"'Exo 2',sans-serif", fontWeight:700, fontSize:11,
                        background: filtro===f.v?'rgba(251,191,36,.15)':'rgba(255,255,255,.05)',
                        border:`1px solid ${filtro===f.v?'#fbbf24':'rgba(255,255,255,.1)'}`,
                        color: filtro===f.v?'#fbbf24':'rgba(255,255,255,.5)', transition:'all .15s',
                      }}>{f.l}</button>
                    ))}
                    <input placeholder="Buscar jogador..." value={busca} onChange={e=>setBusca(e.target.value)} style={{
                      padding:'6px 12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                      borderRadius:8, color:'#fff', fontSize:12, outline:'none', fontFamily:"'Exo 2',sans-serif",
                    }}/>
                  </div>

                  {/* Grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))', gap:10 }}>
                    {figs.map(f => <CardFigurinha key={f.id} fig={f} onClick={f.desbloqueada?setFigSel:null}/>)}
                  </div>
                  {figs.length===0 && <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)' }}>Nenhum jogador encontrado.</div>}
                </>
              )}
            </>
          )}

          {/* ABA PACOTES */}
          {aba==='pacotes' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
              {[
                {tipo:'comum',  emoji:'📦',cor:'#64748b',nome:'Pacote Comum',  desc:'3 cartas · maioria comuns',           custo:50  },
                {tipo:'premium',emoji:'💎',cor:'#8b5cf6',nome:'Pacote Premium', desc:'5 cartas · chance de épicas',          custo:120 },
                {tipo:'especial',emoji:'🏆',cor:'#fbbf24',nome:'Pacote Especial',desc:'5 cartas garantidas épica+ (professor)',custo:0   },
              ].map(pk => (
                <div key={pk.tipo} style={{ background:`linear-gradient(145deg,${pk.cor}18,${pk.cor}06)`, border:`2px solid ${pk.cor}55`, borderRadius:18, padding:24, textAlign:'center', boxShadow:`0 0 24px ${pk.cor}18` }}>
                  <div style={{ fontSize:52, marginBottom:12, filter:`drop-shadow(0 0 10px ${pk.cor})`, animation:'float 3s ease-in-out infinite' }}>{pk.emoji}</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:15, fontWeight:900, color:'#fff', marginBottom:6 }}>{pk.nome}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:16, lineHeight:1.5 }}>{pk.desc}</div>
                  {pk.custo > 0
                    ? <div style={{ fontSize:20, fontWeight:900, color:pk.cor, marginBottom:16 }}>{pk.custo} XP</div>
                    : <div style={{ fontSize:13, color:pk.cor, fontWeight:700, marginBottom:16 }}>Sem custo de XP</div>
                  }
                  <button disabled={!alunoSel||abrindo} onClick={()=>{setPacoteTipo(pk.tipo);pk.tipo==='especial'?distribuirPacote():abrirPacote()}} style={{
                    width:'100%', padding:'12px', borderRadius:11, border:'none', cursor:'pointer',
                    background:`linear-gradient(135deg,${pk.cor},${pk.cor}bb)`,
                    color:pk.tipo==='especial'?'#0a1628':'#fff',
                    fontFamily:"'Exo 2',sans-serif", fontWeight:900, fontSize:13,
                    opacity:alunoSel?1:.5, transition:'all .2s',
                    boxShadow:alunoSel?`0 4px 18px ${pk.cor}44`:'none',
                  }}>
                    {abrindo?'Abrindo...':pk.tipo==='especial'?'Enviar para Aluno':`Abrir ${pk.nome}`}
                  </button>
                </div>
              ))}
              {/* Premiar por Nota */}
              <PremiarPorNota />

              {erro && <div style={{ gridColumn:'1/-1', background:'rgba(231,76,60,.12)', border:'1px solid rgba(231,76,60,.3)', borderRadius:10, padding:'12px 16px', color:'#ff8a8a', fontSize:13 }}>⚠️ {erro}</div>}
              {alunoSel && dados && <div style={{ gridColumn:'1/-1', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12, padding:14, fontSize:13, color:'#22c55e', fontWeight:700 }}>⭐ XP disponível: {dados.xp_disponivel} XP</div>}

              {/* Info ganhar cartas automaticamente */}
              <div style={{ gridColumn:'1/-1', background:'rgba(251,191,36,.06)', border:'1px solid rgba(251,191,36,.2)', borderRadius:14, padding:18 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, fontWeight:900, color:'#fbbf24', marginBottom:12 }}>⚽ Como os alunos ganham cartas automaticamente</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                  {[
                    { emoji:'🎯', titulo:'Quiz Interativo', desc:'70–89% → Pacote Comum (3 cartas)\n90%+ → Pacote Premium (5 cartas)' },
                    { emoji:'🎓', titulo:'Missão ItagGame', desc:'Professor aprova missão → aluno recebe Pacote Especial (5 cartas épicas+)' },
                    { emoji:'📝', titulo:'Por Nota', desc:'Professor define nota mínima → todos que passaram ganham cartas' },
                  ].map(g => (
                    <div key={g.titulo} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:22, marginBottom:6 }}>{g.emoji}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:4 }}>{g.titulo}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', lineHeight:1.5, whiteSpace:'pre-line' }}>{g.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA RANKING */}
          {aba==='ranking' && (
            <div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:'#fbbf24', marginBottom:16 }}>🏆 Ranking do Álbum</div>
              {ranking.length===0 && <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)' }}>Nenhum aluno coletou cartas ainda.</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ranking.map(r => (
                  <div key={r.aluno_id} style={{ display:'flex', alignItems:'center', gap:14, background:r.posicao<=3?'rgba(251,191,36,.08)':'rgba(255,255,255,.03)', border:`1px solid ${r.posicao<=3?'rgba(251,191,36,.3)':'rgba(255,255,255,.08)'}`, borderRadius:12, padding:'12px 16px' }}>
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:900, width:36, textAlign:'center', color:r.posicao===1?'#fbbf24':r.posicao===2?'#94a3b8':r.posicao===3?'#cd7f32':'rgba(255,255,255,.3)' }}>
                      {r.posicao<=3?['🥇','🥈','🥉'][r.posicao-1]:r.posicao}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{r.nome}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{r.turma}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:'#fbbf24' }}>{r.desbloqueadas}/{r.total}</div>
                      <div style={{ background:'rgba(255,255,255,.08)', borderRadius:4, height:6, width:80, overflow:'hidden', marginTop:4 }}>
                        <div style={{ height:'100%', width:`${r.percentual}%`, background:'linear-gradient(90deg,#009C3B,#FFDF00)' }}/>
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

      <ModalFigurinha fig={figSel} onClose={()=>setFigSel(null)}/>
      <ModalPacote resultado={resultado} onClose={()=>{setResultado(null);if(alunoSel)carregarAlbum(alunoSel)}}/>
    </>
  )
}
