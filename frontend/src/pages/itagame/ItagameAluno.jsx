import React, { useState, useEffect } from 'react'
import api from '../../api'

const ITAGAME_URL = 'https://projetoitagame.pythonanywhere.com'
const CHAVE = 'gamificaedu_secreto_2026'
const STORAGE_KEY = 'portal_aluno'

const TABS = [
  { id: 'inicio',      label: 'Início',      emoji: '🏠' },
  { id: 'notas',       label: 'Notas',       emoji: '📝' },
  { id: 'presenca',    label: 'Presença',     emoji: '📅' },
  { id: 'ocorrencias', label: 'Ocorrências',  emoji: '⚠️' },
  { id: 'itagame',     label: 'ItagGame',     emoji: '🎮' },
  { id: 'repositorio', label: 'Repositório',  emoji: '📚' },
]

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('pt-BR')
}

export default function ItagameAluno() {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState(null)
  const [aba, setAba] = useState('inicio')

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY)
    if (salvo) { try { setDados(JSON.parse(salvo)) } catch (_) {} }
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

  if (!dados) return <Login codigo={codigo} setCodigo={setCodigo} erro={erro} carregando={carregando} onSubmit={entrar} />
  return <Portal dados={dados} aba={aba} setAba={setAba} onSair={sair} onItagame={abrirItagame} />
}

/* ══════════════════════════════════════
   TELA DE LOGIN
══════════════════════════════════════ */
function Login({ codigo, setCodigo, erro, carregando, onSubmit }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Segoe UI', sans-serif",
    }}>
      {/* Círculos decorativos */}
      <div style={{ position: 'fixed', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #f5a623, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, boxShadow: '0 0 40px rgba(245,166,35,0.4)',
          }}>🎓</div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: 1 }}>Portal do Aluno</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6 }}>ITA Tecnologia Educacional</p>
        </div>

        {/* Card de login */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 36,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 1.7 }}>
            Digite seu <strong style={{ color: '#f5a623', fontWeight: 800 }}>código da carteirinha</strong> para acessar suas notas, presença e muito mais
          </p>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="ESC192-0001"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.08)',
                  border: `2px solid ${erro ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 16, padding: '16px 20px',
                  color: '#fff', fontSize: 26, textAlign: 'center',
                  fontWeight: 900, letterSpacing: 4, outline: 'none',
                  transition: 'border-color .2s',
                }}
                autoFocus
              />
            </div>
            {erro && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 14px', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
                ⚠️ {erro}
              </div>
            )}
            <button
              type="submit"
              disabled={carregando || !codigo.trim()}
              style={{
                background: carregando ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f5a623 0%, #ef4444 100%)',
                border: 'none', borderRadius: 16, padding: '16px',
                color: '#fff', fontWeight: 900, fontSize: 17, cursor: carregando ? 'default' : 'pointer',
                boxShadow: carregando ? 'none' : '0 8px 30px rgba(245,166,35,0.4)',
                transition: 'all .2s', letterSpacing: 0.5,
              }}
            >
              {carregando ? '⏳ Carregando...' : '🚀 Acessar Portal'}
            </button>
          </form>

          <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 12, marginTop: 20 }}>
            🔐 Seu código está impresso na carteirinha escolar
          </p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   PORTAL PRINCIPAL
══════════════════════════════════════ */
function Portal({ dados, aba, setAba, onSair, onItagame }) {
  const { aluno, itagame, notas, presencas, ocorrencias, repositorio } = dados
  const nivel = itagame.nivel
  const presentes = presencas.filter(p => p.status === 'presente').length
  const pctPresenca = presencas.length > 0 ? Math.round((presentes / presencas.length) * 100) : null

  const nivelCores = {
    '#6b7280': ['#6b7280', '#9ca3af'],
    '#3b82f6': ['#3b82f6', '#60a5fa'],
    '#10b981': ['#10b981', '#34d399'],
    '#f59e0b': ['#f59e0b', '#fbbf24'],
    '#ef4444': ['#ef4444', '#f87171'],
    '#8b5cf6': ['#8b5cf6', '#a78bfa'],
  }
  const [c1, c2] = nivelCores[nivel.cor] || ['#f5a623', '#ef4444']

  return (
    <div style={{ minHeight: '100vh', background: '#0f0c29', color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, #302b63 0%, #1e1b4b 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 20px',
        position: 'sticky', top: 0, zIndex: 20,
        boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, boxShadow: `0 0 16px ${c1}66`,
            }}>
              {aluno.nome.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{aluno.nome.split(' ').slice(0, 2).join(' ')}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{aluno.codigo} · {aluno.turma}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              background: `linear-gradient(135deg, ${c1}33, ${c2}22)`,
              border: `1px solid ${c1}55`,
              borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: c1,
            }}>
              {nivel.emoji} {nivel.nome}
            </div>
            <button onClick={onSair} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)} style={{
              flex: '0 0 auto', padding: '13px 18px', background: 'none', border: 'none',
              borderBottom: aba === t.id ? '3px solid #f5a623' : '3px solid transparent',
              color: aba === t.id ? '#f5a623' : 'rgba(255,255,255,0.4)',
              fontWeight: aba === t.id ? 700 : 400, fontSize: 13,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s',
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {aba === 'inicio'      && <AbaInicio aluno={aluno} itagame={itagame} nivel={nivel} c1={c1} c2={c2} pctPresenca={pctPresenca} totalNotas={notas.length} onItagame={onItagame} />}
        {aba === 'notas'       && <AbaNotas notas={notas} />}
        {aba === 'presenca'    && <AbaPresenca presencas={presencas} presentes={presentes} pctPresenca={pctPresenca} />}
        {aba === 'ocorrencias' && <AbaOcorrencias ocorrencias={ocorrencias} />}
        {aba === 'itagame'     && <AbaItagame itagame={itagame} onItagame={onItagame} />}
        {aba === 'repositorio' && <AbaRepositorio repositorio={repositorio} />}
      </div>
    </div>
  )
}

/* ── Componentes reutilizáveis ── */
function Card({ children, glow, gradient, style = {} }) {
  return (
    <div style={{
      background: gradient || 'rgba(255,255,255,0.05)',
      border: `1px solid ${glow ? glow + '33' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20,
      padding: 20,
      boxShadow: glow ? `0 8px 32px ${glow}22` : 'none',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, cor }) {
  return (
    <span style={{
      background: `${cor}22`, border: `1px solid ${cor}44`,
      color: cor, borderRadius: 20, padding: '3px 12px',
      fontSize: 12, fontWeight: 700,
    }}>{label}</span>
  )
}

