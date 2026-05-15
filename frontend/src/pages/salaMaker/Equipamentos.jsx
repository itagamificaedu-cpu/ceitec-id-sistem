// ============================================================
// ABA 6 — EQUIPAMENTOS E MANUTENÇÃO
// CRUD de equipamentos + registro e acompanhamento de manutenções.
// Inclui painel de configurações gerais da Sala Maker (só admin).
// ============================================================

import React, { useEffect, useState } from 'react'
import api from '../../api'

// Status badge de equipamento
const COR_STATUS_EQ = {
  disponivel:  'bg-green-100 text-green-700 border-green-200',
  em_uso:      'bg-blue-100 text-blue-700 border-blue-200',
  manutencao:  'bg-red-100 text-red-700 border-red-200',
  reservado:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  indisponivel:'bg-gray-100 text-gray-500 border-gray-200',
}
const LABEL_STATUS_EQ = {
  disponivel:   '✅ Disponível',
  em_uso:       '🔵 Em Uso',
  manutencao:   '🔧 Manutenção',
  reservado:    '🟡 Reservado',
  indisponivel: '⚫ Indisponível',
}

// Categorias padrão
const CATEGORIAS = [
  'Impressão 3D', 'Corte a Laser', 'Eletrônica', 'Robótica',
  'Ferramentas', 'Computadores', 'Audio/Video', 'Outros',
]

// Sub-abas do módulo Equipamentos
const ABAS = [
  { key: 'lista',        label: '📦 Equipamentos'   },
  { key: 'manutencoes',  label: '🔧 Manutenções'    },
  { key: 'configuracoes',label: '⚙️ Configurações'  },
]

