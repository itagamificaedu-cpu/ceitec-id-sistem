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

const COR = {
  bg:       '#0f172a',
  card:     'rgba(255,255,255,0.05)',
  borda:    'rgba(255,255,255,0.1)',
  laranja:  '#f5a623',
  verde:    '#10b981',
  vermelho: '#ef4444',
  azul:     '#3b82f6',
  texto:    '#f1f5f9',
  sub:      'rgba(255,255,255,0.5)',
}

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
    if (salvo) {
      try { setDados(JSON.parse(salvo)) } catch (_) {}
    }
  }, [])

  async function entrar(e) {
    e.preventDefault()
    const cod = codigo.trim().toUpperCase()
    if (!cod) return
    setErro('')
    setCarregando(true)
    try {
      const { data } = await api.get(`/portal/${cod}`)
      setDados(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      setErro('Código não encontrado. Verifique sua carteirinha.')
    } finally {
      setCarregando(false)
    }
  }

  function sair() {
    localStorage.removeItem(STORAGE_KEY)
    setDados(null)
    setCodigo('')
    setAba('inicio')
  }

  function abrirItagame() {
    if (!dados) return
    const params = new URLSearchParams({
      user: dados.aluno.codigo,
      email: dados.aluno.codigo,
      nome: dados.aluno.nome,
      turma: dados.aluno.turma || '',
      chave: CHAVE,
      tipo: 'aluno',
    })
    window.open(`${ITAGAME_URL}/login-magico/?${params}`, '_blank')
  }

  if (!dados) return <Login codigo={codigo} setCodigo={setCodigo} erro={erro} carregando={carregando} onSubmit={entrar} />
  return <Portal dados={dados} aba={aba} setAba={setAba} onSair={sair} onItagame={abrirItagame} />
}

