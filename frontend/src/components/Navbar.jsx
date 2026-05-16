import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'

const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'https://itagamificaedu.pythonanywhere.com'

const SECOES_ESTATICAS = [
  {
    titulo: 'ESCOLA',
    itens: [
      { path: '/dashboard', label: 'Dashboard Geral', icon: '🏠' },
      { path: '/scanner', label: 'Scanner de Presença', icon: '📷' },
      { path: '/almoco/scanner', label: 'Scanner de Almoço', icon: '🍽️' },
      { path: '/almoco/relatorio', label: 'Relatório de Almoço', icon: '📋' },
      { path: '/usuarios', label: 'Gerenciar Usuários', icon: '🔑' },
    ]
  },
  {
    titulo: 'ALUNOS',
    itens: [
      { path: '/turmas', label: 'Turmas e Alunos', icon: '👥' },
      { path: '/alunos/novo', label: 'Cadastrar Aluno', icon: '➕' },
      { path: '/justificativas', label: 'Justificativas', icon: '📋' },
    ]
  },
  {
    titulo: 'PROFESSORES',
    itens: [
      { path: '/professores', label: 'Professores', icon: '👨‍🏫' },
    ]
  },
  {
    titulo: 'PEDAGÓGICO',
    itens: [
      { path: '/corretor-resultados', label: 'Resultados Corretor de Provas', icon: '📋' },
      { path: '/avaliacoes', label: 'Avaliações da Plataforma', icon: '📝' },
      { path: '/quiz',       label: 'Quiz Interativo',          icon: '🎯' },
      { path: '/desempenho', label: 'Desempenho Acadêmico', icon: '📊' },
      { path: '/diagnostico', label: 'Diagnóstico por Disciplina', icon: '🔬' },
      { path: '/ocorrencias', label: 'Ocorrências', icon: '⚠️' },
    ]
  },
  {
    titulo: 'MÓDULOS EXTRAS',
    itens: [
      { path: '/sala-maker', label: 'Sala Maker', icon: '🔧' },
      { path: '/curso-ferias', label: 'Curso de Férias Maker', icon: '🚀' },
    ]
  },
  {
    titulo: 'RELATÓRIOS',
    itens: [
      { path: '/relatorios', label: 'Relatórios Gerais', icon: '📈' },
      { path: '/planos', label: 'Planos de Assinatura', icon: '💳' },
      { path: '/minha-licenca', label: 'Minha Licença', icon: '🔐' },
    ]
  },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const ssoUrl = (next) => {
    const base = `${DJANGO_URL}/accounts/login-magico/`
    const params = new URLSearchParams({
      email: usuario.email || '',
      nome: usuario.nome || '',
      chave: 'gamificaedu_secreto_2026',
      next,
    })
    return `${base}?${params.toString()}`
  }

  const corretorSsoUrl = () => {
    const params = new URLSearchParams({
      email: usuario.email || '',
      nome: usuario.nome || '',
      chave: 'gamificaedu_secreto_2026',
      next: '/home/',
    })
    return `https://correcaoonlineita.pythonanywhere.com/login-magico/?${params.toString()}`
  }

  function abrirUrl(url) {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  async function abrirItagame() {
    // No navegador abre about:blank antes do await para evitar bloqueio de popup
    const janela = window.electronAPI?.isElectron ? null : window.open('about:blank', '_blank')

    try {
      const [{ data: turmas }, { data: alunos }] = await Promise.all([
        api.get('/turmas'),
        api.get('/alunos'),
      ])
      const turmasComAlunos = turmas.map(t => ({
        nome: t.nome,
        alunos: alunos
          .filter(a => a.turma_id === t.id || (a.turma_id == null && a.turma === t.nome))
          .map(a => ({ codigo: a.codigo, nome: a.nome })),
      }))
      await fetch('https://projetoitagame.pythonanywhere.com/api/sync-turmas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chave: 'gamificaedu_secreto_2026',
          professor_username: usuario.email || '',
          turmas: turmasComAlunos,
        }),
      })
    } catch (_) {}

    const params = new URLSearchParams({
      user: usuario.email || '',
      email: usuario.email || '',
      nome: usuario.nome || '',
      chave: 'gamificaedu_secreto_2026',
      tipo: 'professor',
    })
    const url = `https://projetoitagame.pythonanywhere.com/login-magico/?${params}`
    if (janela) janela.location.href = url
    else abrirUrl(url)
  }

  async function abrirCorretor() {
    const janela = window.electronAPI?.isElectron ? null : window.open('about:blank', '_blank')

    // Sincroniza alunos da plataforma ITA → Corretor de Provas (em segundo plano)
    try {
      const { data: alunos } = await api.get('/alunos')
      await fetch('https://correcaoonlineita.pythonanywhere.com/api/sync-alunos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chave: 'gamificaedu_secreto_2026',
          email: usuario.email || '',
          alunos: alunos.map(a => ({ nome: a.nome, turma: a.turma || a.turma_nome || '', codigo: a.codigo || '' })),
        }),
      })
    } catch (_) {}

    const url = corretorSsoUrl()
    if (janela) janela.location.href = url
    else abrirUrl(url)
  }

  const isProfessor = usuario.perfil === 'professor'

  const secoes = isProfessor
    ? [
        {
          titulo: 'MINHAS TURMAS',
          itens: [
            { path: '/dashboard', label: 'Painel do Professor', icon: '🏫' },
          ]
        },
        {
          titulo: 'MÓDULOS EXTRAS',
          itens: [
            { path: '/sala-maker', label: 'Sala Maker', icon: '🔧' },
          ]
        },
        {
          titulo: 'FERRAMENTAS ITA',
          itens: [
            { onClick: abrirItagame, label: 'ItagGame — Painel do Professor', icon: '🎮' },
          ]
        }
      ]
    : [
        ...SECOES_ESTATICAS,
        {
          titulo: 'FERRAMENTAS ITA',
          itens: [
            { path: '/itagame',                        label: 'ItagGame — Painel',  icon: '🎮' },
            { onClick: abrirCorretor,                  label: 'Corretor de Provas', icon: '📋' },
          ]
        },
      ]

  function sair() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  const isAtivo = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary text-white flex items-center justify-between px-4 h-14 shadow-md">
        <div>
          <span className="font-bold text-secondary text-sm">ITA</span>
          <span className="font-bold text-white text-xs ml-1">TECNOLOGIA</span>
        </div>
        <button onClick={() => setAberto(!aberto)} className="text-xl p-1">☰</button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-primary text-white z-40 flex flex-col transition-transform duration-300 shadow-2xl
        ${aberto ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎓</span>
            </div>
            <div>
              <div className="text-secondary font-black text-sm leading-tight">ITA TECNOLOGIA</div>
              <div className="text-white/60 text-xs leading-tight">EDUCACIONAL</div>
            </div>
          </div>
        </div>

        {/* Usuário */}
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm flex-shrink-0">👤</div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{usuario.nome}</p>
            <p className="text-white/50 text-xs capitalize">{usuario.perfil}</p>
          </div>
        </div>

        {/* Menu com scroll */}
        <nav className="flex-1 overflow-y-auto py-2">
          {secoes.map(secao => (
            <div key={secao.titulo} className="mb-1">
              <p className="text-white/30 text-xs font-bold tracking-widest px-4 py-2">{secao.titulo}</p>
              {secao.itens.map(item => (
                item.onClick ? (
                  <button
                    key={item.label}
                    onClick={() => { setAberto(false); item.onClick() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors mx-2 rounded-lg text-white/70 hover:bg-white/8 hover:text-white"
                  >
                    <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto text-white/30 text-xs">↗</span>
                  </button>
                ) : secao.externo || item.href ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setAberto(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors mx-2 rounded-lg text-white/70 hover:bg-white/8 hover:text-white"
                  >
                    <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto text-white/30 text-xs">↗</span>
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setAberto(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors mx-2 rounded-lg
                      ${isAtivo(item.path)
                        ? 'bg-secondary/20 text-secondary font-semibold border-l-2 border-secondary'
                        : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
                  >
                    <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          ))}
        </nav>

        {/* Sair */}
        <div className="p-3 border-t border-white/10">
          <button onClick={sair} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors">
            <span>🚪</span><span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {aberto && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setAberto(false)} />}
    </>
  )
}
