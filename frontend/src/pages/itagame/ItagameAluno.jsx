import React, { useState, useEffect } from 'react'
import api from '../../api'

const ITAGAME_URL = 'https://projetoitagame.pythonanywhere.com'
const CHAVE = 'gamificaedu_secreto_2026'
const STORAGE_KEY = 'portal_aluno'

const TABS = [
  { id: 'inicio',      label: 'INÍCIO',      emoji: '🏠' },
  { id: 'notas',       label: 'NOTAS',       emoji: '📝' },
  { id: 'presenca',    label: 'PRESENÇA',    emoji: '📅' },
  { id: 'ocorrencias', label: 'OCORRÊNCIAS', emoji: '⚠️' },
  { id: 'itagame',     label: 'ITAGAME',     emoji: '🎮' },
  { id: 'repositorio', label: 'MATERIAIS',   emoji: '📚' },
]

/* Paleta neon */
const N = {
  amarelo: '#FFE600',
  verde:   '#00FF88',
  rosa:    '#FF2D78',
  azul:    '#00CFFF',
  roxo:    '#B66DFF',
  laranja: '#FF8C00',
  bg:      '#0A0A0F',
  card:    '#12121A',
  borda:   '#1E1E2E',
  branco:  '#FFFFFF',
  cinza:   '#888899',
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function Glow({ cor, size = 300, top, left, right, bottom, opacity = 0.12 }) {
  return (
    <div style={{
      position: 'fixed', width: size, height: size, borderRadius: '50%', pointerEvents: 'none',
      background: `radial-gradient(circle, ${cor} 0%, transparent 70%)`,
      opacity, top, left, right, bottom, zIndex: 0,
    }} />
  )
}

export default function ItagameAluno() {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState(null)
  const [aba, setAba] = useState('inicio')

  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) { try { setDados(JSON.parse(s)) } catch (_) {} }
  }, [])

  async function entrar(e) {
    e.preventDefault()
    const cod = codigo.trim().toUpperCase()
    if (!cod) return
    setErro(''); setCarregando(true)
    try {
      const { data } = await api.get(`/portal/${cod}`)
      setDados(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { setErro('Código não encontrado. Verifique sua carteirinha.') }
    finally { setCarregando(false) }
  }

  function sair() {
    localStorage.removeItem(STORAGE_KEY)
    setDados(null); setCodigo(''); setAba('inicio')
  }

  function abrirItagame() {
    if (!dados) return
    const p = new URLSearchParams({ user: dados.aluno.codigo, email: dados.aluno.codigo, nome: dados.aluno.nome, turma: dados.aluno.turma || '', chave: CHAVE, tipo: 'aluno' })
    window.open(`${ITAGAME_URL}/login-magico/?${p}`, '_blank')
  }

  if (!dados) return <TelaLogin codigo={codigo} setCodigo={setCodigo} erro={erro} carregando={carregando} onSubmit={entrar} />
  return <Portal dados={dados} aba={aba} setAba={setAba} onSair={sair} onItagame={abrirItagame} />
}

/* ══════════════════════════════════════════
   TELA DE LOGIN
══════════════════════════════════════════ */
function TelaLogin({ codigo, setCodigo, erro, carregando, onSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <Glow cor={N.amarelo} top={-80} right={-80} opacity={0.18} />
      <Glow cor={N.verde}   bottom={-80} left={-80} opacity={0.15} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%', margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${N.amarelo}, ${N.laranja})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44,
            boxShadow: `0 0 60px ${N.amarelo}55`,
          }}>🎓</div>
          <div style={{ color: N.amarelo, fontWeight: 900, fontSize: 32, letterSpacing: 3, textShadow: `0 0 30px ${N.amarelo}88` }}>
            PORTAL DO ALUNO
          </div>
          <div style={{ color: N.cinza, fontSize: 14, marginTop: 8, letterSpacing: 1 }}>ITA TECNOLOGIA EDUCACIONAL</div>
        </div>

        {/* Card */}
        <div style={{
          background: N.card,
          borderRadius: 28,
          padding: 40,
          border: `1px solid ${N.borda}`,
          boxShadow: `0 0 0 1px ${N.amarelo}22, 0 32px 80px rgba(0,0,0,0.7)`,
        }}>
          <p style={{ color: '#CCCCDD', textAlign: 'center', marginBottom: 28, fontSize: 16, lineHeight: 1.7, fontWeight: 500 }}>
            Digite o código da sua{' '}
            <span style={{ color: N.amarelo, fontWeight: 900 }}>carteirinha escolar</span>
          </p>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="ESC192-0001"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0A0A0F',
                border: `2px solid ${erro ? N.rosa : N.amarelo}`,
                borderRadius: 18, padding: '18px 22px',
                color: N.branco, fontSize: 28, textAlign: 'center',
                fontWeight: 900, letterSpacing: 5, outline: 'none',
                boxShadow: erro ? `0 0 20px ${N.rosa}44` : `0 0 20px ${N.amarelo}33`,
              }}
              autoFocus
            />

            {erro && (
              <div style={{ background: `${N.rosa}15`, border: `1px solid ${N.rosa}44`, borderRadius: 14, padding: '12px 16px', color: '#FF8FA3', fontSize: 14, textAlign: 'center', fontWeight: 600 }}>
                ⚠️ {erro}
              </div>
            )}

            <button type="submit" disabled={carregando || !codigo.trim()} style={{
              background: carregando ? '#1E1E2E' : `linear-gradient(135deg, ${N.amarelo}, ${N.laranja})`,
              border: 'none', borderRadius: 18, padding: '18px',
              color: carregando ? N.cinza : '#000', fontWeight: 900, fontSize: 18,
              cursor: carregando ? 'default' : 'pointer', letterSpacing: 1,
              boxShadow: carregando ? 'none' : `0 0 40px ${N.amarelo}55`,
            }}>
              {carregando ? '⏳ Carregando...' : '🚀 ACESSAR PORTAL'}
            </button>
          </form>

          <p style={{ color: '#444455', textAlign: 'center', fontSize: 12, marginTop: 24, letterSpacing: 0.5 }}>
            🔐 Código impresso na carteirinha escolar
          </p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   PORTAL PRINCIPAL
