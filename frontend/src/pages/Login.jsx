import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const CREDS = [
  { perfil: 'Admin',      icon: '👑', email: 'admin@ita.com',      senha: 'ita2024' },
  { perfil: 'Secretaria', icon: '📋', email: 'secretaria@ita.com', senha: 'ita2024' },
  { perfil: 'Professor',  icon: '👨‍🏫', email: '',                  senha: '' },
  { perfil: 'Aluno',      icon: '🎓', email: null,                 senha: null },
]

const CARDS = [
  { icon: '🎮', titulo: 'ItagGame',      desc: 'XP, badges e rankings',     num: '247',   label: 'missões concluídas' },
  { icon: '🤖', titulo: 'IA Educacional',desc: 'Questões e planos por IA',  num: '1.2k',  label: 'questões criadas' },
  { icon: '📊', titulo: 'Diagnóstico',   desc: 'Desempenho por aluno',      num: '98%',   label: 'precisão de análise' },
  { icon: '👥', titulo: 'Alunos',        desc: 'Cadastros ativos',          num: '500+',  label: 'alunos gerenciados' },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const [shakeEmail, setShakeEmail] = useState(false)
  const [shakeSenha, setShakeSenha] = useState(false)
  const [tooltip, setTooltip] = useState(false)

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
      navigate('/dashboard')
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
        *,*::before,*::after{box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes growXP{from{width:0}to{width:84.7%}}
        @keyframes floatIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
        @keyframes spin{to{transform:rotate(360deg)}}

        .ita-root{display:flex;height:100vh;background:#0d1b2e;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}

        /* PAINEL ESQUERDO */
        .ita-left{
          flex:1;height:100vh;display:flex;flex-direction:column;
          align-items:center;justify-content:space-evenly;
          padding:40px 60px;
          border-right:1px solid rgba(245,166,35,.15);
          background:#0d1b2e;position:relative;overflow:hidden;
          background-image:
            repeating-linear-gradient(0deg,rgba(245,166,35,.04) 0,transparent 1px,transparent 44px),
            repeating-linear-gradient(90deg,rgba(245,166,35,.04) 0,transparent 1px,transparent 44px);
        }
        @media(max-width:767px){.ita-left{display:none}}

        .ita-top{width:100%;display:flex;flex-direction:column;align-items:center;gap:12px}

        .ita-logo{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:14px}
        .ita-logo-icon{width:54px;height:54px;background:#f5a623;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0}
        .ita-logo-text{text-align:center}
        .ita-logo-text p:first-child{margin:0;font-size:19px;font-weight:800;color:#f5a623;letter-spacing:.06em;line-height:1}
        .ita-logo-text p:last-child{margin:0;font-size:11px;color:rgba(255,255,255,.4);letter-spacing:.12em;margin-top:3px}

        .ita-tag{display:inline-flex;align-items:center;gap:9px;background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.3);border-radius:20px;padding:7px 18px}
        .ita-tag-dot{width:8px;height:8px;background:#f5a623;border-radius:50%;animation:pulse 1.4s infinite;flex-shrink:0}
        .ita-tag span{font-size:13px;font-weight:600;color:#f5a623}

        .ita-hero{text-align:center;width:100%}
        .ita-hero h1{margin:0 0 10px;font-size:44px;font-weight:800;color:#fff;line-height:1.1}
        .ita-hero h1 em{font-style:normal;color:#f5a623}
        .ita-hero p{margin:0 auto;font-size:13px;color:rgba(255,255,255,.5);max-width:480px;line-height:1.6}

        .ita-cards{
          width:100%;max-width:560px;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .ita-card-xp{
          grid-column:span 2;display:flex;align-items:center;gap:14px;
          background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);
          border-radius:12px;padding:16px 20px;
          animation:floatIn .5s ease both .05s;
        }
        .ita-card-xp-avatar{width:44px;height:44px;border-radius:50%;background:#f5a623;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0d1b2e;flex-shrink:0}
        .ita-card-xp-info{flex:1;min-width:0}
        .ita-card-xp-info p{margin:0}
        .ita-card-xp-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ita-card-xp-lvl{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px!important}
        .ita-xp-track{background:rgba(255,255,255,.1);border-radius:3px;height:6px;margin-top:8px;overflow:hidden}
        .ita-xp-fill{height:100%;background:#f5a623;border-radius:3px;animation:growXP 1.2s ease .6s both}
        .ita-xp-labels{display:flex;justify-content:space-between;margin-top:5px}
        .ita-xp-labels span{font-size:10px;color:rgba(255,255,255,.35)}
        .ita-card-xp-badge{background:#f5a623;color:#0d1b2e;font-size:11px;font-weight:800;border-radius:7px;padding:4px 10px;flex-shrink:0}

        .ita-card{
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
          border-radius:12px;padding:16px 18px;
          display:flex;flex-direction:column;gap:6px;
        }
        .ita-card:nth-child(2){animation:floatIn .5s ease both .1s}
        .ita-card:nth-child(3){animation:floatIn .5s ease both .2s}
        .ita-card:nth-child(4){animation:floatIn .5s ease both .3s}
        .ita-card:nth-child(5){animation:floatIn .5s ease both .4s}
        .ita-card-head{display:flex;align-items:center;gap:8px}
        .ita-card-head span:first-child{font-size:20px;line-height:1}
        .ita-card-title{font-size:13px;font-weight:700;color:#fff}
        .ita-card-desc{font-size:11px;color:rgba(255,255,255,.38)}
        .ita-card-num{font-size:24px;font-weight:800;color:#f5a623;line-height:1}
        .ita-card-label{font-size:10px;color:rgba(255,255,255,.35)}

        /* PAINEL DIREITO */
        .ita-right{
          width:360px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          padding:32px 28px;background:#1a2d4a;position:relative;overflow:hidden;
        }
        @media(max-width:767px){.ita-right{width:100%}}
        .ita-right::before{
          content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);
          width:280px;height:200px;pointer-events:none;
          background:radial-gradient(ellipse 50% 20% at 50% 0%, rgba(245,166,35,.1) 0%, transparent 100%);
        }

        .ita-form-wrap{width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;gap:0;position:relative;z-index:1}

        .ita-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.35);border-radius:20px;padding:4px 14px;margin-bottom:16px}
        .ita-badge span{font-size:9px;font-weight:700;color:#f5a623;letter-spacing:.8px}

        .ita-form-title{text-align:center;margin-bottom:22px;width:100%}
        .ita-form-title h2{margin:0 0 4px;font-size:22px;font-weight:800;color:#fff}
        .ita-form-title p{margin:0;font-size:11px;color:rgba(255,255,255,.4)}

        .ita-field{width:100%;margin-bottom:14px}
        .ita-field label{display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,.45);letter-spacing:.8px;margin-bottom:6px}
        .ita-field-wrap{position:relative}
        .ita-field-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;line-height:1}
        .ita-input{
          width:100%;height:42px;padding:0 12px 0 36px;
          background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);
          border-radius:8px;color:#fff;font-size:13px;outline:none;transition:border-color .2s,background .2s;
        }
        .ita-input::placeholder{color:rgba(255,255,255,.25)}
        .ita-input:focus{border-color:#f5a623;background:rgba(245,166,35,.06)}
        .ita-input.err{border-color:#e74c3c}
        .ita-input.err.shake{animation:shake .4s ease}
        .ita-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:14px;color:rgba(255,255,255,.35);padding:2px;line-height:1}
        .ita-eye:hover{color:rgba(255,255,255,.7)}

        .ita-err{width:100%;background:rgba(231,76,60,.12);border:1px solid rgba(231,76,60,.35);color:#ff8a8a;font-size:12px;border-radius:7px;padding:9px 12px;margin-bottom:12px;display:flex;align-items:flex-start;gap:6px}

        .ita-btn{
          width:100%;height:44px;background:#f5a623;border:none;border-radius:9px;
          font-size:14px;font-weight:800;color:#0d1b2e;cursor:pointer;
          box-shadow:0 4px 20px rgba(245,166,35,.35);
          transition:transform .15s,box-shadow .15s;
          display:flex;align-items:center;justify-content:center;gap:8px;
          margin-bottom:20px;
        }
        .ita-btn:hover:not(:disabled){transform:scale(1.02);box-shadow:0 6px 28px rgba(245,166,35,.5)}
        .ita-btn:disabled{opacity:.6;cursor:not-allowed}
        .ita-spinner{width:18px;height:18px;border:2.5px solid rgba(13,27,46,.3);border-top-color:#0d1b2e;border-radius:50%;animation:spin .7s linear infinite}

        .ita-divider{display:flex;align-items:center;gap:10px;width:100%;margin-bottom:14px}
        .ita-divider::before,.ita-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}
        .ita-divider span{font-size:10px;color:rgba(255,255,255,.25);white-space:nowrap}

        .ita-creds{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;position:relative}
        .ita-cred{
          background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:8px;padding:9px 10px;cursor:pointer;text-align:center;
          transition:background .15s,border-color .15s;border:none;
        }
        .ita-cred:hover{background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3)}
        .ita-cred-icon{font-size:16px;display:block;margin-bottom:3px}
        .ita-cred-role{font-size:10px;font-weight:700;color:#f5a623;display:block}
        .ita-cred-email{font-size:9px;color:rgba(255,255,255,.3);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .ita-tooltip{
          position:absolute;bottom:calc(100% + 8px);right:0;
          background:#1e3a5f;color:#fff;font-size:11px;padding:8px 12px;
          border-radius:8px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:20;
          pointer-events:none;
        }
        .ita-tooltip::after{content:'';position:absolute;bottom:-5px;right:18px;width:10px;height:10px;background:#1e3a5f;transform:rotate(45deg)}

        .ita-copy{font-size:9px;color:rgba(255,255,255,.18);text-align:center;margin-top:20px;width:100%}
      `}</style>

      <div className="ita-root">

        {/* ═══════════ PAINEL ESQUERDO ═══════════ */}
        <div className="ita-left">

          {/* Logo + Tag */}
          <div className="ita-top">
            <div className="ita-logo">
              <div className="ita-logo-icon">🎓</div>
              <div className="ita-logo-text">
                <p>ITA TECNOLOGIA</p>
                <p>EDUCACIONAL</p>
              </div>
            </div>
            <div className="ita-tag">
              <span className="ita-tag-dot" />
              <span>Sistema v2.0 — IA + Gamificação</span>
            </div>
          </div>

          {/* Hero */}
          <div className="ita-hero">
            <h1>O Futuro da <em>Educação</em><br />começa aqui.</h1>
            <p>Plataforma inteligente que une tecnologia, gamificação e IA para transformar o ensino.</p>
          </div>

          {/* Cards */}
          <div className="ita-cards">

            {/* Card XP */}
            <div className="ita-card-xp">
              <div className="ita-card-xp-avatar">A</div>
              <div className="ita-card-xp-info">
                <p className="ita-card-xp-name">Ana Sousa — Robótica 9A</p>
                <p className="ita-card-xp-lvl">Nível 3 · Guerreiro</p>
                <div className="ita-xp-track"><div className="ita-xp-fill" /></div>
                <div className="ita-xp-labels"><span>847 XP</span><span>153 XP para Campeão</span></div>
              </div>
              <div className="ita-card-xp-badge">#1</div>
            </div>

            {/* Cards módulos */}
            {CARDS.map(c => (
              <div key={c.titulo} className="ita-card">
                <div className="ita-card-head">
                  <span>{c.icon}</span>
                  <span className="ita-card-title">{c.titulo}</span>
                </div>
                <div className="ita-card-desc">{c.desc}</div>
                <div className="ita-card-num">{c.num}</div>
                <div className="ita-card-label">{c.label}</div>
              </div>
            ))}

          </div>
        </div>

        {/* ═══════════ PAINEL DIREITO ═══════════ */}
        <div className="ita-right">
          <div className="ita-form-wrap">

            {/* Badge */}
            <div className="ita-badge">
              <span>🔒</span>
              <span>ACESSO SEGURO</span>
            </div>

            {/* Título */}
            <div className="ita-form-title">
              <h2>Bem-vindo de volta</h2>
              <p>Entre com suas credenciais para acessar o sistema</p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>

              {/* Email */}
              <div className="ita-field">
                <label>EMAIL</label>
                <div className="ita-field-wrap">
                  <span className="ita-field-icon">✉️</span>
                  <input
                    id="inp-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`ita-input${!email && shakeEmail ? ' err shake' : ''}`}
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="ita-field">
                <label>SENHA</label>
                <div className="ita-field-wrap">
                  <span className="ita-field-icon">🔑</span>
                  <input
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className={`ita-input${!senha && shakeSenha ? ' err shake' : ''}`}
                    style={{ paddingRight: 38 }}
                    placeholder="••••••••"
                  />
                  <button type="button" className="ita-eye" onClick={() => setVerSenha(v => !v)}>
                    {verSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <div className="ita-err">
                  <span>⚠️</span><span>{erro}</span>
                </div>
              )}

              {/* Botão */}
              <button type="submit" disabled={carregando} className="ita-btn">
                {carregando ? <><span className="ita-spinner" /> Entrando...</> : '→ Entrar no Sistema'}
              </button>
            </form>

            {/* Divisor */}
            <div className="ita-divider"><span>acesso rápido</span></div>

            {/* Credenciais */}
            <div className="ita-creds">
              {CREDS.map(c => (
                <button key={c.perfil} type="button" className="ita-cred" onClick={() => clicarCred(c)}>
                  <span className="ita-cred-icon">{c.icon}</span>
                  <span className="ita-cred-role">{c.perfil}</span>
                  <span className="ita-cred-email">{c.email || (c.email === '' ? 'digitar email' : 'via QR Code')}</span>
                </button>
              ))}
              {tooltip && (
                <div className="ita-tooltip">
                  📱 Alunos acessam via QR Code na entrada
                </div>
              )}
            </div>

            {/* Rodapé */}
            <p className="ita-copy">© 2025 ITA Tecnologia Educacional · Sistema Inteligente de Educação</p>

          </div>
        </div>
      </div>
    </>
  )
}
