import React, { useState, useEffect } from 'react'
import api from '../api'

// ── Turmas da escola ─────────────────────────────────────────────────────────
const TURMAS = ['6A','6B','7A','7B','8A','8B','9A','9B','9C']

// ── Escola padrão (para inscrições públicas) ─────────────────────────────────
function getEscolaId() {
  try { return JSON.parse(localStorage.getItem('usuario') || '{}').escola_id || 1 }
  catch { return 1 }
}

// ── Cronograma ───────────────────────────────────────────────────────────────
const CRONOGRAMA = [
  { semana:'Semana 1', titulo:'Divulgação e Inscrições',            icon:'📣', cor:'#1d4ed8' },
  { semana:'Semana 2', titulo:'Eliminatórias por Turma',            icon:'🏫', cor:'#7c3aed' },
  { semana:'Semana 3', titulo:'Classificatória dos Representantes', icon:'📊', cor:'#0891b2' },
  { semana:'Semana 4', titulo:'Quartas de Final',                   icon:'⚔️', cor:'#b45309' },
  { semana:'Semana 5', titulo:'Semifinais',                         icon:'🔥', cor:'#b91c1c' },
  { semana:'Semana 6', titulo:'Final + Cerimônia de Premiação',     icon:'🏆', cor:'#d97706' },
]

const PREMIACOES = [
  { medal:'🥇', titulo:'Campeão do CEITEC',     desc:'Melhor tempo na Grande Final'        },
  { medal:'🥈', titulo:'Vice-Campeão',           desc:'2º lugar na Grande Final'            },
  { medal:'🥉', titulo:'3º Lugar',               desc:'Disputa de 3º lugar'                 },
  { medal:'🏅', titulo:'Melhor Tempo Geral',     desc:'Menor tempo de toda a competição'    },
  { medal:'🏅', titulo:'Campeão de Cada Turma',  desc:'9 campeões (um por turma)'           },
]

// ── Chaveamento inicial (vazio) ───────────────────────────────────────────────
function chaveamentoVazio() {
  return {
    classificados: Array(9).fill(''),   // posições 1-9
    quartas: [
      { chave:'1', a:'', b:'' },
      { chave:'2', a:'', b:'' },
      { chave:'3', a:'', b:'' },
      { chave:'4', a:'', b:'' },
    ],
    semi: [
      { sf:'Semifinal 1', a:'', b:'' },
      { sf:'Semifinal 2', a:'', b:'' },
    ],
    terceiro:  { a:'', b:'' },
    final:     { a:'', b:'', campeao:'' },
  }
}

