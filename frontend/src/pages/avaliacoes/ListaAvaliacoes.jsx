import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

function ModalVerAvaliacao({ av, onFechar }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get(`/avaliacoes/${av.id}`).then(({ data }) => setDados(data)).finally(() => setCarregando(false))
  }, [av.id])

  function baixarPDF() {
    const conteudo = document.getElementById('avaliacao-print')
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html><head><title>${av.titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
        h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
        .info { font-size: 13px; color: #555; margin-bottom: 20px; }
        .questao { margin-bottom: 24px; page-break-inside: avoid; }
        .questao p { font-weight: bold; margin-bottom: 8px; }
        .alternativa { margin: 3px 0 3px 16px; font-size: 14px; }
        .gabarito-box { margin-top: 30px; border-top: 2px solid #333; padding-top: 16px; }
        .gabarito-box h2 { font-size: 14px; margin-bottom: 8px; }
        .gabarito-linha { display: inline-block; margin: 3px 10px; font-size: 13px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${conteudo.innerHTML}
      </body></html>`)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print(); janela.close() }, 400)
  }

  const letras = ['A', 'B', 'C', 'D']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-textMain">{av.titulo}</h2>
            <p className="text-sm text-gray-500">{av.disciplina} • {av.tipo} • {av.total_questoes} questões</p>
          </div>
          <div className="flex gap-2">
            <button onClick={baixarPDF} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1">
              📄 Baixar PDF
            </button>
            <button onClick={onFechar} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {carregando ? (
            <div className="text-center py-10 text-gray-400">Carregando...</div>
          ) : (
            <div id="avaliacao-print">
              <h1>{dados?.titulo}</h1>
              <p className="info">
                {dados?.disciplina && `${dados.disciplina} • `}
                {dados?.tipo} • {dados?.total_questoes} questões
                {dados?.turma_nome && ` • ${dados.turma_nome}`}
                {dados?.data_aplicacao && ` • ${new Date(dados.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}`}
              </p>
              <p className="info">Nome: __________________________________________ Turma: ____________ Data: ___/___/______</p>

              {(dados?.questoes || []).map((q, i) => (
                <div key={q.id} className="questao mb-6">
                  <p className="font-semibold text-gray-800">{i + 1}. {q.enunciado}</p>
                  {q.tipo_questao === 'multipla' || !q.tipo_questao ? (
                    <div className="ml-4 mt-2 space-y-1">
                      {letras.map(l => q[`alternativa_${l.toLowerCase()}`] && (
                        <p key={l} className="alternativa text-sm text-gray-700">({l}) {q[`alternativa_${l.toLowerCase()}`]}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-4 mt-2 border-b border-dashed border-gray-300 pb-8 text-sm text-gray-400">Resposta: _______________________________________________</div>
                  )}
                </div>
              ))}

              {(dados?.questoes || []).some(q => !q.tipo_questao || q.tipo_questao === 'multipla') && (
                <div className="gabarito-box">
                  <h2>GABARITO</h2>
                  {(dados?.questoes || []).map((q, i) => (q.tipo_questao === 'multipla' || !q.tipo_questao) && (
                    <span key={q.id} className="gabarito-linha text-sm">{i + 1}. {q.gabarito}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabNav() {
  return (
    <div className="flex gap-1 mb-6 border-b border-gray-200">
      <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px">
        📝 Avaliações
      </span>
      <Link to="/quiz" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
        🎯 Quiz
      </Link>
    </div>
  )
}

export default function ListaAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [avModal, setAvModal] = useState(null)

  useEffect(() => {
    api.get('/avaliacoes').then(({ data }) => setAvaliacoes(data)).finally(() => setCarregando(false))
  }, [])

  const filtradas = avaliacoes.filter(a =>
    a.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    a.disciplina?.toLowerCase().includes(filtro.toLowerCase()) ||
    a.turma_nome?.toLowerCase().includes(filtro.toLowerCase())
  )

  async function excluir(av) {
    if (!window.confirm(`Excluir "${av.titulo}"? Esta ação não pode ser desfeita.`)) return
    await api.delete(`/avaliacoes/${av.id}`)
    setAvaliacoes(prev => prev.filter(a => a.id !== av.id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <TabNav />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textMain">Avaliações</h1>
            <Link to="/avaliacoes/nova" className="btn-primary text-sm">+ Nova Avaliação</Link>
          </div>

          <div className="mb-5">
            <input className="input-field" placeholder="🔍 Buscar por título, disciplina ou turma..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>

          {carregando ? (
            <div className="text-center py-20 text-gray-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhuma avaliação encontrada</div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(av => (
                <div key={av.id} className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">📝</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-textMain">
                      {av.titulo}
                      {av.bncc_codigo && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold align-middle" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                          📚 {av.bncc_codigo}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{av.disciplina} • {av.tipo} • {av.total_questoes} questões</p>
                    <p className="text-xs text-gray-400 mt-0.5">{av.turma_nome} {av.data_aplicacao ? `• ${new Date(av.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setAvModal(av)} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100">👁️ Ver avaliação</button>
                    <Link to={`/avaliacoes/${av.id}`} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20">Ver resultados</Link>
                    <Link to={`/avaliacoes/${av.id}/editar`} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">✏️</Link>
                    <button onClick={() => excluir(av)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {avModal && <ModalVerAvaliacao av={avModal} onFechar={() => setAvModal(null)} />}
    </div>
  )
}