/* ─── Tela de Login ─── */
function Login({ codigo, setCodigo, erro, carregando, onSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg,${COR.bg} 0%,#1e3a5f 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎓</div>
        <div style={{ color: COR.laranja, fontWeight: 900, fontSize: 26, letterSpacing: 2 }}>PORTAL DO ALUNO</div>
        <div style={{ color: COR.sub, fontSize: 13, marginTop: 4 }}>ITA Tecnologia Educacional</div>
      </div>
      <div style={{ background: COR.card, borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, border: `1px solid ${COR.borda}` }}>
        <p style={{ color: COR.sub, textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
          Digite seu <strong style={{ color: COR.laranja }}>código da carteirinha</strong> para acessar
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: ESC192-0001"
            style={{ background: 'rgba(255,255,255,0.1)', border: `2px solid ${COR.borda}`, borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 22, textAlign: 'center', fontWeight: 800, letterSpacing: 3, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            autoFocus
          />
          {erro && <p style={{ color: COR.vermelho, fontSize: 13, textAlign: 'center', margin: 0 }}>{erro}</p>}
          <button
            type="submit"
            disabled={carregando || !codigo.trim()}
            style={{ background: carregando ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${COR.laranja},${COR.vermelho})`, border: 'none', borderRadius: 14, padding: 14, color: '#fff', fontWeight: 900, fontSize: 17, cursor: carregando ? 'default' : 'pointer' }}
          >
            {carregando ? '⏳ Carregando...' : '🚀 Acessar Portal'}
          </button>
        </form>
        <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: 12, marginTop: 20 }}>
          Seu código está na carteirinha escolar
        </p>
      </div>
    </div>
  )
}

/* ─── Portal Principal ─── */
function Portal({ dados, aba, setAba, onSair, onItagame }) {
  const { aluno, itagame, notas, presencas, ocorrencias, repositorio } = dados
  const nivel = itagame.nivel

  const totalPresencas  = presencas.length
  const presentes       = presencas.filter(p => p.status === 'presente').length
  const pctPresenca     = totalPresencas > 0 ? Math.round((presentes / totalPresencas) * 100) : null

  return (
    <div style={{ minHeight: '100vh', background: COR.bg, color: COR.texto, fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderBottom: `1px solid ${COR.borda}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${COR.laranja},${COR.vermelho})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>
            {aluno.nome.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{aluno.nome.split(' ')[0]}</div>
            <div style={{ color: COR.sub, fontSize: 11 }}>{aluno.codigo} · {aluno.turma}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: `${nivel.cor}22`, color: nivel.cor, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{nivel.emoji} {nivel.nome}</span>
          <button onClick={onSair} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: COR.sub, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', display: 'flex', borderBottom: `1px solid ${COR.borda}`, background: 'rgba(255,255,255,0.02)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            style={{ flex: '0 0 auto', padding: '10px 16px', background: 'none', border: 'none', borderBottom: aba === t.id ? `2px solid ${COR.laranja}` : '2px solid transparent', color: aba === t.id ? COR.laranja : COR.sub, fontWeight: aba === t.id ? 700 : 400, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .2s' }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>

        {aba === 'inicio' && <AbaInicio aluno={aluno} itagame={itagame} nivel={nivel} pctPresenca={pctPresenca} totalNotas={notas.length} onItagame={onItagame} />}
        {aba === 'notas' && <AbaNotas notas={notas} />}
        {aba === 'presenca' && <AbaPresenca presencas={presencas} presentes={presentes} pctPresenca={pctPresenca} />}
        {aba === 'ocorrencias' && <AbaOcorrencias ocorrencias={ocorrencias} />}
        {aba === 'itagame' && <AbaItagame itagame={itagame} onItagame={onItagame} />}
        {aba === 'repositorio' && <AbaRepositorio repositorio={repositorio} />}
      </div>
    </div>
  )
}

/* ─── Aba Início ─── */
function AbaInicio({ aluno, itagame, nivel, pctPresenca, totalNotas, onItagame }) {
  const progresso = nivel.progresso
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Card XP */}
      <div style={{ background: `linear-gradient(135deg,${nivel.cor}22,${nivel.cor}11)`, border: `1px solid ${nivel.cor}44`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 28 }}>{nivel.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: nivel.cor }}>{nivel.nome}</div>
            <div style={{ color: COR.sub, fontSize: 12 }}>Nível {itagame.nivel?.nome ? '' : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: COR.laranja }}>{itagame.xp_total.toLocaleString()}</div>
            <div style={{ color: COR.sub, fontSize: 12 }}>XP Total</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progresso}%`, height: '100%', background: `linear-gradient(90deg,${nivel.cor},${COR.laranja})`, borderRadius: 99, transition: 'width 1s' }} />
        </div>
        {nivel.proximo_min && (
          <div style={{ color: COR.sub, fontSize: 11, marginTop: 6, textAlign: 'right' }}>
            {itagame.xp_total} / {nivel.proximo_min} XP para o próximo nível
          </div>
        )}
      </div>

      {/* Badges */}
      {itagame.badges.length > 0 && (
        <div style={{ background: COR.card, borderRadius: 16, padding: 16, border: `1px solid ${COR.borda}` }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🏅 Conquistas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {itagame.badges.map((b, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Estatísticas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Avaliações', valor: totalNotas, cor: COR.azul, emoji: '📝' },
          { label: 'Presença', valor: pctPresenca !== null ? `${pctPresenca}%` : '—', cor: pctPresenca >= 75 ? COR.verde : COR.vermelho, emoji: '📅' },
          { label: 'Missões', valor: itagame.missoes?.length || 0, cor: COR.laranja, emoji: '🎯' },
        ].map(s => (
          <div key={s.label} style={{ background: COR.card, borderRadius: 14, padding: '14px 10px', border: `1px solid ${COR.borda}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: s.cor }}>{s.valor}</div>
            <div style={{ color: COR.sub, fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recados recentes */}
      {itagame.recados?.length > 0 && (
        <div style={{ background: COR.card, borderRadius: 16, padding: 16, border: `1px solid ${COR.borda}` }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>💬 Recados do Professor</div>
          {itagame.recados.slice(0, 3).map((r, i) => (
            <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${COR.borda}` : 'none', paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.titulo}</div>
              <div style={{ color: COR.sub, fontSize: 12, marginTop: 2 }}>{r.mensagem}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>{fmt(r.criado_em)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Botão ItagGame */}
      <button onClick={onItagame} style={{ background: `linear-gradient(135deg,${COR.laranja},${COR.vermelho})`, border: 'none', borderRadius: 14, padding: 14, color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', width: '100%' }}>
        🎮 Abrir ItagGame — Jogar Agora
      </button>
    </div>
  )
}

/* ─── Aba Notas ─── */
function AbaNotas({ notas }) {
  if (!notas.length) return <Vazio emoji="📝" texto="Nenhuma avaliação lançada ainda." />
  const media = Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: COR.card, borderRadius: 14, padding: 16, border: `1px solid ${COR.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: COR.sub, fontSize: 12 }}>Média Geral</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: media >= 7 ? COR.verde : media >= 5 ? COR.laranja : COR.vermelho }}>{media}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: COR.sub, fontSize: 12 }}>{notas.length} avaliações</div>
        </div>
      </div>
      {notas.map((n, i) => (
        <div key={i} style={{ background: COR.card, borderRadius: 14, padding: 14, border: `1px solid ${COR.borda}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{n.avaliacao_titulo}</div>
              <div style={{ color: COR.sub, fontSize: 12, marginTop: 2 }}>{n.disciplina} · {fmt(n.data_aplicacao)}</div>
            </div>
            <div style={{ textAlign: 'right', marginLeft: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: n.nota_final >= 7 ? COR.verde : n.nota_final >= 5 ? COR.laranja : COR.vermelho }}>{n.nota_final}</div>
              <div style={{ color: COR.sub, fontSize: 11 }}>{Math.round(n.percentual_acerto)}% acerto</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 4, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${n.percentual_acerto}%`, height: '100%', background: n.nota_final >= 7 ? COR.verde : n.nota_final >= 5 ? COR.laranja : COR.vermelho, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Aba Presença ─── */
function AbaPresenca({ presencas, presentes, pctPresenca }) {
  if (!presencas.length) return <Vazio emoji="📅" texto="Nenhum registro de presença ainda." />
  const faltas = presencas.length - presentes
  const cor = pctPresenca >= 75 ? COR.verde : pctPresenca >= 60 ? COR.laranja : COR.vermelho
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: COR.card, borderRadius: 14, padding: 16, border: `1px solid ${COR.borda}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div><div style={{ fontSize: 26, fontWeight: 900, color: cor }}>{pctPresenca}%</div><div style={{ color: COR.sub, fontSize: 11 }}>Frequência</div></div>
          <div><div style={{ fontSize: 26, fontWeight: 900, color: COR.verde }}>{presentes}</div><div style={{ color: COR.sub, fontSize: 11 }}>Presenças</div></div>
          <div><div style={{ fontSize: 26, fontWeight: 900, color: COR.vermelho }}>{faltas}</div><div style={{ color: COR.sub, fontSize: 11 }}>Faltas</div></div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: `${pctPresenca}%`, height: '100%', background: cor, borderRadius: 99 }} />
        </div>
        {pctPresenca < 75 && <div style={{ color: COR.vermelho, fontSize: 12, marginTop: 8, textAlign: 'center' }}>⚠️ Frequência abaixo de 75% — atenção!</div>}
      </div>
      {presencas.map((p, i) => (
        <div key={i} style={{ background: COR.card, borderRadius: 12, padding: '10px 14px', border: `1px solid ${COR.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>{fmt(p.data)}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {p.hora_entrada && <span style={{ color: COR.sub, fontSize: 12 }}>{p.hora_entrada}</span>}
            <span style={{ background: p.status === 'presente' ? `${COR.verde}22` : `${COR.vermelho}22`, color: p.status === 'presente' ? COR.verde : COR.vermelho, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
              {p.status === 'presente' ? '✓ Presente' : '✗ Falta'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Aba Ocorrências ─── */
function AbaOcorrencias({ ocorrencias }) {
  if (!ocorrencias.length) return <Vazio emoji="✅" texto="Nenhuma ocorrência registrada. Continue assim!" />
  const gravidadeCor = { baixa: COR.verde, media: COR.laranja, alta: COR.vermelho }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ocorrencias.map((o, i) => (
        <div key={i} style={{ background: COR.card, borderRadius: 14, padding: 14, border: `1px solid ${gravidadeCor[o.gravidade] || COR.borda}44` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ background: `${gravidadeCor[o.gravidade] || COR.borda}22`, color: gravidadeCor[o.gravidade], borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{o.gravidade}</span>
            <span style={{ color: COR.sub, fontSize: 12 }}>{fmt(o.criado_em)}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{o.tipo.replace('_', ' ')}</div>
          <div style={{ color: COR.sub, fontSize: 13, marginTop: 4 }}>{o.descricao}</div>
          {o.professor_nome && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>Prof. {o.professor_nome}</div>}
        </div>
      ))}
    </div>
  )
}

/* ─── Aba ItagGame ─── */
function AbaItagame({ itagame, onItagame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onItagame} style={{ background: `linear-gradient(135deg,${COR.laranja},${COR.vermelho})`, border: 'none', borderRadius: 14, padding: 16, color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
        🎮 Abrir ItagGame — Jogar Agora
      </button>

      {/* Missões */}
      {itagame.missoes?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🎯 Missões Ativas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itagame.missoes.map((m, i) => (
              <div key={i} style={{ background: COR.card, borderRadius: 14, padding: 14, border: `1px solid ${COR.borda}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>🎯 {m.titulo}</div>
                  <span style={{ background: `${COR.laranja}22`, color: COR.laranja, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>+{m.xp_recompensa} XP</span>
                </div>
                {m.descricao && <div style={{ color: COR.sub, fontSize: 12, marginTop: 4 }}>{m.descricao}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recados */}
      {itagame.recados?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>💬 Recados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itagame.recados.map((r, i) => (
              <div key={i} style={{ background: COR.card, borderRadius: 14, padding: 14, border: `1px solid ${COR.borda}` }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>💬 {r.titulo}</div>
                <div style={{ color: COR.sub, fontSize: 13, marginTop: 4 }}>{r.mensagem}</div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 6 }}>{fmt(r.criado_em)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico XP */}
      {itagame.historico?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>⚡ Histórico de XP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itagame.historico.map((h, i) => (
              <div key={i} style={{ background: COR.card, borderRadius: 12, padding: '10px 14px', border: `1px solid ${COR.borda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{h.descricao}</div>
                  <div style={{ color: COR.sub, fontSize: 11, marginTop: 2 }}>{fmt(h.criado_em)}</div>
                </div>
                <span style={{ color: h.xp_ganho >= 0 ? COR.verde : COR.vermelho, fontWeight: 700, fontSize: 14, marginLeft: 12, whiteSpace: 'nowrap' }}>
                  {h.xp_ganho >= 0 ? '+' : ''}{h.xp_ganho} XP
                </span>
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

/* ─── Aba Repositório ─── */
function AbaRepositorio({ repositorio }) {
  if (!repositorio.length) return <Vazio emoji="📚" texto="Nenhum material publicado ainda." />
  const tipoEmoji = { video: '🎥', documento: '📄', link: '🔗', exercicio: '📝', outro: '📌' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {repositorio.map((r, i) => (
        <a key={i} href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: COR.card, borderRadius: 14, padding: 14, border: `1px solid ${COR.borda}`, cursor: 'pointer', transition: 'border-color .2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{tipoEmoji[r.tipo] || '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COR.azul }}>{r.titulo}</div>
                {r.descricao && <div style={{ color: COR.sub, fontSize: 12, marginTop: 3 }}>{r.descricao}</div>}
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>{fmt(r.criado_em)} · {r.tipo}</div>
              </div>
              <span style={{ color: COR.azul, fontSize: 18 }}>↗</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

/* ─── Estado vazio ─── */
function Vazio({ emoji, texto }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: COR.sub }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 15 }}>{texto}</div>
    </div>
  )
}
