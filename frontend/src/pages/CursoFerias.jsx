import React, { useState } from 'react'
import Navbar from '../components/Navbar'

const WA_NUMERO = '5588988411890'
const WA_MSG = encodeURIComponent('Olá! Quero garantir minha vaga no curso Alunos Maker Não Tiram Férias! Pode me enviar mais informações?')
const WA_LINK = `https://wa.me/${WA_NUMERO}?text=${WA_MSG}`

const URL_INSCRICAO = 'https://itatecnologiaeducacional.tech/inscricao/'
const URL_LANDING = URL_INSCRICAO

function InfoCard({ icon, label, valor, cor }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 flex items-center gap-3 ${cor}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-800">{valor}</p>
      </div>
    </div>
  )
}

export default function CursoFerias() {
  const [copiado, setCopiado] = useState(false)
  const [abaPreview, setAbaPreview] = useState('preview')

  function copiarLink() {
    navigator.clipboard.writeText(URL_LANDING).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  function abrirLanding() {
    window.open(URL_LANDING, '_blank')
  }

  function abrirWhatsApp() {
    window.open(WA_LINK, '_blank')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Cabeçalho */}
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🚀</span>
                <h1 className="text-2xl font-bold text-textMain">Curso de Férias</h1>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">● AO VIVO</span>
              </div>
              <p className="text-sm text-gray-400">Alunos Maker Não Tiram Férias — Gerenciamento da landing page e inscrições</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copiarLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copiado ? '✅ Copiado!' : '🔗 Copiar Link'}
              </button>
              <a
                href={URL_INSCRICAO}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                🚀 Abrir Página de Inscrição
              </a>
              <button
                onClick={abrirWhatsApp}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#25D366' }}
              >
                <span>📱</span> WhatsApp
              </button>
            </div>
          </div>

          {/* Cards de info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <InfoCard icon="📅" label="Duração" valor="5 dias" cor="border-blue-500" />
            <InfoCard icon="💰" label="Valor" valor="R$ 199" cor="border-orange-500" />
            <InfoCard icon="🎯" label="Vagas" valor="30 alunos" cor="border-red-500" />
            <InfoCard icon="📆" label="Inscrições até" valor="30/06/2026" cor="border-green-500" />
          </div>

          {/* Abas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {[
                { id: 'preview', label: '👁️ Preview da Página' },
                { id: 'info', label: '📋 Informações do Curso' },
                { id: 'compartilhar', label: '📤 Compartilhar' },
              ].map(aba => (
                <button
                  key={aba.id}
                  onClick={() => setAbaPreview(aba.id)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    abaPreview === aba.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* Aba Preview */}
            {abaPreview === 'preview' && (
              <div>
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono border border-gray-200 truncate">
                    {URL_LANDING}
                  </div>
                  <button
                    onClick={abrirLanding}
                    className="text-xs text-primary font-medium hover:underline whitespace-nowrap"
                  >
                    Abrir ↗
                  </button>
                </div>
                <iframe
                  src={URL_INSCRICAO}
                  title="Página de Inscrição — Curso de Férias Maker"
                  className="w-full"
                  style={{ height: '700px', border: 'none' }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Aba Informações */}
            {abaPreview === 'info' && (
              <div className="p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-textMain mb-4 text-base">📚 Programa do Curso</h3>
                    <div className="space-y-3">
                      {[
                        { dia: 'Dia 1', titulo: 'Mundo Maker & Eletrônica Básica', icon: '🔬' },
                        { dia: 'Dia 2', titulo: 'Arduino na Prática', icon: '⚡' },
                        { dia: 'Dia 3', titulo: 'Robótica e Movimento', icon: '🤖' },
                        { dia: 'Dia 4', titulo: 'ESP32 & Controle Sem Fio', icon: '📡' },
                        { dia: 'Dia 5', titulo: 'Demo Day — Mostra Maker', icon: '🏆' },
                      ].map(m => (
                        <div key={m.dia} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xl">{m.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-orange-500 uppercase tracking-wide">{m.dia}</p>
                            <p className="text-sm font-medium text-gray-800">{m.titulo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-textMain mb-4 text-base">✅ O Que Está Incluído</h3>
                    <ul className="space-y-2">
                      {[
                        '5 dias de imersão prática (25h+)',
                        'Todos os materiais e equipamentos',
                        'Apostila digital completa',
                        'Certificado impresso pelo ITA',
                        'Acesso ao Clube de Robótica',
                        'Registro fotográfico do projeto',
                        'Participação no Campeonato Demo Day',
                      ].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-500 font-bold">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 p-4 rounded-xl border-2 border-orange-200 bg-orange-50">
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-1">Preço especial</p>
                      <p className="text-sm text-gray-500 line-through">De R$ 350,00</p>
                      <p className="text-3xl font-black text-orange-500">R$ 199</p>
                      <p className="text-xs text-gray-500 mt-1">ou 3x de R$ 66,33 sem juros</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Compartilhar */}
            {abaPreview === 'compartilhar' && (
              <div className="p-6">
                <h3 className="font-semibold text-textMain mb-6 text-base">📤 Como Divulgar o Curso</h3>
                <div className="grid lg:grid-cols-2 gap-4">

                  {/* Link direto */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🔗 Link da Landing Page</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={URL_LANDING}
                        className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono focus:outline-none"
                      />
                      <button
                        onClick={copiarLink}
                        className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 whitespace-nowrap"
                      >
                        {copiado ? '✅' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Envie este link para pais e alunos interessados</p>
                  </div>

                  {/* WhatsApp */}
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📱 Link do WhatsApp</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={WA_LINK}
                        className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-600 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(WA_LINK) }}
                        className="px-3 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 whitespace-nowrap"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Link direto para inscrição via WhatsApp</p>
                  </div>

                  {/* Texto para copiar */}
                  <div className="lg:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">✍️ Texto Pronto para Divulgação</p>
                    <textarea
                      readOnly
                      rows={6}
                      className="w-full text-sm bg-white border border-blue-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none resize-none"
                      value={`🚀 ALUNOS MAKER NÃO TIRAM FÉRIAS!\n\n5 dias de imersão em Robótica, Arduino e Eletrônica para jovens de 11 a 17 anos — em Itapipoca, CE!\n\n✅ Projeto real + Certificado + Portfólio\n✅ ESP32, Arduino, robótica e muito mais\n✅ 30 vagas | R$ 199 (3x sem juros)\n✅ Inscrições abertas até 30 de Junho\n\n👉 Veja tudo na página: ${URL_LANDING}\n\nGaranta sua vaga pelo WhatsApp: ${WA_LINK}`}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`🚀 ALUNOS MAKER NÃO TIRAM FÉRIAS!\n\n5 dias de imersão em Robótica, Arduino e Eletrônica para jovens de 11 a 17 anos — em Itapipoca, CE!\n\n✅ Projeto real + Certificado + Portfólio\n✅ ESP32, Arduino, robótica e muito mais\n✅ 30 vagas | R$ 199 (3x sem juros)\n✅ Inscrições abertas até 30 de Junho\n\n👉 Veja tudo na página: ${URL_LANDING}\n\nGarante sua vaga pelo WhatsApp: ${WA_LINK}`)
                      }}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📋 Copiar Texto Completo
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
