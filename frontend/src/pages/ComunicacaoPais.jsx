/**
 * ComunicacaoPais.jsx
 * Envia mensagens (e-mail e/ou WhatsApp) para responsáveis dos alunos.
 */
import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// Ícones de canal
const CANAL_ICONE = { email: '📧', whatsapp: '💬', ambos: '📢' }
const CANAL_COR   = {
  email:    { bg: '#dbeafe', text: '#1d4ed8' },
  whatsapp: { bg: '#dcfce7', text: '#15803d' },
  ambos:    { bg: '#fef3c7', text: '#92400e' },
}

export default function ComunicacaoPais() {
  const [turmas, setTurmas]       = useState([])
  const [turmaSel, setTurmaSel]   = useState('')
  const [titulo, setTitulo]       = useState('')
  const [mensagem, setMensagem]   = useState('')
  const [canal, setCanal]         = useState('ambos')
  const [enviando, setEnviando]   = useState(false)
  const [resultado, setResultado] = useState(null)   // resposta do POST
  const [historico, setHistorico] = useState([])
  const [aba, setAba]             = useState('enviar') // 'enviar' | 'historico'
  const [erro, setErro]           = useState('')

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data)).catch(() => {})
    carregarHistorico()
  }, [])

  function carregarHistorico() {
    api.get('/comunicacao/historico').then(({ data }) => setHistorico(data)).catch(() => {})
  }

  async function enviar() {
    setErro('')
    if (!titulo.trim()) return setErro('Informe o título da mensagem.')
    if (!mensagem.trim()) return setErro('Escreva a mensagem.')
    setEnviando(true)
    setResultado(null)
    try {
      const { data } = await api.post('/comunicacao/enviar', {
        titulo, mensagem, canal,
        turma_id: turmaSel || undefined,
      })
      setResultado(data)
      carregarHistorico()
      setAba('resultado')
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  function novoEnvio() {
    setResultado(null)
    setTitulo('')
    setMensagem('')
    setTurmaSel('')
    setCanal('ambos')
    setErro('')
    setAba('enviar')
  }

  const turmaNome = turmas.find(t => String(t.id) === String(turmaSel))?.nome || 'Todas as turmas'

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textMain">📢 Comunicação com Pais</h1>
            <p className="text-gray-400 text-sm mt-1">
              Envie e-mails e mensagens WhatsApp para responsáveis dos alunos
            </p>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            {[
              { id: 'enviar',    label: '✉️ Nova Mensagem' },
              { id: 'historico', label: '📋 Histórico' },
            ].map(a => (
              <button key={a.id}
                onClick={() => setAba(a.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  aba === a.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{a.label}</button>
            ))}
          </div>

          {/* ── ABA: ENVIAR ─────────────────────────────────────── */}
          {(aba === 'enviar') && (
            <div className="bg-white rounded-xl shadow-md p-6 space-y-5">

              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Turma</label>
                <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)} className="input-field w-full">
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {turmaSel ? `Enviará para responsáveis da turma "${turmaNome}"` : 'Enviará para todos os responsáveis da escola'}
                </p>
              </div>

              {/* Canal */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Canal de envio</label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { v: 'email',    l: '📧 Somente E-mail',    d: 'Envia para o e-mail do responsável' },
                    { v: 'whatsapp', l: '💬 Somente WhatsApp',  d: 'Gera links para abrir no WhatsApp' },
                    { v: 'ambos',    l: '📢 E-mail + WhatsApp', d: 'Ambos os canais' },
                  ].map(opt => (
                    <button key={opt.v}
                      onClick={() => setCanal(opt.v)}
                      title={opt.d}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        canal === opt.v
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >{opt.l}</button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Assunto / Título <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Reunião de pais — Quinta-feira 19h"
                  className="input-field w-full"
                  maxLength={100}
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Mensagem <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  rows={6}
                  placeholder="Escreva a mensagem para os responsáveis..."
                  className="input-field w-full resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{mensagem.length} caracteres</p>
              </div>

              {/* Preview */}
              {titulo && mensagem && (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Prévia da mensagem:</p>
                  <p className="text-sm font-bold text-gray-700">📢 {titulo}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{mensagem}</p>
                </div>
              )}

              {erro && <p className="text-red-500 text-sm">⚠️ {erro}</p>}

              <button
                onClick={enviar}
                disabled={enviando}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {enviando
                  ? <><span className="animate-spin">⏳</span> Enviando...</>
                  : <>🚀 Enviar Mensagem</>
                }
              </button>
            </div>
          )}

          {/* ── ABA: RESULTADO ──────────────────────────────────── */}
          {aba === 'resultado' && resultado && (
            <div className="space-y-4">
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{resultado.total}</p>
                  <p className="text-xs text-gray-400 mt-1">Total de alunos</p>
                </div>
                {(canal === 'email' || canal === 'ambos') && (
                  <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{resultado.enviados_email}</p>
                    <p className="text-xs text-gray-400 mt-1">E-mails enviados</p>
                  </div>
                )}
                {(canal === 'whatsapp' || canal === 'ambos') && (
                  <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{resultado.links_whatsapp?.length || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Links WhatsApp</p>
                  </div>
                )}
              </div>

              {/* Links WhatsApp */}
              {resultado.links_whatsapp?.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h2 className="font-semibold text-textMain mb-1">💬 Links WhatsApp</h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Clique em cada link para abrir a conversa no WhatsApp com a mensagem já preenchida.
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {resultado.links_whatsapp.map((item, i) => (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-green-100 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <span className="text-green-600 text-xl">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{item.aluno}</p>
                          <p className="text-xs text-gray-400">+{item.tel}</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium flex-shrink-0">Abrir ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Erros */}
              {resultado.erros?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-medium text-red-700 mb-2">⚠️ Avisos de envio:</p>
                  {resultado.erros.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}
                </div>
              )}

              <button onClick={novoEnvio} className="btn-secondary w-full">
                ✉️ Enviar Nova Mensagem
              </button>
            </div>
          )}

          {/* ── ABA: HISTÓRICO ──────────────────────────────────── */}
          {aba === 'historico' && (
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="font-semibold text-textMain mb-4">📋 Mensagens Enviadas</h2>
              {historico.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-gray-400">Nenhuma mensagem enviada ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map(c => {
                    const cor = CANAL_COR[c.canal] || CANAL_COR.ambos
                    return (
                      <div key={c.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium text-sm text-textMain truncate">{c.titulo}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                style={{ background: cor.bg, color: cor.text }}>
                                {CANAL_ICONE[c.canal]} {c.canal}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">{c.mensagem}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">
                              {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {c.turma_nome || 'Escola toda'} · {c.total_destinatarios} alunos
                            </p>
                            {c.enviados > 0 && (
                              <p className="text-xs text-blue-600 mt-0.5">{c.enviados} e-mails enviados</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
