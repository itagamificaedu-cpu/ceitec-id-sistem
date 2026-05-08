import React, { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../../api'

const LETRAS = ['A', 'B', 'C', 'D']
const CORES = ['#e21b3c', '#1368ce', '#d89e00', '#2e7d32']
const EMOJIS_CORRETO = ['🎉', '🔥', '💪', '🚀', '⭐', '🏆']
const EMOJIS_ERRADO = ['😬', '😅', '💀', '🤦', '😭']

export default function JogarQuiz() {
  const { codigo } = useParams()
  const [searchParams] = useSearchParams()

  const [etapa, setEtapa] = useState('nome')   // nome | carregando | jogando | resultado
  const [nome, setNome] = useState('')
  const [codigoCarteirinha, setCodigoCarteirinha] = useState(() => searchParams.get('aluno') || '')
  const [quiz, setQuiz] = useState(null)
  const [questoes, setQuestoes] = useState([])
  const [erro, setErro] = useState('')

  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState([])
  const [respondeu, setRespondeu] = useState(false)
  const [escolhida, setEscolhida] = useState(null)
  const [tempo, setTempo] = useState(30)
  const [acertos, setAcertos] = useState(0)

  const [resultado, setResultado] = useState(null)
  const [xpGanho, setXpGanho] = useState(0)

  const timerRef = useRef(null)
  const tempoInicioRef = useRef(null)
  const respostasRef = useRef([])  // ref para evitar stale closure

  // Carrega quiz ao entrar
  async function iniciar() {
    if (!nome.trim()) return setErro('Digite seu nome para começar!')
    setErro('')
    setEtapa('carregando')
    try {
      const { data } = await api.get(`/quiz/jogar/${codigo}`)
      setQuiz(data)
      setQuestoes(data.questoes || [])
      setTempo(data.tempo_por_questao || 30)
      tempoInicioRef.current = Date.now()
      setEtapa('jogando')
    } catch {
      setErro('Quiz não encontrado ou link inválido.')
      setEtapa('nome')
    }
  }

  // Timer por questão
  useEffect(() => {
    if (etapa !== 'jogando' || respondeu) return
    const totalTempo = quiz?.tempo_por_questao || 30
    setTempo(totalTempo)

    timerRef.current = setInterval(() => {
      setTempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          if (!respondeu) {
            responderSemSelecao()
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [indice, etapa])

  function responderSemSelecao() {
    setRespondeu(true)
    setEscolhida(null)
    const nova = { questao_id: questoes[indice].id, resposta: -1 }
    respostasRef.current = [...respostasRef.current, nova]
    setRespostas(respostasRef.current)
    agendar()
  }

  function responder(altIdx) {
    if (respondeu) return
    setRespondeu(true)
    clearInterval(timerRef.current)
    setEscolhida(altIdx)

    const q = questoes[indice]
    const correta = altIdx === q.resposta_correta
    if (correta) setAcertos(a => a + 1)

    const nova = { questao_id: q.id, resposta: altIdx }
    respostasRef.current = [...respostasRef.current, nova]
    setRespostas(respostasRef.current)
    agendar()
  }

  function agendar() {
    setTimeout(() => {
      const proximo = indice + 1
      if (proximo >= questoes.length) {
        finalizarQuiz()
      } else {
        setIndice(proximo)
        setRespondeu(false)
        setEscolhida(null)
      }
    }, 2000)
  }

  async function finalizarQuiz() {
    const tempoDecorrido = Math.round((Date.now() - tempoInicioRef.current) / 1000)
    setEtapa('enviando')
    try {
      const { data } = await api.post(`/quiz/jogar/${codigo}/responder`, {
        aluno_nome: nome,
        aluno_codigo: codigoCarteirinha.trim().toUpperCase() || undefined,
        respostas: respostasRef.current,
        tempo_total: tempoDecorrido,
      })
      setResultado(data)
      setAcertos(data.acertos)
      setXpGanho(data.xp_ganho || 0)
      setEtapa('resultado')
    } catch {
      setEtapa('resultado')
    }
  }

  // ─── TELAS ─────────────────────────────────────────────────────────────────

  if (etapa === 'nome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-black text-white mb-1">Quiz</h1>
          <p className="text-white/70 text-sm mb-6">Código: <span className="font-black text-yellow-300 tracking-widest">{codigo?.toUpperCase()}</span></p>

          {erro && <p className="text-red-300 text-sm mb-3 font-medium">{erro}</p>}

          <input
            className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 font-medium text-center text-lg outline-none focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/30 mb-3"
            placeholder="Seu nome ou apelido"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && iniciar()}
            maxLength={40}
          />

          <input
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 font-medium text-center text-sm outline-none focus:border-yellow-300/50 mb-1 tracking-widest"
            placeholder="Código da carteirinha (opcional)"
            value={codigoCarteirinha}
            onChange={e => setCodigoCarteirinha(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && iniciar()}
            maxLength={20}
          />
          <p className="text-white/30 text-xs mb-4 text-center">⚡ Informe seu código para ganhar XP</p>

          <button
            onClick={iniciar}
            className="w-full py-4 rounded-2xl font-black text-lg text-purple-800 bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg"
          >
            ▶ Entrar no Quiz!
          </button>
        </div>
      </div>
    )
  }

  if (etapa === 'carregando' || etapa === 'enviando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800">
        <div className="text-center text-white">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="font-bold text-xl">{etapa === 'enviando' ? 'Calculando resultado...' : 'Carregando quiz...'}</p>
        </div>
      </div>
    )
  }

  if (etapa === 'resultado') {
    const total = questoes.length
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '😊' : pct >= 40 ? '😐' : '😢'
    const mensagem = pct === 100 ? 'Perfeito! Mandou muito!' : pct >= 80 ? 'Ótimo resultado!' : pct >= 60 ? 'Bom trabalho!' : pct >= 40 ? 'Continue praticando!' : 'Pode melhorar!'

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="text-7xl mb-2">{emoji}</div>
          <p className="text-gray-500 font-medium mb-1">{nome}</p>
          <div className="text-6xl font-black text-gray-900 mb-1">{pct}%</div>
          <p className="text-gray-500 text-sm mb-1">{acertos} de {total} corretas</p>
          <p className="text-lg font-bold text-gray-700 mb-6">{mensagem}</p>

          {/* Barra de progresso */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
            <div
              className="h-3 rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>

          {xpGanho > 0 && (
            <div className="mb-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 text-center">
              <p className="font-black text-gray-900 text-lg">⚡ +{xpGanho} XP ganhos!</p>
              <p className="text-gray-800 text-xs font-medium">Adicionados à sua carteirinha</p>
            </div>
          )}

          <button
            onClick={() => { setEtapa('nome'); setNome(''); setCodigoCarteirinha(''); setIndice(0); setRespostas([]); respostasRef.current = []; setAcertos(0); setEscolhida(null); setRespondeu(false); setXpGanho(0) }}
            className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 mb-2"
          >
            🔄 Jogar de novo
          </button>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
            className="w-full py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
          >
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  // ─── TELA DE JOGO ──────────────────────────────────────────────────────────

  const q = questoes[indice]
  const totalTempo = quiz?.tempo_por_questao || 30
  const pctTimer = (tempo / totalTempo) * 100
  const urgente = tempo <= 5

  const getAlts = q => [q.alt_a, q.alt_b, q.alt_c, q.alt_d].filter(Boolean)
  const alts = getAlts(q)

  function statusBotao(aIdx) {
    if (!respondeu) return 'normal'
    if (aIdx === q.resposta_correta) return 'correta'
    if (aIdx === escolhida && escolhida !== q.resposta_correta) return 'errada'
    return 'neutra'
  }

  const emojisFeedback = respondeu
    ? (escolhida === q.resposta_correta
        ? EMOJIS_CORRETO[Math.floor(Math.random() * EMOJIS_CORRETO.length)]
        : EMOJIS_ERRADO[Math.floor(Math.random() * EMOJIS_ERRADO.length)])
    : null

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header: progresso + timer */}
      <div className="bg-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2 text-sm text-white/70 font-medium">
            <span>Pergunta {indice + 1} / {questoes.length}</span>
            <span
              className={`font-black text-xl tabular-nums ${urgente ? 'text-red-400 animate-pulse' : 'text-white'}`}
            >{tempo}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pctTimer}%`,
                background: urgente ? '#ef4444' : 'linear-gradient(90deg, #00d68f, #22d3ee)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Pergunta */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <div className="w-full max-w-2xl bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-2">PERGUNTA {indice + 1}</p>
          <p className="text-white text-xl font-bold leading-snug">{q.enunciado}</p>
        </div>

        {/* Feedback pós-resposta */}
        {respondeu && (
          <div className="text-center animate-bounce">
            <div className="text-4xl">{escolhida === q.resposta_correta ? '🎉' : '😬'}</div>
            <p className={`font-black text-lg mt-1 ${escolhida === q.resposta_correta ? 'text-green-400' : 'text-red-400'}`}>
              {escolhida === q.resposta_correta ? 'Correto!' : 'Errou!'}
            </p>
            {escolhida !== q.resposta_correta && (
              <p className="text-white/60 text-sm">
                Resposta correta: <strong className="text-green-400">{LETRAS[q.resposta_correta]}</strong>
              </p>
            )}
          </div>
        )}

        {/* Alternativas */}
        <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
          {alts.map((alt, aIdx) => {
            const st = statusBotao(aIdx)
            let opacity = 'opacity-100'
            let ring = ''
            if (respondeu) {
              if (st === 'correta') ring = 'ring-4 ring-green-300 scale-105'
              else if (st === 'errada') ring = 'ring-4 ring-red-300'
              else opacity = 'opacity-40'
            }

            return (
              <button
                key={aIdx}
                onClick={() => responder(aIdx)}
                disabled={respondeu}
                className={`
                  flex items-center gap-3 rounded-2xl p-4 text-white font-bold text-sm text-left
                  transition-all duration-200 min-h-[72px]
                  ${opacity} ${ring}
                  ${respondeu ? 'cursor-default' : 'hover:scale-102 active:scale-98 cursor-pointer'}
                `}
                style={{ backgroundColor: CORES[aIdx] }}
              >
                <span className="bg-black/25 rounded-lg w-9 h-9 flex-shrink-0 flex items-center justify-center font-black text-base">
                  {LETRAS[aIdx]}
                </span>
                <span className="flex-1 leading-tight">{alt}</span>
              </button>
            )
          })}
        </div>

        {/* Info do jogador */}
        <div className="text-white/40 text-xs font-medium">
          {nome} • {acertos} acerto{acertos !== 1 ? 's' : ''} até agora
        </div>
      </div>
    </div>
  )
}
