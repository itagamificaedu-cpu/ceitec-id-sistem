import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

const CREDS = [
  { perfil: 'Admin',      icon: '👑', email: 'admin@ita.com',      senha: 'ita2024' },
  { perfil: 'Secretaria', icon: '📋', email: 'secretaria@ita.com', senha: 'ita2024' },
  { perfil: 'Professor',  icon: '👨‍🏫', email: '',                  senha: '' },
  { perfil: 'Aluno',      icon: '🎓', email: null,                 senha: null },
]

const FEATURES = [
  { icon: '🎮', titulo: 'Gamificação',       desc: 'XP, missões, rankings e recompensas que transformam o aprendizado em jogo.' },
  { icon: '🤖', titulo: 'IA Educacional',    desc: 'Questões, diagnósticos e planos de aula gerados por inteligência artificial.' },
  { icon: '📊', titulo: 'Desempenho Real',   desc: 'Acompanhe cada aluno em tempo real com dados precisos de frequência e notas.' },
  { icon: '🏆', titulo: 'Engajamento Total', desc: 'Álbum de figurinhas, Copa do Saber e ItagGame para manter o aluno ativo.' },
]

const STATS = [
  { valor: '500+', label: 'Alunos ativos'   },
  { valor: '9',    label: 'Turmas'          },
  { valor: '1.2k', label: 'Questões de IA'  },
  { valor: '247',  label: 'Missões criadas' },
]

