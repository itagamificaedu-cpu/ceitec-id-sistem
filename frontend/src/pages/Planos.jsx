import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'

const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8000'

export default function Planos() {
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [assinando, setAssinando] = useState(null)

  useEffect(() => {
    fetch(`${DJANGO_URL}/api/planos/`)
      .then(r => r.json())
      .then(data => { setPlanos(data.planos || []); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [])

  async function assinar(planoId) {
    setAssinando(planoId)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${DJANGO_URL}/api/assinar/${planoId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.link_pagamento) {
        window.open(data.link_pagamento, '_blank')
      } else {
        alert('Erro ao gerar link de pagamento. Tente novamente.')
      }
    } catch {
      alert('Erro de conexão com o servidor de pagamentos.')
    } finally {
      setAssinando(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-primary">ITA TECNOLOGIA EDUCACIONAL</h1>
            <p className="text-gray-500 mt-2">Escolha o plano ideal para sua escola</p>
          </div>

          {carregando ? (
            <div className="text-center text-gray-400 py-20">Carregando planos...</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {planos.map(plano => (
                <div
                  key={plano.id}
                  className={`rounded-2xl border-2 p-8 relative transition-shadow hover:shadow-xl
                    ${plano.destaque
                      ? 'border-secondary bg-primary text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-800'}`}
                >
                  {plano.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-4 py-1 rounded-full">
                      MAIS POPULAR
                    </div>
                  )}

                  <h2 className={`text-xl font-black mb-1 ${plano.destaque ? 'text-white' : 'text-primary'}`}>
                    {plano.nome}
                  </h2>

                  <div className="flex items-end gap-1 my-4">
                    <span className={`text-4xl font-black ${plano.destaque ? 'text-secondary' : 'text-primary'}`}>
                      R$ {plano.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span className={`text-sm mb-1 ${plano.destaque ? 'text-white/70' : 'text-gray-500'}`}>
                      /{plano.periodo}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-8">
                    {plano.recursos.map((r, i) => (
                      <li key={i} className={`flex items-start gap-2 text-sm ${plano.destaque ? 'text-white/90' : 'text-gray-600'}`}>
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                        {r}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => assinar(plano.id)}
                    disabled={assinando === plano.id}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all
                      ${plano.destaque
                        ? 'bg-secondary hover:bg-yellow-400 text-primary'
                        : 'bg-primary hover:bg-blue-900 text-white'}`}
                  >
                    {assinando === plano.id ? 'Aguarde...' : 'Assinar Agora'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center text-sm text-gray-400">
            <p>Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
            <p className="mt-1">Dúvidas? WhatsApp: <a href="https://wa.me/5500000000000" className="text-primary underline">fale conosco</a></p>
          </div>

        </div>
      </main>
    </div>
  )
}
