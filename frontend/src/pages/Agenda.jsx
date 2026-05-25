/**
 * Agenda e Avisos — CEITEC ID System
 * Professores, coordenadores e ita_admin podem criar avisos e eventos.
 * Todos os usuários autenticados podem visualizar.
 */

import React, { useEffect, useState, useCallback } from 'react'
import api from '../api'
import Navbar from '../components/Navbar'

const TIPO_CONFIG = {
  aviso:   { label: 'Aviso',   cor: '#3B82F6', bg: '#EFF6FF', icone: '📢' },
  evento:  { label: 'Evento',  cor: '#8B5CF6', bg: '#F5F3FF', icone: '📅' },
  urgente: { label: 'Urgente', cor: '#EF4444', bg: '#FEF2F2', icone: '🚨' },
}

function formatarData(str) {
  if (!str) return null
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function tempoAtras(str) {
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora mesmo'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

export default function Agenda() {
  const [avisos, setAvisos]     = useState([])
  const [filtro, setFiltro]     = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal]       = useState(false)
  const [excluindo, setExcluindo] = useState(null)

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const podeGerir = ['ita_admin', 'admin', 'coordenador', 'professor'].includes(usuario.perfil)

  // Form para novo aviso
  const [form, setForm] = useState({ titulo: '', conteudo: '', tipo: 'aviso', data_evento: '', fixado: false })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/agenda')
      setAvisos(data)
    } catch {
      setAvisos([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Marca como lido ao visualizar
  const marcarLido = async (id) => {
    try { await api.post(`/agenda/${id}/lido`) } catch {}
    setAvisos(prev => prev.map(a => a.id === id ? { ...a, lido: 1 } : a))
  }

  const marcarTodosLidos = async () => {
    try { await api.post('/agenda/marcar-todos-lidos') } catch {}
    setAvisos(prev => prev.map(a => ({ ...a, lido: 1 })))
  }

  const salvar = async () => {
    setErro('')
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      setErro('Título e conteúdo são obrigatórios.')
      return
    }
    setSalvando(true)
    try {
      await api.post('/agenda', {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        tipo: form.tipo,
        data_evento: form.data_evento || null,
        fixado: form.fixado,
      })
      setModal(false)
      setForm({ titulo: '', conteudo: '', tipo: 'aviso', data_evento: '', fixado: false })
      await carregar()
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id) => {
    setExcluindo(id)
    try {
      await api.delete(`/agenda/${id}`)
      setAvisos(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao excluir.')
    } finally {
      setExcluindo(null)
    }
  }

  const avisosFiltrados = filtro === 'todos'
    ? avisos
    : avisos.filter(a => a.tipo === filtro)

  const naoLidos = avisos.filter(a => !a.lido).length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1E293B' }}>
              📋 Agenda & Avisos
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>
              Comunicados e eventos da escola
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {naoLidos > 0 && (
              <button
                onClick={marcarTodosLidos}
                style={{ background: 'none', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
              >
                ✓ Marcar todos lidos
              </button>
            )}
            {podeGerir && (
              <button
                onClick={() => setModal(true)}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ＋ Nova Publicação
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'todos',   label: `Todos (${avisos.length})` },
            { key: 'aviso',   label: `📢 Avisos` },
            { key: 'evento',  label: `📅 Eventos` },
            { key: 'urgente', label: `🚨 Urgentes` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: filtro === f.key ? '#3B82F6' : '#E2E8F0',
                color: filtro === f.key ? '#fff' : '#475569',
                transition: 'all .15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de avisos */}
        {carregando ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 48, fontSize: 15 }}>
            Carregando...
          </div>
        ) : avisosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 48 }}>
            <div style={{ fontSize: 40 }}>📭</div>
            <div style={{ marginTop: 12, fontSize: 15 }}>Nenhum aviso encontrado.</div>
            {podeGerir && (
              <button
                onClick={() => setModal(true)}
                style={{ marginTop: 16, background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
              >
                Criar primeiro aviso
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {avisosFiltrados.map(aviso => {
              const cfg = TIPO_CONFIG[aviso.tipo] || TIPO_CONFIG.aviso
              const naoLido = !aviso.lido
              return (
                <div
                  key={aviso.id}
                  onClick={() => naoLido && marcarLido(aviso.id)}
                  style={{
                    background: '#fff',
                    border: `1px solid ${naoLido ? cfg.cor + '55' : '#E2E8F0'}`,
                    borderLeft: `4px solid ${cfg.cor}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    cursor: naoLido ? 'pointer' : 'default',
                    boxShadow: naoLido ? `0 2px 8px ${cfg.cor}22` : '0 1px 3px #0001',
                    position: 'relative',
                  }}
                >
                  {/* Badge tipo + fixado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.bg, color: cfg.cor, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {cfg.icone} {cfg.label}
                    </span>
                    {aviso.fixado ? <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>📌 Fixado</span> : null}
                    {naoLido && <span style={{ background: cfg.cor, color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>NOVO</span>}
                    {aviso.data_evento && (
                      <span style={{ background: '#F0FDF4', color: '#166534', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                        📅 {formatarData(aviso.data_evento)}
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                    {aviso.titulo}
                  </h3>

                  {/* Conteúdo */}
                  <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {aviso.conteudo}
                  </p>

                  {/* Rodapé */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>
                      Por <b>{aviso.criado_por_nome}</b> · {tempoAtras(aviso.criado_em)}
                    </span>
                    {(podeGerir && (usuario.perfil !== 'professor' || aviso.criado_por_id === usuario.id)) && (
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm('Excluir este aviso?')) excluir(aviso.id) }}
                        disabled={excluindo === aviso.id}
                        style={{ background: 'none', border: '1px solid #FCA5A5', color: '#EF4444', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                      >
                        {excluindo === aviso.id ? '...' : '🗑 Excluir'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de nova publicação */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px #0003' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1E293B' }}>
              📝 Nova Publicação
            </h2>

            {erro && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                {erro}
              </div>
            )}

            {/* Tipo */}
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Tipo</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setForm(f => ({ ...f, tipo: k }))}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${form.tipo === k ? v.cor : '#E2E8F0'}`,
                    background: form.tipo === k ? v.bg : '#fff', color: form.tipo === k ? v.cor : '#6B7280',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}
                >
                  {v.icone} {v.label}
                </button>
              ))}
            </div>

            {/* Título */}
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Título *</label>
            <input
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Reunião de pais na sexta-feira"
              maxLength={120}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />

            {/* Conteúdo */}
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Mensagem *</label>
            <textarea
              value={form.conteudo}
              onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              placeholder="Descreva o aviso ou evento..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical' }}
            />

            {/* Data do evento (opcional) */}
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Data do evento <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span></label>
            <input
              type="date"
              value={form.data_evento}
              onChange={e => setForm(f => ({ ...f, data_evento: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />

            {/* Fixar */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={form.fixado}
                onChange={e => setForm(f => ({ ...f, fixado: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, color: '#374151' }}>📌 Fixar no topo</span>
            </label>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModal(false); setErro('') }}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#3B82F6', color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: salvando ? .7 : 1 }}
              >
                {salvando ? 'Salvando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
