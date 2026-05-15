// ============================================================
// ABA 1 — PAINEL GERAL da Sala Maker
// Dashboard com cards de resumo, calendário semanal e avisos.
// ============================================================

import React, { useEffect, useState } from 'react'
import api from '../../api'

// Dias da semana em português
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Cores por status do agendamento
const COR_STATUS = {
  aprovado:  'bg-green-100 border-green-400 text-green-800',
  pendente:  'bg-yellow-100 border-yellow-400 text-yellow-800',
  recusado:  'bg-red-100 border-red-400 text-red-800',
  cancelado: 'bg-gray-100 border-gray-400 text-gray-600',
  concluido: 'bg-blue-100 border-blue-400 text-blue-800',
}

export default function Painel({ config, usuario }) {
  const [dados, setDados]           = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState('')

  // Datas da semana atual
  const hoje = new Date()
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay())

  useEffect(() => {
    api.get('/sala-maker/painel')
      .then(({ data }) => setDados(data))
      .catch(err => setErro(err.response?.data?.erro || 'Erro ao carregar painel.'))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <Carregando />
  if (erro)       return <Erro mensagem={erro} />

  // Monta estrutura de colunas da semana (7 dias)
  const diasComAgendamentos = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana)
    dia.setDate(inicioSemana.getDate() + i)
    const dataStr = dia.toISOString().split('T')[0]
    const agendamentos = (dados.calendario_semana || []).filter(
      ag => ag.data_agendamento?.slice(0, 10) === dataStr
    )
    return { dia, dataStr, agendamentos, isHoje: dataStr === hoje.toISOString().split('T')[0] }
  })

  return (
    <div className="space-y-6">

      {/* ── Avisos automáticos ── */}
      {(dados.pendentes_agendamentos > 0 || dados.pendentes_inscricoes > 0 || dados.equipamentos_manutencao > 0) && (
        <div className="space-y-2">
          {dados.pendentes_agendamentos > 0 && (
            <Aviso cor="yellow" icone="📅">
              <strong>{dados.pendentes_agendamentos}</strong> agendamento{dados.pendentes_agendamentos !== 1 ? 's' : ''} pendente{dados.pendentes_agendamentos !== 1 ? 's' : ''} de aprovação
            </Aviso>
          )}
          {dados.pendentes_inscricoes > 0 && (
            <Aviso cor="blue" icone="📋">
              <strong>{dados.pendentes_inscricoes}</strong> inscrição{dados.pendentes_inscricoes !== 1 ? 'ões' : ''} aguardando aprovação
            </Aviso>
          )}
          {dados.equipamentos_manutencao > 0 && (
            <Aviso cor="red" icone="🔧">
              <strong>{dados.equipamentos_manutencao}</strong> equipamento{dados.equipamentos_manutencao !== 1 ? 's' : ''} em manutenção
            </Aviso>
          )}
        </div>
      )}

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <CardResumo
          icone="🎓"
          valor={dados.total_alunos}
          label="Alunos inscritos"
          cor="border-primary"
        />
        <CardResumo
          icone="👨‍🏫"
          valor={dados.total_professores}
          label="Professores"
          cor="border-secondary"
        />
        <CardResumo
          icone="📅"
          valor={dados.agendamentos_semana}
          label="Agendamentos esta semana"
          cor="border-green-500"
        />
        <CardResumo
          icone="📝"
          valor={dados.atividades_andamento}
          label="Atividades em andamento"
          cor="border-purple-500"
        />
        <CardResumo
          icone="🖨️"
          valor={dados.equipamentos_disponiveis}
          label="Equipamentos disponíveis"
          cor="border-blue-400"
        />
      </div>

      {/* ── Calendário semanal ── */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">📅 Calendário da Semana</h2>
          <span className="text-white/60 text-sm">
            {inicioSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} –{' '}
            {new Date(inicioSemana.getTime() + 6 * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px]">
            {/* Cabeçalhos dos dias */}
            {diasComAgendamentos.map(({ dia, isHoje }) => (
              <div
                key={dia.toISOString()}
                className={`p-3 text-center border-b border-r border-gray-100 ${isHoje ? 'bg-blue-50' : ''}`}
              >
                <p className={`text-xs font-bold uppercase tracking-wide ${isHoje ? 'text-primary' : 'text-gray-400'}`}>
                  {DIAS_SEMANA[dia.getDay()]}
                </p>
                <p className={`text-lg font-bold ${isHoje ? 'text-primary' : 'text-textMain'}`}>
                  {dia.getDate()}
                </p>
              </div>
            ))}

            {/* Agendamentos de cada dia */}
            {diasComAgendamentos.map(({ dia, agendamentos, isHoje }) => (
              <div
                key={'ag-' + dia.toISOString()}
                className={`p-2 border-r border-gray-100 min-h-[120px] align-top ${isHoje ? 'bg-blue-50/30' : ''}`}
              >
                {agendamentos.length === 0 ? (
                  <p className="text-gray-300 text-xs text-center mt-4">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {agendamentos.map(ag => (
                      <div
                        key={ag.id}
                        title={`${ag.nome_projeto}\n${ag.hora_inicio}–${ag.hora_fim}\n${ag.responsavel_nome}`}
                        className={`text-xs p-1.5 rounded border-l-2 cursor-default truncate
                          ${COR_STATUS[ag.status] || 'bg-gray-100 border-gray-400 text-gray-600'}`}
                      >
                        <p className="font-semibold truncate">{ag.nome_projeto}</p>
                        <p className="opacity-70">{ag.hora_inicio}–{ag.hora_fim}</p>
                        <p className="opacity-60 truncate">{ag.responsavel_nome?.split(' ')[0]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legenda de status */}
        <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-3">
          {Object.entries(COR_STATUS).map(([status, cor]) => (
            <span key={status} className={`text-xs px-2 py-0.5 rounded border-l-2 ${cor} capitalize`}>
              {status}
            </span>
          ))}
        </div>
      </div>

      {/* ── Próximos agendamentos aprovados ── */}
      {dados.calendario_semana?.filter(ag => ag.status === 'aprovado').length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-bold text-textMain mb-4">✅ Aprovados nesta semana</h2>
          <div className="space-y-3">
            {dados.calendario_semana
              .filter(ag => ag.status === 'aprovado')
              .map(ag => (
                <div key={ag.id} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(ag.data_agendamento + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <p className="font-bold text-textMain">
                      {new Date(ag.data_agendamento + 'T12:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-textMain truncate">{ag.nome_projeto}</p>
                    <p className="text-sm text-gray-500">{ag.responsavel_nome} · {ag.hora_inicio}–{ag.hora_fim}</p>
                  </div>
                  <div className="text-sm text-gray-400 flex-shrink-0">
                    👥 {ag.num_participantes}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────

function CardResumo({ icone, valor, label, cor }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${cor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xl">{icone}</span>
        <span className="text-3xl font-bold text-textMain">{valor ?? '—'}</span>
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
    </div>
  )
}

function Aviso({ cor, icone, children }) {
  const cores = {
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    blue:   'bg-blue-50 border-blue-300 text-blue-800',
    red:    'bg-red-50 border-red-300 text-red-800',
  }
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm ${cores[cor]}`}>
      <span>{icone}</span>
      <span>{children}</span>
    </div>
  )
}

function Carregando() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">📊</div>
        <p>Carregando painel…</p>
      </div>
    </div>
  )
}

function Erro({ mensagem }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
      <div className="text-3xl mb-2">⚠️</div>
      <p>{mensagem}</p>
    </div>
  )
}
