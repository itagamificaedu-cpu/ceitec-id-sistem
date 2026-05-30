import React, { useState } from 'react'

// Dados dos representantes
const REPRESENTANTES = [
  { nome: 'Isaac Cândido',   turma: '9A', email: 'isaac@ligajovem.ceitec',       cel: '(88) 9 9841-7200', emoji: '🦁' },
  { nome: 'Thiago Gabriel',  turma: '9B', email: 'thiago@ligajovem.ceitec',      cel: '(85) 9 8949-0735', emoji: '⚡' },
  { nome: 'Julia Teodora',   turma: '9B', email: 'julia@ligajovem.ceitec',       cel: '(88) 9 2157-8840', emoji: '🌟' },
  { nome: 'Ana Beatriz',     turma: '9A', email: 'anabeatriz@ligajovem.ceitec',  cel: '(88) 9 9269-5438', emoji: '🔥' },
  { nome: 'Leonardo Cauã',   turma: '9A', email: 'leonardo@ligajovem.ceitec',    cel: '(88) 9 9942-9230', emoji: '🚀' },
]

const MENUS_DISPONIVEIS = [
  { icon: '📷', label: 'Scanner de Presença',  path: '/scanner' },
  { icon: '📲', label: 'Scanner Game Aluno',   path: '/scanner/portal' },
  { icon: '👥', label: 'Turmas e Alunos',      path: '/turmas' },
  { icon: '🎯', label: 'Quiz Interativo',      path: '/quiz' },
  { icon: '⚽', label: 'Copa do Saber',        path: '/quiz-copa/' },
  { icon: '🏆', label: 'Álbum dos Craques',   path: '/album' },
  { icon: '🎮', label: 'ItagGame — Painel',   path: '/itagame' },
  { icon: '📝', label: 'Criar Avaliações',    path: '/avaliacoes/nova' },
  { icon: '➕', label: 'Criar Quiz',           path: '/quiz/novo' },
]

