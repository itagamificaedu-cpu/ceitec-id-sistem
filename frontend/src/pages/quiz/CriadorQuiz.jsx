import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const LETRAS = ['A', 'B', 'C', 'D']
const CORES_ALT = [
  'bg-red-500 hover:bg-red-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
]
const CORES_BORDA = [
  'border-red-300 focus:border-red-500',
  'border-blue-300 focus:border-blue-500',
  'border-yellow-300 focus:border-yellow-500',
  'border-green-300 focus:border-green-500',
]

const TEMPOS = [10, 15, 20, 30, 45, 60, 90, 120]

function questaoVazia() {
  return { enunciado: '', alt_a: '', alt_b: '', alt_c: '', alt_d: '', resposta_correta: 0 }
}

export default function CriadorQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [form, setForm] = useState({ titulo: '', descricao: '', tempo_por_questao: 30 })
  const [questoes, setQuestoes] = useState([questaoVazia()])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [questaoAtiva, setQuestaoAtiva] = useState(0)

  // IA
  const [iaAberto, setIaAberto] = useState(false)
  const [iaTema, setIaTema] = useState('')
  const [iaNivel, setIaNivel] = useState('médio')
  const [iaQtd, setIaQtd] = useState(5)
  const [iaGerando, setIaGerando] = useState(false)
  const [iaErro, setIaErro] = useState('')

  useEffect(() => {
    if (editando) {
      api.get(`/quiz/${id}`).then(({ data }) => {
        setForm({
          titulo: data.titulo || '',
          descricao: data.descricao || '',
          tempo_por_questao: data.tempo_por_questao || 30,
        })
        if (data.questoes && data.questoes.length > 0) {
          setQuestoes(data.questoes.map(q => ({
            enunciado: q.enunciado || '',
            alt_a: q.alt_a || '',
            alt_b: q.alt_b || '',
            alt_c: q.alt_c || '',
            alt_d: q.alt_d || '',
            resposta_correta: q.resposta_correta ?? 0,
          })))
          setQuestaoAtiva(0)
        }
      })
    }
  }, [id])

  function addQuestao() {
    setQuestoes(q => [...q, questaoVazia()])
    setQuestaoAtiva(questoes.length)
  }

  function removeQuestao(idx) {
    if (questoes.length <= 1) return
    const nova = questoes.filter((_, i) => i !== idx)
    setQuestoes(nova)
    setQuestaoAtiva(Math.min(questaoAtiva, nova.length - 1))
  }

  function updateQ(idx, campo, valor) {
    setQuestoes(qs => qs.map((q, i) => i === idx ? { ...q, [campo]: valor } : q))
  }

  function getAlts(q) {
    return [q.alt_a, q.alt_b, q.alt_c, q.alt_d]
  }

  function setAlt(idx, altIdx, valor) {
    const campos = ['alt_a', 'alt_b', 'alt_c', 'alt_d']
    updateQ(idx, campos[altIdx], valor)
  }

  async function gerarComIA() {
    if (!iaTema.trim()) return setIaErro('Informe o tema das questões.')
    setIaErro('')
    setIaGerando(true)
    try {
      const { data } = await api.post('/ia/questoes', { tema: iaTema, nivel: iaNivel, quantidade: iaQtd })
      const novas = data.questoes.map(q => ({
        enunciado: q.enunciado || '',
        alt_a: q.alternativas?.[0] || '',
        alt_b: q.alternativas?.[1] || '',
        alt_c: q.alternativas?.[2] || '',
        alt_d: q.alternativas?.[3] || '',
        resposta_correta: q.resposta_correta ?? 0,
      }))
      setQuestoes(prev => {
        const semVazias = prev.filter(q => q.enunciado.trim())
        return [...semVazias, ...novas]
      })
      setQuestaoAtiva(0)
      setIaAberto(false)
      setIaTema('')
    } catch (err) {
      setIaErro(err.response?.data?.erro || 'Erro ao gerar questões. Tente novamente.')
    } finally {
      setIaGerando(false)
    }
  }

  async function salvar() {
    setErro('')
    if (!form.titulo.trim()) return setErro('O título do quiz é obrigatório.')
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i]
      if (!q.enunciado.trim()) return setErro(`A pergunta ${i + 1} está vazia.`)
      if (!q.alt_a.trim() || !q.alt_b.trim()) return setErro(`A pergunta ${i + 1} precisa ter ao menos 2 alternativas (A e B).`)
    }

    setSalvando(true)
    try {
      const payload = { ...form, questoes }
      if (editando) {
        await api.put(`/quiz/${id}`, payload)
      } else {
        await api.post('/quiz', payload)
      }
      navigate('/quiz')
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const qAtual = questoes[questaoAtiva] || questaoVazia()

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to="/quiz" className="text-gray-400 hover:text-gray-600">← Voltar</Link>
              <h1 className="text-xl font-bold text-textMain">
                {editando ? '✏️ Editar Quiz' : '✨ Criar Novo Quiz'}
              </h1>
            </div>
            <button
              onClick={salvar}
              disabled={salvando}
              className="btn-primary text-sm px-6"
            >
              {salvando ? 'Salvando...' : '💾 Salvar Quiz'}
            </button>
          </div>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              ⚠️ {erro}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Coluna esquerda: configurações + lista de questões */}
            <div className="lg:col-span-1 space-y-4">

              {/* Configurações do quiz */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">⚙️ Configurações</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                    <input
                      className="input-field text-sm"
                      placeholder="Ex: Matemática — Frações"
                      value={form.titulo}
                      onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição</label>
                    <textarea
                      className="input-field text-sm resize-none"
                      rows={2}
                      placeholder="Sobre qual assunto é este quiz?"
                      value={form.descricao}
                      onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">⏱️ Tempo por pergunta</label>
                    <select
                      className="input-field text-sm"
                      value={form.tempo_por_questao}
                      onChange={e => setForm(f => ({ ...f, tempo_por_questao: parseInt(e.target.value) }))}
                    >
                      {TEMPOS.map(t => (
                        <option key={t} value={t}>{t} segundos</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista de questões */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  📋 Perguntas ({questoes.length})
                </h3>
                <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
                  {questoes.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestaoAtiva(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                        questaoAtiva === i
                          ? 'bg-primary text-white font-semibold'
                          : 'hover:bg-gray-50 text-gray-700 border border-gray-100'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black ${
                        questaoAtiva === i ? 'bg-white/20' : 'bg-gray-100'
                      }`}>{i + 1}</span>
                      <span className="truncate">
                        {q.enunciado || <span className="opacity-50">Pergunta {i + 1}</span>}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={addQuestao}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  + Adicionar pergunta
                </button>
                <button
                  onClick={() => setIaAberto(true)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  🤖 Gerar com IA
                </button>
              </div>
            </div>

            {/* Coluna direita: editor da questão ativa */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

                {/* Header da questão */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-800">
                    Pergunta {questaoAtiva + 1} de {questoes.length}
                  </h3>
                  <button
                    onClick={() => removeQuestao(questaoAtiva)}
                    disabled={questoes.length <= 1}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
                  >
                    🗑️ Remover
                  </button>
                </div>

                {/* Texto da pergunta */}
                <div className="mb-6">
                  <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">
                    Texto da pergunta *
                  </label>
                  <textarea
                    className="input-field text-base font-medium resize-none"
                    rows={3}
                    placeholder="Digite a pergunta aqui..."
                    value={qAtual.enunciado}
                    onChange={e => updateQ(questaoAtiva, 'enunciado', e.target.value)}
                  />
                </div>

                {/* Alternativas */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    Alternativas — marque a correta ✓
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAlts(qAtual).map((alt, aIdx) => (
                      <div
                        key={aIdx}
                        className={`relative rounded-xl border-2 transition-all ${
                          qAtual.resposta_correta === aIdx
                            ? 'border-green-400 bg-green-50 ring-2 ring-green-300'
                            : CORES_BORDA[aIdx] + ' bg-white'
                        }`}
                      >
                        {/* Letra colorida */}
                        <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm ${CORES_ALT[aIdx].split(' ')[0]}`}>
                          {LETRAS[aIdx]}
                        </div>

                        {/* Input */}
                        <input
                          className="w-full pl-14 pr-10 py-3 bg-transparent text-sm font-medium outline-none"
                          placeholder={`Alternativa ${LETRAS[aIdx]}${aIdx < 2 ? ' *' : ' (opcional)'}`}
                          value={alt || ''}
                          onChange={e => setAlt(questaoAtiva, aIdx, e.target.value)}
                        />

                        {/* Radio de correta */}
                        <button
                          onClick={() => updateQ(questaoAtiva, 'resposta_correta', aIdx)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            qAtual.resposta_correta === aIdx
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                          title="Marcar como correta"
                        >
                          {qAtual.resposta_correta === aIdx && (
                            <span className="text-white text-xs font-black">✓</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Clique no círculo à direita para marcar a alternativa correta
                  </p>
                </div>

                {/* Preview mini */}
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Preview como aluno vê</p>
                  <p className="text-white font-semibold text-sm mb-3">
                    {qAtual.enunciado || 'Sua pergunta aparecerá aqui...'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {getAlts(qAtual).map((alt, aIdx) => alt ? (
                      <div
                        key={aIdx}
                        className={`rounded-lg p-2 flex items-center gap-2 text-white text-xs font-medium ${
                          ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-600'][aIdx]
                        }`}
                      >
                        <span className="bg-black/20 rounded px-1 font-black">{LETRAS[aIdx]}</span>
                        {alt}
                      </div>
                    ) : null)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal IA */}
      {iaAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">🤖 Gerar Questões com IA</h3>
              <button onClick={() => { setIaAberto(false); setIaErro('') }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tema ou assunto *</label>
                <input
                  className="input-field text-sm"
                  placeholder="Ex: Frações, Revolução Francesa, Fotossíntese..."
                  value={iaTema}
                  onChange={e => setIaTema(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && gerarComIA()}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nível</label>
                  <select className="input-field text-sm" value={iaNivel} onChange={e => setIaNivel(e.target.value)}>
                    <option value="fácil">Fácil</option>
                    <option value="médio">Médio</option>
                    <option value="difícil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Quantidade</label>
                  <select className="input-field text-sm" value={iaQtd} onChange={e => setIaQtd(parseInt(e.target.value))}>
                    {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} questões</option>)}
                  </select>
                </div>
              </div>

              {iaErro && <p className="text-red-500 text-sm font-medium">⚠️ {iaErro}</p>}

              <button
                onClick={gerarComIA}
                disabled={iaGerando}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {iaGerando ? '⏳ Gerando questões...' : '✨ Gerar Questões'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                A IA irá criar {iaQtd} questões com 4 alternativas cada
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
