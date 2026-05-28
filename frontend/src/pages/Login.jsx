import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

const CREDS = [
  { perfil: 'Admin',      icon: '👑', email: 'admin@ita.com',      senha: 'ita2024' },
  { perfil: 'Secretaria', icon: '📋', email: 'secretaria@ita.com', senha: 'ita2024' },
  { perfil: 'Professor',  icon: '👨‍🏫', email: '',                  senha: '' },
  { perfil: 'Aluno',      icon: '🎓', email: null,                 senha: null },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [erro, setErro]           = useState('')
  const [carregando, setCarregando] = useState(false)
  const [verSenha, setVerSenha]   = useState(false)
  const [shakeEmail, setShakeEmail] = useState(false)
  const [shakeSenha, setShakeSenha] = useState(false)
  const [tooltip, setTooltip]     = useState(false)

  function shake(set) { set(true); setTimeout(() => set(false), 420) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    let inv = false
    if (!email) { shake(setShakeEmail); inv = true }
    if (!senha) { shake(setShakeSenha); inv = true }
    if (inv) return
    setCarregando(true)
    try {
      const { data } = await api.post('/auth/login', { email, senha })
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      navigate(data.trocar_senha ? '/trocar-senha' : '/dashboard')
    } catch (err) {
      if (!err.response) setErro('Servidor offline. Verifique se o backend está rodando.')
      else setErro(err.response?.data?.erro || 'Email ou senha incorretos.')
    } finally { setCarregando(false) }
  }

  function clicarCred(c) {
    if (c.email === null) { setTooltip(true); setTimeout(() => setTooltip(false), 3000); return }
    if (c.email === '') { document.getElementById('inp-email')?.focus(); return }
    setEmail(c.email); setSenha(c.senha); setErro('')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@400;700;900&display=swap');

        *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes floatIn  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse{ 0%,100%{box-shadow:0 0 24px rgba(245,166,35,.45)} 50%{box-shadow:0 0 42px rgba(245,166,35,.75)} }

        /* ── ROOT ── */
        .lg-root {
          display: flex;
          height: 100vh;
          background: #07101e;
          font-family: 'Exo 2', sans-serif;
          overflow: hidden;
          border: 1px solid rgba(245,166,35,.2);
        }

        /* ════════════════════════════════════════
           PAINEL ESQUERDO
        ════════════════════════════════════════ */
        .lg-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 36px;
          padding: 48px 56px;
          background: #050d19;
          background-image:
            radial-gradient(rgba(245,166,35,0.09) 1px, transparent 1px);
          background-size: 26px 26px;
          border-right: 1px solid rgba(245,166,35,.18);
          position: relative;
          overflow: hidden;
        }
        /* Glow dourado no rodapé */
        .lg-left::after {
          content: '';
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 200px;
          background: radial-gradient(ellipse 60% 40% at 50% 100%, rgba(245,166,35,.18) 0%, transparent 70%);
          pointer-events: none;
        }
        @media (max-width: 767px) { .lg-left { display: none; } }

        /* — Bloco de identidade ITA — */
        .lg-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .lg-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #f5a623, #e08000);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 0 28px rgba(245,166,35,.55), 0 4px 16px rgba(0,0,0,.4);
          animation: glowPulse 2.8s ease-in-out infinite;
          flex-shrink: 0;
        }

        .lg-ita-name {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: 24px;
          color: #f5a623;
          letter-spacing: 3px;
          text-shadow: 0 0 18px rgba(245,166,35,.7), 0 0 40px rgba(245,166,35,.3);
          line-height: 1;
        }

        .lg-ita-sub {
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 11px;
          color: #cbd5e1;
          letter-spacing: 7px;
          text-transform: uppercase;
          line-height: 1;
        }

        /* — Logo CEITECGAME — */
        .lg-ceitec {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: 28px;
          line-height: 1;
          letter-spacing: 2px;
        }
        .lg-ceitec-c { color: #f5a623; text-shadow: 0 0 18px rgba(245,166,35,.8), 0 0 40px rgba(245,166,35,.4); }
        .lg-ceitec-g { color: #22c55e; text-shadow: 0 0 18px rgba(34,197,94,.8),  0 0 40px rgba(34,197,94,.4); }

        /* — Tagline — */
        .lg-tagline {
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          font-size: 13px;
          text-align: center;
          line-height: 1.6;
        }
        .lg-tagline-gold  { color: #f5a623; text-shadow: 0 0 12px rgba(245,166,35,.5); }
        .lg-tagline-green { color: #22c55e; text-shadow: 0 0 12px rgba(34,197,94,.5); }

        /* — Badge roxo — */
        .lg-badge-roxo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(124,58,237,.2);
          border: 1px solid rgba(124,58,237,.5);
          border-radius: 20px;
          padding: 6px 16px;
        }
        .lg-badge-dot {
          width: 7px;
          height: 7px;
          background: #a78bfa;
          border-radius: 50%;
          animation: pulse 1.4s ease-in-out infinite;
          flex-shrink: 0;
          box-shadow: 0 0 8px #a78bfa;
        }
        .lg-badge-roxo span:last-child {
          font-family: 'Exo 2', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #c4b5fd;
          letter-spacing: .5px;
        }

        /* ════════════════════════════════════════
           PAINEL DIREITO
        ════════════════════════════════════════ */
        .lg-right {
          width: 380px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 28px;
          background: #07101e;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 767px) { .lg-right { width: 100%; } }

        /* Glow dourado no topo do painel direito */
        .lg-right::before {
          content: '';
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 220px;
          background: radial-gradient(ellipse 50% 30% at 50% 0%, rgba(245,166,35,.1) 0%, transparent 100%);
          pointer-events: none;
        }

        .lg-form-wrap {
          width: 100%;
          max-width: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
          animation: floatIn .5s ease both;
        }

        /* — Título — */
        .lg-form-title {
          text-align: center;
          margin-bottom: 24px;
          width: 100%;
        }
        .lg-form-title h2 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: 22px;
          color: #fff;
          margin-bottom: 6px;
          line-height: 1.2;
        }
        .lg-form-title p {
          font-family: 'Exo 2', sans-serif;
          font-size: 13px;
          color: #94a3b8;
        }

        /* — Campos — */
        .lg-field {
          width: 100%;
          margin-bottom: 16px;
        }
        .lg-field label {
          display: block;
          font-family: 'Exo 2', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #f5a623;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .lg-field-wrap { position: relative; }
        .lg-field-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          pointer-events: none;
          line-height: 1;
        }
        .lg-input {
          width: 100%;
          height: 46px;
          padding: 0 14px 0 40px;
          background: rgba(255,255,255,.05);
          border: 1.5px solid rgba(255,255,255,.15);
          border-radius: 10px;
          color: #fff;
          font-family: 'Exo 2', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .lg-input::placeholder { color: #475569; }
        .lg-input:focus {
          border-color: #f5a623;
          background: rgba(245,166,35,.05);
          box-shadow: 0 0 0 3px rgba(245,166,35,.15);
        }
        .lg-input.err   { border-color: #e74c3c; }
        .lg-input.shake { animation: shake .4s ease; }
        .lg-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          color: #475569;
          padding: 2px;
          line-height: 1;
          transition: color .2s;
        }
        .lg-eye:hover { color: #94a3b8; }

        /* — Erro — */
        .lg-err {
          width: 100%;
          background: rgba(231,76,60,.12);
          border: 1px solid rgba(231,76,60,.35);
          color: #ff8a8a;
          font-family: 'Exo 2', sans-serif;
          font-size: 12px;
          border-radius: 8px;
          padding: 10px 13px;
          margin-bottom: 14px;
          display: flex;
          align-items: flex-start;
          gap: 7px;
        }

        /* — Botão principal — */
        .lg-btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #f5a623, #d97706);
          border: none;
          border-radius: 11px;
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: 13px;
          color: #0a1628;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(245,166,35,.45), 0 2px 8px rgba(245,166,35,.25);
          transition: transform .2s, box-shadow .2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .lg-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(245,166,35,.65), 0 4px 16px rgba(245,166,35,.35);
        }
        .lg-btn:active:not(:disabled) { transform: translateY(-1px); }
        .lg-btn:disabled { opacity: .6; cursor: not-allowed; }
        .lg-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(10,22,40,.3);
          border-top-color: #0a1628;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        /* — Botão secundário — */
        .lg-btn-sec {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          height: 46px;
          background: transparent;
          border: 1.5px solid rgba(245,166,35,.35);
          border-radius: 11px;
          font-family: 'Exo 2', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #f5a623;
          cursor: pointer;
          text-decoration: none;
          transition: background .2s, border-color .2s;
          margin-bottom: 20px;
        }
        .lg-btn-sec:hover {
          background: rgba(245,166,35,.08);
          border-color: #f5a623;
        }

        /* — Divisor — */
        .lg-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin-bottom: 14px;
        }
        .lg-divider::before,
        .lg-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,.1);
        }
        .lg-divider span {
          font-family: 'Exo 2', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,.25);
          letter-spacing: 2px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* — Acesso rápido — */
        .lg-creds {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          position: relative;
        }
        .lg-cred {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 11px 10px;
          cursor: pointer;
          text-align: center;
          transition: background .2s, border-color .2s, transform .2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .lg-cred:hover {
          background: rgba(245,166,35,.08);
          border-color: rgba(245,166,35,.5);
          transform: translateY(-2px);
        }
        .lg-cred-icon  { font-size: 18px; line-height: 1; }
        .lg-cred-role  { font-family: 'Exo 2', sans-serif; font-size: 11px; font-weight: 700; color: #f5a623; }
        .lg-cred-email { font-family: 'Exo 2', sans-serif; font-size: 9px; color: rgba(255,255,255,.3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }

        .lg-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: #0f1e35;
          border: 1px solid rgba(245,166,35,.3);
          color: #f5a623;
          font-family: 'Exo 2', sans-serif;
          font-size: 11px;
          padding: 8px 14px;
          border-radius: 8px;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0,0,0,.4);
          z-index: 20;
          pointer-events: none;
        }
        .lg-tooltip::after {
          content: '';
          position: absolute;
          bottom: -5px;
          right: 18px;
          width: 10px;
          height: 10px;
          background: #0f1e35;
          border-right: 1px solid rgba(245,166,35,.3);
          border-bottom: 1px solid rgba(245,166,35,.3);
          transform: rotate(45deg);
        }

        /* — Rodapé — */
        .lg-copy {
          font-family: 'Exo 2', sans-serif;
          font-size: 9px;
          color: rgba(255,255,255,.15);
          text-align: center;
          margin-top: 18px;
          width: 100%;
          letter-spacing: .5px;
        }
      `}</style>

      <div className="lg-root">

        {/* ═══════════════════════════════════════
            PAINEL ESQUERDO — Branding
        ═══════════════════════════════════════ */}
        <div className="lg-left">

          {/* Ícone + ITA TECNOLOGIA EDUCACIONAL */}
          <div className="lg-brand">
            <div className="lg-icon">🎓</div>
            <div className="lg-ita-name">ITA TECNOLOGIA</div>
            <div className="lg-ita-sub">EDUCACIONAL</div>
          </div>

          {/* Logo CEITECGAME */}
          <div style={{ textAlign: 'center' }}>
            <div className="lg-ceitec">
              <span className="lg-ceitec-c">CEITEC</span>
              <span className="lg-ceitec-g">GAME</span>
            </div>
            <div className="lg-tagline" style={{ marginTop: 10 }}>
              <span className="lg-tagline-gold">Gamificando o Ensino</span>
              <br />
              <span className="lg-tagline-green">para Alcançar Melhores Resultados</span>
            </div>
          </div>

          {/* Badge roxo */}
          <div className="lg-badge-roxo">
            <span className="lg-badge-dot" />
            <span>Sistema v2.0 — IA + Gamificação</span>
          </div>

        </div>

        {/* ═══════════════════════════════════════
            PAINEL DIREITO — Formulário
        ═══════════════════════════════════════ */}
        <div className="lg-right">
          <div className="lg-form-wrap">

            {/* Título */}
            <div className="lg-form-title">
              <h2>Bem-vindo de volta</h2>
              <p>Entre com suas credenciais para acessar o sistema</p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>

              {/* Email */}
              <div className="lg-field">
                <label>E-MAIL</label>
                <div className="lg-field-wrap">
                  <span className="lg-field-icon">✉️</span>
                  <input
                    id="inp-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`lg-input${!email && shakeEmail ? ' err shake' : ''}`}
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="lg-field">
                <label>SENHA</label>
                <div className="lg-field-wrap">
                  <span className="lg-field-icon">🔑</span>
                  <input
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className={`lg-input${!senha && shakeSenha ? ' err shake' : ''}`}
                    style={{ paddingRight: 40 }}
                    placeholder="••••••••"
                  />
                  <button type="button" className="lg-eye" onClick={() => setVerSenha(v => !v)}>
                    {verSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <div className="lg-err">
                  <span>⚠️</span><span>{erro}</span>
                </div>
              )}

              {/* Botão principal */}
              <button type="submit" disabled={carregando} className="lg-btn">
                {carregando
                  ? <><span className="lg-spinner" /> Entrando...</>
                  : '→ ENTRAR NO SISTEMA'
                }
              </button>
            </form>

            {/* Botão secundário */}
            <Link to="/planos" className="lg-btn-sec">
              🏫 Criar conta — ver planos
            </Link>

            {/* Divisor acesso rápido */}
            <div className="lg-divider"><span>acesso rápido</span></div>

            {/* Cards de acesso rápido */}
            <div className="lg-creds">
              {CREDS.map(c => (
                <button key={c.perfil} type="button" className="lg-cred" onClick={() => clicarCred(c)}>
                  <span className="lg-cred-icon">{c.icon}</span>
                  <span className="lg-cred-role">{c.perfil}</span>
                  <span className="lg-cred-email">
                    {c.email || (c.email === '' ? 'digitar email' : 'via QR Code')}
                  </span>
                </button>
              ))}
              {tooltip && (
                <div className="lg-tooltip">
                  📱 Alunos acessam via QR Code na entrada
                </div>
              )}
            </div>

            {/* Rodapé */}
            <p className="lg-copy">© 2026 ITA Tecnologia Educacional · Sistema Inteligente de Educação</p>

          </div>
        </div>

      </div>
    </>
  )
}
