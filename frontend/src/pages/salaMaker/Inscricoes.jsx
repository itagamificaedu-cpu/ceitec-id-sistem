// ============================================================
// ABA 2 — INSCRIÇÕES na Sala Maker
// Formulários de adesão para professores e alunos.
// Admin vê e gerencia todas; professor vê a própria inscrição.
// ============================================================

import React, { useEffect, useState } from 'react'
import api from '../../api'

// Opções de tipo de uso (professor)
const TIPOS_USO = [
  'Atividade prática vinculada à disciplina',
  'Projeto interdisciplinar',
  'Clube/Equipe Maker',
  'Desafio ou Missão',
  'Outro',
]

// Áreas de interesse do aluno
const AREAS_INTERESSE = [
  'Robótica e Eletrônica',
  'Impressão 3D e Modelagem',
  'Corte a Laser e Gravação',
  'Programação e Tecnologia',
  'Marcenaria e Construção',
  'Arte e Design Digital',
  'Outro',
]

// Competências a desenvolver
const COMPETENCIAS = [
  'Criatividade e inovação',
  'Trabalho em equipe',
  'Resolução de problemas',
  'Raciocínio lógico',
  'Programação e robótica',
  'Prototipagem e fabricação digital',
]

// Cores por status
const COR_STATUS = {
  pendente:  'bg-yellow-100 text-yellow-800',
  aprovada:  'bg-green-100 text-green-800',
  recusada:  'bg-red-100 text-red-800',
}

