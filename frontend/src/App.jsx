import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import CadastroAluno from './pages/CadastroAluno'
import Carteirinha from './pages/Carteirinha'
import Scanner from './pages/Scanner'
import ScannerAlmoco from './pages/ScannerAlmoco'
import RelatorioAlmoco from './pages/RelatorioAlmoco'
import Relatorios from './pages/Relatorios'
import Justificativas from './pages/Justificativas'
import Desempenho from './pages/Desempenho'
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
import RankingQuiz from './pages/quiz/RankingQuiz'
import ItagameDashboard from './pages/itagame/ItagameDashboard'
import ItagameAluno from './pages/itagame/ItagameAluno'
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
import SalaMaker from './pages/salaMaker'
import CursoFerias from './pages/CursoFerias'

function RotaProtegida({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
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
        <Route path="/alunos/:id/carteirinha" element={<Admin><Carteirinha /></Admin>} />
        <Route path="/alunos/:id/perfil" element={<Admin><PerfilAluno /></Admin>} />
        <Route path="/scanner" element={<Admin><Scanner /></Admin>} />
        <Route path="/almoco/scanner" element={<Admin><ScannerAlmoco /></Admin>} />
        <Route path="/almoco/relatorio" element={<Admin><RelatorioAlmoco /></Admin>} />
        <Route path="/relatorios" element={<Admin><Relatorios /></Admin>} />
        <Route path="/justificativas" element={<Admin><Justificativas /></Admin>} />
        <Route path="/desempenho" element={<Admin><Desempenho /></Admin>} />

        {/* Turmas */}
        <Route path="/turmas" element={<Admin><ListaTurmas /></Admin>} />
        <Route path="/turmas/:id" element={<P><DetalheTurma /></P>} />

        {/* Professores */}
        <Route path="/professores" element={<Admin><ListaProfessores /></Admin>} />
        <Route path="/professores/novo" element={<Admin><CadastroProfessor /></Admin>} />
        <Route path="/professores/:id/editar" element={<Admin><CadastroProfessor /></Admin>} />

        {/* Avaliações */}
        <Route path="/avaliacoes" element={<Admin><ListaAvaliacoes /></Admin>} />
        <Route path="/avaliacoes/nova" element={<Admin><CriadorAvaliacao /></Admin>} />
        <Route path="/avaliacoes/:id" element={<Admin><ResultadosAvaliacao /></Admin>} />
        <Route path="/avaliacoes/:id/editar" element={<Admin><CriadorAvaliacao /></Admin>} />

        {/* Ocorrências */}
        <Route path="/ocorrencias" element={<Admin><ListaOcorrencias /></Admin>} />
        <Route path="/ocorrencias/nova" element={<Admin><NovaOcorrencia /></Admin>} />

        {/* Quiz */}
        <Route path="/quiz" element={<Admin><ListaQuizzes /></Admin>} />
        <Route path="/quiz/novo" element={<Admin><CriadorQuiz /></Admin>} />
        <Route path="/quiz/:id/editar" element={<Admin><CriadorQuiz /></Admin>} />
        <Route path="/quiz/:id/ranking" element={<Admin><RankingQuiz /></Admin>} />
        {/* Rota pública para jogar */}
        <Route path="/q/:codigo" element={<JogarQuiz />} />

        {/* ItagGame */}
        <Route path="/itagame" element={<Admin><ItagameDashboard /></Admin>} />
        <Route path="/itagame/aluno" element={<ItagameAluno />} />
        <Route path="/aluno/:codigo" element={<ItagameAluno />} />

        {/* Avaliações — portal do aluno sem login */}
        <Route path="/responder/:avaliacao_id/:codigo" element={<ResponderAvaliacao />} />

        {/* IA */}
        <Route path="/ia/plano-aula" element={<Admin><PlanoDeAula /></Admin>} />
        <Route path="/ia/questoes" element={<Admin><CriadorQuestoes /></Admin>} />
        <Route path="/ia/corretor" element={<Admin><CorretorProvas /></Admin>} />
        <Route path="/diagnostico" element={<Admin><DiagnosticoAluno /></Admin>} />
        <Route path="/ia/conteudo" element={<Admin><CriadorConteudo /></Admin>} />

        {/* Planos de Assinatura — público para novos clientes */}
        <Route path="/planos" element={<Planos />} />

        {/* Área do cliente — licença e assinatura */}
        <Route path="/minha-licenca" element={<P><MinhaLicenca /></P>} />

        {/* Corretor de Provas — resultados reais */}
        <Route path="/corretor-resultados" element={<Admin><CorretorResultados /></Admin>} />

        {/* Sala Maker — acessível a todos os usuários autenticados */}
        <Route path="/sala-maker" element={<P><SalaMaker /></P>} />

        {/* Curso de Férias — landing page e gerenciamento (só admin) */}
        <Route path="/curso-ferias" element={<Admin><CursoFerias /></Admin>} />

        {/* Usuários */}
        <Route path="/usuarios" element={<Admin><Usuarios /></Admin>} />
        <Route path="/trocar-senha" element={<P><TrocarSenha /></P>} />
      </Routes>
    </BrowserRouter>
  )
}
