// ============================================================
// ABA 4 — ATIVIDADES E PROJETOS da Sala Maker
// Portfólio digital: 5 tipos (Atividade, Desafio, Missão,
// Prova Prática, Projeto Livre). Com conexão STEAM.
// ============================================================

import React, { useEffect, useState } from 'react'
import api from '../../api'

// Tipos de atividade com cor e ícone
const TIPOS = {
  atividade:     { label: 'Atividade Prática',  cor: 'bg-blue-100 text-blue-800',   icone: '🔵', borda: 'border-blue-400' },
  desafio:       { label: 'Desafio',            cor: 'bg-yellow-100 text-yellow-800',icone: '🟡', borda: 'border-yellow-400' },
  missao:        { label: 'Missão',             cor: 'bg-orange-100 text-orange-800',icone: '🟠', borda: 'border-orange-400' },
  prova_pratica: { label: 'Prova Prática',      cor: 'bg-green-100 text-green-800',  icone: '🟢', borda: 'border-green-400' },
  projeto_livre: { label: 'Projeto Livre',      cor: 'bg-red-100 text-red-800',      icone: '🔴', borda: 'border-red-400' },
}

// Status de atividade
const STATUS = {
  em_andamento: { label: 'Em andamento', cor: 'bg-blue-100 text-blue-700' },
  concluido:    { label: 'Concluído',    cor: 'bg-green-100 text-green-700' },
  cancelado:    { label: 'Cancelado',    cor: 'bg-gray-100 text-gray-600' },
  planejamento: { label: 'Planejamento', cor: 'bg-purple-100 text-purple-700' },
  apresentado:  { label: 'Apresentado',  cor: 'bg-teal-100 text-teal-700' },
}

// Competências maker
const COMPETENCIAS = [
  'Criatividade e inovação', 'Trabalho em equipe', 'Resolução de problemas',
  'Raciocínio lógico', 'Programação e robótica', 'Prototipagem',
]

// Áreas STEAM
const STEAM = [
  { key: 'S', label: 'Science (Ciência)' },
  { key: 'T', label: 'Technology (Tecnologia)' },
  { key: 'E', label: 'Engineering (Engenharia)' },
  { key: 'A', label: 'Arts (Arte)' },
  { key: 'M', label: 'Mathematics (Matemática)' },
]

