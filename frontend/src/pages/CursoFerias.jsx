import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'

const WA_NUMERO = '5588988411890'
const WA_MSG = encodeURIComponent('Olá! Quero garantir minha vaga no curso Alunos Maker Não Tiram Férias! Pode me enviar mais informações?')
const WA_LINK = `https://wa.me/${WA_NUMERO}?text=${WA_MSG}`

const URL_LANDING = window.location.origin + '/curso-ferias.html'
const URL_INSCRICAO = window.location.origin + '/inscricao/formulario/'

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
  const [abaPreview, setAbaPreview] = useState('inscritos')
  const [inscritos, setInscritos] = useState([])
  const [statsInscritos, setStatsInscritos] = useState(null)
  const [loadingInscritos, setLoadingInscritos] = useState(false)
  const [marcandoPago, setMarcandoPago] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [editando, setEditando] = useState(null)
  const [dadosEdicao, setDadosEdicao] = useState({})
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  async function carregarInscritos() {
    setLoadingInscritos(true)
    try {
      const res = await fetch('/inscricao/api/inscricoes/?chave=gamificaedu_secreto_2026')
      const data = await res.json()
      setInscritos(data.inscricoes || [])
      setStatsInscritos(data.stats || null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingInscritos(false)
    }
  }

  async function marcarComoPago(id) {
    setMarcandoPago(id)
    try {
      await fetch(`/inscricao/api/inscricao/${id}/pagar/?chave=gamificaedu_secreto_2026`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      await carregarInscritos()
    } catch (e) {
      console.error(e)
    }
    setMarcandoPago(null)
  }

  async function excluirInscricao(id, nome) {
    if (!window.confirm(`Excluir a inscrição de ${nome}? Esta ação não pode ser desfeita.`)) return
    try {
      await fetch(`/inscricao/api/inscricao/${id}/excluir/?chave=gamificaedu_secreto_2026`, { method: 'DELETE' })
      await carregarInscritos()
    } catch (e) {
      console.error(e)
    }
  }

  function abrirEdicao(inscrito) {
    setEditando(inscrito.id)
    setDadosEdicao({
      nome_completo: inscrito.nome,
      escola: inscrito.escola,
      serie: inscrito.serie,
      turno: inscrito.turno === 'Manhã (8h–12h)' ? 'manha' : 'tarde',
      nome_responsavel: inscrito.responsavel,
      telefone: inscrito.telefone,
      email: inscrito.email,
      status: inscrito.status,
    })
  }

  async function salvarEdicao() {
    setSalvandoEdicao(true)
    try {
      await fetch(`/inscricao/api/inscricao/${editando}/editar/?chave=gamificaedu_secreto_2026`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosEdicao),
      })
      setEditando(null)
      await carregarInscritos()
    } catch (e) {
      console.error(e)
    }
    setSalvandoEdicao(false)
  }

  useEffect(() => {
    if (abaPreview === 'inscritos') carregarInscritos()
  }, [abaPreview])

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
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {[
                { id: 'inscritos', label: '👥 Inscritos' },
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

            {/* Aba Inscritos */}
            {abaPreview === 'inscritos' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-semibold text-textMain text-base">👥 Pessoas Inscritas</h3>
                  <button
                    onClick={carregarInscritos}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    🔄 Atualizar
                  </button>
                </div>

                {/* Cards de resumo */}
                {statsInscritos && (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-600">{statsInscritos.total}</p>
                      <p className="text-xs text-blue-500 font-semibold mt-0.5">Total</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-600">{statsInscritos.pagas}</p>
                      <p className="text-xs text-green-500 font-semibold mt-0.5">Confirmadas</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-orange-500">{statsInscritos.pendentes}</p>
                      <p className="text-xs text-orange-400 font-semibold mt-0.5">Aguardando</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-red-500">{statsInscritos.vagas_restantes}</p>
                      <p className="text-xs text-red-400 font-semibold mt-0.5">Vagas Restantes</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-emerald-600">R$ {Number(statsInscritos.receita).toFixed(0)}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">Receita</p>
                    </div>
                  </div>
                )}

                {/* Filtro */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[
                    { v: 'todos', label: 'Todos' },
                    { v: 'pago', label: '✅ Confirmados' },
                    { v: 'aguardando_pagamento', label: '⏳ Aguardando' },
                    { v: 'cancelado', label: '❌ Cancelados' },
                  ].map(f => (
                    <button
                      key={f.v}
                      onClick={() => setFiltroStatus(f.v)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        filtroStatus === f.v
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {loadingInscritos ? (
                  <div className="text-center py-12 text-gray-400">Carregando...</div>
                ) : inscritos.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-sm">Nenhuma inscrição ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aluno</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Escola</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Turno</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Data</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {inscritos
                          .filter(i => filtroStatus === 'todos' || i.status === filtroStatus || (filtroStatus === 'pago' && i.status === 'certificado_emitido'))
                          .map(inscrito => (
                          <tr key={inscrito.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                {inscrito.codigo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800 leading-tight">{inscrito.nome}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{inscrito.responsavel} · {inscrito.email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                              {inscrito.escola}<br/>
                              <span className="text-xs text-gray-400">{inscrito.serie}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{inscrito.turno}</td>
                            <td className="px-4 py-3">
                              {inscrito.status === 'pago' || inscrito.status === 'certificado_emitido' ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✅ Pago</span>
                              ) : inscrito.status === 'aguardando_pagamento' ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">⏳ Aguardando</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">❌ {inscrito.status_display}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{inscrito.data_inscricao}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a
                                  href={`https://wa.me/55${inscrito.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-white text-xs"
                                  style={{ backgroundColor: '#25D366' }}
                                  title="WhatsApp do responsável"
                                >
                                  📱
                                </a>
                                {inscrito.status === 'aguardando_pagamento' && (
                                  <button
                                    onClick={() => marcarComoPago(inscrito.id)}
                                    disabled={marcandoPago === inscrito.id}
                                    className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                    title="Marcar como pago"
                                  >
                                    {marcandoPago === inscrito.id ? '...' : '✓ Pago'}
                                  </button>
                                )}
                                <button
                                  onClick={() => abrirEdicao(inscrito)}
                                  className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                  title="Editar inscrição"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => excluirInscricao(inscrito.id, inscrito.nome)}
                                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                                  title="Excluir inscrição"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

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
                  src={URL_LANDING}
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

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">✏️ Editar Inscrição</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { field: 'nome_completo', label: 'Nome do Aluno' },
                { field: 'escola', label: 'Escola' },
                { field: 'serie', label: 'Série/Ano' },
                { field: 'nome_responsavel', label: 'Nome do Responsável' },
                { field: 'telefone', label: 'Telefone/WhatsApp' },
                { field: 'email', label: 'E-mail' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                  <input
                    type="text"
                    value={dadosEdicao[field] || ''}
                    onChange={e => setDadosEdicao(d => ({ ...d, [field]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Turno</label>
                <select
                  value={dadosEdicao.turno || ''}
                  onChange={e => setDadosEdicao(d => ({ ...d, turno: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400"
                >
                  <option value="manha">Manhã (8h–12h)</option>
                  <option value="tarde">Tarde (13h–17h)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                <select
                  value={dadosEdicao.status || ''}
                  onChange={e => setDadosEdicao(d => ({ ...d, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400"
                >
                  <option value="pendente">Pendente</option>
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pago">Pago ✅</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="certificado_emitido">Certificado Emitido</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao}
                className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {salvandoEdicao ? 'Salvando...' : '💾 Salvar Alterações'}
              </button>
              <button
                onClick={() => setEditando(null)}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
