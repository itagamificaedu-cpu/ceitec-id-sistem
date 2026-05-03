import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

export default function Carteirinha() {
  const { id } = useParams()
  const [aluno, setAluno] = useState(null)
  const [qrcode, setQrcode] = useState('')
  const [carregando, setCarregando] = useState(true)
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
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
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
        backgroundColor: null
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54)
      pdf.save(`carteirinha_${aluno.codigo}.pdf`)
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message)
    }
  }

  function imprimir() {
    window.print()
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center">
          <p className="text-gray-400">Carregando...</p>
        </main>
      </div>
    )
  }

  if (!aluno) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center">
          <p className="text-danger">Aluno não encontrado</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/alunos" className="text-gray-500 hover:text-primary">← Voltar</Link>
            <h1 className="text-2xl font-bold text-textMain">Carteirinha — {aluno.nome}</h1>
          </div>

          {/* Carteirinha Preview */}
          <div className="flex justify-center mb-6">
            <div
              ref={carteirinhaRef}
              style={{
                width: '342px',
                height: '216px',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2040 100%)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'Segoe UI, system-ui, sans-serif'
              }}
            >
              {/* Decoração fundo */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', left: '-10px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ color: '#f5a623', fontSize: '14px', fontWeight: '900', letterSpacing: '1px', lineHeight: 1 }}>ITA TECNOLOGIA</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', letterSpacing: '1px' }}>EDUCACIONAL</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', textAlign: 'right' }}>
                  <div>ID ESTUDANTIL</div>
                  <div style={{ color: '#f5a623', fontSize: '7px', marginTop: '2px' }}>2024</div>
                </div>
              </div>

              {/* Conteúdo principal */}
              <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                {/* Foto */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid #f5a623',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {aluno.foto_path ? (
                      <img src={aluno.foto_path} alt={aluno.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>

                  {/* Dados */}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: '700', lineHeight: 1.2, maxWidth: '140px', marginBottom: '4px' }}>{aluno.nome}</div>
                    <div style={{ color: '#f5a623', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', marginBottom: '3px' }}>{aluno.codigo}</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8.5px', marginBottom: '2px' }}>{aluno.turma}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8px' }}>{aluno.curso}</div>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    background: '#ffffff',
                    padding: '6px',
                    borderRadius: '8px',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {qrcode && <img src={qrcode} alt="QR Code" style={{ width: '88px', height: '88px' }} />}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', textAlign: 'center' }}>Escaneie para presença</div>
                </div>
              </div>

              {/* Rodapé */}
              <div style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '7px',
                letterSpacing: '1px'
              }}>
                DOCUMENTO DE IDENTIFICAÇÃO ESTUDANTIL • NÃO TRANSFERÍVEL
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={baixarPDF} className="btn-primary">
              📥 Baixar PDF
            </button>
            <button onClick={imprimir} className="btn-secondary">
              🖨️ Imprimir
            </button>
            <Link to={`/alunos/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              ✏️ Editar Aluno
            </Link>
          </div>

          {/* Info */}
          <div className="mt-6 bg-white rounded-xl shadow-md p-4 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Código:</span> <span className="font-mono font-bold text-secondary">{aluno.codigo}</span></div>
            <div><span className="text-gray-500">Matrícula:</span> {(() => { const d = new Date(aluno.data_matricula); return aluno.data_matricula && !isNaN(d) ? d.toLocaleDateString('pt-BR') : '—' })()}</div>
            <div><span className="text-gray-500">Turma:</span> {aluno.turma}</div>
            <div><span className="text-gray-500">Curso:</span> {aluno.curso}</div>
            {aluno.email_responsavel && (
              <div className="col-span-2"><span className="text-gray-500">Email responsável:</span> {aluno.email_responsavel}</div>
            )}
            {aluno.telefone_responsavel && (
              <div className="col-span-2"><span className="text-gray-500">WhatsApp responsável:</span> {aluno.telefone_responsavel}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
