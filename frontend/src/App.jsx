import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import api from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import CadastroAluno from './pages/CadastroAluno'
import Carteirinha from './pages/Carteirinha'
import Scanner from './pages/Scanner'
import ScannerPortal from './pages/ScannerPortal'
import ScannerAlmoco from './pages/ScannerAlmoco'
import RelatorioAlmoco from './pages/RelatorioAlmoco'
import Relatorios from './pages/Relatorios'
import Justificativas from './pages/Justificativas'
import Desempenho from './pages/Desempenho'
import EducacaoInclusiva from './pages/EducacaoInclusiva'
import DivisaoEquipes from './pages/DivisaoEquipes'
import ListaTurmas from './pages/turmas/ListaTurmas'
import DetalheTurma from './pages/turmas/DetalheTurma'
import PerfilAluno from './pages/turmas/PerfilAluno'
import ListaProfessores from './pages/professores/ListaProfessores'
import CadastroProfessor from './pages/professores/CadastroProfessor'
import ListaAvaliacoes from './pages/avaliacoes/ListaAvaliacoes'
import CriadorAvaliacao from './pages/avaliacoes/CriadorAvaliacao'
import ResultadosAvaliacao from './pages/avaliacoes/ResultadosAvaliacao'
import ListaOcorrencias from './pages/ocorrencias/ListaOcorrencias'
import NovaOcorrencia from './pages/ocorrencias/NovaOcorrencia'
import ListaQuizzes from './pages/quiz/ListaQuizzes'
import CriadorQuiz from './pages/quiz/CriadorQuiz'
import JogarQuiz from './pages/quiz/JogarQuiz'
import HostQuiz from './pages/quiz/HostQuiz'
import RankingQuiz from './pages/quiz/RankingQuiz'
import ItagameDashboard from './pages/itagame/ItagameDashboard'
import ItagameAluno from './pages/itagame/ItagameAluno'
import ProvaCorretor from './pages/itagame/ProvaCorretor'
import PlanoDeAula from './pages/ia/PlanoDeAula'
import CriadorQuestoes from './pages/ia/CriadorQuestoes'
import CorretorProvas from './pages/ia/CorretorProvas'
import DiagnosticoAluno from './pages/ia/DiagnosticoAluno'
import CriadorConteudo from './pages/ia/CriadorConteudo'
import Planos from './pages/Planos'
import MinhaLicenca from './pages/MinhaLicenca'
import Usuarios from './pages/Usuarios'
import CorretorResultados from './pages/CorretorResultados'
import ResponderAvaliacao from './pages/ResponderAvaliacao'
import TrocarSenha from './pages/TrocarSenha'
import AtividadeUsuarios from './pages/AtividadeUsuarios'
import SalaMaker from './pages/salaMaker'
import ProfessorGame from './pages/ProfessorGame'
import CursoFerias from './pages/CursoFerias'
import ScannerCursoFerias from './pages/ScannerCursoFerias'
import MobileTracker from './pages/MobileTracker'
import SaidaSala from './pages/SaidaSala'
import PainelSaidaSala from './pages/PainelSaidaSala'
import EmpreendedorismoDigital from './pages/EmpreendedorismoDigital'
import Agenda from './pages/Agenda'

