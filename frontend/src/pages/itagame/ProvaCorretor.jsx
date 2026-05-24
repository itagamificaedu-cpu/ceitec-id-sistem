import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

const CORRETOR_BASE = 'https://correcaoonlineita.pythonanywhere.com'

/* Paleta neon igual ao portal do aluno */
const N = {
  amarelo: '#FFE600',
  verde:   '#00FF88',
  rosa:    '#FF2D78',
  azul:    '#00CFFF',
  bg:      '#0A0A0F',
  card:    '#12121A',
  borda:   '#1E1E2E',
  branco:  '#FFFFFF',
  cinza:   '#888899',
}

/* ── Estilos responsivos globais ── */
const estilosCSS = `
  @media (max-width: 600px) {
    .prova-header-inner { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
    .prova-progress-bar { width: 100% !important; }
    .prova-main { padding: 12px 8px !important; }
    .prova-grid { grid-template-columns: 1fr !important; }
    .prova-iframe { height: 320px !important; }
    .prova-send-btn { font-size: 15px !important; padding: 15px !important; }
  }
`

export default function ProvaCorretor() {
  const { uuid } = useParams()
  const [searchParams] = useSearchParams()
  const codigoAluno = searchParams.get('codigo') || ''

  const [prova, setProva]           = useState(null)
  const [respostas, setRespostas]   = useState({})  // { "1": "A", "2": "C", ... }
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando]     = useState(false)
  const [resultado, setResultado]   = useState(null) // { sucesso, nota, acertos, erros }
  const [erro, setErro]             = useState('')

  /* Carrega estrutura da prova via portal backend */
  useEffect(() => {
    if (!uuid) return
    fetch(`/node-api/portal/corretor-prova/${uuid}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) { setErro(data.erro); setCarregando(false); return }
        setProva(data)
      })
      .catch(() => setErro('Não foi possível carregar a prova. Tente novamente.'))
      .finally(() => setCarregando(false))
  }, [uuid])

  function selecionarResposta(q, ans) {
    setRespostas(prev => ({ ...prev, [String(q)]: ans }))
  }

  async function enviarProva() {
    if (!prova || !codigoAluno) return

    // Verifica se todas as questões foram respondidas
    const naoRespondidas = []
    for (let q = 1; q <= prova.numQuestoes; q++) {
      if (!respostas[String(q)]) naoRespondidas.push(q)
    }
    if (naoRespondidas.length > 0) {
      alert(`Responda todas as questões antes de enviar.\nQuestões sem resposta: ${naoRespondidas.join(', ')}`)
      return
    }

    const confirmar = window.confirm('Tem certeza que quer enviar a prova? Você não poderá alterar as respostas.')
    if (!confirmar) return

    setEnviando(true)
    setErro('')
    try {
      const resp = await fetch(`/node-api/portal/corretor-submit/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoAluno, respostas }),
      })
      const data = await resp.json()
      if (data.sucesso) {
        setResultado(data)
      } else {
        setErro(data.erro || 'Erro ao enviar a prova.')
      }
    } catch {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  /* ── Tela de carregando ── */
  if (carregando) return (
    <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>⏳</div>
      <div style={{ color: N.amarelo, fontWeight: 900, fontSize: 20 }}>Carregando prova...</div>
    </div>
  )

  /* ── Tela de erro ── */
  if (erro && !prova) return (
    <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ color: N.rosa, fontWeight: 900, fontSize: 20, textAlign: 'center' }}>{erro}</div>
      <button onClick={() => window.close()} style={{ background: N.borda, color: N.cinza, border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
        Fechar
      </button>
    </div>
  )

  /* ── Overlay de resultado ── */
  if (resultado) return (
    <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: N.card, borderRadius: 28, padding: 40, maxWidth: 480, width: '100%', border: `2px solid ${N.verde}44`, textAlign: 'center', boxShadow: `0 0 60px ${N.verde}22` }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <div style={{ color: N.verde, fontWeight: 900, fontSize: 28, letterSpacing: 2, marginBottom: 4 }}>PROVA ENVIADA!</div>
        <div style={{ color: N.cinza, fontSize: 14, marginBottom: 32 }}>{prova?.titulo}</div>

        <div style={{ background: '#0A0A0F', borderRadius: 20, padding: 24, marginBottom: 24, border: `1px solid ${N.verde}33` }}>
          <div style={{ color: N.cinza, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>SUA NOTA</div>
          <div style={{ color: N.verde, fontWeight: 900, fontSize: 56, lineHeight: 1, textShadow: `0 0 30px ${N.verde}` }}>
            {resultado.nota?.toFixed(1).replace('.', ',')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div style={{ background: '#0A0A0F', borderRadius: 14, padding: '12px 16px', border: `1px solid ${N.verde}33` }}>
            <div style={{ color: N.verde, fontWeight: 900, fontSize: 24 }}>✅ {resultado.acertos}</div>
            <div style={{ color: N.cinza, fontSize: 12, marginTop: 2 }}>Acertos</div>
          </div>
          <div style={{ background: '#0A0A0F', borderRadius: 14, padding: '12px 16px', border: `1px solid ${N.rosa}33` }}>
            <div style={{ color: N.rosa, fontWeight: 900, fontSize: 24 }}>❌ {resultado.erros}</div>
            <div style={{ color: N.cinza, fontSize: 12, marginTop: 2 }}>Erros</div>
          </div>
        </div>

        <div style={{ color: N.cinza, fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          Sua nota foi registrada automaticamente no sistema.
        </div>

        <button onClick={() => window.close()} style={{
          background: `linear-gradient(135deg, ${N.verde}, #008844)`,
          border: 'none', borderRadius: 16, padding: '14px 28px',
          color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer',
          width: '100%', boxShadow: `0 0 30px ${N.verde}44`,
        }}>
          Fechar
        </button>
      </div>
    </div>
  )

  const totalRespondidas = Object.keys(respostas).length
  const progresso = prova ? Math.round((totalRespondidas / prova.numQuestoes) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: N.bg, color: N.branco, fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{estilosCSS}</style>

      {/* Header */}
      <div style={{ background: N.card, borderBottom: `1px solid ${N.borda}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div className="prova-header-inner" style={{ maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: N.verde, fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              📄 Corretor de Provas
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: N.branco }}>{prova?.titulo}</div>
          </div>
          <div className="prova-progress-bar" style={{ textAlign: 'right', minWidth: 120 }}>
            <div style={{ color: N.cinza, fontSize: 12, marginBottom: 2 }}>{totalRespondidas} / {prova?.numQuestoes} respondidas</div>
            <div style={{ width: '100%', height: 6, background: N.borda, borderRadius: 3 }}>
              <div style={{ width: `${progresso}%`, height: '100%', background: progresso === 100 ? N.verde : N.amarelo, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="prova-main" style={{ maxWidth: '100%', padding: '16px', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

        {/* PDF da prova */}
        {prova?.pdfUrl && (
          <div style={{ background: N.card, borderRadius: 20, border: `1px solid ${N.borda}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${N.borda}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: N.verde, fontWeight: 700, fontSize: 14 }}>📄 Prova em PDF</span>
              <a href={prova.pdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: N.azul, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                ↗ Abrir em nova aba
              </a>
            </div>
            <iframe
              src={prova.pdfUrl}
              className="prova-iframe"
              style={{ width: '100%', height: 500, border: 'none', display: 'block' }}
              title="Prova"
            />
          </div>
        )}

        {/* Gabarito de respostas */}
        <div style={{ background: N.card, borderRadius: 20, border: `1px solid ${N.verde}33`, padding: 24 }}>
          <div style={{ color: N.verde, fontWeight: 900, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
            ✏️ Suas Respostas — {prova?.numQuestoes} questões
          </div>

          <div className="prova-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {Array.from({ length: prova?.numQuestoes || 0 }, (_, i) => i + 1).map(q => {
              const resp = respostas[String(q)]
              return (
                <div key={q} style={{
                  background: resp ? '#0A0A0F' : '#0E0E16',
                  borderRadius: 14,
                  border: `1px solid ${resp ? N.verde + '66' : N.borda}`,
                  padding: '12px 16px',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ color: N.cinza, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                    Questão {q}
                    {resp && <span style={{ marginLeft: 8, color: N.verde }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(prova?.alternativas || ['A','B','C','D','E']).map(alt => (
                      <button
                        key={alt}
                        onClick={() => selecionarResposta(q, alt)}
                        style={{
                          width: 40, height: 40,
                          borderRadius: 10,
                          border: `2px solid ${resp === alt ? N.verde : N.borda}`,
                          background: resp === alt ? N.verde : 'transparent',
                          color: resp === alt ? '#000' : N.cinza,
                          fontWeight: 900, fontSize: 15,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: resp === alt ? `0 0 14px ${N.verde}66` : 'none',
                        }}
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: `${N.rosa}15`, border: `1px solid ${N.rosa}44`, borderRadius: 14, padding: '14px 18px', color: '#FF8FA3', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ {erro}
          </div>
        )}

        {/* Botão enviar */}
        <button
          className="prova-send-btn"
          onClick={enviarProva}
          disabled={enviando || totalRespondidas < (prova?.numQuestoes || 0)}
          style={{
            background: totalRespondidas === prova?.numQuestoes
              ? `linear-gradient(135deg, ${N.verde}, #008844)`
              : N.borda,
            border: 'none', borderRadius: 18, padding: '18px',
            color: totalRespondidas === prova?.numQuestoes ? '#000' : N.cinza,
            fontWeight: 900, fontSize: 18,
            cursor: totalRespondidas === prova?.numQuestoes && !enviando ? 'pointer' : 'default',
            boxShadow: totalRespondidas === prova?.numQuestoes ? `0 0 40px ${N.verde}44` : 'none',
            letterSpacing: 1, transition: 'all 0.2s', width: '100%',
          }}
        >
          {enviando ? '⏳ Enviando...' : totalRespondidas < (prova?.numQuestoes || 0)
            ? `Responda todas as questões (${(prova?.numQuestoes || 0) - totalRespondidas} faltando)`
            : '✅ ENVIAR E VER NOTA'}
        </button>

      </div>
    </div>
  )
}
