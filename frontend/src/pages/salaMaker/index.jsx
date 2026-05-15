// ============================================================
// SALA MAKER — Layout principal com navegação por abas
// Módulo opcional: só aparece para escolas com Sala Maker ativada.
// ============================================================

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

// Importação das abas
import Painel       from './Painel'
import Inscricoes   from './Inscricoes'
import Agendamentos from './Agendamentos'
import Atividades   from './Atividades'
import Presenca     from './Presenca'
import Equipamentos from './Equipamentos'

// Definição das abas — ícone, rótulo e chave interna
const ABAS = [
  { key: 'painel',        label: 'Painel Geral',           icon: '🏠' },
  { key: 'inscricoes',    label: 'Inscrições',             icon: '📋' },
  { key: 'agendamentos',  label: 'Agendamento',            icon: '📅' },
  { key: 'atividades',    label: 'Atividades e Projetos',  icon: '📝' },
  { key: 'presenca',      label: 'Presença',               icon: '📊' },
  { key: 'equipamentos',  label: 'Equipamentos',           icon: '⚙️' },
]

export default function SalaMaker() {
  const location = useLocation()
  const navigate = useNavigate()

  // Lê aba ativa da URL (?aba=agendamentos) ou usa painel como padrão
  const params    = new URLSearchParams(location.search)
  const abaInicial = params.get('aba') || 'painel'
  const [abaAtiva, setAbaAtiva] = useState(abaInicial)

  // Estado da configuração da Sala Maker desta escola
  const [config, setConfig]         = useState(null)
  const [carregando, setCarregando] = useState(true)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const isAdmin = usuario.perfil === 'admin'

  // Carrega configuração da Sala Maker ao montar
  useEffect(() => {
    api.get('/sala-maker/config')
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig({ ativa: false }))
      .finally(() => setCarregando(false))
  }, [])

  // Mantém URL sincronizada com a aba ativa
  function trocarAba(key) {
    setAbaAtiva(key)
    navigate(`/sala-maker?aba=${key}`, { replace: true })
  }

  // ── Tela de carregamento ──────────────────────────────────
  if (carregando) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-5xl mb-4 animate-pulse">🔧</div>
            <p className="font-medium">Carregando Sala Maker…</p>
          </div>
        </main>
      </div>
    )
  }

  // ── Sala Maker não está ativada para esta escola ──────────
  if (!config?.ativa) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-md p-10 max-w-lg text-center">
            <div className="text-6xl mb-5">🔧</div>
            <h1 className="text-2xl font-bold text-textMain mb-3">Sala Maker</h1>
            <p className="text-gray-500 mb-6">
              Este módulo ainda não está ativado para a sua escola.
            </p>
            {isAdmin ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left">
                <p className="text-sm font-bold text-blue-800 mb-3">⚙️ Ativar Sala Maker</p>
                <p className="text-sm text-blue-700 mb-4">
                  Como administrador, você pode ativar o módulo abaixo.
                </p>
                <BotaoAtivar onAtivado={setConfig} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Entre em contato com o administrador da escola para ativar este módulo.
              </p>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── Layout principal com abas ─────────────────────────────
  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">

          {/* Cabeçalho do módulo */}
          <div className="mb-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
                  🔧 {config.nome_sala || 'Sala Maker'}
                </h1>
                {config.descricao && (
                  <p className="text-sm text-gray-400 mt-0.5">{config.descricao}</p>
                )}
              </div>
              {/* Botão de configurações — apenas admin */}
              {isAdmin && (
                <button
                  onClick={() => trocarAba('equipamentos')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  ⚙️ Configurações
                </button>
              )}
            </div>
          </div>

          {/* Barra de abas — scroll horizontal em mobile */}
          <div className="overflow-x-auto mb-6">
            <div className="flex gap-1 min-w-max border-b border-gray-200">
              {ABAS.map(aba => (
                <button
                  key={aba.key}
                  onClick={() => trocarAba(aba.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors
                    ${abaAtiva === aba.key
                      ? 'border-primary text-primary bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-textMain hover:border-gray-300'
                    }`}
                >
                  <span>{aba.icon}</span>
                  <span>{aba.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo da aba ativa */}
          {abaAtiva === 'painel'       && <Painel       config={config} usuario={usuario} />}
          {abaAtiva === 'inscricoes'   && <Inscricoes   config={config} usuario={usuario} />}
          {abaAtiva === 'agendamentos' && <Agendamentos config={config} usuario={usuario} />}
          {abaAtiva === 'atividades'   && <Atividades   config={config} usuario={usuario} />}
          {abaAtiva === 'presenca'     && <Presenca     config={config} usuario={usuario} />}
          {abaAtiva === 'equipamentos' && <Equipamentos config={config} usuario={usuario} onConfigAtualizada={setConfig} />}
        </div>
      </main>
    </div>
  )
}

// ── Botão inline para ativar Sala Maker (admin) ─────────────
function BotaoAtivar({ onAtivado }) {
  const [nome, setNome]             = useState('Sala Maker')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  async function ativar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const { data } = await api.put('/sala-maker/config', { ativa: 1, nome_sala: nome })
      onAtivado(data)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao ativar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={ativar} className="space-y-3">
      <input
        className="input-field text-sm"
        placeholder="Nome da sala (ex: Sala Maker CEITEC)"
        value={nome}
        onChange={e => setNome(e.target.value)}
        required
      />
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <button
        type="submit"
        disabled={salvando}
        className="btn-primary w-full text-sm disabled:opacity-50"
      >
        {salvando ? 'Ativando…' : '🔧 Ativar Sala Maker'}
      </button>
    </form>
  )
}
