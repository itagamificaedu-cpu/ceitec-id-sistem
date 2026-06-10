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
  // Caça-palavras: primeira célula tocada de cada questão (aguardando a segunda)
  const [selCaca, setSelCaca] = useState({})

  useEffect(() => {
    axios.get(`${API}/portal/avaliacao/${avaliacao_id}/${codigo}`)
      .then(r => setDados(r.data))
      .catch(e => setErro(e.response?.data?.erro || 'Avaliação não encontrada'))
  }, [avaliacao_id, codigo])

  function marcar(questao_id, letra) {
    setRespostas(r => ({ ...r, [questao_id]: letra }))
  }

  // Dissertativa: texto livre
  function escreverTexto(questao_id, texto) {
    setRespostas(r => ({ ...r, [questao_id]: texto }))
  }

  // Associação: liga um item da coluna A a um item da coluna B
  function associar(questao_id, itemA, itemB) {
    setRespostas(r => ({ ...r, [questao_id]: { ...(r[questao_id] || {}), [itemA]: itemB } }))
  }

  // ── Caça-palavras: toque na 1ª letra e depois na última letra da palavra ──
  function tocarCelula(q, r, c) {
    const primeira = selCaca[q.id]
    if (!primeira) { setSelCaca(s => ({ ...s, [q.id]: { r, c } })); return }
    if (primeira.r === r && primeira.c === c) { setSelCaca(s => ({ ...s, [q.id]: null })); return }

    const dr = Math.sign(r - primeira.r), dc = Math.sign(c - primeira.c)
    const distR = Math.abs(r - primeira.r), distC = Math.abs(c - primeira.c)
    // Precisa ser linha reta: horizontal, vertical ou diagonal
    if (!(distR === 0 || distC === 0 || distR === distC)) {
      setSelCaca(s => ({ ...s, [q.id]: { r, c } })) // recomeça da nova célula
      return
    }
    const passos = Math.max(distR, distC)
    let palavra = '', celulas = []
    for (let i = 0; i <= passos; i++) {
      const rr = primeira.r + dr * i, cc = primeira.c + dc * i
      palavra += q.grade[rr][cc]
      celulas.push(`${rr}-${cc}`)
    }
    const invertida = palavra.split('').reverse().join('')
    const atual = respostas[q.id] || { encontradas: [], celulas: [] }
    const alvo = (q.palavras || []).find(p => p === palavra || p === invertida)
    if (alvo && !atual.encontradas.includes(alvo)) {
      setRespostas(rs => ({ ...rs, [q.id]: { encontradas: [...atual.encontradas, alvo], celulas: [...atual.celulas, ...celulas] } }))
    }
    setSelCaca(s => ({ ...s, [q.id]: null }))
  }

  // Cruzadinha: digita a palavra de uma dica
  function digitarCruzadinha(questao_id, numero, texto) {
    setRespostas(r => ({ ...r, [questao_id]: { ...(r[questao_id] || {}), [numero]: texto } }))
  }

  // Lacunas: escolhe palavra do banco para uma lacuna
  function escolherLacuna(questao_id, indice, palavra) {
    setRespostas(r => {
      const arr = [...(r[questao_id] || [])]
      arr[indice] = palavra
      return { ...r, [questao_id]: arr }
    })
  }

  // Verifica se a questão está completamente respondida (por tipo)
  function respondida(q) {
    const r = respostas[q.id]
    if (q.tipo_questao === 'dissertativa')  return typeof r === 'string' && r.trim().length > 0
    if (q.tipo_questao === 'associacao')    return (q.coluna_a || []).every(a => r?.[a])
    if (q.tipo_questao === 'caca_palavras') return (r?.encontradas || []).length > 0
    if (q.tipo_questao === 'cruzadinha')    return Object.values(r || {}).some(v => v?.trim())
    if (q.tipo_questao === 'lacunas') {
      const total = (q.texto_partes || []).filter(p => p.tipo === 'lacuna').length
      return total > 0 && (r || []).filter(Boolean).length === total
    }
    return !!r
  }

  async function enviar() {
    const faltando = dados.questoes.filter(q => !respondida(q))
    if (faltando.length > 0) {
      alert(`Responda todas as questões antes de enviar. Faltam ${faltando.length}.`)
      return
    }
    setEnviando(true)
    try {
      const resp = await axios.post(`${API}/portal/responder-avaliacao`, {
        codigo,
        avaliacao_id: parseInt(avaliacao_id),
        respostas: dados.questoes.map(q => {
          const r = respostas[q.id]
          if (q.tipo_questao === 'dissertativa')  return { questao_id: q.id, resposta_texto: r }
          if (q.tipo_questao === 'associacao')    return { questao_id: q.id, associacoes: r }
          if (q.tipo_questao === 'caca_palavras') return { questao_id: q.id, encontradas: r?.encontradas || [] }
          if (q.tipo_questao === 'cruzadinha')    return { questao_id: q.id, palavras_resp: r || {} }
          if (q.tipo_questao === 'lacunas')       return { questao_id: q.id, lacunas: r || [] }
          return { questao_id: q.id, resposta_marcada: r }
        }),
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
        {resultado.pendentes > 0 && (
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '.75rem 1rem', marginBottom: '1rem', color: '#854d0e', fontSize: '.85rem', fontWeight: 600 }}>
            ✍️ {resultado.pendentes} questão(ões) de resposta livre aguardando correção do professor — sua nota pode aumentar!
          </div>
        )}
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
              <div style={s.questaoNum}>
                Questão {i + 1}
                {q.tipo_questao === 'dissertativa' && <span style={{ marginLeft: 8, color: '#92400e' }}>✍️ Resposta livre</span>}
                {q.tipo_questao === 'associacao' && <span style={{ marginLeft: 8, color: '#3730a3' }}>🔗 Associação</span>}
                {q.tipo_questao === 'caca_palavras' && <span style={{ marginLeft: 8, color: '#166534' }}>🔤 Caça-Palavras</span>}
                {q.tipo_questao === 'cruzadinha' && <span style={{ marginLeft: 8, color: '#166534' }}>➕ Cruzadinha</span>}
                {q.tipo_questao === 'lacunas' && <span style={{ marginLeft: 8, color: '#166534' }}>✏️ Completar Lacunas</span>}
              </div>
              <p style={s.enunciado}>{q.enunciado}</p>

              {/* ── DISSERTATIVA: texto livre ── */}
              {q.tipo_questao === 'dissertativa' && (
                ja_respondeu ? (
                  <div style={{ background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 8, padding: '.75rem 1rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {resp_salvas?.find(r => r.questao_id === q.id)?.resposta_texto || '—'}
                    <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: '#92400e', fontWeight: 700 }}>
                      ⏳ Aguardando correção do professor
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={5}
                    placeholder="Escreva sua resposta aqui..."
                    value={respostas[q.id] || ''}
                    onChange={e => escreverTexto(q.id, e.target.value)}
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 8, padding: '.75rem 1rem', fontFamily: 'inherit', fontSize: '.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                )
              )}

              {/* ── ASSOCIAÇÃO: ligar colunas (toque, mobile-first) ── */}
              {q.tipo_questao === 'associacao' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {(q.coluna_a || []).map(itemA => {
                    const respSalvaAssoc = ja_respondeu
                      ? (() => { try { return JSON.parse(resp_salvas?.find(r => r.questao_id === q.id)?.resposta_marcada || '{}') } catch { return {} } })()
                      : null
                    const escolhido = ja_respondeu ? respSalvaAssoc?.[itemA] : respostas[q.id]?.[itemA]
                    return (
                      <div key={itemA} style={{ background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 8, padding: '.6rem .75rem' }}>
                        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '.9rem', marginBottom: '.4rem' }}>{itemA}</div>
                        {ja_respondeu ? (
                          <div style={{ fontSize: '.85rem', color: '#374151' }}>↳ {escolhido || '—'}</div>
                        ) : (
                          <select
                            value={escolhido || ''}
                            onChange={e => associar(q.id, itemA, e.target.value)}
                            style={{ width: '100%', border: escolhido ? '2px solid #3b82f6' : '2px solid #e5e7eb', borderRadius: 8, padding: '.5rem .75rem', fontFamily: 'inherit', fontSize: '.85rem', background: escolhido ? '#dbeafe' : '#fff', color: '#1e3a5f', boxSizing: 'border-box' }}
                          >
                            <option value="">Toque para escolher...</option>
                            {(q.coluna_b || []).map(itemB => (
                              <option key={itemB} value={itemB}>{itemB}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── CAÇA-PALAVRAS: grade interativa (toque na 1ª e na última letra) ── */}
              {q.tipo_questao === 'caca_palavras' && (q.grade || []).length > 0 && (() => {
                const respCaca = ja_respondeu
                  ? (() => { try { return JSON.parse(resp_salvas?.find(r => r.questao_id === q.id)?.resposta_marcada || '{}') } catch { return {} } })()
                  : (respostas[q.id] || { encontradas: [], celulas: [] })
                const celulasMarcadas = new Set(respCaca.celulas || [])
                const encontradas = respCaca.encontradas || []
                const primeira = selCaca[q.id]
                return (
                  <div>
                    {!ja_respondeu && (
                      <p style={{ fontSize: '.8rem', color: '#6b7280', margin: '0 0 .5rem' }}>
                        👆 Toque na <strong>primeira letra</strong> e depois na <strong>última letra</strong> da palavra
                      </p>
                    )}
                    <div style={{
                      display: 'grid', gridTemplateColumns: `repeat(${q.grade[0].length}, 1fr)`,
                      gap: 2, maxWidth: 440, margin: '0 auto', userSelect: 'none',
                    }}>
                      {q.grade.map((linha, r) => linha.map((letra, c) => {
                        const marcada = celulasMarcadas.has(`${r}-${c}`)
                        const ehPrimeira = primeira && primeira.r === r && primeira.c === c
                        return (
                          <button
                            key={`${r}-${c}`}
                            disabled={ja_respondeu}
                            onClick={() => tocarCelula(q, r, c)}
                            style={{
                              aspectRatio: '1', minWidth: 0, padding: 0, fontFamily: 'inherit',
                              fontSize: 'clamp(.6rem, 2.5vw, .85rem)', fontWeight: 800,
                              borderRadius: 4, cursor: ja_respondeu ? 'default' : 'pointer',
                              background: marcada ? '#00c264' : ehPrimeira ? '#1a3fd4' : '#f9fafb',
                              color: marcada || ehPrimeira ? '#fff' : '#1e3a5f',
                              border: marcada ? '1px solid #00a855' : ehPrimeira ? '1px solid #1a3fd4' : '1px solid #e5e7eb',
                              transition: 'all .1s',
                            }}
                          >{letra}</button>
                        )
                      }))}
                    </div>
                    {/* Lista de palavras a encontrar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '.75rem', justifyContent: 'center' }}>
                      {(q.palavras || (ja_respondeu ? encontradas : [])).map(p => {
                        const achou = encontradas.includes(p)
                        return (
                          <span key={p} style={{
                            padding: '.25rem .6rem', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                            background: achou ? '#dcfce7' : '#f3f4f6',
                            color: achou ? '#166534' : '#6b7280',
                            textDecoration: achou ? 'line-through' : 'none',
                          }}>{achou ? '✓ ' : ''}{p}</span>
                        )
                      })}
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '.8rem', color: '#16a34a', fontWeight: 700, marginTop: '.5rem' }}>
                      {encontradas.length} de {(q.palavras || []).length || encontradas.length} palavras encontradas
                    </p>
                  </div>
                )
              })()}

              {/* ── CRUZADINHA: grade visual + resposta por dica ── */}
              {q.tipo_questao === 'cruzadinha' && q.cruzadinha && (() => {
                const respCruz = ja_respondeu
                  ? (() => { try { return JSON.parse(resp_salvas?.find(r => r.questao_id === q.id)?.resposta_marcada || '{}') } catch { return {} } })()
                  : null
                const celulasSet = new Set((q.cruzadinha.celulas || []).map(cel => `${cel.r}-${cel.c}`))
                const numeros = {}
                ;(q.cruzadinha.palavras || []).forEach(p => {
                  const chave = `${p.linha}-${p.coluna}`
                  if (!numeros[chave]) numeros[chave] = p.numero
                })
                return (
                  <div>
                    {/* Grade visual (formato da cruzadinha) */}
                    <div style={{ overflowX: 'auto', marginBottom: '.75rem' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: `repeat(${q.cruzadinha.colunas}, 22px)`,
                        gridAutoRows: '22px', gap: 1, justifyContent: 'center', minWidth: 'min-content', margin: '0 auto',
                      }}>
                        {Array.from({ length: q.cruzadinha.linhas }).map((_, r) =>
                          Array.from({ length: q.cruzadinha.colunas }).map((_, c) => {
                            const ativa = celulasSet.has(`${r}-${c}`)
                            return (
                              <div key={`${r}-${c}`} style={{
                                background: ativa ? '#fff' : 'transparent',
                                border: ativa ? '1.5px solid #1a3fd4' : 'none',
                                borderRadius: 3, position: 'relative',
                              }}>
                                {ativa && numeros[`${r}-${c}`] && (
                                  <span style={{ position: 'absolute', top: 0, left: 1, fontSize: 8, fontWeight: 900, color: '#1a3fd4' }}>
                                    {numeros[`${r}-${c}`]}
                                  </span>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                    {/* Dicas com campo de resposta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                      {(q.cruzadinha.palavras || []).map(p => {
                        const valor = ja_respondeu ? (respCruz?.[p.numero]?.digitada || '') : (respostas[q.id]?.[p.numero] || '')
                        const ok = ja_respondeu ? respCruz?.[p.numero]?.ok : null
                        return (
                          <div key={p.numero} style={{ background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 8, padding: '.6rem .75rem' }}>
                            <div style={{ fontSize: '.85rem', color: '#1e3a5f', marginBottom: '.35rem' }}>
                              <strong style={{ color: '#1a3fd4' }}>{p.numero}.</strong> {p.dica}
                              <span style={{ color: '#9ca3af', fontSize: '.75rem' }}> ({p.tamanho} letras, {p.direcao})</span>
                            </div>
                            {ja_respondeu ? (
                              <div style={{ fontSize: '.85rem', fontWeight: 700, color: ok ? '#16a34a' : '#dc2626' }}>
                                {ok ? '✅' : '❌'} {valor || '—'}
                              </div>
                            ) : (
                              <input
                                value={valor}
                                maxLength={p.tamanho}
                                onChange={e => digitarCruzadinha(q.id, p.numero, e.target.value.toUpperCase())}
                                placeholder={'_ '.repeat(p.tamanho).trim()}
                                style={{
                                  width: '100%', border: valor.length === p.tamanho ? '2px solid #00c264' : '2px solid #e5e7eb',
                                  borderRadius: 8, padding: '.5rem .75rem', fontFamily: 'inherit', fontSize: '.95rem',
                                  fontWeight: 800, letterSpacing: '.35em', textTransform: 'uppercase',
                                  color: '#1e3a5f', boxSizing: 'border-box', background: '#fff',
                                }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* ── COMPLETAR LACUNAS: texto + banco de palavras ── */}
              {q.tipo_questao === 'lacunas' && (q.texto_partes || []).length > 0 && (() => {
                const respLac = ja_respondeu
                  ? (() => { try { return JSON.parse(resp_salvas?.find(r => r.questao_id === q.id)?.resposta_marcada || '[]') } catch { return [] } })()
                  : (respostas[q.id] || [])
                const usadas = respLac.filter(Boolean)
                return (
                  <div>
                    {/* Banco de palavras */}
                    {!ja_respondeu && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '.5rem .75rem', marginBottom: '.75rem' }}>
                        <span style={{ fontSize: '.7rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase' }}>Banco de palavras: </span>
                        {(q.banco_palavras || []).map(p => (
                          <span key={p} style={{
                            display: 'inline-block', margin: '2px 3px', padding: '.2rem .55rem', borderRadius: 16,
                            fontSize: '.8rem', fontWeight: 700,
                            background: usadas.includes(p) ? '#e5e7eb' : '#fff',
                            color: usadas.includes(p) ? '#9ca3af' : '#166534',
                            border: '1px solid #bbf7d0',
                            textDecoration: usadas.includes(p) ? 'line-through' : 'none',
                          }}>{p}</span>
                        ))}
                      </div>
                    )}
                    {/* Texto com as lacunas */}
                    <div style={{ fontSize: '.95rem', lineHeight: 2.2, color: '#1e3a5f' }}>
                      {(q.texto_partes || []).map((parte, pi) => parte.tipo === 'texto'
                        ? <span key={pi}>{parte.valor}</span>
                        : ja_respondeu
                          ? <strong key={pi} style={{ borderBottom: '2px solid #1a3fd4', padding: '0 .4rem', color: '#1a3fd4' }}>{respLac[parte.indice] || '___'}</strong>
                          : (
                            <select
                              key={pi}
                              value={respLac[parte.indice] || ''}
                              onChange={e => escolherLacuna(q.id, parte.indice, e.target.value)}
                              style={{
                                border: respLac[parte.indice] ? '2px solid #00c264' : '2px solid #e5e7eb',
                                borderRadius: 8, padding: '.25rem .5rem', fontFamily: 'inherit', fontSize: '.85rem',
                                fontWeight: 700, background: respLac[parte.indice] ? '#f0fdf4' : '#fff',
                                color: '#1e3a5f', margin: '0 2px', maxWidth: 160,
                              }}
                            >
                              <option value="">escolher...</option>
                              {(q.banco_palavras || []).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          )
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ── MÚLTIPLA ESCOLHA (modelo original) ── */}
              {(!q.tipo_questao || q.tipo_questao === 'multipla') && (
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
              )}
              {ja_respondeu && gabarito?.explicacao && (
                <div style={s.explicacao}>💡 {gabarito.explicacao}</div>
              )}
            </div>
          )
        })}

        {/* Botão enviar */}
        {!ja_respondeu && (
          <button style={{ ...s.btn, width: '100%', marginTop: '1rem' }} onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando...' : `📤 Enviar Respostas (${questoes.filter(q => respondida(q)).length}/${questoes.length})`}
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
