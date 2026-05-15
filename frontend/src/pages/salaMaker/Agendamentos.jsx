// ============================================================
// ABA 3 — AGENDAMENTO DA SALA MAKER
// Formulário completo com datepicker, materiais dinâmicos,
// equipamentos com aviso de operador, disciplinas STEAM.
// Admin aprova/recusa; professor gerencia os próprios.
// ============================================================

import React, { useEffect, useState } from 'react'
import api from '../../api'

// Equipamentos padrão com observações de segurança
const EQUIPAMENTOS_PADRAO = [
  { id: 'impressora3d',  label: '🖨️ Impressora 3D',          requerOperador: true,  aviso: 'Você sabe operar a Impressora 3D sozinho?' },
  { id: 'laser',         label: '✂️ Cortadora a Laser',       requerOperador: true,  aviso: 'Você sabe operar a Cortadora a Laser sozinho?' },
  { id: 'plotter',       label: '🗺️ Plotter',                 requerOperador: true,  aviso: 'Você sabe operar o Plotter sozinho?' },
  { id: 'bancada',       label: '🔧 Bancada de Chaveiro',      requerOperador: true,  aviso: 'Você usará as ferramentas com supervisão?' },
  { id: 'lousa',         label: '📺 Lousa Digital',            requerOperador: false, aviso: null },
]

// Materiais sugeridos como chips
const MATERIAIS_SUGERIDOS = [
  'Filamento PLA', 'Papel para plotter', 'Papelão', 'Arduino',
  'Fios', 'Cola quente', 'Acrílico', 'MDF', 'Tinta', 'EVA',
]

// Disciplinas / componentes curriculares
const DISCIPLINAS = [
  'Matemática', 'Ciências', 'Física', 'Química',
  'Artes', 'Tecnologia', 'Geografia', 'Outro',
]

// Cores por status
const COR_STATUS = {
  aprovado:  { bg: 'bg-green-100 text-green-800',  icone: '✅' },
  pendente:  { bg: 'bg-yellow-100 text-yellow-800', icone: '⏳' },
  recusado:  { bg: 'bg-red-100 text-red-800',       icone: '❌' },
  cancelado: { bg: 'bg-gray-100 text-gray-600',     icone: '🚫' },
  concluido: { bg: 'bg-blue-100 text-blue-800',     icone: '🎉' },
}

