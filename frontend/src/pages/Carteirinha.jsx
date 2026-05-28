import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

const ITAGAME_BASE = 'itatecnologiaeducacional.tech/itagame/aluno'

function parseTurma(turma) {
  if (!turma) return { ano: '', secao: '' }
  const parts = turma.trim().split(/\s+/)
  if (parts.length >= 3) {
    return { ano: `${parts[0]}º Ano`, secao: `Turma ${parts[parts.length - 1]}` }
  }
  return { ano: turma, secao: '' }
}

function CardCarteirinha({ aluno, qrcode, equipe }) {
  const { ano, secao } = parseTurma(aluno.turma)
  return (
    <div style={{
      width: '204px',
      height: '322px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '2px solid #1e3a5f',
      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      flexShrink: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>

      {/* Cabeçalho navy */}
      <div style={{
        background: '#1e3a5f',
        padding: '8px 10px 7px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#f5a623', fontSize: '15px', fontWeight: '900', letterSpacing: '1px', lineHeight: 1 }}>CEITEC</div>
          <div style={{ color: '#ffffff', fontSize: '6px', fontWeight: '800', letterSpacing: '1.2px', marginTop: '2px' }}>INOVAÇÃO E TECNOLOGIA</div>
        </div>
        <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.4)', paddingLeft: '8px' }}>
          <div style={{ color: '#ffffff', fontSize: '6px', fontWeight: '800', letterSpacing: '0.5px', lineHeight: 1 }}>ID ESTUDANTIL</div>
          <div style={{ color: '#f5a623', fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px', lineHeight: 1.2 }}>2026</div>
        </div>
      </div>

      {/* Corpo */}
      <div style={{ padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Foto */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '70px', height: '70px',
            borderRadius: '50%',
            background: '#e8f0fb',
            border: '3px solid #1e3a5f',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {aluno.foto_path
              ? <img src={aluno.foto_path} alt={aluno.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              : <span style={{ fontSize: '30px' }}>👤</span>}
          </div>
        </div>

        {/* Nome e dados */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ color: '#000000', fontSize: '10.5px', fontWeight: '900', lineHeight: 1.3, marginBottom: '3px' }}>{aluno.nome}</div>
          <div style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: '3px' }}>{aluno.codigo}</div>
          <div style={{ color: '#000000', fontSize: '8px', fontWeight: '800' }}>
            {ano}{secao ? ` • ${secao}` : ''}
          </div>
        </div>

        {/* Linha divisória */}
        <div style={{ borderTop: '1px solid #d0dcea', marginBottom: '8px' }} />

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '7px' }}>
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #1e3a5f',
            borderRadius: '7px',
            padding: '4px',
            width: '70px', height: '70px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {qrcode && <img src={qrcode} alt="QR" style={{ width: '62px', height: '62px' }} />}
          </div>
          <div style={{ color: '#000000', fontSize: '6.5px', marginTop: '4px', letterSpacing: '0.3px', fontWeight: '800' }}>
            Escaneie para registrar presença
          </div>
        </div>

        {/* Startup (se tiver) */}
        {equipe && (
          <div style={{
            background: '#f5f0ff',
            border: '1.5px solid #7c3aed',
            borderRadius: '6px',
            padding: '4px 7px',
            marginBottom: '5px',
          }}>
            <div style={{ color: '#6d28d9', fontSize: '7px', fontWeight: '900', letterSpacing: '0.8px', marginBottom: '1px' }}>
              💼 STARTUP
            </div>
            <div style={{ color: '#1e1b4b', fontSize: '8px', fontWeight: '800', lineHeight: 1.3 }}>
              {equipe.nome_startup}
            </div>
            {equipe.e_lider
              ? <div style={{ color: '#92400e', fontSize: '6.5px', fontWeight: '700', marginTop: '1px' }}>👑 Líder da Equipe</div>
              : <div style={{ color: '#6d28d9', fontSize: '6px', marginTop: '1px' }}>Membro</div>
            }
          </div>
        )}

        {/* ItagGame */}
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #c47a00',
          borderRadius: '6px',
          padding: '4px 7px',
          marginBottom: '6px',
        }}>
          <div style={{ color: '#000000', fontSize: '7.5px', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '2px' }}>
            🎮 ACESSE SUA PÁGINA ITAGAME
          </div>
          <div style={{ color: '#000000', fontSize: '6px', fontFamily: 'monospace', fontWeight: '800', lineHeight: 1.6, wordBreak: 'break-all' }}>
            {ITAGAME_BASE}?codigo={aluno.codigo}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '5px',
          borderTop: '1px solid #d0dcea',
          textAlign: 'center',
          color: '#000000',
          fontSize: '5.5px',
          letterSpacing: '0.8px',
          fontWeight: '800',
        }}>
          DOCUMENTO DE IDENTIFICAÇÃO ESTUDANTIL • NÃO TRANSFERÍVEL
        </div>
      </div>
    </div>
  )
}