export default function Inscricoes({ config, usuario }) {
  const [inscricoes, setInscricoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [minhaInscricao, setMinhaInscricao] = useState(null)
  const [mostrarForm, setMostrarForm]       = useState(false)
  const [filtroStatus, setFiltroStatus]     = useState('todos')
  const [filtroTipo, setFiltroTipo]         = useState('todos')

  const isAdmin = usuario.perfil === 'admin'

  // Carrega inscrições
  function carregar() {
    setCarregando(true)
    api.get('/sala-maker/inscricoes')
      .then(({ data }) => {
        setInscricoes(data)
        // Verifica se o usuário atual já tem inscrição
        const minha = data.find(i => i.usuario_id === usuario.id)
        setMinhaInscricao(minha || null)
      })
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  // Filtragem da lista (apenas para admin)
  const inscricoesFiltradas = inscricoes.filter(i => {
    if (filtroStatus !== 'todos' && i.status !== filtroStatus) return false
    if (filtroTipo   !== 'todos' && i.tipo_inscrito !== filtroTipo) return false
    return true
  })

  // ── Se professor: mostrar sua inscrição ou formulário ─────
  if (!isAdmin) {
    return (
      <div className="max-w-2xl">
        {minhaInscricao ? (
          <CartaoMinhaInscricao inscricao={minhaInscricao} />
        ) : mostrarForm ? (
          <FormularioInscricao
            usuario={usuario}
            onSalvo={(nova) => { setMinhaInscricao(nova); setMostrarForm(false) }}
            onCancelar={() => setMostrarForm(false)}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-textMain mb-2">Inscrição na Sala Maker</h2>
            <p className="text-gray-500 text-sm mb-6">
              Você ainda não está inscrito na Sala Maker. Faça sua inscrição para solicitar agendamentos e registrar atividades.
            </p>
            <button onClick={() => setMostrarForm(true)} className="btn-primary">
              📋 Fazer Inscrição
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Vista do Admin: lista completa ────────────────────────
  return (
    <div className="space-y-5">

      {/* Cabeçalho com botão de nova inscrição */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-textMain text-lg">📋 Gerenciar Inscrições</h2>
        <div className="flex gap-2 flex-wrap">
          <BotaoExportar inscricoes={inscricoesFiltradas} />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input-field text-sm w-40" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="recusada">Recusada</option>
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input-field text-sm w-40" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="professor">Professor</option>
            <option value="aluno">Aluno</option>
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-500">{inscricoesFiltradas.length} inscrição(ões)</span>
        </div>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando…</div>
      ) : inscricoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Nenhuma inscrição encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inscricoesFiltradas.map(inscricao => (
            <CardInscricaoAdmin
              key={inscricao.id}
              inscricao={inscricao}
              onAtualizada={carregar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Cartão da inscrição do professor logado ───────────────

function CartaoMinhaInscricao({ inscricao }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-textMain">Minha Inscrição</h2>
          <p className="text-sm text-gray-400">Inscrito em {new Date(inscricao.criado_em).toLocaleDateString('pt-BR')}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${COR_STATUS[inscricao.status] || 'bg-gray-100 text-gray-600'}`}>
          {inscricao.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Info label="Nome"       value={inscricao.nome} />
        <Info label="Tipo"       value={inscricao.tipo_inscrito} />
        <Info label="Disciplina" value={inscricao.disciplina || '—'} />
        <Info label="Turma"      value={inscricao.turma_nome   || '—'} />
        {inscricao.tipo_uso && <Info label="Tipo de uso" value={inscricao.tipo_uso} />}
        {inscricao.area_interesse && <Info label="Área de interesse" value={inscricao.area_interesse} />}
      </div>

      {inscricao.descricao_projeto && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Descrição do projeto</p>
          <p className="text-sm text-gray-700">{inscricao.descricao_projeto}</p>
        </div>
      )}

      {inscricao.status === 'pendente' && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⏳ Sua inscrição está aguardando aprovação do administrador.
        </div>
      )}
      {inscricao.status === 'recusada' && inscricao.justificativa_recusa && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          ❌ Recusada: {inscricao.justificativa_recusa}
        </div>
      )}
      {inscricao.status === 'aprovada' && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✅ Inscrição aprovada! Você pode agendar sessões na aba Agendamento.
        </div>
      )}
    </div>
  )
}

// ── Formulário de inscrição ───────────────────────────────

function FormularioInscricao({ usuario, onSalvo, onCancelar }) {
  const isProfessor = usuario.perfil === 'professor'

  const [form, setForm] = useState({
    tipo_inscrito:     isProfessor ? 'professor' : 'aluno',
    nome:              usuario.nome || '',
    email:             usuario.email || '',
    disciplina:        '',
    turma_nome:        '',
    modalidade:        '',
    nome_equipe:       '',
    area_interesse:    '',
    tipo_uso:          '',
    descricao_projeto: '',
    tem_experiencia:   false,
    descricao_experiencia: '',
    competencias_json: [],
    aceite_regulamento: false,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function toggleCompetencia(comp) {
    setForm(f => ({
      ...f,
      competencias_json: f.competencias_json.includes(comp)
        ? f.competencias_json.filter(c => c !== comp)
        : [...f.competencias_json, comp],
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.aceite_regulamento) {
      setErro('Você precisa aceitar o regulamento para se inscrever.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const { data } = await api.post('/sala-maker/inscricoes', form)
      onSalvo(data)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar inscrição.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-textMain">📋 Nova Inscrição — Sala Maker</h2>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      <form onSubmit={salvar} className="space-y-5">

        {/* Dados básicos */}
        <Secao titulo="Dados do Inscrito">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input-field" value={form.nome} readOnly disabled
                     style={{ backgroundColor: '#f9fafb' }} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input-field" value={form.email} readOnly disabled
                     style={{ backgroundColor: '#f9fafb' }} />
            </div>
            {isProfessor && (
              <div>
                <label className="label">Disciplina que leciona</label>
                <input className="input-field" placeholder="Ex: Matemática"
                       value={form.disciplina}
                       onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Turma</label>
              <input className="input-field" placeholder="Ex: 9º A"
                     value={form.turma_nome}
                     onChange={e => setForm(f => ({ ...f, turma_nome: e.target.value }))} />
            </div>
          </div>
        </Secao>

        {/* Tipo de uso (professor) */}
        {isProfessor && (
          <Secao titulo="Tipo de uso pretendido">
            <div className="space-y-2">
              {TIPOS_USO.map(tipo => (
                <label key={tipo} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="tipo_uso"
                    value={tipo}
                    checked={form.tipo_uso === tipo}
                    onChange={() => setForm(f => ({ ...f, tipo_uso: tipo }))}
                    className="accent-primary"
                  />
                  {tipo}
                </label>
              ))}
            </div>
          </Secao>
        )}

        {/* Área de interesse (aluno) */}
        {!isProfessor && (
          <Secao titulo="Área de interesse">
            <div className="space-y-2">
              {AREAS_INTERESSE.map(area => (
                <label key={area} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="area_interesse"
                    value={area}
                    checked={form.area_interesse === area}
                    onChange={() => setForm(f => ({ ...f, area_interesse: area }))}
                    className="accent-primary"
                  />
                  {area}
                </label>
              ))}
            </div>
          </Secao>
        )}

        {/* Descrição do projeto */}
        <Secao titulo="Descrição do que pretende desenvolver">
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Descreva o que você planeja fazer na Sala Maker…"
            value={form.descricao_projeto}
            onChange={e => setForm(f => ({ ...f, descricao_projeto: e.target.value }))}
          />
        </Secao>

        {/* Experiência prévia */}
        <Secao titulo="Experiência com ferramentas maker">
          <label className="flex items-center gap-2 cursor-pointer text-sm mb-3">
            <input
              type="checkbox"
              checked={form.tem_experiencia}
              onChange={e => setForm(f => ({ ...f, tem_experiencia: e.target.checked }))}
              className="accent-primary"
            />
            Sim, já tenho experiência com ferramentas maker
          </label>
          {form.tem_experiencia && (
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Descreva sua experiência…"
              value={form.descricao_experiencia}
              onChange={e => setForm(f => ({ ...f, descricao_experiencia: e.target.value }))}
            />
          )}
        </Secao>

        {/* Competências a desenvolver */}
        <Secao titulo="Competências que deseja desenvolver">
          <div className="flex flex-wrap gap-2">
            {COMPETENCIAS.map(comp => (
              <button
                key={comp}
                type="button"
                onClick={() => toggleCompetencia(comp)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors
                  ${form.competencias_json.includes(comp)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}
              >
                {comp}
              </button>
            ))}
          </div>
        </Secao>

        {/* Aceite do regulamento */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary mt-0.5"
              checked={form.aceite_regulamento}
              onChange={e => setForm(f => ({ ...f, aceite_regulamento: e.target.checked }))}
            />
            <span className="text-sm text-blue-800">
              <strong>Li e aceito o regulamento da Sala Maker</strong>. Comprometo-me a usar os equipamentos com responsabilidade, respeitar os horários agendados e seguir as normas de segurança.
              {config?.regulamento && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:underline text-xs">Ver regulamento completo</summary>
                  <p className="mt-2 text-xs text-blue-700 whitespace-pre-wrap">{config.regulamento}</p>
                </details>
              )}
            </span>
          </label>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando || !form.aceite_regulamento}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {salvando ? 'Enviando…' : '📋 Enviar Inscrição'}
          </button>
          <button type="button" onClick={onCancelar}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Card de inscrição na lista do admin ───────────────────

function CardInscricaoAdmin({ inscricao, onAtualizada }) {
  const [expandido, setExpandido]   = useState(false)
  const [modal, setModal]           = useState(null) // 'aprovar' | 'recusar'
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando]     = useState(false)

  async function alterar(status) {
    setSalvando(true)
    try {
      await api.patch(`/sala-maker/inscricoes/${inscricao.id}/status`, {
        status,
        justificativa_recusa: justificativa || undefined,
      })
      setModal(null)
      setJustificativa('')
      onAtualizada()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao alterar status.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Linha principal */}
      <div className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
          {inscricao.tipo_inscrito === 'professor' ? '👨‍🏫' : '🎓'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-textMain truncate">{inscricao.nome}</p>
          <p className="text-sm text-gray-400">
            {inscricao.tipo_inscrito === 'professor' ? 'Professor' : 'Aluno'}
            {inscricao.disciplina && ` · ${inscricao.disciplina}`}
            {inscricao.turma_nome && ` · ${inscricao.turma_nome}`}
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${COR_STATUS[inscricao.status] || 'bg-gray-100 text-gray-600'}`}>
          {inscricao.status}
        </span>
        <button onClick={() => setExpandido(!expandido)}
          className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0 w-6">
          {expandido ? '▲' : '▼'}
        </button>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {inscricao.descricao_projeto && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Projeto</p>
              <p className="text-sm text-gray-700">{inscricao.descricao_projeto}</p>
            </div>
          )}
          {inscricao.area_interesse && (
            <p className="text-sm"><span className="font-medium">Área:</span> {inscricao.area_interesse}</p>
          )}
          {inscricao.tipo_uso && (
            <p className="text-sm"><span className="font-medium">Uso:</span> {inscricao.tipo_uso}</p>
          )}
          {inscricao.competencias_json?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {inscricao.competencias_json.map(c => (
                <span key={c} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {inscricao.justificativa_recusa && (
            <p className="text-sm text-red-600"><span className="font-medium">Recusa:</span> {inscricao.justificativa_recusa}</p>
          )}

          {/* Botões de ação para inscrições pendentes */}
          {inscricao.status === 'pendente' && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal('aprovar')}
                className="btn-secondary text-sm px-4 py-1.5">
                ✅ Aprovar
              </button>
              <button onClick={() => setModal('recusar')}
                className="btn-danger text-sm px-4 py-1.5">
                ❌ Recusar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmação */}
      {modal && (
        <div className="border-t border-gray-100 p-4 bg-white">
          {modal === 'recusar' && (
            <div className="mb-3">
              <label className="label">Justificativa da recusa (opcional)</label>
              <input className="input-field text-sm" placeholder="Ex: Horário já ocupado…"
                     value={justificativa}
                     onChange={e => setJustificativa(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={salvando}
              onClick={() => alterar(modal === 'aprovar' ? 'aprovada' : 'recusada')}
              className={`${modal === 'aprovar' ? 'btn-secondary' : 'btn-danger'} text-sm disabled:opacity-50`}
            >
              {salvando ? '…' : (modal === 'aprovar' ? '✅ Confirmar aprovação' : '❌ Confirmar recusa')}
            </button>
            <button onClick={() => setModal(null)}
              className="text-sm text-gray-500 hover:text-gray-700 px-3">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Exportar CSV ──────────────────────────────────────────

function BotaoExportar({ inscricoes }) {
  function exportar() {
    const cabecalho = ['Nome', 'Tipo', 'Email', 'Turma', 'Disciplina', 'Status', 'Data']
    const linhas = inscricoes.map(i => [
      i.nome, i.tipo_inscrito, i.email || '', i.turma_nome || '',
      i.disciplina || '', i.status,
      new Date(i.criado_em).toLocaleDateString('pt-BR'),
    ])
    const csv = [cabecalho, ...linhas].map(l => l.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `inscricoes-sala-maker-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }
  return (
    <button onClick={exportar}
      className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
      📥 Exportar CSV
    </button>
  )
}

// ── Componentes auxiliares ────────────────────────────────

function Secao({ titulo, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100">
        {titulo}
      </h3>
      {children}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-textMain">{value || '—'}</p>
    </div>
  )
}