══════════════════════════════════════════ */
function Portal({ dados, aba, setAba, onSair, onItagame }) {
  const { aluno, itagame, notas, presencas, ocorrencias, repositorio } = dados
  const nivel = itagame.nivel
  const presentes = presencas.filter(p => p.status === 'presente').length
  const pctPresenca = presencas.length > 0 ? Math.round((presentes / presencas.length) * 100) : null

  const nivelCor = { '#6b7280': N.cinza, '#3b82f6': N.azul, '#10b981': N.verde, '#f59e0b': N.amarelo, '#ef4444': N.rosa, '#8b5cf6': N.roxo }
  const nc = nivelCor[nivel.cor] || N.amarelo

  return (
    <div style={{ minHeight: '100vh', background: N.bg, color: N.branco, fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: N.card, borderBottom: `1px solid ${N.borda}`, padding: '14px 20px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${nc}, ${N.amarelo})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#000',
              boxShadow: `0 0 20px ${nc}66`,
            }}>{aluno.nome.charAt(0)}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: N.branco }}>{aluno.nome.split(' ').slice(0, 2).join(' ')}</div>
              <div style={{ color: N.cinza, fontSize: 12, marginTop: 1 }}>{aluno.codigo} · {aluno.turma}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ background: `${nc}22`, border: `1px solid ${nc}66`, borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 900, color: nc, letterSpacing: 0.5, textShadow: `0 0 10px ${nc}` }}>
              {nivel.emoji} {nivel.nome.toUpperCase()}
            </div>
            <button onClick={onSair} style={{ background: 'transparent', border: `1px solid ${N.borda}`, color: N.cinza, borderRadius: 10, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#0E0E16', borderBottom: `1px solid ${N.borda}`, overflowX: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)} style={{
              flex: '0 0 auto', padding: '14px 18px', background: 'none', border: 'none',
              borderBottom: aba === t.id ? `3px solid ${N.amarelo}` : '3px solid transparent',
              color: aba === t.id ? N.amarelo : N.cinza,
              fontWeight: aba === t.id ? 900 : 600,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 0.5,
              textShadow: aba === t.id ? `0 0 12px ${N.amarelo}` : 'none',
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px' }}>
        {aba === 'inicio'      && <AbaInicio aluno={aluno} itagame={itagame} nivel={nivel} nc={nc} pctPresenca={pctPresenca} totalNotas={notas.length} onItagame={onItagame} />}
        {aba === 'notas'       && <AbaNotas notas={notas} />}
        {aba === 'presenca'    && <AbaPresenca presencas={presencas} presentes={presentes} pctPresenca={pctPresenca} />}
        {aba === 'ocorrencias' && <AbaOcorrencias ocorrencias={ocorrencias} />}
        {aba === 'itagame'     && <AbaItagame itagame={itagame} onItagame={onItagame} />}
        {aba === 'repositorio' && <AbaRepositorio repositorio={repositorio} />}
      </div>
    </div>
  )
}

