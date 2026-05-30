import React, { useState } from 'react'

// Dados do chaveamento
const CHAVES_QUARTAS = [
  { chave: '1', a: '1º colocado', b: '8º colocado' },
  { chave: '2', a: '4º colocado', b: '5º colocado' },
  { chave: '3', a: '2º colocado', b: '7º colocado' },
  { chave: '4', a: '3º colocado', b: '6º colocado' },
]

const CRONOGRAMA = [
  { semana: 'Semana 1', titulo: 'Divulgação e Inscrições',       icon: '📣', cor: '#1d4ed8' },
  { semana: 'Semana 2', titulo: 'Eliminatórias por Turma',       icon: '🏫', cor: '#7c3aed' },
  { semana: 'Semana 3', titulo: 'Classificatória dos Representantes', icon: '📊', cor: '#0891b2' },
  { semana: 'Semana 4', titulo: 'Quartas de Final',              icon: '⚔️',  cor: '#b45309' },
  { semana: 'Semana 5', titulo: 'Semifinais',                    icon: '🔥', cor: '#b91c1c' },
  { semana: 'Semana 6', titulo: 'Final + Cerimônia de Premiação', icon: '🏆', cor: '#d97706' },
]

const PREMIACOES = [
  { medal: '🥇', titulo: 'Campeão do CEITEC',          desc: 'Melhor tempo na Grande Final' },
  { medal: '🥈', titulo: 'Vice-Campeão',               desc: '2º lugar na Grande Final' },
  { medal: '🥉', titulo: '3º Lugar',                   desc: 'Disputa de 3º lugar' },
  { medal: '🏅', titulo: 'Melhor Tempo Geral',         desc: 'Menor tempo de toda a competição' },
  { medal: '🏅', titulo: 'Campeão de Cada Turma',      desc: '9 campeões (um por turma)' },
]