export default function Atividades({ config, usuario }) {
  const [atividades, setAtividades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm]     = useState(false)
  const [editando, setEditando]           = useState(null)
  const [filtroTipo, setFiltroTipo]       = useState('todos')
  const [filtroStatus, setFiltroStatus]   = useState('todos')
  const [expandidos, setExpandidos]       = useState({})

  const isAdmin = usuario.perfil === 'admin'

  function carregar() {
    setCarregando(true)
    api.get('/sala-maker/atividades')
      .then(({ data }) => setAtividades(data))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  const lista = atividades.filter(a => {
    if (filtroTipo   !== 'todos' && a.tipo   !== filtroTipo)   return false
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
    return true
  })

  function toggleExpandido(id) {
    setExpandidos(e => ({ ...e, [id]: !e[id] }))
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta atividade? Esta ação não pode ser desfeita.')) return
    try {
      await api.delete(`/sala-maker/atividades/${id}`)
      carregar()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-textMain text-lg">📝 Atividades e Projetos</h2>
        <button onClick={() => { setEditando(null); setMostrarForm(true) }}
          className="btn-primary text-sm">
          + Nova Atividade
        </button>
      </div>

      {/* Chips de tipo */}
      <div className="flex flex-wrap gap-2">
        <Chip label="Todos" ativo={filtroTipo === 'todos'} onClick={() => setFiltroTipo('todos')} />
        {Object.entries(TIPOS).map(([key, t]) => (
          <Chip key={key} label={`${t.icone} ${t.label}`}
            ativo={filtroTipo === key} onClick={() => setFiltroTipo(key)} />
        ))}
      </div>

      {/* Filtro de status */}
      <div className="flex flex-wrap gap-2">
        <Chip label="Todos os status" ativo={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')} small />
        {Object.entries(STATUS).map(([key, s]) => (
          <Chip key={key} label={s.label} ativo={filtroStatus === key}
            onClick={() => setFiltroStatus(key)} small />
        ))}
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <FormularioAtividade
          inicial={editando}
          usuario={usuario}
          onSalvo={() => { setMostrarForm(false); setEditando(null); carregar() }}
          onCancelar={() => { setMostrarForm(false); setEditando(null) }}
        />
      )}

      {/* Lista */}
      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p>Nenhuma atividade registrada ainda.</p>
          <p className="text-sm mt-1 text-gray-300">Clique em "+ Nova Atividade" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(at => {
            const tipo   = TIPOS[at.tipo]   || TIPOS.atividade
            const status = STATUS[at.status] || STATUS.em_andamento

            return (
              <div key={at.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden ${tipo.borda}`}>
                {/* Linha resumo */}
                <div className="flex items-center gap-3 p-4">
                  <span className="text-2xl">{tipo.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-textMain truncate">{at.titulo}</p>
                    <p className="text-sm text-gray-400">
                      {at.professor_nome?.split(' ')[0]}
                      {at.data_realizacao && ` · ${new Date(at.data_realizacao).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${status.cor}`}>
                    {status.label}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Editar: apenas dono ou admin */}
                    {(isAdmin || at.professor_id === usuario.id) && (
                      <button onClick={() => { setEditando(at); setMostrarForm(true) }}
                        className="text-gray-400 hover:text-primary text-sm p-1">✏️</button>
                    )}
                    {(isAdmin || at.professor_id === usuario.id) && (
                      <button onClick={() => excluir(at.id)}
                        className="text-gray-400 hover:text-red-500 text-sm p-1">🗑️</button>
                    )}
                    <button onClick={() => toggleExpandido(at.id)}
                      className="text-gray-400 hover:text-gray-600 text-lg w-6">
                      {expandidos[at.id] ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {expandidos[at.id] && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    {at.descricao && (
                      <p className="text-sm text-gray-700">{at.descricao}</p>
                    )}

                    {/* Turmas envolvidas */}
                    {at.turmas_json?.length > 0 && (
                      <InfoChips label="Turmas" items={at.turmas_json} cor="bg-blue-100 text-blue-700" />
                    )}

                    {/* Competências */}
                    {at.competencias_json?.length > 0 && (
                      <InfoChips label="Competências" items={at.competencias_json} cor="bg-purple-100 text-purple-700" />
                    )}

                    {/* Conexão STEAM */}
                    {at.steam_json?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">STEAM</p>
                        <div className="flex flex-wrap gap-1">
                          {STEAM.filter(s => at.steam_json.includes(s.key)).map(s => (
                            <span key={s.key}
                              className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                              {s.key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Etapas */}
                    {at.etapas_json?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Etapas</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          {at.etapas_json.map((etapa, i) => (
                            <li key={i} className="text-sm text-gray-700">{typeof etapa === 'string' ? etapa : etapa.titulo}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Resultado */}
                    {at.vencedor && (
                      <p className="text-sm">🏆 <span className="font-medium">Vencedor:</span> {at.vencedor}</p>
                    )}

                    {/* Critérios de avaliação */}
                    {at.criterios_avaliacao && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Critérios de avaliação</p>
                        <p className="text-sm text-gray-700">{at.criterios_avaliacao}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Formulário de criação/edição ──────────────────────────

function FormularioAtividade({ inicial, usuario, onSalvo, onCancelar }) {
  const [form, setForm] = useState({
    tipo:              inicial?.tipo               || 'atividade',
    titulo:            inicial?.titulo             || '',
    descricao:         inicial?.descricao          || '',
    turmas_json:       inicial?.turmas_json        || [],
    data_realizacao:   inicial?.data_realizacao?.slice(0,10)   || '',
    prazo_entrega:     inicial?.prazo_entrega?.slice(0,10)     || '',
    competencias_json: inicial?.competencias_json  || [],
    steam_json:        inicial?.steam_json         || [],
    criterios_avaliacao: inicial?.criterios_avaliacao || '',
    status:            inicial?.status             || 'em_andamento',
    etapas_json:       inicial?.etapas_json        || [],
    vencedor:          inicial?.vencedor           || '',
  })
  const [novaEtapa, setNovaEtapa] = useState('')
  const [novaTurma, setNovaTurma] = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')

  const editando = !!inicial

  function toggleCompetencia(c) {
    setForm(f => ({
      ...f,
      competencias_json: f.competencias_json.includes(c)
        ? f.competencias_json.filter(x => x !== c)
        : [...f.competencias_json, c],
    }))
  }

  function toggleSteam(k) {
    setForm(f => ({
      ...f,
      steam_json: f.steam_json.includes(k)
        ? f.steam_json.filter(x => x !== k)
        : [...f.steam_json, k],
    }))
  }

  function addEtapa() {
    if (!novaEtapa.trim()) return
    setForm(f => ({ ...f, etapas_json: [...f.etapas_json, novaEtapa.trim()] }))
    setNovaEtapa('')
  }

  function addTurma() {
    if (!novaTurma.trim()) return
    setForm(f => ({ ...f, turmas_json: [...f.turmas_json, novaTurma.trim()] }))
    setNovaTurma('')
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await api.put(`/sala-maker/atividades/${inicial.id}`, form)
      } else {
        await api.post('/sala-maker/atividades', form)
      }
      onSalvo()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const tipo = TIPOS[form.tipo] || TIPOS.atividade

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${tipo.borda}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-textMain">
          {editando ? '✏️ Editar Atividade' : '📝 Nova Atividade'}
        </h3>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      <form onSubmit={salvar} className="space-y-5">

        {/* Tipo */}
        <div>
          <label className="label">Tipo de atividade</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIPOS).map(([key, t]) => (
              <button key={key} type="button" onClick={() => setForm(f => ({ ...f, tipo: key }))}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors
                  ${form.tipo === key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}>
                {t.icone} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título e descrição */}
        <div className="space-y-3">
          <div>
            <label className="label">Título *</label>
            <input className="input-field" required placeholder="Título da atividade"
                   value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Descreva a atividade…"
                      value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>
        </div>

        {/* Turmas */}
        <div>
          <label className="label">Turmas envolvidas</label>
          <div className="flex gap-2 mb-2">
            <input className="input-field text-sm" placeholder="Ex: 9º A"
                   value={novaTurma} onChange={e => setNovaTurma(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTurma())} />
            <button type="button" onClick={addTurma} className="btn-secondary text-sm px-3">+</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {form.turmas_json.map((t, i) => (
              <span key={i} className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                {t}
                <button type="button" onClick={() => setForm(f => ({ ...f, turmas_json: f.turmas_json.filter((_, j) => j !== i) }))}
                  className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Datas e status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Data de realização</label>
            <input type="date" className="input-field"
                   value={form.data_realizacao}
                   onChange={e => setForm(f => ({ ...f, data_realizacao: e.target.value }))} />
          </div>
          {['desafio', 'missao', 'projeto_livre'].includes(form.tipo) && (
            <div>
              <label className="label">Prazo de entrega</label>
              <input type="date" className="input-field"
                     value={form.prazo_entrega}
                     onChange={e => setForm(f => ({ ...f, prazo_entrega: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Status</label>
            <select className="input-field" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS).map(([k, s]) => (
                <option key={k} value={k}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Competências */}
        <div>
          <label className="label">Competências desenvolvidas</label>
          <div className="flex flex-wrap gap-2">
            {COMPETENCIAS.map(c => (
              <button key={c} type="button" onClick={() => toggleCompetencia(c)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors
                  ${form.competencias_json.includes(c)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Conexão STEAM */}
        <div>
          <label className="label">Conexão STEAM</label>
          <div className="flex flex-wrap gap-2">
            {STEAM.map(s => (
              <button key={s.key} type="button" onClick={() => toggleSteam(s.key)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors
                  ${form.steam_json.includes(s.key)
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                <span className="font-bold">{s.key}</span>
                <span className="hidden sm:inline"> — {s.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Etapas (para missão e projeto_livre) */}
        {['missao', 'projeto_livre'].includes(form.tipo) && (
          <div>
            <label className="label">Etapas da atividade</label>
            <div className="flex gap-2 mb-2">
              <input className="input-field text-sm" placeholder="Descreva uma etapa…"
                     value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEtapa())} />
              <button type="button" onClick={addEtapa} className="btn-secondary text-sm px-3">+</button>
            </div>
            {form.etapas_json.length > 0 && (
              <ol className="list-decimal list-inside space-y-1">
                {form.etapas_json.map((etapa, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="flex-1">{etapa}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, etapas_json: f.etapas_json.filter((_, j) => j !== i) }))}
                      className="text-red-400 hover:text-red-600 flex-shrink-0">×</button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Critérios de avaliação */}
        <div>
          <label className="label">Critérios de avaliação</label>
          <textarea className="input-field resize-none" rows={2}
                    placeholder="Como os alunos serão avaliados…"
                    value={form.criterios_avaliacao}
                    onChange={e => setForm(f => ({ ...f, criterios_avaliacao: e.target.value }))} />
        </div>

        {/* Vencedor (para desafio) */}
        {form.tipo === 'desafio' && (
          <div>
            <label className="label">Vencedor(es)</label>
            <input className="input-field" placeholder="Nome da equipe ou aluno vencedor"
                   value={form.vencedor} onChange={e => setForm(f => ({ ...f, vencedor: e.target.value }))} />
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{erro}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-50">
            {salvando ? 'Salvando…' : (editando ? '✏️ Atualizar' : '📝 Salvar Atividade')}
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

// ── Componentes auxiliares ────────────────────────────────

function Chip({ label, ativo, onClick, small }) {
  return (
    <button onClick={onClick}
      className={`${small ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'} rounded-full border font-medium transition-colors
        ${ativo
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-gray-500 border-gray-300 hover:border-primary'}`}>
      {label}
    </button>
  )
}

function InfoChips({ label, items, cor }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${cor}`}>{item}</span>
        ))}
      </div>
    </div>
  )
}