function RotaProtegida({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  // Verifica do servidor se admin resetou a senha (localStorage pode estar desatualizado)
  useEffect(() => {
    if (!token) return
    // Registra login diário para o Professor Game (XP de presença na plataforma)
    api.post('/prof-game/login-diario').catch(() => {})
    // Cria sessão Django a partir do JWT — usa fetch direto pois /api/ é Django, não /node-api/
    const _token = localStorage.getItem('token')
    if (_token) {
      fetch('/api/auth/set-session/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      }).catch(() => {})
    }
    api.get('/auth/me').then(({ data }) => {
      if (data.trocar_senha) {
        // Atualiza localStorage e força o redirect no próximo render
        const u = JSON.parse(localStorage.getItem('usuario') || '{}')
        localStorage.setItem('usuario', JSON.stringify({ ...u, trocar_senha: true }))
        window.location.href = '/trocar-senha'
      } else {
        // Garante que localStorage está atualizado
        const u = JSON.parse(localStorage.getItem('usuario') || '{}')
        if (u.trocar_senha) {
          localStorage.setItem('usuario', JSON.stringify({ ...u, trocar_senha: false }))
        }
      }
    }).catch(() => {})
  }, [])

  if (usuario.trocar_senha) return <Navigate to="/trocar-senha" replace />
  return children
}

function P({ children }) {
  return <RotaProtegida>{children}</RotaProtegida>
}

function Admin({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  if (usuario.perfil === 'professor') return <Navigate to="/dashboard" replace />
  return children
}

// Guard exclusivo para o dono da plataforma ITA — bloqueia coordenadores de outras escolas
function ItaAdmin({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  if (usuario.perfil !== 'ita_admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Core */}
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/alunos" element={<Admin><Alunos /></Admin>} />
        <Route path="/alunos/novo" element={<Admin><CadastroAluno /></Admin>} />
        <Route path="/alunos/:id/editar" element={<Admin><CadastroAluno /></Admin>} />
        <Route path="/alunos/:id/carteirinha" element={<P><Carteirinha /></P>} />
        <Route path="/alunos/:id/perfil" element={<P><PerfilAluno /></P>} />
        <Route path="/scanner" element={<P><Scanner /></P>} />
        <Route path="/scanner/portal" element={<P><ScannerPortal /></P>} />
        <Route path="/saida-sala" element={<P><SaidaSala /></P>} />
        <Route path="/saida-sala/painel" element={<P><PainelSaidaSala /></P>} />
        <Route path="/almoco/scanner" element={<Admin><ScannerAlmoco /></Admin>} />
        <Route path="/almoco/relatorio" element={<Admin><RelatorioAlmoco /></Admin>} />
        <Route path="/relatorios" element={<Admin><Relatorios /></Admin>} />
        <Route path="/justificativas" element={<P><Justificativas /></P>} />
        <Route path="/desempenho" element={<P><Desempenho /></P>} />
        <Route path="/educacao-inclusiva" element={<P><EducacaoInclusiva /></P>} />
        <Route path="/divisao-equipes" element={<P><DivisaoEquipes /></P>} />

        {/* Turmas */}
        <Route path="/turmas" element={<Admin><ListaTurmas /></Admin>} />
        <Route path="/turmas/:id" element={<P><DetalheTurma /></P>} />

        {/* Professores */}
        <Route path="/professores" element={<Admin><ListaProfessores /></Admin>} />
        <Route path="/professores/novo" element={<Admin><CadastroProfessor /></Admin>} />
        <Route path="/professores/:id/editar" element={<Admin><CadastroProfessor /></Admin>} />

        {/* Avaliações — professor pode criar e editar as suas */}
        <Route path="/avaliacoes" element={<P><ListaAvaliacoes /></P>} />
        <Route path="/avaliacoes/nova" element={<P><CriadorAvaliacao /></P>} />
        <Route path="/avaliacoes/:id" element={<P><ResultadosAvaliacao /></P>} />
        <Route path="/avaliacoes/:id/editar" element={<P><CriadorAvaliacao /></P>} />

        {/* Ocorrências */}
        <Route path="/ocorrencias" element={<P><ListaOcorrencias /></P>} />
        <Route path="/ocorrencias/nova" element={<P><NovaOcorrencia /></P>} />

        {/* Quiz — professor pode criar e editar */}
        <Route path="/quiz" element={<P><ListaQuizzes /></P>} />
        <Route path="/quiz/novo" element={<P><CriadorQuiz /></P>} />
        <Route path="/quiz/:id/editar" element={<P><CriadorQuiz /></P>} />
        <Route path="/quiz/:id/ranking" element={<P><RankingQuiz /></P>} />
        {/* Rota pública para jogar (aluno) */}
        <Route path="/q/:codigo" element={<JogarQuiz />} />
        {/* Painel do professor (host) — abre em nova aba */}
        <Route path="/quiz/:id/host" element={<P><HostQuiz /></P>} />

        {/* ItagGame */}
        <Route path="/itagame" element={<P><ItagameDashboard /></P>} />
        <Route path="/itagame/aluno" element={<ItagameAluno />} />
        <Route path="/aluno/:codigo" element={<ItagameAluno />} />
        {/* Prova do Corretor de Provas — página nativa sem precisar de código */}
        <Route path="/itagame/prova-corretor/:uuid" element={<ProvaCorretor />} />

        {/* Avaliações — portal do aluno sem login */}
        <Route path="/responder/:avaliacao_id/:codigo" element={<ResponderAvaliacao />} />

        {/* IA — professor tem acesso a todas as ferramentas */}
        <Route path="/ia/plano-aula" element={<P><PlanoDeAula /></P>} />
        <Route path="/ia/questoes" element={<P><CriadorQuestoes /></P>} />
        <Route path="/ia/corretor" element={<P><CorretorProvas /></P>} />
        <Route path="/diagnostico" element={<P><DiagnosticoAluno /></P>} />
        <Route path="/ia/conteudo" element={<P><CriadorConteudo /></P>} />

        {/* Planos de Assinatura — público para novos clientes */}
        <Route path="/planos" element={<Planos />} />

        {/* Área do cliente — licença e assinatura */}
        <Route path="/minha-licenca" element={<P><MinhaLicenca /></P>} />

        {/* Corretor de Provas — resultados reais */}
        <Route path="/corretor-resultados" element={<P><CorretorResultados /></P>} />

        {/* Professor Game — ranking e gamificação dos professores */}
        <Route path="/professor-game" element={<P><ProfessorGame /></P>} />

        {/* Sala Maker — acessível a todos os usuários autenticados */}
        <Route path="/sala-maker" element={<P><SalaMaker /></P>} />

        {/* Empreendedorismo Digital — professor, coordenador e ita_admin */}
        <Route path="/empreendedorismo-digital" element={<P><EmpreendedorismoDigital /></P>} />

        {/* Agenda e Avisos — todos os usuários autenticados */}
        <Route path="/agenda" element={<P><Agenda /></P>} />

        {/* Curso de Férias — exclusivo do dono da plataforma ITA (não visível a coordenadores) */}
        <Route path="/curso-ferias" element={<ItaAdmin><CursoFerias /></ItaAdmin>} />
        <Route path="/curso-ferias/scanner" element={<ItaAdmin><ScannerCursoFerias /></ItaAdmin>} />

        {/* Mobile Tracker — GPS de alunos */}
        <Route path="/mobile-tracker" element={<Admin><MobileTracker /></Admin>} />

        {/* Usuários — gerenciar usuários da própria escola (admin da escola) */}
        <Route path="/usuarios" element={<Admin><Usuarios /></Admin>} />
        {/* Atividade de Usuários — exclusivo do dono da plataforma ITA */}
        <Route path="/atividade-usuarios" element={<ItaAdmin><AtividadeUsuarios /></ItaAdmin>} />
        <Route path="/trocar-senha" element={<TrocarSenha />} />
      </Routes>
    </BrowserRouter>
  )
}