/* ── Componentes base ── */
function NeonCard({ children, cor = N.amarelo, style = {} }) {
  return (
    <div style={{
      background: N.card, borderRadius: 20,
      border: `1px solid ${cor}33`,
      boxShadow: `0 0 24px ${cor}11, inset 0 1px 0 ${cor}11`,
      padding: 22, ...style,
    }}>{children}</div>
  )
}

function Tag({ label, cor }) {
  return (
    <span style={{
      background: `${cor}18`, border: `1px solid ${cor}55`,
      color: cor, borderRadius: 20, padding: '4px 12px',
      fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
    }}>{label}</span>
  )
}

function Vazio({ emoji, texto }) {
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
      <div style={{ color: N.cinza, fontSize: 16, fontWeight: 600 }}>{texto}</div>
    </div>
  )
}

/* ══════════════════════════════════════════
   INÍCIO
══════════════════════════════════════════ */
function AbaInicio({ aluno, itagame, nivel, nc, pctPresenca, totalNotas, onItagame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* XP Card */}
      <div style={{
        background: `linear-gradient(135deg, ${nc}22 0%, ${N.card} 60%)`,
        border: `2px solid ${nc}55`,
        borderRadius: 24, padding: 28,
        boxShadow: `0 0 50px ${nc}22`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, gap: 12 }}>
          <div>
            <div style={{ fontSize: 48 }}>{nivel.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 26, color: nc, letterSpacing: 1, marginTop: 4, textShadow: `0 0 20px ${nc}` }}>
              {nivel.nome.toUpperCase()}
            </div>
            <div style={{ color: N.cinza, fontSize: 13, fontWeight: 600, marginTop: 2 }}>SEU NÍVEL</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: N.amarelo, lineHeight: 1, textShadow: `0 0 30px ${N.amarelo}` }}>
              {itagame.xp_total.toLocaleString()}
            </div>
            <div style={{ color: N.cinza, fontSize: 13, fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>XP TOTAL</div>
          </div>
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: 99, height: 14, overflow: 'hidden', border: `1px solid ${nc}33` }}>
          <div style={{
            width: `${nivel.progresso}%`, height: '100%',
            background: `linear-gradient(90deg, ${nc}, ${N.amarelo})`,
            borderRadius: 99, boxShadow: `0 0 16px ${nc}`,
            transition: 'width 1.5s ease',
          }} />
        </div>
        {nivel.proximo_min && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: N.cinza, fontWeight: 700 }}>
            <span>{itagame.xp_total} XP</span>
            <span>{nivel.progresso}% → próximo: {nivel.proximo_min} XP</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { emoji: '📝', valor: totalNotas,   label: 'AVALIAÇÕES', cor: N.azul },
          { emoji: '📅', valor: pctPresenca !== null ? `${pctPresenca}%` : '—', label: 'FREQUÊNCIA', cor: pctPresenca === null ? N.cinza : pctPresenca >= 75 ? N.verde : N.rosa },
          { emoji: '🎯', valor: itagame.missoes?.length || 0, label: 'MISSÕES', cor: N.amarelo },
        ].map(s => (
          <div key={s.label} style={{
            background: N.card, border: `2px solid ${s.cor}44`,
            borderRadius: 20, padding: '18px 12px', textAlign: 'center',
            boxShadow: `0 0 20px ${s.cor}22`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{s.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 30, color: s.cor, textShadow: `0 0 16px ${s.cor}` }}>{s.valor}</div>
            <div style={{ color: N.cinza, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {itagame.badges.length > 0 && (
        <NeonCard cor={N.amarelo}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: N.amarelo, letterSpacing: 1 }}>🏅 CONQUISTAS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {itagame.badges.map((b, i) => (
              <span key={i} style={{
                background: `${N.amarelo}18`, border: `1px solid ${N.amarelo}55`,
                color: N.amarelo, borderRadius: 20, padding: '6px 16px',
                fontSize: 14, fontWeight: 800,
              }}>{b}</span>
            ))}
          </div>
        </NeonCard>
      )}

      {/* Recados */}
      {itagame.recados?.length > 0 && (
        <NeonCard cor={N.verde}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: N.verde, letterSpacing: 1 }}>💬 RECADOS DO PROFESSOR</div>
          {itagame.recados.slice(0, 3).map((r, i) => (
            <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${N.borda}` : 'none', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: N.branco }}>{r.titulo}</div>
              <div style={{ color: '#BBBBCC', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>{r.mensagem}</div>
              <div style={{ color: N.cinza, fontSize: 12, marginTop: 6, fontWeight: 700 }}>{fmt(r.criado_em)}</div>
            </div>
          ))}
        </NeonCard>
      )}

      <button onClick={onItagame} style={{
        background: `linear-gradient(135deg, ${N.amarelo}, ${N.laranja})`,
        border: 'none', borderRadius: 18, padding: '20px',
        color: '#000', fontWeight: 900, fontSize: 18, cursor: 'pointer',
        boxShadow: `0 0 50px ${N.amarelo}55`, letterSpacing: 1,
      }}>🎮 ABRIR ITAGAME — JOGAR AGORA ↗</button>
    </div>
  )
}

/* ══════════════════════════════════════════
   NOTAS
══════════════════════════════════════════ */
function AbaNotas({ notas }) {
  if (!notas.length) return <Vazio emoji="📝" texto="Nenhuma avaliação lançada ainda." />
  const media = Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10
  const cm = media >= 7 ? N.verde : media >= 5 ? N.amarelo : N.rosa
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: `linear-gradient(135deg, ${cm}22, ${N.card})`,
        border: `2px solid ${cm}55`, borderRadius: 24, padding: 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: `0 0 40px ${cm}22`,
      }}>
        <div>
          <div style={{ color: N.cinza, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>MÉDIA GERAL</div>
          <div style={{ fontSize: 68, fontWeight: 900, color: cm, lineHeight: 1, textShadow: `0 0 30px ${cm}` }}>{media}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 52 }}>{media >= 7 ? '🏆' : media >= 5 ? '📊' : '📉'}</div>
          <div style={{ color: N.cinza, fontSize: 14, fontWeight: 700, marginTop: 8 }}>{notas.length} avaliações</div>
        </div>
      </div>

      {notas.map((n, i) => {
        const cor = n.nota_final >= 7 ? N.verde : n.nota_final >= 5 ? N.amarelo : N.rosa
        return (
          <NeonCard key={i} cor={cor}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: N.branco }}>{n.avaliacao_titulo}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <Tag label={n.disciplina} cor={N.azul} />
                  <Tag label={fmt(n.data_aplicacao)} cor={N.cinza} />
                  {n.avaliacao_tipo && <Tag label={n.avaliacao_tipo} cor={N.roxo} />}
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 46, fontWeight: 900, color: cor, lineHeight: 1, textShadow: `0 0 20px ${cor}` }}>{n.nota_final}</div>
                <div style={{ color: N.cinza, fontSize: 12, fontWeight: 800, marginTop: 4 }}>{Math.round(n.percentual_acerto)}%</div>
              </div>
            </div>
            <div style={{ background: '#0A0A0F', borderRadius: 99, height: 8, marginTop: 14, overflow: 'hidden' }}>
              <div style={{ width: `${n.percentual_acerto}%`, height: '100%', background: `linear-gradient(90deg, ${cor}, ${N.amarelo})`, borderRadius: 99, boxShadow: `0 0 10px ${cor}` }} />
            </div>
          </NeonCard>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════
   PRESENÇA
══════════════════════════════════════════ */
function AbaPresenca({ presencas, presentes, pctPresenca }) {
  if (!presencas.length) return <Vazio emoji="📅" texto="Nenhum registro de presença ainda." />
  const faltas = presencas.length - presentes
  const cor = pctPresenca >= 75 ? N.verde : pctPresenca >= 60 ? N.amarelo : N.rosa
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: `linear-gradient(135deg, ${cor}22, ${N.card})`, border: `2px solid ${cor}55`, borderRadius: 24, padding: 28, boxShadow: `0 0 40px ${cor}22` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center', gap: 16, marginBottom: 24 }}>
          {[
            { v: `${pctPresenca}%`, l: 'FREQUÊNCIA', c: cor },
            { v: presentes,         l: 'PRESENÇAS',  c: N.verde },
            { v: faltas,            l: 'FALTAS',     c: N.rosa  },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 38, fontWeight: 900, color: s.c, textShadow: `0 0 20px ${s.c}` }}>{s.v}</div>
              <div style={{ color: N.cinza, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: 99, height: 14, overflow: 'hidden', border: `1px solid ${cor}33` }}>
          <div style={{ width: `${pctPresenca}%`, height: '100%', background: `linear-gradient(90deg, ${cor}, ${N.amarelo})`, borderRadius: 99, boxShadow: `0 0 14px ${cor}` }} />
        </div>
        {pctPresenca < 75 && (
          <div style={{ background: `${N.rosa}15`, border: `1px solid ${N.rosa}44`, borderRadius: 14, padding: '12px 16px', color: '#FF8FA3', fontSize: 14, textAlign: 'center', fontWeight: 800, marginTop: 16, letterSpacing: 0.5 }}>
            ⚠️ FREQUÊNCIA ABAIXO DE 75% — ATENÇÃO!
          </div>
        )}
      </div>

      {presencas.map((p, i) => {
        const presente = p.status === 'presente'
        return (
          <div key={i} style={{
            background: N.card, borderRadius: 16, padding: '14px 20px',
            border: `1px solid ${presente ? N.verde : N.rosa}33`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: N.branco }}>{fmt(p.data)}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {p.hora_entrada && <span style={{ color: N.cinza, fontSize: 13, fontWeight: 700 }}>{p.hora_entrada}</span>}
              <span style={{
                background: presente ? `${N.verde}18` : `${N.rosa}18`,
                border: `1px solid ${presente ? N.verde : N.rosa}55`,
                color: presente ? N.verde : N.rosa,
                borderRadius: 20, padding: '5px 16px', fontSize: 13, fontWeight: 900,
                letterSpacing: 0.5,
              }}>
                {presente ? '✓ PRESENTE' : '✗ FALTA'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════
   OCORRÊNCIAS
══════════════════════════════════════════ */
function AbaOcorrencias({ ocorrencias }) {
  if (!ocorrencias.length) return <Vazio emoji="✅" texto="Nenhuma ocorrência registrada. Continue assim!" />
  const cfg = { baixa: { cor: N.verde, label: '🟢 BAIXA' }, media: { cor: N.amarelo, label: '🟡 MÉDIA' }, alta: { cor: N.rosa, label: '🔴 ALTA' } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ocorrencias.map((o, i) => {
        const c = cfg[o.gravidade] || cfg.baixa
        return (
          <NeonCard key={i} cor={c.cor}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Tag label={c.label} cor={c.cor} />
              <span style={{ color: N.cinza, fontSize: 13, fontWeight: 700 }}>{fmt(o.criado_em)}</span>
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: N.branco, textTransform: 'capitalize' }}>
              {o.tipo.replace(/_/g, ' ')}
            </div>
            <div style={{ color: '#BBBBCC', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{o.descricao}</div>
            {o.professor_nome && <div style={{ color: N.cinza, fontSize: 13, marginTop: 10, fontWeight: 700 }}>👨‍🏫 Prof. {o.professor_nome}</div>}
          </NeonCard>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════
   ITAGAME
══════════════════════════════════════════ */
function AbaItagame({ itagame, onItagame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={onItagame} style={{
        background: `linear-gradient(135deg, ${N.amarelo}, ${N.laranja})`,
        border: 'none', borderRadius: 18, padding: '22px',
        color: '#000', fontWeight: 900, fontSize: 20, cursor: 'pointer',
        boxShadow: `0 0 60px ${N.amarelo}55`, letterSpacing: 1,
      }}>🎮 ABRIR ITAGAME — JOGAR AGORA ↗</button>

      {itagame.missoes?.length > 0 && (
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: N.amarelo, marginBottom: 14, letterSpacing: 1, textShadow: `0 0 12px ${N.amarelo}` }}>🎯 MISSÕES ATIVAS</div>
          {itagame.missoes.map((m, i) => (
            <NeonCard key={i} cor={N.amarelo} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: N.branco }}>🎯 {m.titulo}</div>
                  {m.descricao && <div style={{ color: '#BBBBCC', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{m.descricao}</div>}
                </div>
                <div style={{ background: `${N.amarelo}18`, border: `1px solid ${N.amarelo}55`, borderRadius: 14, padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: N.amarelo, textShadow: `0 0 14px ${N.amarelo}` }}>+{m.xp_recompensa}</div>
                  <div style={{ fontSize: 11, color: N.cinza, fontWeight: 800 }}>XP</div>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>
      )}

      {itagame.recados?.length > 0 && (
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: N.verde, marginBottom: 14, letterSpacing: 1, textShadow: `0 0 12px ${N.verde}` }}>💬 RECADOS</div>
          {itagame.recados.map((r, i) => (
            <NeonCard key={i} cor={N.verde} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: N.verde }}>💬 {r.titulo}</div>
              <div style={{ color: '#BBBBCC', fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>{r.mensagem}</div>
              <div style={{ color: N.cinza, fontSize: 12, fontWeight: 700, marginTop: 10 }}>{fmt(r.criado_em)}</div>
            </NeonCard>
          ))}
        </div>
      )}

      {itagame.historico?.length > 0 && (
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: N.azul, marginBottom: 14, letterSpacing: 1, textShadow: `0 0 12px ${N.azul}` }}>⚡ HISTÓRICO DE XP</div>
          {itagame.historico.map((h, i) => (
            <div key={i} style={{
              background: N.card, borderRadius: 16, padding: '14px 18px', marginBottom: 8,
              border: `1px solid ${N.borda}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: N.branco }}>{h.descricao}</div>
                <div style={{ color: N.cinza, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{fmt(h.criado_em)}</div>
              </div>
              <div style={{
                fontWeight: 900, fontSize: 18,
                color: h.xp_ganho >= 0 ? N.verde : N.rosa,
                background: h.xp_ganho >= 0 ? `${N.verde}15` : `${N.rosa}15`,
                border: `1px solid ${h.xp_ganho >= 0 ? N.verde : N.rosa}44`,
                borderRadius: 12, padding: '6px 14px', marginLeft: 12,
                textShadow: `0 0 12px ${h.xp_ganho >= 0 ? N.verde : N.rosa}`,
              }}>
                {h.xp_ganho >= 0 ? '+' : ''}{h.xp_ganho} XP
              </div>
            </div>
          ))}
        </div>
      )}

      {!itagame.missoes?.length && !itagame.recados?.length && !itagame.historico?.length && (
        <Vazio emoji="🎮" texto="Nenhuma atividade ainda. Jogue para ganhar XP!" />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   REPOSITÓRIO
══════════════════════════════════════════ */
function AbaRepositorio({ repositorio }) {
  if (!repositorio.length) return <Vazio emoji="📚" texto="Nenhum material publicado ainda." />
  const tipoCfg = {
    video:     { emoji: '🎥', cor: N.rosa },
    documento: { emoji: '📄', cor: N.azul },
    link:      { emoji: '🔗', cor: N.verde },
    exercicio: { emoji: '📝', cor: N.amarelo },
    outro:     { emoji: '📌', cor: N.cinza },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {repositorio.map((r, i) => {
        const c = tipoCfg[r.tipo] || tipoCfg.outro
        return (
          <a key={i} href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <NeonCard cor={c.cor}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                  background: `${c.cor}18`, border: `2px solid ${c.cor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, boxShadow: `0 0 16px ${c.cor}33`,
                }}>{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: N.branco }}>{r.titulo}</div>
                  {r.descricao && <div style={{ color: '#BBBBCC', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{r.descricao}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <Tag label={r.tipo.toUpperCase()} cor={c.cor} />
                    <Tag label={fmt(r.criado_em)} cor={N.cinza} />
                  </div>
                </div>
                <div style={{ color: c.cor, fontSize: 22, flexShrink: 0, fontWeight: 900, textShadow: `0 0 10px ${c.cor}` }}>↗</div>
              </div>
            </NeonCard>
          </a>
        )
      })}
    </div>
  )
}