export default function Login() {
  const navigate = useNavigate()
  const [email,       setEmail]       = useState('')
  const [senha,       setSenha]       = useState('')
  const [erro,        setErro]        = useState('')
  const [carregando,  setCarregando]  = useState(false)
  const [verSenha,    setVerSenha]    = useState(false)
  const [shakeEmail,  setShakeEmail]  = useState(false)
  const [shakeSenha,  setShakeSenha]  = useState(false)
  const [tooltip,     setTooltip]     = useState(false)

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
      if (!err.response) setErro('Servidor offline. Verifique a conexão.')
      else setErro(err.response?.data?.erro || 'E-mail ou senha incorretos.')
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }

        .lp { min-height:100vh; font-family:'Inter',sans-serif; background:#fff; display:flex; }

        /* ── PAINEL ESQUERDO ── */
        .lp-left {
          flex:1; display:flex; flex-direction:column;
          padding: 48px 56px;
          background: linear-gradient(160deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%);
          position:relative; overflow:hidden;
        }
        .lp-left::before {
          content:''; position:absolute; top:-120px; right:-80px;
          width:500px; height:500px; border-radius:50%;
          background:radial-gradient(circle, rgba(124,58,237,.08) 0%, transparent 70%);
          pointer-events:none;
        }
        .lp-left::after {
          content:''; position:absolute; bottom:-100px; left:-60px;
          width:400px; height:400px; border-radius:50%;
          background:radial-gradient(circle, rgba(16,185,129,.07) 0%, transparent 70%);
          pointer-events:none;
        }

        /* — Logo / brand — */
        .lp-brand { display:flex; align-items:center; gap:12px; margin-bottom:56px; position:relative; z-index:1; }
        .lp-brand-icon {
          width:44px; height:44px; border-radius:12px;
          background:linear-gradient(135deg,#7c3aed,#a855f7);
          display:flex; align-items:center; justify-content:center;
          font-size:22px; flex-shrink:0;
          box-shadow:0 4px 16px rgba(124,58,237,.3);
        }
        .lp-brand-name { font-weight:800; font-size:18px; color:#1e1b4b; letter-spacing:-.3px; }
        .lp-brand-sub  { font-size:11px; color:#6b7280; font-weight:500; }

        /* — Headline — */
        .lp-headline { position:relative; z-index:1; margin-bottom:32px; animation:fadeUp .6s ease both; }
        .lp-headline h1 {
          font-size:clamp(28px,3.2vw,42px); font-weight:900;
          color:#1e1b4b; line-height:1.15; margin-bottom:14px;
          letter-spacing:-.5px;
        }
        .lp-headline h1 .hl-purple { color:#7c3aed; }
        .lp-headline h1 .hl-green  { color:#10b981; }
        .lp-headline p {
          font-size:16px; color:#6b7280; line-height:1.7; max-width:480px;
        }

        /* — Badge — */
        .lp-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:#fff; border:1px solid #e5e7eb;
          border-radius:30px; padding:6px 16px 6px 10px;
          margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,.06);
          position:relative; z-index:1;
        }
        .lp-badge-dot { width:8px; height:8px; background:#10b981; border-radius:50%; animation:pulse 1.5s ease-in-out infinite; }
        .lp-badge span:last-child { font-size:12px; font-weight:600; color:#374151; }

        /* — Feature cards — */
        .lp-features { display:grid; grid-template-columns:1fr 1fr; gap:12px; position:relative; z-index:1; animation:fadeUp .7s ease .1s both; }
        .lp-feat {
          background:#fff; border:1px solid #e5e7eb; border-radius:16px;
          padding:18px 16px; cursor:default;
          transition:transform .2s, box-shadow .2s, border-color .2s;
          box-shadow:0 2px 8px rgba(0,0,0,.04);
        }
        .lp-feat:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08); border-color:#c4b5fd; }
        .lp-feat-icon { font-size:28px; margin-bottom:8px; }
        .lp-feat-title { font-size:13px; font-weight:700; color:#1e1b4b; margin-bottom:4px; }
        .lp-feat-desc  { font-size:12px; color:#6b7280; line-height:1.5; }

        /* — Stats — */
        .lp-stats { display:flex; gap:24px; margin-top:20px; position:relative; z-index:1; animation:fadeUp .8s ease .2s both; }
        .lp-stat  { text-align:center; }
        .lp-stat-val { font-size:22px; font-weight:900; color:#7c3aed; }
        .lp-stat-lbl { font-size:11px; color:#9ca3af; font-weight:500; margin-top:2px; }

        /* — Depoimento — */
        .lp-quote {
          background:#fff; border:1px solid #e5e7eb; border-radius:16px;
          padding:18px 20px; margin-top:20px;
          position:relative; z-index:1; animation:fadeUp .9s ease .3s both;
          box-shadow:0 2px 8px rgba(0,0,0,.04);
        }
        .lp-quote p   { font-size:13px; color:#374151; line-height:1.6; font-style:italic; margin-bottom:10px; }
        .lp-quote-by  { display:flex; align-items:center; gap:8px; }
        .lp-quote-av  { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#7c3aed,#a855f7); display:flex; align-items:center; justify-content:center; font-size:14px; }
        .lp-quote-name { font-size:12px; font-weight:700; color:#1e1b4b; }
        .lp-quote-role { font-size:11px; color:#9ca3af; }
        .lp-stars { color:#f59e0b; font-size:12px; margin-top:2px; }

        /* ── PAINEL DIREITO ── */
        .lp-right {
          width:460px; flex-shrink:0;
          background:#fff;
          border-left:1px solid #f3f4f6;
          display:flex; align-items:center; justify-content:center;
          padding:40px 40px;
          box-shadow:-4px 0 40px rgba(0,0,0,.05);
        }

        .lp-form-wrap { width:100%; max-width:360px; animation:fadeUp .5s ease both; }

        /* — Segurança badge — */
        .lp-secure {
          display:flex; align-items:center; justify-content:flex-end;
          gap:6px; margin-bottom:24px;
          font-size:11px; color:#9ca3af; font-weight:500;
        }
        .lp-secure-dot { width:8px; height:8px; background:#10b981; border-radius:50%; }

        /* — Título do form — */
        .lp-form-title { margin-bottom:28px; }
        .lp-form-title h2 { font-size:24px; font-weight:800; color:#1e1b4b; margin-bottom:4px; }
        .lp-form-title p  { font-size:13px; color:#6b7280; }

        /* — Campo — */
        .lp-field { margin-bottom:16px; }
        .lp-field label {
          display:block; font-size:12px; font-weight:600;
          color:#374151; letter-spacing:.3px; margin-bottom:6px;
        }
        .lp-field-wrap { position:relative; }
        .lp-field-icon {
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          font-size:15px; pointer-events:none; line-height:1;
        }
        .lp-input {
          width:100%; height:48px; padding:0 14px 0 44px;
          background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:12px;
          color:#111827; font-family:'Inter',sans-serif; font-size:14px;
          outline:none; transition:border-color .2s, background .2s, box-shadow .2s;
        }
        .lp-input::placeholder { color:#9ca3af; }
        .lp-input:focus {
          border-color:#7c3aed; background:#faf5ff;
          box-shadow:0 0 0 3px rgba(124,58,237,.1);
        }
        .lp-input.err   { border-color:#ef4444; background:#fef2f2; }
        .lp-input.shake { animation:shake .4s ease; }
        .lp-eye {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer;
          font-size:16px; color:#9ca3af; padding:2px; transition:color .2s;
        }
        .lp-eye:hover { color:#374151; }

        /* — Erro — */
        .lp-err {
          background:#fef2f2; border:1px solid #fecaca;
          color:#dc2626; font-size:12px; border-radius:10px;
          padding:10px 14px; margin-bottom:14px;
          display:flex; align-items:center; gap:7px;
        }

        /* — Botão principal — */
        .lp-btn {
          width:100%; height:50px;
          background:linear-gradient(135deg,#7c3aed,#9333ea);
          border:none; border-radius:12px; color:#fff;
          font-family:'Inter',sans-serif; font-weight:700; font-size:15px;
          cursor:pointer; transition:transform .2s, box-shadow .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
          margin-bottom:12px;
          box-shadow:0 4px 20px rgba(124,58,237,.35);
        }
        .lp-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(124,58,237,.5); }
        .lp-btn:active:not(:disabled) { transform:translateY(0); }
        .lp-btn:disabled { opacity:.65; cursor:not-allowed; }
        .lp-spinner {
          width:18px; height:18px;
          border:2.5px solid rgba(255,255,255,.3);
          border-top-color:#fff; border-radius:50%;
          animation:spin .7s linear infinite;
        }

        /* — Botão secundário — */
        .lp-btn-sec {
          display:flex; align-items:center; justify-content:center; gap:7px;
          width:100%; height:46px;
          background:#fff; border:1.5px solid #e5e7eb; border-radius:12px;
          font-family:'Inter',sans-serif; font-size:13px; font-weight:600;
          color:#374151; cursor:pointer; text-decoration:none;
          transition:background .2s, border-color .2s, color .2s;
          margin-bottom:24px;
        }
        .lp-btn-sec:hover { background:#f5f3ff; border-color:#c4b5fd; color:#7c3aed; }

        /* — Divisor — */
        .lp-divider {
          display:flex; align-items:center; gap:10px;
          width:100%; margin-bottom:14px;
        }
        .lp-divider::before, .lp-divider::after {
          content:''; flex:1; height:1px; background:#f3f4f6;
        }
        .lp-divider span {
          font-size:10px; font-weight:600; color:#d1d5db;
          letter-spacing:1px; text-transform:uppercase; white-space:nowrap;
        }

        /* — Acesso rápido — */
        .lp-creds { display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; position:relative; }
        .lp-cred {
          background:#f9fafb; border:1.5px solid #f3f4f6;
          border-radius:12px; padding:12px 10px; cursor:pointer;
          text-align:center; display:flex; flex-direction:column;
          align-items:center; gap:3px;
          transition:background .2s, border-color .2s, transform .15s;
        }
        .lp-cred:hover { background:#f5f3ff; border-color:#c4b5fd; transform:translateY(-2px); }
        .lp-cred-icon  { font-size:20px; line-height:1; }
        .lp-cred-role  { font-size:12px; font-weight:700; color:#7c3aed; }
        .lp-cred-email { font-size:10px; color:#9ca3af; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }

        .lp-tooltip {
          position:absolute; bottom:calc(100% + 8px); right:0;
          background:#1e1b4b; color:#fff;
          font-size:11px; padding:8px 14px; border-radius:8px;
          white-space:nowrap; box-shadow:0 4px 20px rgba(0,0,0,.15);
          z-index:20; pointer-events:none;
        }
        .lp-tooltip::after {
          content:''; position:absolute; bottom:-5px; right:18px;
          width:10px; height:10px; background:#1e1b4b;
          transform:rotate(45deg);
        }

        .lp-copy { font-size:10px; color:#d1d5db; text-align:center; margin-top:24px; width:100%; }

        /* ── RESPONSIVO ── */
        @media (max-width:1100px) { .lp-left { padding:40px 36px; } .lp-features { grid-template-columns:1fr 1fr; } }
        @media (max-width:900px)  { .lp-right { width:420px; } .lp-stats { gap:16px; } }
        @media (max-width:680px)  { .lp-left { display:none; } .lp-right { width:100%; border-left:none; box-shadow:none; padding:32px 24px; } }
      `}</style>

      <div className="lp">

        {/* ══════════════════ PAINEL ESQUERDO ══════════════════ */}
        <div className="lp-left">

          {/* Logo */}
          <div className="lp-brand">
            <div className="lp-brand-icon">🎓</div>
            <div>
              <div className="lp-brand-name">ITA Tecnologia Educacional</div>
              <div className="lp-brand-sub">itatecnologiaeducacional.tech</div>
            </div>
          </div>

          {/* Badge live */}
          <div className="lp-badge">
            <span className="lp-badge-dot"/>
            <span>Sistema v2.0 — IA + Gamificação ativo</span>
          </div>

          {/* Headline */}
          <div className="lp-headline">
            <h1>
              Plataforma de{' '}
              <span className="hl-purple">gamificação educacional</span>{' '}
              com{' '}
              <span className="hl-green">IA</span>{' '}
              para aprendizagem
            </h1>
            <p>
              Engaje alunos. Acompanhe professores. Fortaleça sua escola.<br/>
              Missões, XP, diagnósticos por IA e muito mais — tudo em um lugar.
            </p>
          </div>

          {/* Feature cards */}
          <div className="lp-features">
            {FEATURES.map(f => (
              <div key={f.titulo} className="lp-feat">
                <div className="lp-feat-icon">{f.icon}</div>
                <div className="lp-feat-title">{f.titulo}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="lp-stats">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat">
                <div className="lp-stat-val">{s.valor}</div>
                <div className="lp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Depoimento */}
          <div className="lp-quote">
            <p>"Agora estudar parece um jogo. A gente faz missões, ganha moedas e vai subindo de nível. Nunca gostei tanto de aprender!"</p>
            <div className="lp-quote-by">
              <div className="lp-quote-av">😊</div>
              <div>
                <div className="lp-quote-name">Ana Beatriz</div>
                <div className="lp-quote-role">Aluna do 9º ano · CEITEC</div>
                <div className="lp-stars">★★★★★</div>
              </div>
            </div>
          </div>

        </div>

        {/* ══════════════════ PAINEL DIREITO ══════════════════ */}
        <div className="lp-right">
          <div className="lp-form-wrap">

            {/* Segurança */}
            <div className="lp-secure">
              <span className="lp-secure-dot"/>
              <span>ACESSO SEGURO</span>
            </div>

            {/* Título */}
            <div className="lp-form-title">
              <h2>Bem-vindo de volta 👋</h2>
              <p>Entre com suas credenciais para acessar o sistema</p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate>

              <div className="lp-field">
                <label>E-mail</label>
                <div className="lp-field-wrap">
                  <span className="lp-field-icon">✉️</span>
                  <input
                    id="inp-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`lp-input${!email && shakeEmail ? ' err shake' : ''}`}
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>
              </div>

              <div className="lp-field">
                <label>Senha</label>
                <div className="lp-field-wrap">
                  <span className="lp-field-icon">🔑</span>
                  <input
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className={`lp-input${!senha && shakeSenha ? ' err shake' : ''}`}
                    style={{ paddingRight: 44 }}
                    placeholder="••••••••"
                  />
                  <button type="button" className="lp-eye" onClick={() => setVerSenha(v => !v)}>
                    {verSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="lp-err">
                  <span>⚠️</span><span>{erro}</span>
                </div>
              )}

              <button type="submit" disabled={carregando} className="lp-btn">
                {carregando
                  ? <><span className="lp-spinner"/> Entrando...</>
                  : '→ Entrar no Sistema'
                }
              </button>
            </form>

            <Link to="/planos" className="lp-btn-sec">
              🏫 Criar conta — ver planos
            </Link>

            <div className="lp-divider"><span>acesso rápido</span></div>

            <div className="lp-creds">
              {CREDS.map(c => (
                <button key={c.perfil} type="button" className="lp-cred" onClick={() => clicarCred(c)}>
                  <span className="lp-cred-icon">{c.icon}</span>
                  <span className="lp-cred-role">{c.perfil}</span>
                  <span className="lp-cred-email">
                    {c.email || (c.email === '' ? 'digitar email' : 'via QR Code')}
                  </span>
                </button>
              ))}
              {tooltip && (
                <div className="lp-tooltip">
                  📱 Alunos acessam via QR Code na entrada
                </div>
              )}
            </div>

            <p className="lp-copy">© 2026 ITA Tecnologia Educacional · Sistema Inteligente de Educação</p>

          </div>
        </div>

      </div>
    </>
  )
}