function Vazio({ emoji, texto }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>{emoji}</div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>{texto}</div>
    </div>
  )
}

/* ══════════════════════════════════════
   ABA INÍCIO
══════════════════════════════════════ */
function AbaInicio({ aluno, itagame, nivel, c1, c2, pctPresenca, totalNotas, onItagame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Card XP principal */}
      <Card gradient={`linear-gradient(135deg, ${c1}33 0%, ${c2}22 100%)`} glow={c1}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 40 }}>{nivel.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: c1, marginTop: 4 }}>{nivel.nome}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Nível atual</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 48, fontWeight: 900,
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{itagame.xp_total.toLocaleString()}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>XP Total</div>
          </div>
        </div>
        {/* Barra de progresso */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${nivel.progresso}%`, height: '100%',
            background: `linear-gradient(90deg, ${c1}, ${c2})`,
            borderRadius: 99, transition: 'width 1.5s ease',
            boxShadow: `0 0 10px ${c1}`,
          }} />
        </div>
        {nivel.proximo_min && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <span>{itagame.xp_total} XP</span>
            <span>{nivel.progresso}% → {nivel.proximo_min} XP</span>
          </div>
        )}
      </Card>

      {/* Estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { emoji: '📝', valor: totalNotas, label: 'Avaliações', cor: '#3b82f6' },
          { emoji: '📅', valor: pctPresenca !== null ? `${pctPresenca}%` : '—', label: 'Frequência', cor: pctPresenca === null ? '#6b7280' : pctPresenca >= 75 ? '#10b981' : '#ef4444' },
          { emoji: '🎯', valor: itagame.missoes?.length || 0, label: 'Missões', cor: '#f5a623' },
        ].map(s => (
          <Card key={s.label} glow={s.cor} style={{ textAlign: 'center', padding: '18px 10px' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 26, color: s.cor }}>{s.valor}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Badges */}
      {itagame.badges.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏅</span> Conquistas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {itagame.badges.map((b, i) => (
              <span key={i} style={{
                background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(239,68,68,0.2))',
                border: '1px solid rgba(245,166,35,0.3)',
                color: '#fbbf24', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600,
              }}>{b}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Recados */}
      {itagame.recados?.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>💬</span> Recados do Professor
          </div>
          {itagame.recados.slice(0, 3).map((r, i) => (
            <div key={i} style={{ borderBottom: i < Math.min(itagame.recados.length, 3) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{r.titulo}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>{r.mensagem}</div>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 6 }}>{fmt(r.criado_em)}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Botão ItagGame */}
      <button onClick={onItagame} style={{
        background: 'linear-gradient(135deg, #f5a623 0%, #ef4444 100%)',
        border: 'none', borderRadius: 18, padding: '18px',
        color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(245,166,35,0.4)',
        letterSpacing: 0.5, transition: 'transform .15s',
      }}>
        🎮 Abrir ItagGame — Jogar Agora ↗
      </button>
    </div>
  )
}

/* ══════════════════════════════════════
   ABA NOTAS
══════════════════════════════════════ */
function AbaNotas({ notas }) {
  if (!notas.length) return <Vazio emoji="📝" texto="Nenhuma avaliação lançada ainda." />
  const media = Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10
  const corMedia = media >= 7 ? '#10b981' : media >= 5 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card gradient="linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))" glow="#6366f1">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 4 }}>Média Geral</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: corMedia, lineHeight: 1 }}>{media}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 40 }}>{media >= 7 ? '🏆' : media >= 5 ? '📊' : '📉'}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>{notas.length} avaliações</div>
          </div>
        </div>
      </Card>

      {notas.map((n, i) => {
        const cor = n.nota_final >= 7 ? '#10b981' : n.nota_final >= 5 ? '#f59e0b' : '#ef4444'
        return (
          <Card key={i} glow={cor}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{n.avaliacao_titulo}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge label={n.disciplina} cor="#6366f1" />
                  <Badge label={fmt(n.data_aplicacao)} cor="#6b7280" />
                  {n.avaliacao_tipo && <Badge label={n.avaliacao_tipo} cor="#0ea5e9" />}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: cor, lineHeight: 1 }}>{n.nota_final}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{Math.round(n.percentual_acerto)}% acerto</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 6, marginTop: 14, overflow: 'hidden' }}>
              <div style={{ width: `${n.percentual_acerto}%`, height: '100%', background: `linear-gradient(90deg, ${cor}, ${cor}aa)`, borderRadius: 99, boxShadow: `0 0 8px ${cor}` }} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════
   ABA PRESENÇA
══════════════════════════════════════ */
function AbaPresenca({ presencas, presentes, pctPresenca }) {
  if (!presencas.length) return <Vazio emoji="📅" texto="Nenhum registro de presença ainda." />
  const faltas = presencas.length - presentes
  const cor = pctPresenca >= 75 ? '#10b981' : pctPresenca >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card gradient={`linear-gradient(135deg, ${cor}22 0%, ${cor}11 100%)`} glow={cor}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center', gap: 10, marginBottom: 20 }}>
          {[
            { v: `${pctPresenca}%`, l: 'Frequência', c: cor },
            { v: presentes, l: 'Presenças', c: '#10b981' },
            { v: faltas, l: 'Faltas', c: '#ef4444' },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 30, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 12, overflow: 'hidden' }}>
          <div style={{ width: `${pctPresenca}%`, height: '100%', background: `linear-gradient(90deg, ${cor}, ${cor}cc)`, borderRadius: 99, boxShadow: `0 0 12px ${cor}` }} />
        </div>
        {pctPresenca < 75 && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', color: '#fca5a5', fontSize: 13, marginTop: 14 }}>
            ⚠️ Frequência abaixo de 75% — atenção ao limite!
          </div>
        )}
      </Card>

      {presencas.map((p, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 18px',
          border: `1px solid ${p.status === 'presente' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(p.data)}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {p.hora_entrada && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{p.hora_entrada}</span>}
            <span style={{
              background: p.status === 'presente' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: p.status === 'presente' ? '#34d399' : '#f87171',
              border: `1px solid ${p.status === 'presente' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700,
            }}>
              {p.status === 'presente' ? '✓ Presente' : '✗ Falta'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════
   ABA OCORRÊNCIAS
══════════════════════════════════════ */
function AbaOcorrencias({ ocorrencias }) {
  if (!ocorrencias.length) return <Vazio emoji="✅" texto="Nenhuma ocorrência registrada. Continue assim!" />
  const gravidadeCfg = {
    baixa:  { cor: '#10b981', label: '🟢 Baixa' },
    media:  { cor: '#f59e0b', label: '🟡 Média' },
    alta:   { cor: '#ef4444', label: '🔴 Alta' },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ocorrencias.map((o, i) => {
        const cfg = gravidadeCfg[o.gravidade] || gravidadeCfg.baixa
        return (
          <Card key={i} glow={cfg.cor}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Badge label={cfg.label} cor={cfg.cor} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{fmt(o.criado_em)}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', color: '#e2e8f0' }}>
              {o.tipo.replace(/_/g, ' ')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{o.descricao}</div>
            {o.professor_nome && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 8 }}>👨‍🏫 Prof. {o.professor_nome}</div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════
   ABA ITAGAME
══════════════════════════════════════ */
function AbaItagame({ itagame, onItagame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={onItagame} style={{
        background: 'linear-gradient(135deg, #f5a623 0%, #ef4444 100%)',
        border: 'none', borderRadius: 18, padding: '20px',
        color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(245,166,35,0.45)', letterSpacing: 0.5,
      }}>
        🎮 Abrir ItagGame — Jogar Agora ↗
      </button>

      {/* Missões */}
      {itagame.missoes?.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎯</span> Missões Ativas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itagame.missoes.map((m, i) => (
              <Card key={i} glow="#f5a623">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🎯 {m.titulo}</div>
                    {m.descricao && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>{m.descricao}</div>}
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245,166,35,0.25), rgba(239,68,68,0.2))',
                    border: '1px solid rgba(245,166,35,0.3)',
                    borderRadius: 12, padding: '6px 14px', textAlign: 'center', flexShrink: 0,
                  }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: '#fbbf24' }}>+{m.xp_recompensa}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>XP</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recados */}
      {itagame.recados?.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>💬</span> Recados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itagame.recados.map((r, i) => (
              <Card key={i} glow="#6366f1">
                <div style={{ fontWeight: 700, fontSize: 15, color: '#a5b4fc' }}>💬 {r.titulo}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{r.mensagem}</div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 8 }}>{fmt(r.criado_em)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Histórico XP */}
      {itagame.historico?.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>⚡</span> Histórico de XP
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itagame.historico.map((h, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 14, color: '#e2e8f0' }}>{h.descricao}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 3 }}>{fmt(h.criado_em)}</div>
                </div>
                <div style={{
                  fontWeight: 900, fontSize: 16,
                  color: h.xp_ganho >= 0 ? '#34d399' : '#f87171',
                  background: h.xp_ganho >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                  borderRadius: 10, padding: '4px 12px', marginLeft: 12,
                }}>
                  {h.xp_ganho >= 0 ? '+' : ''}{h.xp_ganho} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!itagame.missoes?.length && !itagame.recados?.length && !itagame.historico?.length && (
        <Vazio emoji="🎮" texto="Nenhuma atividade ainda. Jogue para ganhar XP!" />
      )}
    </div>
  )
}

/* ══════════════════════════════════════
   ABA REPOSITÓRIO
══════════════════════════════════════ */
function AbaRepositorio({ repositorio }) {
  if (!repositorio.length) return <Vazio emoji="📚" texto="Nenhum material publicado ainda." />
  const tipoEmoji = { video: '🎥', documento: '📄', link: '🔗', exercicio: '📝', outro: '📌' }
  const tipoCor   = { video: '#ef4444', documento: '#3b82f6', link: '#10b981', exercicio: '#f59e0b', outro: '#6b7280' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {repositorio.map((r, i) => {
        const cor = tipoCor[r.tipo] || '#6b7280'
        return (
          <a key={i} href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Card glow={cor} style={{ cursor: 'pointer', transition: 'transform .15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: `${cor}22`, border: `1px solid ${cor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {tipoEmoji[r.tipo] || '📌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{r.titulo}</div>
                  {r.descricao && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{r.descricao}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <Badge label={r.tipo} cor={cor} />
                    <Badge label={fmt(r.criado_em)} cor="#6b7280" />
                  </div>
                </div>
                <div style={{ color: cor, fontSize: 20, flexShrink: 0 }}>↗</div>
              </div>
            </Card>
          </a>
        )
      })}
    </div>
  )
}