export default function Agendamentos({ config, usuario }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const isAdmin = usuario.perfil === 'admin'

  function carregar() {
    setCarregando(true)
    api.get('/sala-maker/agendamentos')
      .then(({ data }) => setAgendamentos(data))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  // Filtra por status
  const lista = agendamentos.filter(
    ag => filtroStatus === 'todos' || ag.status === filtroStatus
  )

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-textMain text-lg">📅 Agendamentos da Sala Maker</h2>
        <button onClick={() => setMostrarForm(true)} className="btn-primary text-sm">
          + Novo Agendamento
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {['todos', 'pendente', 'aprovado', 'recusado', 'cancelado', 'concluido'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition-colors
              ${filtroStatus === s
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-300 hover:border-primary'}`}
          >
            {s === 'todos' ? 'Todos' : `${COR_STATUS[s]?.icone || ''} ${s}`}
            {s !== 'todos' && (
              <span className="ml-1 opacity-60">({agendamentos.filter(ag => ag.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Formulário de novo agendamento */}
      {mostrarForm && (
        <FormularioAgendamento
          usuario={usuario}
          onSalvo={() => { setMostrarForm(false); carregar() }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {/* Lista de agendamentos */}
      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <p>Nenhum agendamento encontrado.</p>
          {!isAdmin && (
            <p className="text-sm mt-1 text-gray-300">Você precisa ter inscrição aprovada para agendar.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(ag => (
            <CardAgendamento
              key={ag.id}
              agendamento={ag}
              isAdmin={isAdmin}
              usuarioId={usuario.id}
              onAtualizado={carregar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Formulário completo de agendamento ────────────────────

function FormularioAgendamento({ usuario, onSalvo, onCancelar }) {
  // Datas mínima: 48h a partir de agora
  const minDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const [form, setForm] = useState({
    data_agendamento: '',
    hora_inicio:      '08:00',
    hora_fim:         '09:00',
    nome_projeto:     '',
    descricao_projeto:'',
    num_participantes: 1,
    materiais_json:   [],          // [{ material, quantidade, unidade }]
    equipamentos_json:[],          // [{ id, label, autonomia }]
    disciplinas_json: [],
  })
  const [horariosOcupados, setHorariosOcupados] = useState([])
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  // Carrega horários ocupados ao selecionar data
  useEffect(() => {
    if (!form.data_agendamento) return
    api.get('/sala-maker/agendamentos/horarios-ocupados', {
      params: { data: form.data_agendamento }
    }).then(({ data }) => setHorariosOcupados(data))
      .catch(() => {})
  }, [form.data_agendamento])

  // Material dinâmico: adicionar linha
  function addMaterial(sugestao) {
    const existe = sugestao
      ? form.materiais_json.some(m => m.material === sugestao)
      : false
    if (existe) return
    setForm(f => ({
      ...f,
      materiais_json: [...f.materiais_json, {
        material: sugestao || '',
        quantidade: '1',
        unidade: 'un',
      }],
    }))
  }

  function removeMaterial(idx) {
    setForm(f => ({
      ...f,
      materiais_json: f.materiais_json.filter((_, i) => i !== idx),
    }))
  }

  function atualizarMaterial(idx, campo, valor) {
    setForm(f => {
      const lista = [...f.materiais_json]
      lista[idx] = { ...lista[idx], [campo]: valor }
      return { ...f, materiais_json: lista }
    })
  }

  // Equipamento: toggle seleção
  function toggleEquipamento(equip) {
    setForm(f => {
      const selecionados = f.equipamentos_json
      const jaEsta = selecionados.some(e => e.id === equip.id)
      if (jaEsta) {
        return { ...f, equipamentos_json: selecionados.filter(e => e.id !== equip.id) }
      }
      return {
        ...f,
        equipamentos_json: [...selecionados, { id: equip.id, label: equip.label, autonomia: 'nao' }],
      }
    })
  }

  function setAutonomia(equipId, valor) {
    setForm(f => ({
      ...f,
      equipamentos_json: f.equipamentos_json.map(e =>
        e.id === equipId ? { ...e, autonomia: valor } : e
      ),
    }))
  }

  function toggleDisciplina(disc) {
    setForm(f => ({
      ...f,
      disciplinas_json: f.disciplinas_json.includes(disc)
        ? f.disciplinas_json.filter(d => d !== disc)
        : [...f.disciplinas_json, disc],
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await api.post('/sala-maker/agendamentos', form)
      onSalvo()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao criar agendamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-secondary">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-textMain">📅 Novo Agendamento</h3>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      <form onSubmit={salvar} className="space-y-6">

        {/* Data e horário */}
        <SecaoForm titulo="Data e Horário">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input-field" min={minDate} required
                     value={form.data_agendamento}
                     onChange={e => setForm(f => ({ ...f, data_agendamento: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Mínimo 48h de antecedência</p>
            </div>
            <div>
              <label className="label">Início *</label>
              <input type="time" className="input-field" required
                     value={form.hora_inicio}
                     onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="label">Término *</label>
              <input type="time" className="input-field" required
                     value={form.hora_fim}
                     onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
            </div>
          </div>

          {/* Horários já ocupados nesta data */}
          {horariosOcupados.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Horários já ocupados nesta data:</p>
              <div className="flex flex-wrap gap-2">
                {horariosOcupados.map((h, i) => (
                  <span key={i} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    {h.hora_inicio}–{h.hora_fim} ({h.nome_projeto})
                  </span>
                ))}
              </div>
            </div>
          )}
        </SecaoForm>

        {/* Projeto */}
        <SecaoForm titulo="Dados do Projeto">
          <div className="space-y-4">
            <div>
              <label className="label">Nome do projeto *</label>
              <input className="input-field" placeholder="Ex: Robô seguidor de linha" required
                     value={form.nome_projeto}
                     onChange={e => setForm(f => ({ ...f, nome_projeto: e.target.value }))} />
            </div>
            <div>
              <label className="label">Descrição do projeto</label>
              <textarea className="input-field resize-none" rows={3}
                        placeholder="Descreva o que será desenvolvido…"
                        value={form.descricao_projeto}
                        onChange={e => setForm(f => ({ ...f, descricao_projeto: e.target.value }))} />
            </div>
            <div>
              <label className="label">Número de participantes</label>
              <input type="number" min={1} max={50} className="input-field w-32"
                     value={form.num_participantes}
                     onChange={e => setForm(f => ({ ...f, num_participantes: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
        </SecaoForm>

        {/* Materiais */}
        <SecaoForm titulo="Materiais necessários">
          {/* Sugestões rápidas */}
          <div className="flex flex-wrap gap-2 mb-3">
            {MATERIAIS_SUGERIDOS.map(s => (
              <button key={s} type="button" onClick={() => addMaterial(s)}
                className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-secondary hover:text-white border border-gray-200 transition-colors">
                + {s}
              </button>
            ))}
          </div>

          {/* Lista de materiais */}
          {form.materiais_json.length > 0 && (
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-[1fr_80px_70px_32px] gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide px-1">
                <span>Material</span><span>Qtd</span><span>Unidade</span><span></span>
              </div>
              {form.materiais_json.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_70px_32px] gap-2 items-center">
                  <input className="input-field text-sm" placeholder="Material"
                         value={m.material}
                         onChange={e => atualizarMaterial(idx, 'material', e.target.value)} />
                  <input type="number" min={1} className="input-field text-sm text-center"
                         value={m.quantidade}
                         onChange={e => atualizarMaterial(idx, 'quantidade', e.target.value)} />
                  <select className="input-field text-sm"
                          value={m.unidade}
                          onChange={e => atualizarMaterial(idx, 'unidade', e.target.value)}>
                    <option value="un">un</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="cm">cm</option>
                    <option value="folha">folha</option>
                    <option value="rolo">rolo</option>
                  </select>
                  <button type="button" onClick={() => removeMaterial(idx)}
                    className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => addMaterial()}
            className="text-sm text-primary hover:underline font-medium">
            + Adicionar material manualmente
          </button>
        </SecaoForm>

        {/* Equipamentos */}
        <SecaoForm titulo="Equipamentos que serão utilizados">
          <div className="space-y-4">
            {EQUIPAMENTOS_PADRAO.map(equip => {
              const selecionado = form.equipamentos_json.find(e => e.id === equip.id)
              return (
                <div key={equip.id} className={`rounded-xl border p-4 transition-colors
                  ${selecionado ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary w-4 h-4"
                      checked={!!selecionado}
                      onChange={() => toggleEquipamento(equip)}
                    />
                    <span className="font-medium text-textMain">{equip.label}</span>
                    {!equip.requerOperador && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Livre</span>
                    )}
                  </label>

                  {/* Pergunta de autonomia — aparece ao selecionar */}
                  {selecionado && equip.requerOperador && (
                    <div className="mt-3 ml-7 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ {equip.aviso}</p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={`aut-${equip.id}`} className="accent-primary"
                                 checked={selecionado.autonomia === 'sim'}
                                 onChange={() => setAutonomia(equip.id, 'sim')} />
                          Sim, tenho experiência — usarei de forma autônoma
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={`aut-${equip.id}`} className="accent-primary"
                                 checked={selecionado.autonomia === 'nao'}
                                 onChange={() => setAutonomia(equip.id, 'nao')} />
                          Não — será operado pelo profissional da Sala Maker
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SecaoForm>

        {/* Componentes curriculares */}
        <SecaoForm titulo="Componentes curriculares relacionados">
          <div className="flex flex-wrap gap-2">
            {DISCIPLINAS.map(disc => (
              <button key={disc} type="button" onClick={() => toggleDisciplina(disc)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors
                  ${form.disciplinas_json.includes(disc)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}>
                {disc}
              </button>
            ))}
          </div>
        </SecaoForm>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-50">
            {salvando ? 'Enviando…' : '📅 Solicitar Agendamento'}
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

// ── Card de agendamento na lista ──────────────────────────

function CardAgendamento({ agendamento: ag, isAdmin, usuarioId, onAtualizado }) {
  const [expandido, setExpandido]         = useState(false)
  const [modal, setModal]                 = useState(null)
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando]           = useState(false)

  const ehDono = ag.responsavel_id === usuarioId
  const status = COR_STATUS[ag.status] || { bg: 'bg-gray-100 text-gray-600', icone: '•' }

  async function alterar(novoStatus) {
    setSalvando(true)
    try {
      await api.patch(`/sala-maker/agendamentos/${ag.id}/status`, {
        status: novoStatus,
        justificativa_recusa: justificativa || undefined,
      })
      setModal(null)
      onAtualizado()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao alterar agendamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Linha principal */}
      <div className="flex items-center gap-4 p-4">
        {/* Data */}
        <div className="flex-shrink-0 w-14 text-center bg-gray-50 rounded-lg py-2">
          <p className="text-xs text-gray-400">
            {new Date(ag.data_agendamento + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
          </p>
          <p className="text-xl font-bold text-textMain leading-tight">
            {new Date(ag.data_agendamento + 'T12:00').getDate()}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(ag.data_agendamento + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' })}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-textMain truncate">{ag.nome_projeto}</p>
          <p className="text-sm text-gray-400">
            {ag.hora_inicio}–{ag.hora_fim} · {ag.responsavel_nome} · 👥 {ag.num_participantes}
          </p>
          {ag.equipamentos_json?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ag.equipamentos_json.map(e => (
                <span key={e.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{e.label}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.bg}`}>
            {status.icone} {ag.status}
          </span>
          <button onClick={() => setExpandido(!expandido)}
            className="text-gray-400 hover:text-gray-600 w-6 text-lg">
            {expandido ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {ag.descricao_projeto && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Descrição</p>
              <p className="text-sm text-gray-700">{ag.descricao_projeto}</p>
            </div>
          )}

          {ag.materiais_json?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Materiais</p>
              <div className="flex flex-wrap gap-1">
                {ag.materiais_json.map((m, i) => (
                  <span key={i} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">
                    {m.material} — {m.quantidade} {m.unidade}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ag.disciplinas_json?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Disciplinas</p>
              <div className="flex flex-wrap gap-1">
                {ag.disciplinas_json.map(d => (
                  <span key={d} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{d}</span>
                ))}
              </div>
            </div>
          )}

          {ag.justificativa_recusa && (
            <p className="text-sm text-red-600">❌ Recusa: {ag.justificativa_recusa}</p>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2 pt-1">
            {isAdmin && ag.status === 'pendente' && (
              <>
                <button onClick={() => alterar('aprovado')} disabled={salvando}
                  className="btn-secondary text-sm px-4 py-1.5 disabled:opacity-50">
                  ✅ Aprovar
                </button>
                <button onClick={() => setModal('recusar')} disabled={salvando}
                  className="btn-danger text-sm px-4 py-1.5 disabled:opacity-50">
                  ❌ Recusar
                </button>
              </>
            )}
            {isAdmin && ag.status === 'aprovado' && (
              <button onClick={() => alterar('concluido')} disabled={salvando}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">
                🎉 Marcar Concluído
              </button>
            )}
            {(ehDono || isAdmin) && ['pendente', 'aprovado'].includes(ag.status) && (
              <button onClick={() => alterar('cancelado')} disabled={salvando}
                className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 px-4 py-1.5 rounded-lg transition-colors">
                Cancelar
              </button>
            )}
          </div>

          {/* Modal de justificativa de recusa */}
          {modal === 'recusar' && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="label">Justificativa (opcional)</label>
              <input className="input-field text-sm mb-3" placeholder="Motivo da recusa…"
                     value={justificativa}
                     onChange={e => setJustificativa(e.target.value)} />
              <div className="flex gap-2">
                <button disabled={salvando} onClick={() => alterar('recusado')}
                  className="btn-danger text-sm disabled:opacity-50">
                  {salvando ? '…' : '❌ Confirmar recusa'}
                </button>
                <button onClick={() => setModal(null)} className="text-sm text-gray-500 px-3">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente auxiliar ───────────────────────────────────

function SecaoForm({ titulo, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100">
        {titulo}
      </h3>
      {children}
    </div>
  )
}