export default function CuboMagico() {
  const [abaAtiva, setAbaAtiva] = useState('regulamento')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;600;700;900&display=swap');
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,.4)} 50%{box-shadow:0 0 40px rgba(251,191,36,.8)} }
        @keyframes slide  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .cubo-tab { transition: all .25s; cursor: pointer; }
        .cubo-tab:hover { transform: translateY(-2px); }
        .chave-card:hover { transform: translateY(-4px) scale(1.02); }
        .chave-card { transition: all .25s; }
        .premio-card:hover { transform: translateY(-3px); background: rgba(251,191,36,.15) !important; }
        .premio-card { transition: all .25s; }
        .crono-item:hover .crono-dot { transform: scale(1.3); }
        .crono-dot { transition: transform .2s; }
      `}</style>

      {/* Fundo */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:'linear-gradient(160deg, #0a0a1a 0%, #0d1b3e 40%, #0a1628 70%, #060d1a 100%)' }}>
        {/* Grade decorativa */}
        <div style={{ position:'absolute', inset:0, opacity:.04,
          backgroundImage:'linear-gradient(rgba(59,130,246,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.5) 1px,transparent 1px)',
          backgroundSize:'40px 40px' }}/>
        {/* Brilho central */}
        <div style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)',
          width:'60%', height:300, background:'radial-gradient(ellipse,rgba(59,130,246,.15) 0%,transparent 70%)' }}/>
      </div>

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', fontFamily:"'Exo 2',sans-serif", color:'#e8eaf0' }}>

        {/* ── BANNER PRINCIPAL ── */}
        <div style={{ width:'100%', maxHeight:420, overflow:'hidden', position:'relative' }}>
          <img
            src="/images/cubo-banner.png"
            alt="1º Campeonato de Cubo Mágico do CEITEC"
            style={{ width:'100%', display:'block', objectFit:'cover', objectPosition:'center top' }}
            onError={e => { e.target.style.display='none' }}
          />
          {/* Overlay gradiente embaixo do banner */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80,
            background:'linear-gradient(transparent, #0a0a1a)' }}/>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 16px 60px' }}>

          {/* ── HEADER COM LOGO ── */}
          <div style={{ textAlign:'center', padding:'32px 0 24px', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <img
                src="/images/cubo-logo.png"
                alt="Logo Campeonato Cubo Mágico"
                style={{ width:180, animation:'float 3s ease-in-out infinite', filter:'drop-shadow(0 0 30px rgba(251,191,36,.5))', display:'block' }}
                onError={e => { e.target.style.display='none' }}
              />
            </div>
            <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(22px,4vw,40px)',
              fontWeight:900, margin:0, lineHeight:1.1,
              background:'linear-gradient(135deg,#fff 0%,#fbbf24 50%,#f59e0b 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              1º CAMPEONATO
            </h1>
            <h2 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(18px,3vw,32px)',
              fontWeight:900, margin:'4px 0 0', color:'#fbbf24',
              textShadow:'0 0 30px rgba(251,191,36,.6)' }}>
              DE CUBO MÁGICO DO CEITEC
            </h2>
            <p style={{ color:'rgba(255,255,255,.5)', fontSize:13, letterSpacing:3,
              marginTop:10, textTransform:'uppercase' }}>
              Raciocínio · Foco · Superação · Campeões
            </p>

            {/* Stats rápidos */}
            <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:12, marginTop:20 }}>
              {[
                { icon:'🏫', val:'9', label:'Turmas' },
                { icon:'👤', val:'9', label:'Representantes' },
                { icon:'⚔️',  val:'4', label:'Chaves' },
                { icon:'🏆', val:'1', label:'Campeão' },
              ].map(s => (
                <div key={s.label} style={{
                  background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)',
                  borderRadius:14, padding:'12px 20px', textAlign:'center', minWidth:90,
                }}>
                  <div style={{ fontSize:22 }}>{s.icon}</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22, fontWeight:900, color:'#fbbf24', lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', marginTop:2, textTransform:'uppercase', letterSpacing:1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ABAS ── */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:28 }}>
            {[
              { id:'regulamento', label:'📋 Regulamento' },
              { id:'chaveamento', label:'⚔️ Chaveamento' },
              { id:'cronograma',  label:'📅 Cronograma'  },
              { id:'premiacao',   label:'🏆 Premiação'   },
            ].map(aba => (
              <div
                key={aba.id}
                className="cubo-tab"
                onClick={() => setAbaAtiva(aba.id)}
                style={{
                  padding:'10px 22px', borderRadius:25, fontSize:13, fontWeight:700,
                  background: abaAtiva === aba.id
                    ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                    : 'rgba(255,255,255,.07)',
                  border: `1px solid ${abaAtiva === aba.id ? '#3b82f6' : 'rgba(255,255,255,.12)'}`,
                  color: abaAtiva === aba.id ? '#fff' : 'rgba(255,255,255,.6)',
                  boxShadow: abaAtiva === aba.id ? '0 4px 20px rgba(59,130,246,.4)' : 'none',
                }}
              >
                {aba.label}
              </div>
            ))}
          </div>

          {/* ══════════════════════════════════════════ */}
          {/* ABA: REGULAMENTO */}
          {/* ══════════════════════════════════════════ */}
          {abaAtiva === 'regulamento' && (
            <div style={{ animation:'slide .4s ease' }}>

              {/* Objetivo */}
              <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(59,130,246,.3)',
                borderRadius:18, padding:24, marginBottom:20, borderLeft:'4px solid #3b82f6' }}>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:'#60a5fa',
                  margin:'0 0 12px', letterSpacing:1 }}>🎯 OBJETIVO</h3>
                <p style={{ margin:0, lineHeight:1.8, color:'rgba(255,255,255,.8)', fontSize:14 }}>
                  Promover o <strong style={{ color:'#fbbf24' }}>raciocínio lógico</strong>,
                  a <strong style={{ color:'#fbbf24' }}>concentração</strong>, a
                  <strong style={{ color:'#fbbf24' }}> persistência</strong> e a
                  <strong style={{ color:'#fbbf24' }}> resolução de problemas</strong> por meio da
                  prática do Cubo Mágico, culminando na realização do 1º Campeonato de Cubo
                  Mágico do CEITEC.
                </p>
              </div>

              {/* Etapa 1 */}
              <SecaoRegra
                numero="1ª"
                titulo="ETAPA — ELIMINATÓRIA POR TURMA"
                cor="#7c3aed"
                icone="🏫"
              >
                <InfoGrid itens={[
                  { icon:'👥', titulo:'Participantes', desc:'Todos os alunos interessados de cada turma' },
                  { icon:'🔄', titulo:'Tentativas',    desc:'Até 3 tentativas por aluno' },
                  { icon:'⏱️', titulo:'Classificação', desc:'Melhor tempo obtido entre as tentativas' },
                  { icon:'🏆', titulo:'Campeão',       desc:'Menor tempo = campeão da turma' },
                ]}/>
                <div style={{ marginTop:16, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.3)',
                  borderRadius:12, padding:14, fontSize:13, color:'rgba(255,255,255,.75)', lineHeight:1.7 }}>
                  Ao final desta etapa teremos <strong style={{ color:'#a78bfa' }}>9 turmas participantes</strong> e{' '}
                  <strong style={{ color:'#a78bfa' }}>9 representantes classificados</strong> para a Fase Final.
                </div>
              </SecaoRegra>

              {/* Etapa 2 */}
              <SecaoRegra
                numero="2ª"
                titulo="ETAPA — FASE FINAL CEITEC"
                cor="#b91c1c"
                icone="🏟️"
              >
                <div style={{ fontSize:14, lineHeight:1.8, color:'rgba(255,255,255,.8)' }}>
                  <p style={{ margin:'0 0 12px' }}>
                    Os <strong style={{ color:'#fca5a5' }}>9 representantes</strong> realizarão
                    uma tentativa oficial na Rodada Classificatória. Os tempos são registrados
                    e classificados do menor para o maior.
                  </p>
                </div>
                <InfoGrid itens={[
                  { icon:'✅', titulo:'Avançam',     desc:'Os 8 melhores tempos vão ao mata-mata' },
                  { icon:'❌', titulo:'Eliminado',   desc:'O 9º colocado é eliminado' },
                  { icon:'⚔️',  titulo:'Quartas',    desc:'Chaveamento por posição (1º×8º, etc.)' },
                  { icon:'🏆', titulo:'Critério',    desc:'Menor tempo vence em todas as fases' },
                ]}/>
              </SecaoRegra>

              {/* Fases */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginTop:20 }}>
                {[
                  { fase:'Quartas de Final',      desc:'4 confrontos — vencedor de cada chave avança', cor:'#b45309', icone:'⚔️'  },
                  { fase:'Semifinais',             desc:'Vencedor Chave 1×2 e Vencedor Chave 3×4',      cor:'#b91c1c', icone:'🔥' },
                  { fase:'Disputa de 3º Lugar',   desc:'Perdedores das semifinais pelo bronze',          cor:'#0891b2', icone:'🥉' },
                  { fase:'Grande Final',           desc:'Vencedores das semifinais pelo título máximo', cor:'#d97706', icone:'🥇' },
                ].map(f => (
                  <div key={f.fase} style={{
                    background:`rgba(0,0,0,.3)`, border:`1px solid ${f.cor}44`,
                    borderTop:`3px solid ${f.cor}`, borderRadius:14, padding:16,
                  }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>{f.icone}</div>
                    <div style={{ fontWeight:800, fontSize:13, color:f.cor, marginBottom:6 }}>{f.fase}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', lineHeight:1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* ABA: CHAVEAMENTO */}
          {/* ══════════════════════════════════════════ */}
          {abaAtiva === 'chaveamento' && (
            <div style={{ animation:'slide .4s ease' }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:'#60a5fa',
                textAlign:'center', letterSpacing:2, marginBottom:24 }}>
                CHAVEAMENTO OFICIAL DO CAMPEONATO
              </h3>

              {/* Fluxo visual */}
              <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>

                {/* Classificatória */}
                <FaseBox titulo="RODADA CLASSIFICATÓRIA" cor="#1d4ed8" icone="📊"
                  desc="9 representantes — 1 tentativa oficial cada — tempos classificados do menor ao maior"/>

                <Seta/>

                {/* Quartas */}
                <div style={{ width:'100%', maxWidth:700 }}>
                  <div style={{ textAlign:'center', fontFamily:"'Orbitron',sans-serif",
                    fontSize:11, color:'#b45309', letterSpacing:2, marginBottom:12 }}>
                    ⚔️ QUARTAS DE FINAL — 8 MELHORES TEMPOS
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:10 }}>
                    {CHAVES_QUARTAS.map(c => (
                      <div key={c.chave} className="chave-card" style={{
                        background:'rgba(180,83,9,.1)', border:'1px solid rgba(180,83,9,.4)',
                        borderRadius:14, padding:14, textAlign:'center',
                      }}>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10,
                          color:'#fb923c', letterSpacing:2, marginBottom:10 }}>CHAVE {c.chave}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:6 }}>{c.a}</div>
                        <div style={{ fontSize:18, color:'#fb923c', margin:'4px 0' }}>VS</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.b}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Seta/>

                {/* Semifinais */}
                <div style={{ width:'100%', maxWidth:500 }}>
                  <div style={{ textAlign:'center', fontFamily:"'Orbitron',sans-serif",
                    fontSize:11, color:'#b91c1c', letterSpacing:2, marginBottom:12 }}>
                    🔥 SEMIFINAIS
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { sf:'Semifinal 1', a:'Vencedor Chave 1', b:'Vencedor Chave 2' },
                      { sf:'Semifinal 2', a:'Vencedor Chave 3', b:'Vencedor Chave 4' },
                    ].map(s => (
                      <div key={s.sf} className="chave-card" style={{
                        background:'rgba(185,28,28,.1)', border:'1px solid rgba(185,28,28,.4)',
                        borderRadius:14, padding:14, textAlign:'center',
                      }}>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9,
                          color:'#f87171', letterSpacing:2, marginBottom:10 }}>{s.sf.toUpperCase()}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:4 }}>{s.a}</div>
                        <div style={{ fontSize:16, color:'#f87171', margin:'4px 0' }}>VS</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{s.b}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Seta/>

                {/* 3º lugar */}
                <FaseBox titulo="DISPUTA DE 3º LUGAR" cor="#0891b2" icone="🥉"
                  desc="Perdedores das Semifinais disputam o bronze"/>

                <Seta/>

                {/* Final */}
                <div style={{
                  background:'linear-gradient(135deg,rgba(217,119,6,.15),rgba(251,191,36,.1))',
                  border:'2px solid #fbbf24', borderRadius:20, padding:'24px 40px',
                  textAlign:'center', animation:'glow 2s ease-in-out infinite', maxWidth:400, width:'100%',
                }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11, color:'#fbbf24',
                    letterSpacing:3, marginBottom:6 }}>GRANDE FINAL</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.7)' }}>
                    Vencedor Semifinal 1 × Vencedor Semifinal 2
                  </div>
                  <div style={{ marginTop:14, fontFamily:"'Orbitron',sans-serif",
                    fontSize:14, color:'#fbbf24', fontWeight:900 }}>
                    🥇 CAMPEÃO DO CEITEC
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* ABA: CRONOGRAMA */}
          {/* ══════════════════════════════════════════ */}
          {abaAtiva === 'cronograma' && (
            <div style={{ animation:'slide .4s ease', maxWidth:600, margin:'0 auto' }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:'#60a5fa',
                textAlign:'center', letterSpacing:2, marginBottom:28 }}>
                CRONOGRAMA DO CAMPEONATO
              </h3>
              <div style={{ position:'relative' }}>
                {/* Linha vertical */}
                <div style={{ position:'absolute', left:24, top:12, bottom:12,
                  width:2, background:'linear-gradient(180deg,#3b82f6,#d97706)' }}/>
                {CRONOGRAMA.map((item, i) => (
                  <div key={i} className="crono-item" style={{ display:'flex', gap:20,
                    marginBottom:i < CRONOGRAMA.length-1 ? 20 : 0, position:'relative' }}>
                    {/* Dot */}
                    <div className="crono-dot" style={{
                      width:50, height:50, borderRadius:'50%', flexShrink:0,
                      background:`linear-gradient(135deg,${item.cor},${item.cor}88)`,
                      border:'2px solid rgba(255,255,255,.2)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:22, boxShadow:`0 0 20px ${item.cor}66`, zIndex:1,
                    }}>{item.icon}</div>
                    {/* Conteúdo */}
                    <div style={{
                      flex:1, background:'rgba(255,255,255,.05)',
                      border:`1px solid ${item.cor}44`, borderLeft:`3px solid ${item.cor}`,
                      borderRadius:14, padding:'14px 18px', display:'flex',
                      flexDirection:'column', justifyContent:'center',
                    }}>
                      <div style={{ fontSize:10, color:item.cor, fontWeight:800,
                        letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
                        {item.semana}
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>
                        {item.titulo}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24, background:'rgba(251,191,36,.06)',
                border:'1px solid rgba(251,191,36,.2)', borderRadius:14, padding:16,
                fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.8, textAlign:'center' }}>
                ⏱️ O campeonato tem <strong style={{ color:'#fbbf24' }}>6 semanas</strong> de
                duração, do lançamento até a grande cerimônia de premiação.
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* ABA: PREMIAÇÃO */}
          {/* ══════════════════════════════════════════ */}
          {abaAtiva === 'premiacao' && (
            <div style={{ animation:'slide .4s ease' }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, color:'#60a5fa',
                textAlign:'center', letterSpacing:2, marginBottom:24 }}>
                PREMIAÇÃO OFICIAL
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                {PREMIACOES.map((p, i) => (
                  <div key={i} className="premio-card" style={{
                    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                    borderRadius:18, padding:24, textAlign:'center',
                    borderTop: i === 0 ? '3px solid #d97706'
                              : i === 1 ? '3px solid #9ca3af'
                              : i === 2 ? '3px solid #b45309'
                              : '3px solid #1d4ed8',
                  }}>
                    <div style={{ fontSize:48, marginBottom:8 }}>{p.medal}</div>
                    <div style={{ fontWeight:800, fontSize:13, color:'#fff', marginBottom:6 }}>{p.titulo}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', lineHeight:1.5 }}>{p.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:28, background:'rgba(217,119,6,.08)',
                border:'1px solid rgba(217,119,6,.3)', borderRadius:16, padding:20, textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏆</div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18,
                  fontWeight:900, color:'#fbbf24', marginBottom:8 }}>
                  UM MOVIMENTO PODE TE LEVAR AO TOPO!
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.8 }}>
                  Raciocínio · Foco · Superação · Campeões
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────

function SecaoRegra({ numero, titulo, cor, icone, children }) {
  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${cor}44`,
      borderLeft:`4px solid ${cor}`, borderRadius:16, padding:22, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ width:44, height:44, borderRadius:12,
          background:`linear-gradient(135deg,${cor},${cor}88)`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
          {icone}
        </div>
        <div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10,
            color: cor, letterSpacing:2 }}>{numero} ETAPA</div>
          <div style={{ fontWeight:800, fontSize:14, color:'#fff' }}>{titulo}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function InfoGrid({ itens }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
      {itens.map(item => (
        <div key={item.titulo} style={{ background:'rgba(0,0,0,.25)',
          border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.8)', marginBottom:4 }}>{item.titulo}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', lineHeight:1.5 }}>{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

function FaseBox({ titulo, cor, icone, desc }) {
  return (
    <div style={{
      background:`rgba(0,0,0,.3)`, border:`1px solid ${cor}55`,
      borderTop:`3px solid ${cor}`, borderRadius:16, padding:'16px 24px',
      textAlign:'center', width:'100%', maxWidth:500,
    }}>
      <div style={{ fontSize:26, marginBottom:6 }}>{icone}</div>
      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11,
        color: cor, letterSpacing:2, marginBottom:6 }}>{titulo}</div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,.55)' }}>{desc}</div>
    </div>
  )
}

function Seta() {
  return (
    <div style={{ fontSize:24, color:'rgba(255,255,255,.3)', lineHeight:1 }}>↓</div>
  )
}
