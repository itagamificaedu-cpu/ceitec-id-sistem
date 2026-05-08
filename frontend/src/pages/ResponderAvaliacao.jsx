import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/node-api'

export default function ResponderAvaliacao() {
  const { avaliacao_id, codigo } = useParams()
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    axios.get(`${API}/portal/avaliacao/${avaliacao_id}/${codigo}`)
      .then(r => setDados(r.data))
      .catch(e => setErro(e.response?.data?.erro || 'Avaliação não encontrada'))
  }, [avaliacao_id, codigo])

  function marcar(questao_id, letra) {
    setRespostas(r => ({ ...r, [questao_id]: letra }))
  }

  async function enviar() {
    const faltando = dados.questoes.filter(q => !respostas[q.id])
    if (faltando.length > 0) {
      alert(`Responda todas as questões antes de enviar. Faltam ${faltando.length}.`)
      return
    }
    setEnviando(true)
    try {
      const resp = await axios.post(`${API}/portal/responder-avaliacao`, {
        codigo,
        avaliacao_id: parseInt(avaliacao_id),
        respostas: Object.entries(respostas).map(([questao_id, resposta_marcada]) => ({
          questao_id: parseInt(questao_id),
          resposta_marcada,
        })),
      })
      setResultado(resp.data)
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao enviar respostas')
    } finally {
      setEnviando(false)
    }
  }

  if (erro) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: '3rem', textAlign: 'center' }}>❌</div>
        <p style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{erro}</p>
        <button style={s.btn} onClick={() => navigate(-1)}>Voltar</button>
      </div>
    </div>
  )

  if (!dados) return (
    <div style={s.page}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando avaliação...</div>
    </div>
  )

  if (resultado) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '4rem' }}>{resultado.percentual >= 60 ? '🎉' : '📚'}</div>
          <h2 style={{ color: '#1e3a5f', margin: '.5rem 0' }}>Avaliação Concluída!</h2>
          <p style={{ color: '#6b7280' }}>{dados.avaliacao.titulo}</p>
        </div>
        <div style={s.resultGrid}>
          <div style={s.resultItem}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: resultado.percentual >= 60 ? '#10b981' : '#ef4444' }}>{resultado.nota_final}</span>
            <span style={{ color: '#6b7280', fontSize: '.85rem' }}>Nota Final</span>
          </div>
          <div style={s.resultItem}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6' }}>{resultado.acertos}/{resultado.total}</span>
            <span style={{ color: '#6b7280', fontSize: '.85rem' }}>Acertos</span>
          </div>
          <div style={s.resultItem}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>+{resultado.xp_ganho} XP</span>
            <span style={{ color: '#6b7280', fontSize: '.85rem' }}>ItagGame</span>
          </div>
        </div>
        <button style={s.btn} onClick={() => navigate(`/aluno/${codigo}`)}>Voltar ao Meu Painel</button>
      </div>
    </div>
  )

  const { avaliacao, questoes, ja_respondeu, respostas: resp_salvas, gabaritos } = dados

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>

        {/* Header */}
        <div style={s.header}>
          <button style={s.btnVoltar} onClick={() => navigate(-1)}>← Voltar</button>
          <div>
            <h1 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.25rem' }}>{avaliacao.titulo}</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '.85rem' }}>{avaliacao.disciplina} · {questoes.length} questões</p>
          </div>
          {ja_respondeu && <span style={s.badge}>✅ Respondida</span>}
        </div>

        {ja_respondeu && (
          <div style={s.aviso}>
            ✅ Você já respondeu esta avaliação. Veja o gabarito abaixo.
          </div>
        )}

        {/* Questões */}
        {questoes.map((q, i) => {
          const respSalva = resp_salvas?.find(r => r.questao_id === q.id)
          const marcada = ja_respondeu ? respSalva?.resposta_marcada : respostas[q.id]
          const gabarito = gabaritos?.[q.id]

          return (
            <div key={q.id} style={s.questao}>
              <div style={s.questaoNum}>Questão {i + 1}</div>
              <p style={s.enunciado}>{q.enunciado}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {['a', 'b', 'c', 'd'].filter(l => q[`alternativa_${l}`]).map(letra => {
                  const selecionada = marcada?.toLowerCase() === letra
                  const correta = ja_respondeu && gabarito?.gabarito?.toLowerCase() === letra
                  const errada = ja_respondeu && selecionada && !correta

                  return (
                    <button
                      key={letra}
                      disabled={ja_respondeu}
                      onClick={() => marcar(q.id, letra.toUpperCase())}
                      style={{
                        ...s.alternativa,
                        background: correta ? '#dcfce7' : errada ? '#fee2e2' : selecionada ? '#dbeafe' : '#f9fafb',
                        border: correta ? '2px solid #10b981' : errada ? '2px solid #ef4444' : selecionada ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        cursor: ja_respondeu ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 900, marginRight: '.5rem', color: '#1e3a5f' }}>{letra.toUpperCase()})</span>
                      {q[`alternativa_${letra}`]}
                      {correta && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
                      {errada && <span style={{ marginLeft: 'auto', color: '#ef4444' }}>✗</span>}
                    </button>
                  )
                })}
              </div>
              {ja_respondeu && gabarito?.explicacao && (
                <div style={s.explicacao}>💡 {gabarito.explicacao}</div>
              )}
            </div>
          )
        })}

        {/* Botão enviar */}
        {!ja_respondeu && (
          <button style={{ ...s.btn, width: '100%', marginTop: '1rem' }} onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando...' : `📤 Enviar Respostas (${Object.keys(respostas).length}/${questoes.length})`}
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f4fc', padding: '1rem' },
  card: { maxWidth: 480, margin: '4rem auto', background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,.1)' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', borderRadius: 12, padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' },
  btnVoltar: { background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem', flexShrink: 0 },
  badge: { marginLeft: 'auto', background: '#dcfce7', color: '#166534', padding: '.25rem .75rem', borderRadius: 20, fontSize: '.75rem', fontWeight: 800, flexShrink: 0 },
  aviso: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1rem', color: '#166534', fontWeight: 600, fontSize: '.9rem' },
  questao: { background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' },
  questaoNum: { fontSize: '.75rem', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '.5rem' },
  enunciado: { fontWeight: 600, color: '#1e3a5f', marginBottom: '.75rem', lineHeight: 1.5 },
  alternativa: { display: 'flex', alignItems: 'center', padding: '.75rem 1rem', borderRadius: 8, textAlign: 'left', fontFamily: 'inherit', fontSize: '.9rem', transition: 'all .15s' },
  explicacao: { marginTop: '.75rem', padding: '.75rem', background: '#fefce8', borderRadius: 8, color: '#854d0e', fontSize: '.85rem' },
  btn: { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, padding: '.85rem 1.5rem', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' },
  resultGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', margin: '1.5rem 0' },
  resultItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem', background: '#f9fafb', borderRadius: 10, padding: '1rem' },
}
