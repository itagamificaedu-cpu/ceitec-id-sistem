import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import CadastroAluno from './pages/CadastroAluno'
import Carteirinha from './pages/Carteirinha'
import Scanner from './pages/Scanner'
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
import ItagameDashboard from './pages/itagame/ItagameDashboard'
import PlanoDeAula from './pages/ia/PlanoDeAula'
import CriadorQuestoes from './pages/ia/CriadorQuestoes'
import CorretorProvas from './pages/ia/CorretorProvas'
import DiagnosticoAluno from './pages/ia/DiagnosticoAluno'
import CriadorConteudo from './pages/ia/CriadorConteudo'
import Planos from './pages/Planos'
import Usuarios from './pages/Usuarios'

function RotaProtegida({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

function P({ children }) {
  return <RotaProtegida>{children}</RotaProtegida>
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Core */}
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/alunos" element={<P><Alunos /></P>} />
        <Route path="/alunos/novo" element={<P><CadastroAluno /></P>} />
        <Route path="/alunos/:id/editar" element={<P><CadastroAluno /></P>} />
        <Route path="/alunos/:id/carteirinha" element={<P><Carteirinha /></P>} />
        <Route path="/alunos/:id/perfil" element={<P><PerfilAluno /></P>} />
        <Route path="/scanner" element={<P><Scanner /></P>} />
        <Route path="/relatorios" element={<P><Relatorios /></P>} />
        <Route path="/justificativas" element={<P><Justificativas /></P>} />
        <Route path="/desempenho" element={<P><Desempenho /></P>} />

        {/* Turmas */}
        <Route path="/turmas" element={<P><ListaTurmas /></P>} />
        <Route path="/turmas/:id" element={<P><DetalheTurma /></P>} />

        {/* Professores */}
        <Route path="/professores" element={<P><ListaProfessores /></P>} />
        <Route path="/professores/novo" element={<P><CadastroProfessor /></P>} />
        <Route path="/professores/:id/editar" element={<P><CadastroProfessor /></P>} />

        {/* Avaliações */}
        <Route path="/avaliacoes" element={<P><ListaAvaliacoes /></P>} />
        <Route path="/avaliacoes/nova" element={<P><CriadorAvaliacao /></P>} />
        <Route path="/avaliacoes/:id" element={<P><ResultadosAvaliacao /></P>} />
        <Route path="/avaliacoes/:id/editar" element={<P><CriadorAvaliacao /></P>} />

        {/* Ocorrências */}
        <Route path="/ocorrencias" element={<P><ListaOcorrencias /></P>} />
        <Route path="/ocorrencias/nova" element={<P><NovaOcorrencia /></P>} />

        {/* ItagGame */}
        <Route path="/itagame" element={<P><ItagameDashboard /></P>} />

        {/* IA */}
        <Route path="/ia/plano-aula" element={<P><PlanoDeAula /></P>} />
        <Route path="/ia/questoes" element={<P><CriadorQuestoes /></P>} />
        <Route path="/ia/corretor" element={<P><CorretorProvas /></P>} />
        <Route path="/diagnostico" element={<P><DiagnosticoAluno /></P>} />
        <Route path="/ia/conteudo" element={<P><CriadorConteudo /></P>} />

        {/* Planos de Assinatura — público para novos clientes */}
        <Route path="/planos" element={<Planos />} />

        {/* Usuários */}
        <Route path="/usuarios" element={<P><Usuarios /></P>} />
      </Routes>
    </BrowserRouter>
  )
}