export default function LigaJovem() {
  const [copiado, setCopiado] = useState(null)

  function copiar(texto, id) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2000)
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;700;900&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* Fundo Copa */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,#031a03,#062b06 40%,#041f10 70%,#031508)' }}/>
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ position:'absolute', top:0, bottom:0, left:`${i*12.5}%`, width:'12.5%', background:i%2===0?'rgba(0,80,0,.15)':'transparent' }}/>
        ))}
        <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:'70%', height:250, background:'radial-gradient(ellipse,rgba(255,200,0,.1) 0%,transparent 70%)' }}/>
      </div>

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', padding:'24px 16px 60px', fontFamily:"'Exo 2',sans-serif", color:'#e8eaf0' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ fontSize:56, marginBottom:10, animation:'float 3s ease-in-out infinite', filter:'drop-shadow(0 0 20px rgba(255,200,0,.6))' }}>🏅</div>
            <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'clamp(20px,4vw,32px)', fontWeight:900, color:'#FFD700', textShadow:'0 0 30px rgba(255,200,0,.5)', margin:0, letterSpacing:2 }}>
              DESAFIO LIGA JOVEM 2026
            </h1>
            <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, letterSpacing:3, marginTop:8, textTransform:'uppercase' }}>
              Representantes CEITEC GAME · CEITEC
            </p>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,200,0,.1)', border:'1px solid rgba(255,200,0,.3)', borderRadius:20, padding:'6px 20px', marginTop:12 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 1.5s infinite', display:'block' }}/>
              <span style={{ fontSize:12, color:'#22c55e', fontWeight:700, letterSpacing:1 }}>5 REPRESENTANTES ATIVOS</span>
            </div>
          </div>

          {/* Cards dos representantes */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, marginBottom:32 }}>
            {REPRESENTANTES.map((r, i) => (
              <div key={r.email} style={{
                background:'linear-gradient(145deg,rgba(0,60,0,.7),rgba(0,30,0,.8))',
                border:'1px solid rgba(255,200,0,.25)',
                borderRadius:18, padding:22,
                backdropFilter:'blur(8px)',
                boxShadow:'0 4px 20px rgba(0,0,0,.4)',
              }}>
                {/* Avatar */}
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div style={{
                    width:52, height:52, borderRadius:'50%',
                    background:'linear-gradient(135deg,#FFD700,#f5a000)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:26, boxShadow:'0 0 16px rgba(255,200,0,.4)',
                    flexShrink:0,
                  }}>
                    {r.emoji}
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:900, color:'#FFD700' }}>{r.nome}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:2 }}>Turma {r.turma} · Liga Jovem 2026</div>
                  </div>
                </div>

                {/* Login info */}
                <div style={{ background:'rgba(0,0,0,.4)', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:10, color:'rgba(255,200,0,.6)', fontWeight:700, letterSpacing:2, marginBottom:8 }}>ACESSO AO SISTEMA</div>

                  {/* Email */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', marginBottom:2 }}>LOGIN (E-MAIL)</div>
                      <div style={{ fontSize:12, color:'#fff', fontFamily:'monospace' }}>{r.email}</div>
                    </div>
                    <button onClick={() => copiar(r.email, `email-${i}`)} style={{
                      background: copiado === `email-${i}` ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.08)',
                      border: `1px solid ${copiado === `email-${i}` ? '#22c55e' : 'rgba(255,255,255,.15)'}`,
                      borderRadius:7, padding:'4px 10px', cursor:'pointer',
                      fontSize:10, color: copiado === `email-${i}` ? '#22c55e' : 'rgba(255,255,255,.5)',
                      fontWeight:700, transition:'all .2s',
                    }}>
                      {copiado === `email-${i}` ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>

                  {/* Senha */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', marginBottom:2 }}>SENHA (CELULAR)</div>
                      <div style={{ fontSize:12, color:'#22c55e', fontFamily:'monospace', fontWeight:700 }}>{r.cel}</div>
                    </div>
                    <button onClick={() => copiar(r.cel.replace(/\D/g,''), `cel-${i}`)} style={{
                      background: copiado === `cel-${i}` ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.08)',
                      border: `1px solid ${copiado === `cel-${i}` ? '#22c55e' : 'rgba(255,255,255,.15)'}`,
                      borderRadius:7, padding:'4px 10px', cursor:'pointer',
                      fontSize:10, color: copiado === `cel-${i}` ? '#22c55e' : 'rgba(255,255,255,.5)',
                      fontWeight:700, transition:'all .2s',
                    }}>
                      {copiado === `cel-${i}` ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Menus disponíveis */}
          <div style={{ background:'rgba(0,0,0,.4)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,200,0,.2)', borderRadius:18, padding:24 }}>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:900, color:'#FFD700', marginBottom:16 }}>
              🎯 MENUS LIBERADOS PARA OS REPRESENTANTES
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
              {MENUS_DISPONIVEIS.map(m => (
                <a key={m.path} href={m.path} style={{
                  display:'flex', alignItems:'center', gap:10,
                  background:'rgba(0,80,0,.3)', border:'1px solid rgba(0,180,0,.25)',
                  borderRadius:10, padding:'10px 14px', textDecoration:'none',
                  color:'#fff', fontSize:13, fontWeight:600,
                  transition:'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,200,0,.1)'; e.currentTarget.style.borderColor='rgba(255,200,0,.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(0,80,0,.3)'; e.currentTarget.style.borderColor='rgba(0,180,0,.25)' }}
                >
                  <span style={{ fontSize:18 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div style={{ marginTop:20, background:'rgba(251,191,36,.06)', border:'1px solid rgba(251,191,36,.2)', borderRadius:12, padding:16, fontSize:12, color:'rgba(255,255,255,.6)', lineHeight:1.7 }}>
            <strong style={{ color:'#FFD700' }}>ℹ️ Informações importantes:</strong><br/>
            • Senha = número do celular <strong>sem formatação</strong> (apenas dígitos)<br/>
            • Os representantes <strong>não podem trocar a senha</strong><br/>
            • Acesso restrito apenas aos menus listados acima<br/>
            • URL de acesso: <strong style={{ color:'#22c55e' }}>itatecnologiaeducacional.tech/login</strong>
          </div>

        </div>
      </div>
    </>
  )
}
