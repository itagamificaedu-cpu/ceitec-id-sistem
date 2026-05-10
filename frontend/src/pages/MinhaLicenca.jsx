import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

function StatusBadge({ status }) {
  const map = {
    ativo:          { cor: 'bg-green-100 text-green-700 border-green-200',  icon: '✅', label: 'Ativo' },
    expirado:       { cor: 'bg-red-100 text-red-700 border-red-200',        icon: '❌', label: 'Expirado' },
    ativo_demo:     { cor: 'bg-blue-100 text-blue-700 border-blue-200',     icon: '🔵', label: 'Demo / Manual' },
  }
  const s = map[status] || map.ativo_demo
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${s.cor}`}>
      {s.icon} {s.label}
    </span>
  )
}

function BarraProgresso({ dias_restantes }) {
  if (dias_restantes === null) return null
  const total = 30
  const pct = Math.min(100, Math.round((dias_restantes / total) * 100))
  const cor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Dias restantes</span>
        <span className="font-bold">{dias_restantes} de {total} dias</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function MinhaLicenca() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get('/pagamento/minha-licenca')
      .then(r => { setDados(r.data); setCarregando(false) })
      .catch(e => { setErro(e.response?.data?.erro || 'Erro ao carregar dados.'); setCarregando(false) })
  }, [])

  const expirou = dados?.status === 'expirado'
  const demo = dados?.status === 'ativo_demo'

  const dataFormatada = dados?.licenca_expira
    ? new Date(dados.licenca_expira).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-2xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-black text-primary">Minha Licença</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie sua assinatura e veja o status do plano</p>
          </div>

          {carregando && (
            <div className="text-center text-gray-400 py-20">Carregando...</div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{erro}</div>
          )}

          {dados && (
            <div className="space-y-4">

              {/* Alerta se expirado */}
              {expirou && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-bold text-red-700">Sua licença expirou</p>
                    <p className="text-red-600 text-sm mt-1">O acesso ao sistema está bloqueado. Renove agora para voltar a usar todas as funcionalidades.</p>
                    <Link
                      to="/planos"
                      className="inline-block mt-3 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-bold"
                    >
                      Renovar Agora →
                    </Link>
                  </div>
                </div>
              )}

              {/* Card principal da licença */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plano atual</p>
                    <h2 className="text-xl font-black text-primary">{dados.plano_nome}</h2>
                    {dados.plano_preco && (
                      <p className="text-gray-500 text-sm">
                        R$ {dados.plano_preco.toFixed(2).replace('.', ',')} / {dados.plano_periodo}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={dados.status} />
                </div>

                <div className="space-y-4">
                  <BarraProgresso dias_restantes={dados.dias_restantes} />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Escola / Conta</p>
                      <p className="font-semibold text-gray-800 text-sm truncate">{dados.escola}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Email</p>
                      <p className="font-semibold text-gray-800 text-sm truncate">{dados.email}</p>
                    </div>
                    {dataFormatada && (
                      <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                        <p className="text-xs text-gray-400 mb-1">
                          {expirou ? 'Expirou em' : 'Validade até'}
                        </p>
                        <p className={`font-semibold text-sm ${expirou ? 'text-red-600' : 'text-gray-800'}`}>
                          {dataFormatada}
                          {dados.dias_restantes !== null && !expirou && (
                            <span className="ml-2 text-green-600 font-normal">
                              ({dados.dias_restantes} dias restantes)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {demo && (
                      <div className="bg-blue-50 rounded-xl p-3 col-span-2 text-blue-700 text-sm">
                        Conta de demonstração ou provisionada manualmente. Sem expiração configurada.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Ações</h3>
                <div className="space-y-3">
                  <Link
                    to="/planos"
                    className="flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💳</span>
                      <div>
                        <p className="font-semibold text-primary text-sm">
                          {expirou ? 'Reativar assinatura' : 'Renovar / Trocar plano'}
                        </p>
                        <p className="text-gray-400 text-xs">Pague via Mercado Pago e o acesso é liberado automaticamente</p>
                      </div>
                    </div>
                    <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
                  </Link>

                  <a
                    href="https://wa.me/5585999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20licen%C3%A7a%20ITA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💬</span>
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">Falar com suporte</p>
                        <p className="text-gray-400 text-xs">Dúvidas sobre pagamento ou acesso</p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xs">↗</span>
                  </a>
                </div>
              </div>

              {/* Info sobre o app desktop */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🖥️</span>
                  <div>
                    <p className="font-bold text-primary text-sm">App para Desktop disponível</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Você pode instalar o ITA Tecnologia Educacional como um programa no seu computador (Windows, Mac ou Linux).
                      Funciona como qualquer software instalado, com ícone na área de trabalho.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Entre em contato com o suporte para baixar o instalador.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
