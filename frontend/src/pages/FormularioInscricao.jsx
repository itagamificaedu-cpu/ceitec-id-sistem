import React, { useState, useEffect } from 'react'

const API = '/node-api/inscricao'

const NIVEIS = [
  { value: 'iniciante', label: 'Iniciante — nunca mexi com eletrônica' },
  { value: 'basico', label: 'Básico — já vi alguma coisa' },
  { value: 'intermediario', label: 'Intermediário — já programei um pouco' },
]

const TURNOS = [
  { value: 'manha', label: 'Manhã (8h–12h)' },
  { value: 'tarde', label: 'Tarde (13h–17h)' },
]

export default function FormularioInscricao() {
  const [vagas, setVagas] = useState(null)
  const [form, setForm] = useState({
    nome_completo: '', data_nascimento: '', escola: '', serie: '',
    nivel_experiencia: '', turno: '', nome_responsavel: '', telefone: '',
    email: '', cpf_responsavel: '', autoriza_imagem: false, aceita_termos: false,
  })
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch(`${API}/vagas`)
      .then(r => r.json())
      .then(setVagas)
      .catch(() => {})
  }, [])

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function enviar(e) {
    e.preventDefault()
    if (!form.aceita_termos) { setErro('Você precisa aceitar os termos para se inscrever.'); return }
    setErro('')
    setEnviando(true)
    try {
      const r = await fetch(`${API}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) { setErro(data.erro || 'Erro ao enviar inscrição.'); return }
      setSucesso(data.codigo)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#16a34a', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Inscrição Realizada!</h2>
        <p style={{ color: '#374151', marginBottom: 16 }}>
          Sua inscrição foi enviada com sucesso!<br />
          Em breve entraremos em contato pelo WhatsApp para confirmar o pagamento.
        </p>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: '#15803d', margin: 0 }}>Código da inscrição</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#166534', letterSpacing: 2, margin: '4px 0 0' }}>
            {sucesso.toString().slice(0, 8).toUpperCase()}
          </p>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Guarde este código — você vai precisar dele para acompanhar sua inscrição.</p>
        <a href="/curso-ferias" style={{ display: 'inline-block', background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          Voltar para a página do curso
        </a>
      </div>
    </div>
  )

  const lotado = vagas && vagas.lotado

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 }}>Alunos Maker Não Tiram Férias!</h1>
          <p style={{ color: '#a5b4fc', marginTop: 8 }}>Curso de Férias Maker — CEITEC Itapipoca</p>
          {vagas && (
            <div style={{ marginTop: 12, display: 'inline-block', background: vagas.vagas_disponiveis <= 5 ? '#fef3c7' : '#d1fae5', borderRadius: 8, padding: '6px 16px' }}>
              <span style={{ color: vagas.vagas_disponiveis <= 5 ? '#92400e' : '#065f46', fontWeight: 700 }}>
                {vagas.vagas_disponiveis} vaga{vagas.vagas_disponiveis !== 1 ? 's' : ''} disponível{vagas.vagas_disponiveis !== 1 ? 'is' : ''}
              </span>
            </div>
          )}
        </div>

        {lotado ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>😔</div>
            <h2 style={{ color: '#dc2626', marginTop: 12 }}>Vagas Esgotadas</h2>
            <p style={{ color: '#374151' }}>As vagas para este curso já foram preenchidas.<br />Entre em contato pelo WhatsApp para saber das próximas turmas.</p>
            <a href="https://wa.me/5588988411890" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 16, background: '#16a34a', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              Falar no WhatsApp
            </a>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ background: '#fff', borderRadius: 16, padding: '32px 24px' }}>

            <h2 style={{ color: '#1e40af', fontSize: 18, fontWeight: 700, marginBottom: 20, borderBottom: '2px solid #e0e7ff', paddingBottom: 10 }}>
              Dados do Aluno
            </h2>

            <Campo label="Nome completo do aluno *" required>
              <input value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} required style={inputStyle} placeholder="Nome completo" />
            </Campo>

            <Campo label="Data de nascimento *" required>
              <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} required style={inputStyle} />
            </Campo>

            <Campo label="Escola *" required>
              <input value={form.escola} onChange={e => set('escola', e.target.value)} required style={inputStyle} placeholder="Nome da escola" />
            </Campo>

            <Campo label="Série/Ano *" required>
              <input value={form.serie} onChange={e => set('serie', e.target.value)} required style={inputStyle} placeholder="Ex: 8º Ano, 1º EM..." />
            </Campo>

            <Campo label="Nível de experiência *">
              <select value={form.nivel_experiencia} onChange={e => set('nivel_experiencia', e.target.value)} required style={inputStyle}>
                <option value="">Selecione...</option>
                {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </Campo>

            <Campo label="Turno de preferência *">
              <select value={form.turno} onChange={e => set('turno', e.target.value)} required style={inputStyle}>
                <option value="">Selecione...</option>
                {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Campo>

            <h2 style={{ color: '#1e40af', fontSize: 18, fontWeight: 700, margin: '28px 0 20px', borderBottom: '2px solid #e0e7ff', paddingBottom: 10 }}>
              Dados do Responsável
            </h2>

            <Campo label="Nome do responsável *">
              <input value={form.nome_responsavel} onChange={e => set('nome_responsavel', e.target.value)} required style={inputStyle} placeholder="Nome completo do responsável" />
            </Campo>

            <Campo label="Telefone / WhatsApp *">
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)} required style={inputStyle} placeholder="(88) 9XXXX-XXXX" />
            </Campo>

            <Campo label="E-mail *">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required style={inputStyle} placeholder="email@exemplo.com" />
            </Campo>

            <Campo label="CPF do responsável *">
              <input value={form.cpf_responsavel} onChange={e => set('cpf_responsavel', e.target.value)} required style={inputStyle} placeholder="000.000.000-00" />
            </Campo>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.autoriza_imagem} onChange={e => set('autoriza_imagem', e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#374151' }}>Autorizo o uso de imagem do aluno para fins educacionais e divulgação do curso.</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.aceita_termos} onChange={e => set('aceita_termos', e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#374151' }}>Declaro que li e aceito os termos de participação do Curso de Férias Maker. *</span>
              </label>
            </div>

            {erro && (
              <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 14 }}>
                {erro}
              </div>
            )}

            <button type="submit" disabled={enviando} style={{ marginTop: 28, width: '100%', background: enviando ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer' }}>
              {enviando ? 'Enviando...' : '✅ Confirmar Inscrição'}
            </button>

            <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Após a inscrição, entraremos em contato pelo WhatsApp para confirmar o pagamento (R$ 199,00).
            </p>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/curso-ferias" style={{ color: '#a5b4fc', fontSize: 14, textDecoration: 'none' }}>← Voltar para a página do curso</a>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 15, color: '#111827', background: '#fff', boxSizing: 'border-box',
  outline: 'none',
}
