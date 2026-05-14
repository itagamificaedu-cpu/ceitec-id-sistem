import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

// Número WhatsApp para contato do Plano Prefeitura
const WHATSAPP = '5588988411890'

export default function Planos() {
  const logado = !!localStorage.getItem('token')
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get('/pagamento/planos')
      .then(r => { setPlanos(r.data.planos || []); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [])

  function abrirModal(plano) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    setForm({ nome: usuario.nome || '', email: usuario.email || '' })
    setErro('')
    setModal(plano)
  }

  function abrirWhatsApp(plano) {
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no *${plano.nome}* da ITA Tecnologia Educacional.\n\n` +
      `Gostaria de receber uma proposta personalizada para a nossa rede/secretaria municipal.`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  async function assinar() {
    if (!form.nome.trim() || !form.email.trim()) {
      setErro('Preencha nome e email.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      const res = await api.post('/pagamento/criar', {
        plano_id: modal.id,
        nome: form.nome.trim(),
        email: form.email.trim(),
      })
      window.location.href = res.data.link_pagamento
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar link de pagamento.')
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {logado && <Navbar />}
      <main className={`flex-1 p-6 ${logado ? 'lg:ml-64' : ''}`}>
        <div className="max-w-5xl mx-auto">

          {/* Cabeçalho */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-primary">ITA TECNOLOGIA EDUCACIONAL</h1>
            <p className="text-gray-500 mt-2">Escolha o plano ideal para sua escola</p>
          </div>

          {carregando ? (
            <div className="text-center text-gray-400 py-20">Carregando planos...</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {planos.map(plano => (
                <div
                  key={plano.id}
                  className={`rounded-2xl border-2 p-7 relative flex flex-col transition-shadow hover:shadow-xl
                    ${plano.destaque
                      ? 'border-secondary bg-primary text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-800'}`}
                >
                  {/* Badge destaque */}
                  {plano.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-primary text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                      MAIS POPULAR
                    </div>
                  )}

                  {/* Nome e descrição */}
                  <h2 className={`text-xl font-black mb-1 ${plano.destaque ? 'text-white' : 'text-primary'}`}>
                    {plano.nome}
                  </h2>
                  <p className={`text-sm mb-1 ${plano.destaque ? 'text-white/70' : 'text-gray-500'}`}>
                    {plano.descricao}
                  </p>

                  {/* Preço */}
                  <div className="my-4">
                    {plano.preco !== null ? (
                      <>
                        <div className="flex items-end gap-1">
                          <span className={`text-4xl font-black ${plano.destaque ? 'text-secondary' : 'text-primary'}`}>
                            R$ {plano.preco.toFixed(2).replace('.', ',')}
                          </span>
                          <span className={`text-sm mb-1 ${plano.destaque ? 'text-white/70' : 'text-gray-500'}`}>
                            /{plano.periodo}
                          </span>
                        </div>
                        {/* Subtítulo (ex: "2 meses grátis" ou "R$1/aluno") */}
                        {plano.subtitulo && (
                          <p className={`text-xs mt-1 font-semibold ${plano.destaque ? 'text-green-300' : 'text-green-600'}`}>
                            {plano.subtitulo}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={`text-2xl font-black ${plano.destaque ? 'text-secondary' : 'text-primary'}`}>
                          Sob consulta
                        </div>
                        {plano.subtitulo && (
                          <p className="text-xs mt-1 font-semibold text-amber-600">
                            {plano.subtitulo}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Recursos */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plano.recursos.map((r, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-sm ${plano.destaque ? 'text-white/90' : 'text-gray-600'}`}
                      >
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                        {r}
                      </li>
                    ))}
                  </ul>

                  {/* Botão */}
                  {plano.contato ? (
                    /* Plano Prefeitura — abre WhatsApp */
                    <button
                      onClick={() => abrirWhatsApp(plano)}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-amber-500 hover:bg-amber-400 text-white"
                    >
                      Solicitar Proposta via WhatsApp
                    </button>
                  ) : (
                    /* Planos com pagamento via Mercado Pago */
                    <button
                      onClick={() => abrirModal(plano)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all
                        ${plano.destaque
                          ? 'bg-secondary hover:bg-yellow-400 text-primary'
                          : 'bg-primary hover:bg-blue-900 text-white'}`}
                    >
                      Assinar Agora
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comparativo de mercado */}
          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-600">
            <p className="font-black text-primary mb-3 text-base">💡 Por que a ITA vale muito mais?</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="font-bold text-gray-700 mb-1">ClassApp</p>
                <p>R$ 300–800/mês <span className="text-red-500 font-semibold">só por comunicação</span></p>
              </div>
              <div>
                <p className="font-bold text-gray-700 mb-1">Educatena / ERPs</p>
                <p>R$ 500–2.000/mês <span className="text-red-500 font-semibold">só por gestão, sem IA</span></p>
              </div>
              <div>
                <p className="font-bold text-primary mb-1">ITA Tecnologia ✅</p>
                <p>Comunicação + Gestão + IA + Gamificação <span className="text-green-600 font-bold">a partir de R$ 59/mês</span></p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            <p>Pagamento 100% seguro via Mercado Pago • Após confirmação, você recebe o acesso por email automaticamente</p>
            {!logado && (
              <p>Já tem conta? <Link to="/login" className="text-primary underline font-medium">Entrar no sistema →</Link></p>
            )}
          </div>

        </div>
      </main>

      {/* Modal de dados para pagamento */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-black text-primary mb-1">Assinar — {modal.nome}</h2>
            <p className="text-gray-500 text-sm mb-1">
              R$ {modal.preco?.toFixed(2).replace('.', ',')} / {modal.periodo} • Pago via Mercado Pago
            </p>
            {modal.subtitulo && (
              <p className="text-green-600 text-xs font-semibold mb-5">{modal.subtitulo}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Seu nome ou da escola"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email para acesso</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="email@escola.com"
                />
              </div>
              {erro && <p className="text-red-500 text-sm">{erro}</p>}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Após o pagamento confirmado, a conta será criada automaticamente e você receberá as credenciais neste email.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={assinar}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-primary font-bold text-sm hover:bg-yellow-400 disabled:opacity-60"
              >
                {enviando ? 'Aguarde...' : 'Ir para Pagamento →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
