import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

const ITAGAME_LINK = 'itatecnologiaeducacional.tech/itagame/aluno'

function parseTurma(turma) {
  if (!turma) return { ano: '', secao: '' }
  const parts = turma.trim().split(/\s+/)
  if (parts.length >= 3) {
    return { ano: `${parts[0]}º Ano`, secao: `Turma ${parts[parts.length - 1]}` }
  }
  return { ano: turma, secao: '' }
}

function CardCarteirinha({ aluno, qrcode }) {
  const { ano, secao } = parseTurma(aluno.turma)
  return (
    <div style={{
      width: '204px',
      height: '322px',
      background: 'linear-gradient(170deg, #1e3a5f 0%, #0f2040 55%, #1a1040 100%)',
      borderRadius: '12px',
      padding: '11px 12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      flexShrink: 0,
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(245,166,35,0.12)' }} />
      <div style={{ position: 'absolute', bottom: '40px', left: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ color: '#f5a623', fontSize: '14px', fontWeight: '900', letterSpacing: '1px', lineHeight: 1 }}>CEITEC</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '6.5px', letterSpacing: '1.5px', marginTop: '1px' }}>INOVAÇÃO E TECNOLOGIA</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '6.5px', letterSpacing: '0.5px' }}>ID ESTUDANTIL</div>
          <div style={{ color: '#f5a623', fontSize: '8px', fontWeight: '800', marginTop: '1px' }}>2025</div>
        </div>
      </div>

      {/* Foto */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '7px' }}>
        <div style={{
          width: '68px', height: '68px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '3px solid #f5a623',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {aluno.foto_path
            ? <img src={aluno.foto_path} alt={aluno.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            : <span style={{ fontSize: '28px' }}>👤</span>}
        </div>
      </div>

      {/* Nome e dados */}
      <div style={{ textAlign: 'center', marginBottom: '7px' }}>
        <div style={{ color: '#ffffff', fontSize: '10.5px', fontWeight: '700', lineHeight: 1.3, marginBottom: '4px' }}>{aluno.nome}</div>
        <div style={{ color: '#f5a623', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: '3px' }}>{aluno.codigo}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '8px' }}>
          {ano}{secao ? ` • ${secao}` : ''}
        </div>
      </div>

      {/* QR Code */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{
          background: '#ffffff',
          padding: '4px',
          borderRadius: '7px',
          width: '68px', height: '68px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {qrcode && <img src={qrcode} alt="QR" style={{ width: '60px', height: '60px' }} />}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '6.5px', marginTop: '3px', letterSpacing: '0.3px' }}>
          Escaneie para registrar presença
        </div>
      </div>

      {/* ItagGame */}
      <div style={{
        background: 'rgba(245,166,35,0.13)',
        border: '1px solid rgba(245,166,35,0.35)',
        borderRadius: '7px',
        padding: '4px 7px',
        marginBottom: '5px',
      }}>
        <div style={{ color: '#f5a623', fontSize: '7.5px', fontWeight: '900', letterSpacing: '0.8px', marginBottom: '2px' }}>
          🎮 ITAGAME — GANHE XP E MOEDAS
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '6.5px', lineHeight: 1.5 }}>
          Acesse: <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{ITAGAME_LINK}</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '6.5px' }}>
          Código: <span style={{ color: '#f5a623', fontFamily: 'monospace', fontWeight: '800' }}>{aluno.codigo}</span>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '4px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.25)',
        fontSize: '6px',
        letterSpacing: '0.8px',
      }}>
        DOCUMENTO DE IDENTIFICAÇÃO ESTUDANTIL • NÃO TRANSFERÍVEL
      </div>
    </div>
  )
}

export default function Carteirinha() {
  const { id } = useParams()
  const [aluno, setAluno] = useState(null)
  const [qrcode, setQrcode] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [turmaAlunos, setTurmaAlunos] = useState([])
  const [turmaQrcodes, setTurmaQrcodes] = useState({})
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

        // Carrega todos os alunos da turma para impressão
        setCarregandoTurma(true)
        const todosRes = await api.get('/alunos')
        const colegas = todosRes.data.filter(a => a.turma === alunoRes.data.turma && a.ativo !== 0)
        setTurmaAlunos(colegas)

        // Busca QR code de cada aluno da turma em paralelo
        const qrResults = await Promise.all(
          colegas.map(a => api.get(`/alunos/${a.id}/qrcode`).then(r => ({ id: a.id, qr: r.data.qrcode })).catch(() => ({ id: a.id, qr: '' })))
        )
        const qrMap = {}
        qrResults.forEach(({ id: aid, qr }) => { qrMap[aid] = qr })
        setTurmaQrcodes(qrMap)
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
                <CardCarteirinha aluno={aluno} qrcode={qrcode} />
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
              <div className="col-span-2 text-xs text-gray-400">
                Ao clicar em Imprimir, serão impressas as carteirinhas de todos os {turmaAlunos.length} alunos da turma {aluno.turma}, 8 por folha A4.
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Grade de impressão — 1 card por aluno da turma, 8 por folha */}
      <div className="print-grid">
        {turmaAlunos.map(a => (
          <div key={a.id} className="print-card-slot">
            <CardCarteirinha aluno={a} qrcode={turmaQrcodes[a.id] || ''} />
          </div>
        ))}
      </div>

      <style>{`
        @media screen {
          .print-grid { display: none !important; }
        }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }

          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;

          .tela-normal { display: none !important; }

          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, auto);
            gap: 5mm;
            justify-content: center;
            align-content: start;
          }

          .print-card-slot {
            break-inside: avoid;
            page-break-inside: avoid;
            display: block !important;
          }

          .print-card-slot * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}