export default function CuboMagico() {
  const [aba,        setAba]        = useState('inscricao')
  const [inscricoes, setInscricoes] = useState([])  // lista do backend
  const [nome,       setNome]       = useState('')
  const [turma,      setTurma]      = useState('')
  const [salvando,   setSalvando]   = useState(false)
  const [msg,        setMsg]        = useState(null) // { tipo:'ok'|'erro', texto }
  const [chave,      setChave]      = useState(chaveamentoVazio())
  const [salvandoCh, setSalvandoCh] = useState(false)
  const [msgCh,      setMsgCh]      = useState(null)
  const isAdmin = ['ita_admin','coordenador'].includes(
    (() => { try { return JSON.parse(localStorage.getItem('usuario')||'{}').perfil } catch { return '' } })()
  )

  // ── Carregar inscrições ────────────────────────────────────────────────────
  useEffect(() => {
    carregarInscricoes()
    if (isAdmin) carregarChaveamento()
  }, [])

  async function carregarInscricoes() {
    try {
      const { data } = await api.get('/cubo/inscricoes')
      setInscricoes(data)
    } catch { setInscricoes([]) }
  }

  async function carregarChaveamento() {
    try {
      const { data } = await api.get('/cubo/chaveamento')
      if (data) setChave(data)
    } catch {}
  }

  // ── Inscrever aluno ────────────────────────────────────────────────────────
  async function inscrever(e) {
    e.preventDefault()
    if (!nome.trim() || !turma) return
    setSalvando(true); setMsg(null)
    try {
      const escola_id = getEscolaId()
      await api.post('/cubo/inscricoes', { nome: nome.trim(), turma, escola_id })
      setMsg({ tipo:'ok', texto:`✅ ${nome.trim()} inscrito(a) na turma ${turma}!` })
      setNome(''); setTurma('')
      carregarInscricoes()
    } catch (err) {
      setMsg({ tipo:'erro', texto: err.response?.data?.erro || 'Erro ao inscrever' })
    } finally { setSalvando(false) }
  }

  // ── Remover inscrição ──────────────────────────────────────────────────────
  async function remover(id) {
    if (!window.confirm('Remover inscrição?')) return
    try {
      await api.delete(`/cubo/inscricoes/${id}`)
      setInscricoes(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

  // ── Salvar chaveamento ─────────────────────────────────────────────────────
  async function salvarChaveamento() {
    setSalvandoCh(true); setMsgCh(null)
    try {
      await api.post('/cubo/chaveamento', chave)
      setMsgCh({ tipo:'ok', texto:'✅ Chaveamento salvo!' })
    } catch {
      setMsgCh({ tipo:'erro', texto:'Erro ao salvar' })
    } finally { setSalvandoCh(false) }
  }

  // Agrupa inscrições por turma
  const porTurma = TURMAS.reduce((acc, t) => {
    acc[t] = inscricoes.filter(i => i.turma === t)
    return acc
  }, {})

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;600;700;900&display=swap');
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,.4)} 50%{box-shadow:0 0 40px rgba(251,191,36,.8)} }
        @keyframes slide  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        .cubo-tab { transition:all .25s; cursor:pointer; border:none; font-family:'Exo 2',sans-serif; }
        .cubo-tab:hover { transform:translateY(-2px); }
        .chave-card { transition:all .25s; }
        .chave-card:hover { transform:translateY(-3px); }
        input.cubo-input {
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.2);
          border-radius:10px; color:#fff; padding:10px 14px;
          font-size:13px; font-family:'Exo 2',sans-serif;
          outline:none; transition:border .2s; width:100%; box-sizing:border-box;
        }
        input.cubo-input:focus { border-color:#3b82f6; background:rgba(59,130,246,.08); }
        input.cubo-input::placeholder { color:rgba(255,255,255,.3); }
        select.cubo-select {
          background:rgba(255,255,255,.07);
          border:1px solid rgba(255,255,255,.2);
          border-radius:10px; color:#fff; padding:10px 14px;
          font-size:13px; font-family:'Exo 2',sans-serif;
          outline:none; width:100%; box-sizing:border-box; cursor:pointer;
        }
        select.cubo-select option { background:#1e293b; color:#fff; }
        .insc-row:hover { background:rgba(255,255,255,.06) !important; }
        .insc-row { transition:background .15s; }
      `}</style>

      {/* Fundo */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:'linear-gradient(160deg,#0a0a1a,#0d1b3e 40%,#0a1628 70%,#060d1a)' }}>
        <div style={{ position:'absolute', inset:0, opacity:.04,
          backgroundImage:'linear-gradient(rgba(59,130,246,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.5) 1px,transparent 1px)',
          backgroundSize:'40px 40px' }}/>
        <div style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)',
          width:'60%', height:300, background:'radial-gradient(ellipse,rgba(59,130,246,.15) 0%,transparent 70%)' }}/>
      </div>

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', fontFamily:"'Exo 2',sans-serif", color:'#e8eaf0' }}>

        {/* BANNER */}
        <div style={{ width:'100%', maxHeight:380, overflow:'hidden', position:'relative' }}>
          <img src="/images/cubo-banner.png" alt="Campeonato Cubo Mágico"
            style={{ width:'100%', display:'block', objectFit:'cover', objectPosition:'center top' }}
            onError={e => { e.target.style.display='none' }}/>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80,
            background:'linear-gradient(transparent,#0a0a1a)' }}/>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 16px 60px' }}>

          {/* HEADER */}
          <div style={{ textAlign:'center', padding:'24px 0 20px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
              <img src="/images/cubo-logo.png" alt="Logo"
                style={{ width:140, animation:'float 3s ease-in-out infinite',
                  filter:'drop-shadow(0 0 24px rgba(251,191,36,.5))' }}
                onError={e => { e.target.style.display='none' }}/>
            </div>
            <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(20px,4vw,36px)',
              fontWeight:900, margin:0, lineHeight:1.1,
              background:'linear-gradient(135deg,#fff,#fbbf24 50%,#f59e0b)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              1º CAMPEONATO DE CUBO MÁGICO DO CEITEC
            </h1>
            <p style={{ color:'rgba(255,255,255,.45)', fontSize:12, letterSpacing:3, marginTop:8, textTransform:'uppercase' }}>
              Raciocínio · Foco · Superação · Campeões
            </p>
            {/* Stats */}
            <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:10, marginTop:16 }}>
              {[['🏫','9','Turmas'],['👤',inscricoes.length,'Inscritos'],['⚔️','4','Chaves'],['🏆','1','Campeão']].map(([ic,v,l]) => (
                <div key={l} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:12, padding:'10px 18px', textAlign:'center', minWidth:80 }}>
                  <div style={{ fontSize:18 }}>{ic}</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:900, color:'#fbbf24', lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', marginTop:2, textTransform:'uppercase', letterSpacing:1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ABAS */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:24 }}>
            {[
              { id:'inscricao', label:'✍️ Inscrições'   },
              { id:'regulamento', label:'📋 Regulamento'  },
              { id:'chaveamento', label:'⚔️ Chaveamento'  },
              { id:'cronograma',  label:'📅 Cronograma'   },
              { id:'premiacao',   label:'🏆 Premiação'    },
            ].map(a => (
              <button key={a.id} className="cubo-tab" onClick={() => setAba(a.id)} style={{
                padding:'10px 20px', borderRadius:25, fontSize:13, fontWeight:700,
                background: aba === a.id ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,.07)',
                border:`1px solid ${aba === a.id ? '#3b82f6' : 'rgba(255,255,255,.12)'}`,
                color: aba === a.id ? '#fff' : 'rgba(255,255,255,.6)',
                boxShadow: aba === a.id ? '0 4px 20px rgba(59,130,246,.4)' : 'none',
              }}>{a.label}</button>
            ))}
          </div>

          {/* ════ ABA: INSCRIÇÕES ════ */}
          {aba === 'inscricao' && (
            <div style={{ animation:'slide .4s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

                {/* Formulário */}
                <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(59,130,246,.3)',
                  borderLeft:'4px solid #3b82f6', borderRadius:16, padding:24 }}>
                  <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa',
                    margin:'0 0 16px', letterSpacing:1 }}>✍️ INSCREVA-SE AGORA</h3>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.6, marginBottom:20 }}>
                    Cada turma terá uma eliminatória interna. O aluno com o <strong style={{ color:'#fbbf24' }}>
                    menor tempo</strong> representa a turma na fase final.
                  </p>
                  <form onSubmit={inscrever} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginBottom:6, letterSpacing:1 }}>
                        SEU NOME COMPLETO
                      </div>
                      <input
                        className="cubo-input"
                        placeholder="Digite seu nome..."
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginBottom:6, letterSpacing:1 }}>
                        SUA TURMA
                      </div>
                      <select className="cubo-select" value={turma} onChange={e => setTurma(e.target.value)} required>
                        <option value="">Selecione sua turma...</option>
                        {TURMAS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {msg && (
                      <div style={{ padding:'10px 14px', borderRadius:10, fontSize:12,
                        background: msg.tipo === 'ok' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                        border:`1px solid ${msg.tipo === 'ok' ? '#22c55e' : '#ef4444'}`,
                        color: msg.tipo === 'ok' ? '#4ade80' : '#fca5a5' }}>
                        {msg.texto}
                      </div>
                    )}
                    <button type="submit" disabled={salvando} style={{
                      padding:'12px', borderRadius:12, fontSize:14, fontWeight:800,
                      background: salvando ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                      border:'none', color:'#fff', cursor: salvando ? 'not-allowed' : 'pointer',
                      fontFamily:"'Exo 2',sans-serif", transition:'all .2s',
                      boxShadow: salvando ? 'none' : '0 4px 20px rgba(59,130,246,.4)',
                    }}>
                      {salvando ? 'Inscrevendo...' : '🏆 Quero Participar!'}
                    </button>
                  </form>
                </div>

                {/* Lista de inscritos por turma */}
                <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:16, padding:24, maxHeight:480, overflowY:'auto' }}>
                  <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa',
                    margin:'0 0 16px', letterSpacing:1 }}>
                    👥 INSCRITOS ({inscricoes.length})
                  </h3>
                  {TURMAS.map(t => porTurma[t]?.length > 0 && (
                    <div key={t} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#fbbf24', letterSpacing:2,
                        marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                        TURMA {t}
                        <span style={{ background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.3)',
                          borderRadius:10, padding:'1px 8px', fontSize:9 }}>
                          {porTurma[t].length} inscrito{porTurma[t].length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {porTurma[t].map(i => (
                        <div key={i.id} className="insc-row" style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', padding:'7px 10px', borderRadius:8,
                          background:'rgba(255,255,255,.03)', marginBottom:4 }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,.8)' }}>🎯 {i.nome}</span>
                          {isAdmin && (
                            <button onClick={() => remover(i.id)} style={{
                              background:'none', border:'none', color:'rgba(239,68,68,.6)',
                              cursor:'pointer', fontSize:14, padding:'2px 6px',
                            }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  {inscricoes.length === 0 && (
                    <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)', fontSize:13 }}>
                      Nenhuma inscrição ainda.<br/>Seja o primeiro! 🚀
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ ABA: REGULAMENTO ════ */}
          {aba === 'regulamento' && (
            <div style={{ animation:'slide .4s ease' }}>
              <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(59,130,246,.3)',
                borderLeft:'4px solid #3b82f6', borderRadius:16, padding:22, marginBottom:16 }}>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa', margin:'0 0 10px' }}>🎯 OBJETIVO</h3>
                <p style={{ margin:0, lineHeight:1.8, color:'rgba(255,255,255,.8)', fontSize:14 }}>
                  Promover o <strong style={{ color:'#fbbf24' }}>raciocínio lógico</strong>, a{' '}
                  <strong style={{ color:'#fbbf24' }}>concentração</strong>, a{' '}
                  <strong style={{ color:'#fbbf24' }}>persistência</strong> e a{' '}
                  <strong style={{ color:'#fbbf24' }}>resolução de problemas</strong> por meio da prática do Cubo Mágico.
                </p>
              </div>
              <RegrasEtapa numero="1ª" titulo="ETAPA — ELIMINATÓRIA POR TURMA" cor="#7c3aed" icone="🏫">
                <InfoGrid itens={[
                  {icon:'👥',titulo:'Participantes',desc:'Todos os inscritos de cada turma'},
                  {icon:'🔄',titulo:'Tentativas',   desc:'Até 3 tentativas por aluno'},
                  {icon:'⏱️',titulo:'Classificação',desc:'Melhor tempo entre as tentativas'},
                  {icon:'🏆',titulo:'Campeão',      desc:'Menor tempo = representante da turma'},
                ]}/>
                <div style={{ marginTop:14, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.3)',
                  borderRadius:10, padding:12, fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.7 }}>
                  Ao final: <strong style={{ color:'#a78bfa' }}>9 representantes</strong> classificados para a Fase Final.
                </div>
              </RegrasEtapa>
              <RegrasEtapa numero="2ª" titulo="ETAPA — FASE FINAL CEITEC" cor="#b91c1c" icone="🏟️">
                <InfoGrid itens={[
                  {icon:'✅',titulo:'Avançam',  desc:'Os 8 melhores tempos vão ao mata-mata'},
                  {icon:'❌',titulo:'Eliminado',desc:'O 9º colocado é eliminado'},
                  {icon:'⚔️', titulo:'Quartas', desc:'Chaveamento por posição (1º×8º, etc.)'},
                  {icon:'🏆',titulo:'Critério', desc:'Menor tempo vence em todas as fases'},
                ]}/>
              </RegrasEtapa>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginTop:16 }}>
                {[
                  {fase:'Quartas de Final',     desc:'4 confrontos — menor tempo avança', cor:'#b45309', icone:'⚔️'},
                  {fase:'Semifinais',            desc:'Vencedor Ch.1×2 e Ch.3×4',         cor:'#b91c1c', icone:'🔥'},
                  {fase:'Disputa de 3º Lugar',  desc:'Perdedores das semifinais',          cor:'#0891b2', icone:'🥉'},
                  {fase:'Grande Final',          desc:'Vencedores das semifinais',          cor:'#d97706', icone:'🥇'},
                ].map(f => (
                  <div key={f.fase} style={{ background:'rgba(0,0,0,.3)', border:`1px solid ${f.cor}44`,
                    borderTop:`3px solid ${f.cor}`, borderRadius:14, padding:14 }}>
                    <div style={{ fontSize:26, marginBottom:6 }}>{f.icone}</div>
                    <div style={{ fontWeight:800, fontSize:12, color:f.cor, marginBottom:4 }}>{f.fase}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', lineHeight:1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ ABA: CHAVEAMENTO ════ */}
          {aba === 'chaveamento' && (
            <div style={{ animation:'slide .4s ease' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa', letterSpacing:2 }}>
                  ⚔️ CHAVEAMENTO OFICIAL
                </div>
                {isAdmin && (
                  <button onClick={salvarChaveamento} disabled={salvandoCh} style={{
                    padding:'9px 20px', borderRadius:20, fontSize:12, fontWeight:700,
                    background: salvandoCh ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#059669,#10b981)',
                    border:'none', color:'#fff', cursor: salvandoCh ? 'not-allowed' : 'pointer',
                    fontFamily:"'Exo 2',sans-serif", boxShadow:'0 4px 15px rgba(16,185,129,.3)',
                  }}>
                    {salvandoCh ? 'Salvando...' : '💾 Salvar Chaveamento'}
                  </button>
                )}
              </div>
              {msgCh && (
                <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, fontSize:12,
                  background: msgCh.tipo==='ok' ? 'rgba(34,197,94,.1)':'rgba(239,68,68,.1)',
                  border:`1px solid ${msgCh.tipo==='ok' ? '#22c55e':'#ef4444'}`,
                  color: msgCh.tipo==='ok' ? '#4ade80':'#fca5a5' }}>
                  {msgCh.texto}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>

                {/* Classificados 1-9 */}
                <div style={{ width:'100%', maxWidth:700 }}>
                  <FaseLabel cor="#1d4ed8" icone="📊" titulo="RODADA CLASSIFICATÓRIA — 9 REPRESENTANTES"/>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginTop:10 }}>
                    {chave.classificados.map((v, i) => (
                      <div key={i} style={{ background:'rgba(29,78,216,.1)', border:'1px solid rgba(29,78,216,.3)',
                        borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, fontWeight:900,
                          color:'#60a5fa', minWidth:28 }}>{i+1}º</div>
                        <input className="cubo-input"
                          placeholder={`Nome do ${i+1}º colocado...`}
                          value={v}
                          readOnly={!isAdmin}
                          onChange={e => {
                            const n = [...chave.classificados]; n[i] = e.target.value
                            setChave(prev => ({...prev, classificados: n}))
                          }}
                          style={{ padding:'6px 10px', fontSize:12 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Seta/>

                {/* Quartas */}
                <div style={{ width:'100%', maxWidth:700 }}>
                  <FaseLabel cor="#b45309" icone="⚔️" titulo="QUARTAS DE FINAL — 8 MELHORES TEMPOS"/>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:10, marginTop:10 }}>
                    {chave.quartas.map((c, i) => (
                      <div key={i} className="chave-card" style={{ background:'rgba(180,83,9,.1)',
                        border:'1px solid rgba(180,83,9,.4)', borderRadius:14, padding:14 }}>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:'#fb923c',
                          letterSpacing:2, marginBottom:10, textAlign:'center' }}>CHAVE {c.chave}</div>
                        <input className="cubo-input" placeholder="Competidor A..." value={c.a}
                          readOnly={!isAdmin}
                          onChange={e => {
                            const n=[...chave.quartas]; n[i]={...n[i], a:e.target.value}
                            setChave(prev=>({...prev, quartas:n}))
                          }}
                          style={{ marginBottom:6, fontSize:11, textAlign:'center', padding:'6px 8px' }}/>
                        <div style={{ textAlign:'center', color:'#fb923c', fontWeight:900, fontSize:12, margin:'4px 0' }}>VS</div>
                        <input className="cubo-input" placeholder="Competidor B..." value={c.b}
                          readOnly={!isAdmin}
                          onChange={e => {
                            const n=[...chave.quartas]; n[i]={...n[i], b:e.target.value}
                            setChave(prev=>({...prev, quartas:n}))
                          }}
                          style={{ fontSize:11, textAlign:'center', padding:'6px 8px' }}/>
                      </div>
                    ))}
                  </div>
                </div>

                <Seta/>

                {/* Semifinais */}
                <div style={{ width:'100%', maxWidth:500 }}>
                  <FaseLabel cor="#b91c1c" icone="🔥" titulo="SEMIFINAIS"/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                    {chave.semi.map((s, i) => (
                      <div key={i} className="chave-card" style={{ background:'rgba(185,28,28,.1)',
                        border:'1px solid rgba(185,28,28,.4)', borderRadius:14, padding:14 }}>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:'#f87171',
                          letterSpacing:2, marginBottom:10, textAlign:'center' }}>{s.sf.toUpperCase()}</div>
                        <input className="cubo-input" placeholder="Competidor A..." value={s.a}
                          readOnly={!isAdmin}
                          onChange={e => {
                            const n=[...chave.semi]; n[i]={...n[i], a:e.target.value}
                            setChave(prev=>({...prev, semi:n}))
                          }}
                          style={{ marginBottom:6, fontSize:11, textAlign:'center', padding:'6px 8px' }}/>
                        <div style={{ textAlign:'center', color:'#f87171', fontWeight:900, fontSize:14, margin:'4px 0' }}>VS</div>
                        <input className="cubo-input" placeholder="Competidor B..." value={s.b}
                          readOnly={!isAdmin}
                          onChange={e => {
                            const n=[...chave.semi]; n[i]={...n[i], b:e.target.value}
                            setChave(prev=>({...prev, semi:n}))
                          }}
                          style={{ fontSize:11, textAlign:'center', padding:'6px 8px' }}/>
                      </div>
                    ))}
                  </div>
                </div>

                <Seta/>

                {/* 3º lugar */}
                <div style={{ width:'100%', maxWidth:400 }}>
                  <FaseLabel cor="#0891b2" icone="🥉" titulo="DISPUTA DE 3º LUGAR"/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10,
                    alignItems:'center', marginTop:10 }}>
                    <input className="cubo-input" placeholder="Perdedor Semi 1..." value={chave.terceiro.a}
                      readOnly={!isAdmin}
                      onChange={e => setChave(p=>({...p, terceiro:{...p.terceiro, a:e.target.value}}))}
                      style={{ fontSize:12, textAlign:'center', padding:'8px 10px' }}/>
                    <div style={{ color:'#0891b2', fontWeight:900, fontSize:16 }}>VS</div>
                    <input className="cubo-input" placeholder="Perdedor Semi 2..." value={chave.terceiro.b}
                      readOnly={!isAdmin}
                      onChange={e => setChave(p=>({...p, terceiro:{...p.terceiro, b:e.target.value}}))}
                      style={{ fontSize:12, textAlign:'center', padding:'8px 10px' }}/>
                  </div>
                </div>

                <Seta/>

                {/* Grande Final */}
                <div style={{ background:'linear-gradient(135deg,rgba(217,119,6,.15),rgba(251,191,36,.1))',
                  border:'2px solid #fbbf24', borderRadius:20, padding:'22px 30px',
                  textAlign:'center', animation:'glow 2s ease-in-out infinite', maxWidth:420, width:'100%' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🏆</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11, color:'#fbbf24',
                    letterSpacing:3, marginBottom:12 }}>GRANDE FINAL</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center', marginBottom:12 }}>
                    <input className="cubo-input" placeholder="Finalista 1..." value={chave.final.a}
                      readOnly={!isAdmin}
                      onChange={e => setChave(p=>({...p, final:{...p.final, a:e.target.value}}))}
                      style={{ fontSize:12, textAlign:'center', padding:'8px 10px' }}/>
                    <div style={{ color:'#fbbf24', fontWeight:900, fontSize:18 }}>VS</div>
                    <input className="cubo-input" placeholder="Finalista 2..." value={chave.final.b}
                      readOnly={!isAdmin}
                      onChange={e => setChave(p=>({...p, final:{...p.final, b:e.target.value}}))}
                      style={{ fontSize:12, textAlign:'center', padding:'8px 10px' }}/>
                  </div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11, color:'#fbbf24',
                    letterSpacing:2, marginBottom:8 }}>🥇 CAMPEÃO</div>
                  <input className="cubo-input" placeholder="Nome do Campeão..." value={chave.final.campeao}
                    readOnly={!isAdmin}
                    onChange={e => setChave(p=>({...p, final:{...p.final, campeao:e.target.value}}))}
                    style={{ fontSize:14, textAlign:'center', fontWeight:800, padding:'10px',
                      border:'1px solid rgba(251,191,36,.5)',
                      background: chave.final.campeao ? 'rgba(251,191,36,.1)' : 'rgba(255,255,255,.05)' }}/>
                </div>

              </div>
              {!isAdmin && (
                <div style={{ marginTop:20, textAlign:'center', fontSize:12,
                  color:'rgba(255,255,255,.3)' }}>
                  ℹ️ Somente o coordenador pode editar o chaveamento
                </div>
              )}
            </div>
          )}

          {/* ════ ABA: CRONOGRAMA ════ */}
          {aba === 'cronograma' && (
            <div style={{ animation:'slide .4s ease', maxWidth:600, margin:'0 auto' }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa',
                textAlign:'center', letterSpacing:2, marginBottom:24 }}>CRONOGRAMA DO CAMPEONATO</div>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:24, top:12, bottom:12, width:2,
                  background:'linear-gradient(180deg,#3b82f6,#d97706)' }}/>
                {CRONOGRAMA.map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:20,
                    marginBottom: i < CRONOGRAMA.length-1 ? 18 : 0, position:'relative' }}>
                    <div style={{ width:50, height:50, borderRadius:'50%', flexShrink:0,
                      background:`linear-gradient(135deg,${item.cor},${item.cor}88)`,
                      border:'2px solid rgba(255,255,255,.2)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:22, boxShadow:`0 0 20px ${item.cor}66`, zIndex:1 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex:1, background:'rgba(255,255,255,.04)',
                      border:`1px solid ${item.cor}44`, borderLeft:`3px solid ${item.cor}`,
                      borderRadius:14, padding:'12px 16px', display:'flex',
                      flexDirection:'column', justifyContent:'center' }}>
                      <div style={{ fontSize:9, color:item.cor, fontWeight:800, letterSpacing:2, textTransform:'uppercase', marginBottom:3 }}>
                        {item.semana}
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{item.titulo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ ABA: PREMIAÇÃO ════ */}
          {aba === 'premiacao' && (
            <div style={{ animation:'slide .4s ease' }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, color:'#60a5fa',
                textAlign:'center', letterSpacing:2, marginBottom:20 }}>PREMIAÇÃO OFICIAL</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12 }}>
                {PREMIACOES.map((p, i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,.04)',
                    border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:22, textAlign:'center',
                    borderTop:`3px solid ${i===0?'#d97706':i===1?'#9ca3af':i===2?'#b45309':'#1d4ed8'}` }}>
                    <div style={{ fontSize:44, marginBottom:8 }}>{p.medal}</div>
                    <div style={{ fontWeight:800, fontSize:12, color:'#fff', marginBottom:6 }}>{p.titulo}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', lineHeight:1.5 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24, background:'rgba(217,119,6,.08)',
                border:'1px solid rgba(217,119,6,.3)', borderRadius:16, padding:20, textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16,
                  fontWeight:900, color:'#fbbf24', marginBottom:6 }}>
                  UM MOVIMENTO PODE TE LEVAR AO TOPO!
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.55)' }}>Raciocínio · Foco · Superação · Campeões</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ── Auxiliares ────────────────────────────────────────────────────────────────

function RegrasEtapa({ numero, titulo, cor, icone, children }) {
  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${cor}44`,
      borderLeft:`4px solid ${cor}`, borderRadius:16, padding:20, marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:10,
          background:`linear-gradient(135deg,${cor},${cor}88)`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
          {icone}
        </div>
        <div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:cor, letterSpacing:2 }}>
            {numero} ETAPA
          </div>
          <div style={{ fontWeight:800, fontSize:13, color:'#fff' }}>{titulo}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function InfoGrid({ itens }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:8 }}>
      {itens.map(item => (
        <div key={item.titulo} style={{ background:'rgba(0,0,0,.2)',
          border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:12 }}>
          <div style={{ fontSize:18, marginBottom:4 }}>{item.icon}</div>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.8)', marginBottom:3 }}>{item.titulo}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', lineHeight:1.4 }}>{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

function FaseLabel({ cor, icone, titulo }) {
  return (
    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10, color:cor,
      letterSpacing:2, display:'flex', alignItems:'center', gap:6 }}>
      <span>{icone}</span> {titulo}
    </div>
  )
}

function Seta() {
  return <div style={{ fontSize:22, color:'rgba(255,255,255,.25)', lineHeight:1 }}>↓</div>
}
