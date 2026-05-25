/**
 * Professor Game — Ranking e perfil de gamificação dos professores
 * XP por ações: login, quiz, avaliação, plano de aula, ocorrência, presença, etc.
 */
import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

const COR_NIVEL = ['', '#6b7280','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#06b6d4','#ec4899']

function barraXP(xp, nivel) {
  const xpInicioNivel = (nivel - 1) * 200
  const xpFimNivel    = nivel * 200
  const pct = Math.min(100, Math.round(((xp - xpInicioNivel) / 200) * 100))
  return pct
}

function corNivel(nivel) {
  return COR_NIVEL[Math.min(nivel, COR_NIVEL.length - 1)] || '#8b5cf6'
}

export default function ProfessorGame() {
  const [ranking, setRanking]     = useState([])
  const [perfil,  setPerfil]      = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba]             = useState('ranking') // ranking | meu-perfil

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [rankRes, perfilRes] = await Promise.all([
          api.get('/prof-game/ranking'),
          api.get('/prof-game/meu-perfil'),
        ])
        setRanking(rankRes.data)
        setPerfil(perfilRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">

          {/* Título */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-2xl shadow-md">🏆</div>
            <div>
              <h1 className="text-2xl font-bold text-textMain">Professor Game</h1>
              <p className="text-gray-500 text-sm">Ganhe XP criando atividades, quizzes, avaliações e mais!</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {[{ id: 'ranking', label: '🏆 Ranking' }, { id: 'meu-perfil', label: '⚡ Meu Perfil' }].map(t => (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={`px-5 py-2 font-semibold text-sm border-b-2 transition-colors ${
                  aba === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {carregando ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── RANKING ─────────────────────────────────────────────────── */}
              {aba === 'ranking' && (
                <div>
                  {/* Pódio top 3 */}
                  {ranking.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 mb-8">
                      {/* 2º lugar */}
                      <PodioCard prof={ranking[1]} posicao={2} />
                      {/* 1º lugar */}
                      <PodioCard prof={ranking[0]} posicao={1} />
                      {/* 3º lugar */}
                      {ranking[2] && <PodioCard prof={ranking[2]} posicao={3} />}
                    </div>
                  )}

                  {/* Lista completa */}
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                      <div className="font-bold text-gray-700">Classificação Geral</div>
                      <div className="text-sm text-gray-400">{ranking.length} professores</div>
                    </div>
                    {ranking.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-2">🎮</div>
                        <div>Nenhum professor registrou XP ainda.</div>
                        <div className="text-sm mt-1">Faça login amanhã para começar a ganhar pontos!</div>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {ranking.map((prof, idx) => (
                          <RankingRow key={prof.usuario_id} prof={prof} idx={idx} meuId={perfil?.usuario_id} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MEU PERFIL ──────────────────────────────────────────────── */}
              {aba === 'meu-perfil' && perfil && (
                <MeuPerfil perfil={perfil} />
              )}
              {aba === 'meu-perfil' && !perfil && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">🎮</div>
                  <p>Você ainda não tem XP registrado.</p>
                  <p className="text-sm mt-1">Continue usando a plataforma para começar!</p>
                </div>
              )}
            </>
          )}

          {/* Tabela de XP */}
          <div className="mt-8 bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3 font-bold text-gray-700">⚡ Como ganhar XP</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-y md:divide-y-0">
              {[
                { icon: '🔐', acao: 'Login diário',          xp: 5  },
                { icon: '🎯', acao: 'Criar quiz',             xp: 15 },
                { icon: '📝', acao: 'Criar avaliação',        xp: 20 },
                { icon: '📚', acao: 'Plano de aula (IA)',     xp: 20 },
                { icon: '✍️', acao: 'Plano de aula (manual)', xp: 25 },
                { icon: '📅', acao: 'Registrar presença',     xp: 10 },
                { icon: '⚠️', acao: 'Registrar ocorrência',   xp: 5  },
                { icon: '📋', acao: 'Corrigir prova',         xp: 25 },
                { icon: '🎮', acao: 'Quiz ao Vivo',           xp: 10 },
                { icon: '📲', acao: 'Scanner Game Aluno',     xp: 2  },
                { icon: '🔥', acao: 'Bônus 7 dias seguidos',  xp: 20 },
              ].map(item => (
                <div key={item.acao} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 text-sm text-gray-700">{item.acao}</div>
                  <div className="font-bold text-yellow-600">+{item.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function PodioCard({ prof, posicao }) {
  const alturas = { 1: 'h-36', 2: 'h-28', 3: 'h-24' }
  const coroas   = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const cor = corNivel(prof.nivel)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-2xl">{coroas[posicao]}</div>
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg"
        style={{ background: cor }}>
        {prof.nome?.charAt(0).toUpperCase()}
      </div>
      <div className="text-xs font-bold text-gray-700 text-center max-w-20 truncate">{prof.nome?.split(' ')[0]}</div>
      <div className="text-xs font-bold" style={{ color: cor }}>{prof.xp_total} XP</div>
      <div className={`w-20 rounded-t-lg ${alturas[posicao]} flex items-end justify-center pb-2`}
        style={{ background: posicao === 1 ? '#fde68a' : posicao === 2 ? '#e5e7eb' : '#fed7aa' }}>
        <span className="text-lg font-black text-gray-600">{posicao}º</span>
      </div>
    </div>
  )
}

function RankingRow({ prof, idx, meuId }) {
  const cor = corNivel(prof.nivel)
  const ehEu = prof.usuario_id === meuId
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${ehEu ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
      <div className="w-8 text-center font-bold text-gray-400 text-sm flex-shrink-0">
        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
        style={{ background: cor }}>
        {prof.nome?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 text-sm flex items-center gap-1">
          {prof.nome}
          {ehEu && <span className="text-xs bg-yellow-200 text-yellow-800 px-1 rounded">você</span>}
        </div>
        <div className="text-xs" style={{ color: cor }}>{prof.nome_nivel}</div>
      </div>
      {prof.streak > 0 && (
        <div className="text-xs text-orange-500 font-bold flex items-center gap-0.5 flex-shrink-0">
          🔥{prof.streak}
        </div>
      )}
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-yellow-600">{prof.xp_total} XP</div>
        <div className="text-xs text-gray-400">Nível {prof.nivel}</div>
      </div>
    </div>
  )
}

function MeuPerfil({ perfil }) {
  const cor = corNivel(perfil.nivel)
  const pct = barraXP(perfil.xp_total || 0, perfil.nivel || 1)

  return (
    <div className="space-y-5">
      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg"
            style={{ background: cor }}>
            {perfil.nome?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-xl text-gray-800">{perfil.nome}</div>
            <div className="font-semibold text-sm" style={{ color: cor }}>{perfil.nome_nivel}</div>
            {perfil.posicao_ranking && (
              <div className="text-xs text-gray-400">#{perfil.posicao_ranking} no ranking</div>
            )}
          </div>
          {perfil.streak > 0 && (
            <div className="ml-auto text-center">
              <div className="text-3xl">🔥</div>
              <div className="text-xs font-bold text-orange-500">{perfil.streak} dias</div>
            </div>
          )}
        </div>

        {/* Barra de XP */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Nível {perfil.nivel}</span>
            <span>{perfil.xp_total} / {perfil.nivel * 200} XP</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: cor }} />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">
            Faltam {perfil.xp_proximo_nivel} XP para o nível {(perfil.nivel || 1) + 1}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'XP Total', value: perfil.xp_total || 0, icon: '⚡' },
            { label: 'Nível',    value: perfil.nivel || 1,    icon: '🎯' },
            { label: 'Streak',   value: `${perfil.streak || 0}d`, icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl">{s.icon}</div>
              <div className="font-bold text-gray-800 text-lg">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      {perfil.historico?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-gray-50 border-b px-5 py-3 font-bold text-gray-700">📋 Últimas atividades</div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {perfil.historico.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{h.descricao}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(h.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <div className="font-bold text-yellow-600 flex-shrink-0">+{h.xp_ganho}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