export default function Equipamentos({ config, usuario, onConfigAtualizada }) {
  const [abaAtiva, setAbaAtiva] = useState('lista')
  const isAdmin = usuario.perfil === 'admin'

  return (
    <div className="space-y-5">

      {/* Sub-navegação */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {ABAS
          .filter(a => a.key !== 'configuracoes' || isAdmin) // Configurações só para admin
          .map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${abaAtiva === key
                  ? 'border-primary text-primary bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-textMain hover:border-gray-300'}`}
            >
              {label}
            </button>
          ))}
      </div>

      {abaAtiva === 'lista'         && <ListaEquipamentos isAdmin={isAdmin} />}
      {abaAtiva === 'manutencoes'   && <GestaoManutencoes isAdmin={isAdmin} />}
      {abaAtiva === 'configuracoes' && isAdmin && (
        <Configuracoes config={config} onConfigAtualizada={onConfigAtualizada} />
      )}
    </div>
  )
}

// ============================================================
// LISTA DE EQUIPAMENTOS
// ============================================================
function ListaEquipamentos({ isAdmin }) {
  const [equipamentos, setEquipamentos] = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busca, setBusca]               = useState('')
  const [modalAberto, setModalAberto]   = useState(false)
  const [editando, setEditando]         = useState(null)   // null = novo, objeto = editar
  const [confirmExcluir, setConfirmExcluir] = useState(null)

  function carregar() {
    setCarregando(true)
    api.get('/sala-maker/equipamentos')
      .then(({ data }) => setEquipamentos(data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  // Filtragem local
  const lista = equipamentos.filter(e => {
    if (filtroStatus    && e.status    !== filtroStatus)    return false
    if (filtroCategoria && e.categoria !== filtroCategoria) return false
    if (busca && !e.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  // Contagens por status
  const contagens = equipamentos.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  async function excluir(id) {
    try {
      await api.delete(`/sala-maker/equipamentos/${id}`)
      setConfirmExcluir(null)
      carregar()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-4">

      {/* Cards de status */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(LABEL_STATUS_EQ).map(([st, label]) => (
          <button
            key={st}
            onClick={() => setFiltroStatus(filtroStatus === st ? '' : st)}
            className={`rounded-xl p-3 border-2 text-left transition-all
              ${filtroStatus === st ? 'border-primary shadow-md' : 'border-transparent bg-white shadow-sm hover:shadow'}`}
          >
            <p className={`text-xs px-2 py-0.5 rounded-full border inline-block mb-1 font-medium ${COR_STATUS_EQ[st]}`}>
              {label}
            </p>
            <p className="text-2xl font-bold text-textMain">{contagens[st] || 0}</p>
          </button>
        ))}
      </div>

      {/* Barra de filtros + botão adicionar */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="label">Buscar</label>
            <input
              className="input-field"
              placeholder="Nome do equipamento…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <label className="label">Categoria</label>
            <select className="input-field" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditando(null); setModalAberto(true) }}
              className="btn-primary whitespace-nowrap"
            >
              + Novo Equipamento
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-sm">Nenhum equipamento encontrado.</p>
          {isAdmin && <p className="text-xs mt-1">Clique em "+ Novo Equipamento" para adicionar.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold">Equipamento</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold">Categoria</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold">Qtd</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold hidden md:table-cell">Localização</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wide font-semibold">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lista.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-textMain">{eq.nome}</p>
                      {eq.modelo && <p className="text-xs text-gray-400">{eq.modelo}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.categoria || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COR_STATUS_EQ[eq.status] || 'bg-gray-100 text-gray-500'}`}>
                        {LABEL_STATUS_EQ[eq.status] || eq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.quantidade ?? 1}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{eq.localizacao || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => { setEditando(eq); setModalAberto(true) }}
                          className="text-xs text-primary hover:underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmExcluir(eq)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de formulário */}
      {modalAberto && (
        <ModalEquipamento
          inicial={editando}
          onSalvo={() => { setModalAberto(false); carregar() }}
          onFechar={() => setModalAberto(false)}
        />
      )}

      {/* Confirm excluir */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <p className="font-bold text-textMain mb-1">Excluir equipamento?</p>
            <p className="text-sm text-gray-500 mb-5">"{confirmExcluir.nome}" será removido permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExcluir(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => excluir(confirmExcluir.id)} className="btn-danger flex-1">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Modal de criação/edição de equipamento
function ModalEquipamento({ inicial, onSalvo, onFechar }) {
  const [form, setForm] = useState({
    nome:        inicial?.nome        || '',
    modelo:      inicial?.modelo      || '',
    categoria:   inicial?.categoria   || '',
    status:      inicial?.status      || 'disponivel',
    quantidade:  inicial?.quantidade  ?? 1,
    localizacao: inicial?.localizacao || '',
    descricao:   inicial?.descricao   || '',
    numero_serie:inicial?.numero_serie|| '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      if (inicial) {
        await api.put(`/sala-maker/equipamentos/${inicial.id}`, form)
      } else {
        await api.post('/sala-maker/equipamentos', form)
      }
      onSalvo()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-textMain">{inicial ? '✏️ Editar Equipamento' : '+ Novo Equipamento'}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome *</label>
              <input className="input-field" value={form.nome} onChange={e => atualizar('nome', e.target.value)} required />
            </div>
            <div>
              <label className="label">Modelo / Marca</label>
              <input className="input-field" value={form.modelo} onChange={e => atualizar('modelo', e.target.value)} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input-field" value={form.categoria} onChange={e => atualizar('categoria', e.target.value)}>
                <option value="">— Selecione —</option>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => atualizar('status', e.target.value)}>
                {Object.entries(LABEL_STATUS_EQ).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantidade</label>
              <input
                type="number" min="1"
                className="input-field"
                value={form.quantidade}
                onChange={e => atualizar('quantidade', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Localização</label>
              <input className="input-field" placeholder="Ex: Bancada 3, Armário A…" value={form.localizacao} onChange={e => atualizar('localizacao', e.target.value)} />
            </div>
            <div>
              <label className="label">Número de série / Patrimônio</label>
              <input className="input-field" value={form.numero_serie} onChange={e => atualizar('numero_serie', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição / Observações</label>
              <textarea className="input-field resize-none" rows={3} value={form.descricao} onChange={e => atualizar('descricao', e.target.value)} />
            </div>
          </div>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFechar} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-50">
              {salvando ? 'Salvando…' : inicial ? 'Salvar alterações' : '+ Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// GESTÃO DE MANUTENÇÕES
// ============================================================
function GestaoManutencoes({ isAdmin }) {
  const [manutencoes, setManutencoes]   = useState([])
  const [equipamentos, setEquipamentos] = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [filtro, setFiltro]             = useState('aberta')  // aberta | concluida | todas
  const [modalAberto, setModalAberto]   = useState(false)
  const [concluindoId, setConcluindoId] = useState(null)

  function carregar() {
    setCarregando(true)
    Promise.all([
      api.get('/sala-maker/manutencoes'),
      api.get('/sala-maker/equipamentos'),
    ])
      .then(([{ data: m }, { data: e }]) => {
        setManutencoes(m)
        setEquipamentos(e)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  const lista = manutencoes.filter(m => {
    if (filtro === 'aberta')   return m.status === 'aberta'
    if (filtro === 'concluida') return m.status === 'concluida'
    return true
  })

  async function concluir(id, observacao) {
    try {
      await api.patch(`/sala-maker/manutencoes/${id}/concluir`, { observacao_conclusao: observacao })
      setConcluindoId(null)
      carregar()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao concluir manutenção.')
    }
  }

  return (
    <div className="space-y-4">

      {/* Filtros + botão novo */}
      <div className="flex items-center gap-3 flex-wrap">
        {['aberta', 'concluida', 'todas'].map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors border
              ${filtro === f
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {f === 'aberta' ? '🔴 Abertas' : f === 'concluida' ? '✅ Concluídas' : 'Todas'}
            {' '}
            <span className="opacity-70">
              ({manutencoes.filter(m => f === 'todas' ? true : m.status === f).length})
            </span>
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setModalAberto(true)}
            className="btn-primary ml-auto whitespace-nowrap"
          >
            + Registrar Manutenção
          </button>
        )}
      </div>

      {carregando ? <Carregando /> : lista.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <p className="text-3xl mb-2">🔧</p>
          <p className="text-sm">Nenhuma manutenção {filtro === 'aberta' ? 'aberta' : filtro === 'concluida' ? 'concluída' : ''} registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(m => (
            <div
              key={m.id}
              className={`bg-white rounded-xl shadow-sm border-l-4 p-5
                ${m.status === 'aberta' ? 'border-red-400' : 'border-green-400'}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border
                      ${m.status === 'aberta' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                      {m.status === 'aberta' ? '🔴 Aberta' : '✅ Concluída'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(m.aberta_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="font-bold text-textMain">{m.equipamento_nome}</p>
                  <p className="text-sm text-gray-600 mt-1">{m.descricao_problema}</p>
                  {m.tipo_manutencao && (
                    <p className="text-xs text-gray-400 mt-1">Tipo: {m.tipo_manutencao}</p>
                  )}
                  {m.tecnico_responsavel && (
                    <p className="text-xs text-gray-400">Técnico: {m.tecnico_responsavel}</p>
                  )}
                  {m.observacao_conclusao && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">
                      <span className="font-medium">Conclusão:</span> {m.observacao_conclusao}
                    </p>
                  )}
                  {m.concluida_em && (
                    <p className="text-xs text-gray-400 mt-1">
                      Concluída em {new Date(m.concluida_em).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                {isAdmin && m.status === 'aberta' && (
                  <button
                    onClick={() => setConcluindoId(m.id)}
                    className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0"
                  >
                    ✅ Marcar como Concluída
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova manutenção */}
      {modalAberto && (
        <ModalManutencao
          equipamentos={equipamentos}
          onSalvo={() => { setModalAberto(false); carregar() }}
          onFechar={() => setModalAberto(false)}
        />
      )}

      {/* Modal concluir */}
      {concluindoId && (
        <ModalConcluir
          onConfirmar={(obs) => concluir(concluindoId, obs)}
          onFechar={() => setConcluindoId(null)}
        />
      )}
    </div>
  )
}

// Modal de registro de manutenção
function ModalManutencao({ equipamentos, onSalvo, onFechar }) {
  const [form, setForm] = useState({
    equipamento_id:    '',
    descricao_problema:'',
    tipo_manutencao:   'corretiva',
    tecnico_responsavel: '',
    custo_estimado:    '',
    observacoes:       '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.equipamento_id) { setErro('Selecione um equipamento.'); return }
    if (!form.descricao_problema.trim()) { setErro('Descreva o problema.'); return }
    setSalvando(true)
    setErro('')
    try {
      await api.post('/sala-maker/manutencoes', form)
      onSalvo()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao registrar manutenção.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-textMain">🔧 Registrar Manutenção</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-4">
          <div>
            <label className="label">Equipamento *</label>
            <select className="input-field" value={form.equipamento_id} onChange={e => atualizar('equipamento_id', e.target.value)} required>
              <option value="">— Selecione —</option>
              {equipamentos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome} {eq.modelo ? `(${eq.modelo})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de Manutenção</label>
            <select className="input-field" value={form.tipo_manutencao} onChange={e => atualizar('tipo_manutencao', e.target.value)}>
              <option value="corretiva">Corretiva (quebrou)</option>
              <option value="preventiva">Preventiva (revisão programada)</option>
              <option value="calibragem">Calibragem</option>
              <option value="limpeza">Limpeza</option>
              <option value="troca_peca">Troca de peça</option>
            </select>
          </div>
          <div>
            <label className="label">Descrição do problema *</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Descreva o que ocorreu com o equipamento…"
              value={form.descricao_problema}
              onChange={e => atualizar('descricao_problema', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Técnico responsável</label>
              <input className="input-field" value={form.tecnico_responsavel} onChange={e => atualizar('tecnico_responsavel', e.target.value)} placeholder="Nome do técnico" />
            </div>
            <div>
              <label className="label">Custo estimado (R$)</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.custo_estimado} onChange={e => atualizar('custo_estimado', e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input-field resize-none" rows={2} value={form.observacoes} onChange={e => atualizar('observacoes', e.target.value)} />
          </div>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFechar} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary flex-1 disabled:opacity-50">
              {salvando ? 'Registrando…' : '🔧 Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para concluir manutenção
function ModalConcluir({ onConfirmar, onFechar }) {
  const [obs, setObs] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-bold text-textMain">✅ Concluir Manutenção</h2>
        <div>
          <label className="label">Observação da conclusão (opcional)</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="O que foi feito, peças trocadas, etc."
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onFechar} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => onConfirmar(obs)} className="btn-primary flex-1">Confirmar</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CONFIGURAÇÕES DA SALA MAKER (somente admin)
// ============================================================
function Configuracoes({ config, onConfigAtualizada }) {
  const [form, setForm] = useState({
    nome_sala:    config?.nome_sala    || 'Sala Maker',
    descricao:    config?.descricao    || '',
    responsavel:  config?.responsavel  || '',
    capacidade:   config?.capacidade   || 30,
    regulamento:  config?.regulamento  || '',
    ativa:        config?.ativa        ?? 1,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')
  const [sucesso, setSucesso]   = useState('')

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso('')
    try {
      const { data } = await api.put('/sala-maker/config', form)
      onConfigAtualizada(data)
      setSucesso('Configurações salvas com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar configurações.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-primary px-6 py-4">
          <h2 className="text-white font-bold">⚙️ Configurações da Sala Maker</h2>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-5">
          {/* Status ativo/inativo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="font-semibold text-textMain text-sm">Módulo Ativo</p>
              <p className="text-xs text-gray-500">Desativar oculta a Sala Maker para todos os usuários</p>
            </div>
            <button
              type="button"
              onClick={() => atualizar('ativa', form.ativa ? 0 : 1)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${form.ativa ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
                ${form.ativa ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome da Sala</label>
              <input
                className="input-field"
                value={form.nome_sala}
                onChange={e => atualizar('nome_sala', e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição / Subtítulo</label>
              <input
                className="input-field"
                placeholder="Ex: Espaço de prototipagem e inovação tecnológica"
                value={form.descricao}
                onChange={e => atualizar('descricao', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Responsável / Coordenador</label>
              <input
                className="input-field"
                value={form.responsavel}
                onChange={e => atualizar('responsavel', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Capacidade (pessoas)</label>
              <input
                type="number" min="1"
                className="input-field"
                value={form.capacidade}
                onChange={e => atualizar('capacidade', Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Regulamento de Uso</label>
              <textarea
                className="input-field resize-none"
                rows={6}
                placeholder="Regras e normas de uso da Sala Maker que serão exibidas no formulário de inscrição…"
                value={form.regulamento}
                onChange={e => atualizar('regulamento', e.target.value)}
              />
            </div>
          </div>

          {erro    && <p className="text-red-600  text-sm bg-red-50  rounded-lg px-4 py-2">{erro}</p>}
          {sucesso && <p className="text-green-700 text-sm bg-green-50 rounded-lg px-4 py-2">{sucesso}</p>}

          <button type="submit" disabled={salvando} className="btn-primary w-full disabled:opacity-50">
            {salvando ? 'Salvando…' : '💾 Salvar Configurações'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────
function Carregando() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⚙️</div>
        <p>Carregando…</p>
      </div>
    </div>
  )
}
