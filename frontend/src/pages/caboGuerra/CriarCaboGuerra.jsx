/**
 * Criar / Editar partida de Cabo de Guerra
 * Professor define título, turma, times e questões
 */

import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const LETRAS = ['A', 'B', 'C', 'D']

function ModalIA({ disciplina, onFechar, onAdicionar }) {
  const [tema, setTema] = useState('')
  const [quantidade, setQuantidade] = useState(5)
  const [nivel, setNivel] = useState('médio')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    if (!tema.trim()) return setErro('Informe o tema das questões')
    setErro('')
    setGerando(true)
    try {
      const { data } = await api.post('/ia/questoes', {
        disciplina: disciplina || 'Geral',
        tema,
        quantidade,
        nivel,
      })
      // Converte formato da IA para o formato do Cabo de Guerra
      const convertidas = (data.questoes || []).map(q => ({
        texto: q.enunciado || q.texto || '',
        alt_a: q.alternativas?.[0] || q.alt_a || '',
        alt_b: q.alternativas?.[1] || q.alt_b || '',
        alt_c: q.alternativas?.[2] || q.alt_c || '',
        alt_d: q.alternativas?.[3] || q.alt_d || '',
        resposta_correta: q.resposta_correta ?? 0,
      }))
      onAdicionar(convertidas)
      onFechar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar questões com IA')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-1">✨ Gerar Questões com IA</h3>
        <p className="text-sm text-gray-500 mb-4">
          A IA vai criar questões de múltipla escolha prontas para o Cabo de Guerra.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Assunto *</label>
            <input
              className="input-field"
              placeholder="Ex: Frações, Revolução Industrial, Sistema Solar..."
              value={tema}
              onChange={e => setTema(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <select className="input-field" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))}>
                {[3,5,8,10].map(n => <option key={n} value={n}>{n} questões</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
              <select className="input-field" value={nivel} onChange={e => setNivel(e.target.value)}>
                <option value="fácil">Fácil</option>
                <option value="médio">Médio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
          </div>
        </div>

        {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm mb-3">⚠️ {erro}</div>}

        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={gerar}
            disabled={gerando}
            className="flex-1 btn-primary text-sm py-2"
          >
            {gerando ? '⏳ Gerando...' : '✨ Gerar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestaoEditor({ questao, idx, onChange, onRemover }) {
  const alts = [questao.alt_a || '', questao.alt_b || '', questao.alt_c || '', questao.alt_d || '']

  function setAlt(i, val) {
    const k = ['alt_a', 'alt_b', 'alt_c', 'alt_d'][i]
    onChange({ ...questao, [k]: val })
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-600">Pergunta {idx + 1}</span>
        <button onClick={onRemover} className="text-red-400 hover:text-red-600 text-sm">🗑️ Remover</button>
      </div>

      <textarea
        className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-3 resize-none"
        rows={2}
        placeholder="Texto da pergunta..."
        value={questao.texto || ''}
        onChange={e => onChange({ ...questao, texto: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {alts.map((alt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...questao, resposta_correta: i })}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: questao.resposta_correta === i ? '#22c55e' : '#e5e7eb',
                color: questao.resposta_correta === i ? '#fff' : '#374151',
                fontWeight: 900, fontSize: 12, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {LETRAS[i]}
            </button>
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              placeholder={`Alternativa ${LETRAS[i]}`}
              value={alt}
              onChange={e => setAlt(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Clique na letra para marcar a resposta correta (verde = correta)
      </p>
    </div>
  )
}

export default function CriarCaboGuerra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [turmas, setTurmas] = useState([])
  const [form, setForm] = useState({
    titulo: '',
    turma_id: '',
    disciplina: '',
    time1_nome: 'Time 1',
    time2_nome: 'Time 2',
    limite_vitoria: 5,
    tempo_por_pergunta: 30,
  })
  const [questoes, setQuestoes] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalIA, setModalIA] = useState(false)

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
    if (editando) {
      api.get(`/cabo-guerra/${id}`).then(({ data }) => {
        setForm({
          titulo: data.titulo,
          turma_id: data.turma_id,
          disciplina: data.disciplina || '',
          time1_nome: data.time1_nome,
          time2_nome: data.time2_nome,
          limite_vitoria: data.limite_vitoria,
          tempo_por_pergunta: data.tempo_por_pergunta,
        })
        try { setQuestoes(JSON.parse(data.questoes_json || '[]')) } catch { setQuestoes([]) }
      })
    }
  }, [id]) // eslint-disable-line

  function adicionarQuestao() {
    setQuestoes(prev => [
      ...prev,
      { texto: '', alt_a: '', alt_b: '', alt_c: '', alt_d: '', resposta_correta: 0 }
    ])
  }

  function atualizarQuestao(idx, nova) {
    setQuestoes(prev => prev.map((q, i) => i === idx ? nova : q))
  }

  function removerQuestao(idx) {
    setQuestoes(prev => prev.filter((_, i) => i !== idx))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.titulo.trim()) return setErro('Informe o título da partida')
    if (!form.turma_id) return setErro('Selecione uma turma')
    if (questoes.length === 0) return setErro('Adicione ao menos uma pergunta')

    // Valida questões
    for (const q of questoes) {
      if (!q.texto?.trim()) return setErro('Todas as perguntas precisam de texto')
      if (!q.alt_a?.trim() || !q.alt_b?.trim()) return setErro('Cada pergunta precisa de ao menos 2 alternativas (A e B)')
    }

    setErro('')
    setSalvando(true)
    try {
      const payload = { ...form, questoes }
      if (editando) {
        await api.put(`/cabo-guerra/${id}`, payload)
      } else {
        await api.post('/cabo-guerra', payload)
      }
      navigate('/cabo-de-guerra')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />

      {modalIA && (
        <ModalIA
          disciplina={form.disciplina}
          onFechar={() => setModalIA(false)}
          onAdicionar={novas => setQuestoes(prev => [...prev, ...novas])}
        />
      )}

      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/cabo-de-guerra')} className="text-gray-400 hover:text-gray-600">←</button>
            <h1 className="text-2xl font-bold text-textMain">
              {editando ? '✏️ Editar Partida' : '🪢 Nova Partida de Cabo de Guerra'}
            </h1>
          </div>

          <form onSubmit={salvar} className="space-y-4">
            {/* Configurações gerais */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Configurações</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título da Partida *</label>
                  <input className="input-field" placeholder="Ex: Copa de Matemática 9A"
                    value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label>
                    <select className="input-field" value={form.turma_id}
                      onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}>
                      <option value="">Selecione...</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                    <input className="input-field" placeholder="Ex: Matemática"
                      value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Time 1 (esquerda)</label>
                    <input className="input-field" value={form.time1_nome}
                      onChange={e => setForm(f => ({ ...f, time1_nome: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Time 2 (direita)</label>
                    <input className="input-field" value={form.time2_nome}
                      onChange={e => setForm(f => ({ ...f, time2_nome: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limite de vitória (passos da corda)
                    </label>
                    <input type="number" className="input-field" min={1} max={10}
                      value={form.limite_vitoria}
                      onChange={e => setForm(f => ({ ...f, limite_vitoria: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segundos por pergunta
                    </label>
                    <input type="number" className="input-field" min={10} max={120}
                      value={form.tempo_por_pergunta}
                      onChange={e => setForm(f => ({ ...f, tempo_por_pergunta: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Perguntas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Perguntas ({questoes.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalIA(true)}
                    className="text-sm px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                  >
                    ✨ Gerar com IA
                  </button>
                  <button type="button" onClick={adicionarQuestao} className="btn-primary text-sm">
                    + Adicionar
                  </button>
                </div>
              </div>

              {questoes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">❓</div>
                  <p className="text-sm">Nenhuma pergunta ainda. Clique em "+ Adicionar Pergunta".</p>
                </div>
              ) : questoes.map((q, i) => (
                <QuestaoEditor
                  key={i}
                  idx={i}
                  questao={q}
                  onChange={nova => atualizarQuestao(i, nova)}
                  onRemover={() => removerQuestao(i)}
                />
              ))}
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                ⚠️ {erro}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate('/cabo-de-guerra')}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className="flex-2 btn-primary py-3 flex-1">
                {salvando ? 'Salvando...' : editando ? '💾 Salvar Alterações' : '✅ Criar Partida'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