export default function Carteirinha() {
  const { id } = useParams()
  const [aluno, setAluno] = useState(null)
  const [qrcode, setQrcode] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [equipe, setEquipe] = useState(null)        // startup do aluno
  const [turmaAlunos, setTurmaAlunos] = useState([])
  const [turmaQrcodes, setTurmaQrcodes] = useState({})
  const [turmaEquipes, setTurmaEquipes] = useState({}) // equipe de cada aluno da turma
  const [carregandoTurma, setCarregandoTurma] = useState(false)
  const carteirinhaRef = useRef()

  useEffect(() => {
    async function carregar() {
      try {
        const [alunoRes, qrRes] = await Promise.all([
          api.get(`/alunos/${id}`),
          api.get(`/alunos/${id}/qrcode`)
        ])
        setAluno(alunoRes.data)
        setQrcode(qrRes.data.qrcode)

        // Busca startup do aluno (empreendedorismo) — silencioso se não tiver
        api.get(`/empreendedorismo/aluno/${id}/equipe`)
          .then(r => setEquipe(r.data))
          .catch(() => setEquipe(null))

        // Carrega todos os alunos da turma para impressão
        setCarregandoTurma(true)
        const todosRes = await api.get('/alunos')
        const colegas = todosRes.data.filter(a => a.turma === alunoRes.data.turma && a.ativo !== 0)
        setTurmaAlunos(colegas)

        // Busca QR code e equipe de cada aluno da turma em paralelo
        const [qrResults, eqResults] = await Promise.all([
          Promise.all(
            colegas.map(a => api.get(`/alunos/${a.id}/qrcode`)
              .then(r => ({ id: a.id, qr: r.data.qrcode }))
              .catch(() => ({ id: a.id, qr: '' })))
          ),
          Promise.all(
            colegas.map(a => api.get(`/empreendedorismo/aluno/${a.id}/equipe`)
              .then(r => ({ id: a.id, eq: r.data }))
              .catch(() => ({ id: a.id, eq: null })))
          ),
        ])
        const qrMap = {}
        qrResults.forEach(({ id: aid, qr }) => { qrMap[aid] = qr })
        setTurmaQrcodes(qrMap)

        const eqMap = {}
        eqResults.forEach(({ id: aid, eq }) => { eqMap[aid] = eq })
        setTurmaEquipes(eqMap)
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
        setCarregandoTurma(false)
      }
    }
    carregar()
  }, [id])

  async function baixarPDF() {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const canvas = await html2canvas(carteirinhaRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] })
      pdf.addImage(imgData, 'PNG', 0, 0, 54, 86)
      pdf.save(`carteirinha_${aluno.codigo}.pdf`)
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message)
    }
  }

  function imprimir() {
    window.print()
  }

  if (carregando) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </main>
    </div>
  )

  if (!aluno) return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 flex items-center justify-center">
        <p className="text-danger">Aluno não encontrado</p>
      </main>
    </div>
  )

  return (
    <>
      {/* Tela normal — some na impressão */}
      <div className="tela-normal flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Link to="/alunos" className="text-gray-500 hover:text-primary">← Voltar</Link>
              <h1 className="text-2xl font-bold text-textMain">Carteirinha — {aluno.nome}</h1>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div ref={carteirinhaRef}>
                <CardCarteirinha aluno={aluno} qrcode={qrcode} equipe={equipe} />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-center flex-wrap mb-6">
              <button onClick={baixarPDF} className="btn-primary">
                📥 Baixar PDF (crachá)
              </button>
              <button onClick={imprimir} disabled={carregandoTurma} className="btn-secondary">
                {carregandoTurma ? '⏳ Carregando turma...' : `🖨️ Imprimir turma (${turmaAlunos.length} alunos)`}
              </button>
              <Link to={`/alunos/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                ✏️ Editar Aluno
              </Link>
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl shadow-md p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Código:</span> <span className="font-mono font-bold text-secondary">{aluno.codigo}</span></div>
              <div><span className="text-gray-500">Turma:</span> {aluno.turma}</div>
              <div className="col-span-2">
                <span className="text-gray-500">Link ItagGame:</span>{' '}
                <a href={`https://${ITAGAME_BASE}?codigo=${aluno.codigo}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs break-all">
                  {ITAGAME_BASE}?codigo={aluno.codigo}
                </a>
              </div>
              <div className="col-span-2 text-xs text-gray-400">
                Ao clicar em Imprimir, serão impressas as carteirinhas de todos os {turmaAlunos.length} alunos da turma {aluno.turma}, 6 por folha A4 (3 colunas × 2 linhas), todas do mesmo tamanho.
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Grade de impressão — 6 por folha A4 (3 colunas × 2 linhas), tamanho idêntico */}
      <div className="print-grid">
        {/* Agrupa em páginas de 6 */}
        {Array.from({ length: Math.ceil(turmaAlunos.length / 6) }, (_, pi) =>
          turmaAlunos.slice(pi * 6, pi * 6 + 6)
        ).map((pagina, pi) => (
          <div key={pi} className="print-page">
            {pagina.map(a => (
              <div key={a.id} className="print-card-slot">
                <CardCarteirinha aluno={a} qrcode={turmaQrcodes[a.id] || ''} equipe={turmaEquipes[a.id] || null} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @media screen {
          .print-grid { display: none !important; }
        }

        @media print {
          /* A4 retrato, 8 mm de margem em todos os lados */
          @page { size: A4 portrait; margin: 8mm; }

          /* Força cores e fundos coloridos na impressão */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Esconde tudo exceto a grade */
          body * { visibility: hidden; }
          .print-grid,
          .print-grid * { visibility: visible !important; }
          .tela-normal { display: none !important; }

          /* Contêiner geral */
          .print-grid {
            display: block !important;
            position: absolute !important;
            top: 0; left: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /*
           * Cada página: grid 3×2
           * Área útil A4 com 8mm de margem: 194mm × 281mm
           * 3 colunas: (194 - 2×4mm gap) / 3 ≈ 62mm
           * 2 linhas: espaço reservado de 138mm mas o card
           *           NÃO é esticado — fica proporcional
           */
          .print-page {
            display: grid !important;
            grid-template-columns: repeat(3, 62mm) !important;
            grid-template-rows: repeat(2, auto) !important;
            align-items: start !important;
            gap: 6mm !important;
            width: 194mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            /* Quebra de página após cada grupo de 6 */
            break-after: page !important;
            page-break-after: always !important;
          }

          /* Última página não precisa de quebra */
          .print-page:last-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* Slot: centraliza o card horizontalmente, alinha no topo */
          .print-card-slot {
            width: 62mm !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            overflow: visible !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }

          /* Card: mantém proporção natural — SEM esticar altura.
             Só ajustamos a largura para caber nas 3 colunas. */
          .print-card-slot > div {
            width: 62mm !important;
            height: auto !important;
            min-height: unset !important;
            max-height: unset !important;
            flex-shrink: 0 !important;
            box-sizing: border-box !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
    </>
  )
}
