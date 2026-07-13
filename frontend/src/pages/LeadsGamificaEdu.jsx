/**
 * Painel de Leads GamificaEdu — leads de escolas capturados pelo atendente
 * virtual do WhatsApp (n8n + IA), salvos automaticamente no banco.
 */

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

const API = import.meta.env.VITE_API_URL || '/node-api'

const STATUS_OPCOES = [
  { valor: 'novo', label: 'Novo', cor: '#2563eb' },
  { valor: 'contatado', label: 'Contatado', cor: '#d97706' },
  { valor: 'convertido', label: 'Convertido', cor: '#16a34a' },
  { valor: 'perdido', label: 'Perdido', cor: '#dc2626' },
]

function corDoStatus(status) {
  return STATUS_OPCOES.find((s) => s.valor === status)?.cor || '#6b7280'
}

export default function LeadsGamificaEdu() {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvandoId, setSalvandoId] = useState(null)

  const token = localStorage.getItem('token')
  const cabecalho = { headers: { Authorization: `Bearer ${token}` } }

  const carregar = () => {
    setCarregando(true)
    axios.get(`${API}/leads/gamificaedu`, cabecalho)
      .then(({ data }) => setLeads(data.leads || []))
      .catch(() => setErro('Não foi possível carregar os leads.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line

  async function alterarStatus(id, novoStatus) {
    setSalvandoId(id)
    try {
      await axios.patch(`${API}/leads/gamificaedu/${id}`, { status: novoStatus }, cabecalho)
      setLeads((atual) => atual.map((l) => (l.id === id ? { ...l, status: novoStatus } : l)))
    } catch {
      setErro('Não foi possível atualizar o status.')
    } finally {
      setSalvandoId(null)
    }
  }

  function formatarData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  const totalNovos = leads.filter((l) => l.status === 'novo').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-textMain">🎯 Leads GamificaEdu</h1>
            <p className="text-sm text-gray-500 mt-1">
              Escolas interessadas capturadas pelo atendente virtual do WhatsApp
            </p>
          </div>
          {totalNovos > 0 && (
            <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
              {totalNovos} novo{totalNovos > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{erro}</div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {carregando ? (
            <p className="p-6 text-center text-gray-400 text-sm">Carregando...</p>
          ) : leads.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">Nenhum lead capturado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b bg-gray-50">
                    <th className="py-3 px-4">Escola</th>
                    <th className="py-3 px-4">Cidade</th>
                    <th className="py-3 px-4 text-center">Alunos</th>
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Telefone WhatsApp</th>
                    <th className="py-3 px-4">Recebido em</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{lead.escola || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{lead.cidade || '—'}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{lead.alunos || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{lead.contato || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{lead.telefone_origem || '—'}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatarData(lead.criado_em)}</td>
                      <td className="py-3 px-4">
                        <select
                          value={lead.status}
                          disabled={salvandoId === lead.id}
                          onChange={(e) => alterarStatus(lead.id, e.target.value)}
                          className="text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer outline-none"
                          style={{ color: corDoStatus(lead.status), backgroundColor: `${corDoStatus(lead.status)}1a` }}
                        >
                          {STATUS_OPCOES.map((op) => (
                            <option key={op.valor} value={op.valor}>{op.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
