import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

const LETRAS = ['A', 'B', 'C', 'D']
const CORES_ALT = [
  'bg-red-500 hover:bg-red-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
]
const CORES_BORDA = [
  'border-red-300 focus:border-red-500',
  'border-blue-300 focus:border-blue-500',
  'border-yellow-300 focus:border-yellow-500',
  'border-green-300 focus:border-green-500',
]
const TEMPOS = [
  { s: 15,  label: '15s' },
  { s: 30,  label: '30s' },
  { s: 45,  label: '45s' },
  { s: 60,  label: '1min' },
  { s: 90,  label: '1min30' },
  { s: 120, label: '2min' },
]

function questaoVazia() {
  return {
    enunciado: '', alt_a: '', alt_b: '', alt_c: '', alt_d: '',
    resposta_correta: 0,
    imagem: null, imagem_pdf: null,
    alt_imagens: [null, null, null, null],
    alt_pdfs:    [null, null, null, null],
  }
}

// ── pdf.js ────────────────────────────────────────────────────────────────────
let pdfjsLib = null
async function carregarPdfJs() {
  if (pdfjsLib) return pdfjsLib
  await new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  pdfjsLib = window.pdfjsLib
  return pdfjsLib
}

// ── Upload de Imagem ──────────────────────────────────────────────────────────
function UploadImagem({ imagem, onChange, label = 'Imagem' }) {
  const ref = useRef()
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert(`⚠️ Imagem muito grande!\n\nTamanho: ${(file.size/1024/1024).toFixed(1)} MB\nLimite: 5 MB\n\nRedimensione antes de usar.`)
      e.target.value = ''; return
    }
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }
  return (
    <div style={{ marginTop: 6 }}>
      {imagem ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={imagem} alt="img" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: '1.5px solid #e5e7eb', display: 'block' }}/>
          <button type="button" onClick={() => onChange(null)} style={{
            position: 'absolute', top: -8, right: -8,
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
            fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current.click()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
          background: '#eff6ff', border: '1.5px dashed #1d4ed8', color: '#1d4ed8', cursor: 'pointer'
        }}>🖼️ {label}</button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Upload de PDF ─────────────────────────────────────────────────────────────
function UploadPdf({ imagem, onChange, label = 'PDF' }) {
  const ref = useRef()
  const [paginas,    setPaginas]    = useState([])
  const [abrindo,    setAbrindo]    = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handlePdf(e) {
    const file = e.target.files[0]
    if (!file) return
    setCarregando(true); setAbrindo(true); setPaginas([])
    try {
      const lib = await carregarPdfJs()
      const buf = await file.arrayBuffer()
      const pdf = await lib.getDocument({ data: buf }).promise
      const imgs = []
      for (let p = 1; p <= pdf.numPages; p++) {
        const page   = await pdf.getPage(p)
        const vp     = page.getViewport({ scale: 1.2 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        imgs.push(canvas.toDataURL('image/jpeg', 0.85))
      }
      setPaginas(imgs)
    } catch {
      alert('Erro ao abrir PDF.'); setAbrindo(false)
    } finally {
      setCarregando(false); e.target.value = ''
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      {imagem ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={imagem} alt="pdf" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: '1.5px solid #e5e7eb', display: 'block' }}/>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(124,58,237,.8)', color: '#fff', fontSize: 9, textAlign: 'center', padding: '2px', borderRadius: '0 0 8px 8px', fontWeight: 700 }}>📄 PDF</div>
          <button type="button" onClick={() => onChange(null)} style={{
            position: 'absolute', top: -8, right: -8,
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
            fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current.click()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
          background: '#faf5ff', border: '1.5px dashed #7c3aed', color: '#7c3aed', cursor: 'pointer'
        }}>{carregando ? '⏳' : '📄'} {label}</button>
      )}
      <input ref={ref} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdf} />

      {/* Modal páginas */}
      {abrindo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 22, maxWidth: 680, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>📄 Selecione a página</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Clique na página para usar como imagem</div>
              </div>
              <button onClick={() => { setAbrindo(false); setPaginas([]) }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>Fechar</button>
            </div>
            {carregando ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>⏳ Carregando páginas...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, overflowY: 'auto' }}>
                {paginas.map((img, i) => (
                  <div key={i} onClick={() => { onChange(img); setAbrindo(false); setPaginas([]) }}
                    style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: '2px solid #e5e7eb', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#1d4ed8'; e.currentTarget.style.transform='translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e5e7eb'; e.currentTarget.style.transform='none' }}>
                    <img src={img} alt={`Página ${i+1}`} style={{ width: '100%', display: 'block' }}/>
                    <div style={{ background: '#f9fafb', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#374151', padding: '4px' }}>Pág. {i+1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CriadorQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [form,         setForm]         = useState({ titulo: '', descricao: '', tempo_por_questao: 30, auto_avancar: false })
  const [questoes,     setQuestoes]     = useState([questaoVazia()])
  const [salvando,     setSalvando]     = useState(false)
  const [erro,         setErro]         = useState('')
  const [questaoAtiva, setQuestaoAtiva] = useState(0)

  // IA
  const [iaAberto,  setIaAberto]  = useState(false)
  const [iaTema,    setIaTema]    = useState('')
  const [iaNivel,   setIaNivel]   = useState('médio')
  const [iaQtd,     setIaQtd]     = useState(5)
  const [iaGerando, setIaGerando] = useState(false)
  const [iaErro,    setIaErro]    = useState('')

  useEffect(() => {
    if (editando) {
      api.get(`/quiz/${id}`).then(({ data }) => {
        setForm({ titulo: data.titulo || '', descricao: data.descricao || '', tempo_por_questao: data.tempo_por_questao || 30, auto_avancar: !!data.auto_avancar })
        if (data.questoes?.length > 0) {
          setQuestoes(data.questoes.map(q => ({
            enunciado: q.enunciado || '',
            alt_a: q.alt_a || '', alt_b: q.alt_b || '',
            alt_c: q.alt_c || '', alt_d: q.alt_d || '',
            resposta_correta: q.resposta_correta ?? 0,
            imagem:     q.imagem     || null,
            imagem_pdf: q.imagem_pdf || null,
            alt_imagens: q.alt_imagens ? (typeof q.alt_imagens === 'string' ? JSON.parse(q.alt_imagens) : q.alt_imagens) : [null,null,null,null],
            alt_pdfs:    q.alt_pdfs    ? (typeof q.alt_pdfs    === 'string' ? JSON.parse(q.alt_pdfs)    : q.alt_pdfs)    : [null,null,null,null],
          })))
          setQuestaoAtiva(0)
        }
      })
    }
  }, [id])

  function addQuestao() {
    setQuestoes(q => [...q, questaoVazia()])
    setQuestaoAtiva(questoes.length)
  }
  function removeQuestao(idx) {
    if (questoes.length <= 1) return
    const nova = questoes.filter((_, i) => i !== idx)
    setQuestoes(nova)
    setQuestaoAtiva(Math.min(questaoAtiva, nova.length - 1))
  }
  function updateQ(idx, campo, valor) {
    setQuestoes(qs => qs.map((q, i) => i === idx ? { ...q, [campo]: valor } : q))
  }
  function getAlts(q) { return [q.alt_a, q.alt_b, q.alt_c, q.alt_d] }
  function setAlt(idx, aIdx, valor) {
    const campos = ['alt_a', 'alt_b', 'alt_c', 'alt_d']
    updateQ(idx, campos[aIdx], valor)
  }
  function setAltImagem(qIdx, aIdx, valor) {
    setQuestoes(qs => qs.map((q, i) => i !== qIdx ? q : {
      ...q, alt_imagens: (q.alt_imagens || [null,null,null,null]).map((v,j) => j === aIdx ? valor : v)
    }))
  }
  function setAltPdf(qIdx, aIdx, valor) {
    setQuestoes(qs => qs.map((q, i) => i !== qIdx ? q : {
      ...q, alt_pdfs: (q.alt_pdfs || [null,null,null,null]).map((v,j) => j === aIdx ? valor : v)
    }))
  }

  async function gerarComIA() {
    if (!iaTema.trim()) return setIaErro('Informe o tema das questões.')
    setIaErro(''); setIaGerando(true)
    try {
      const { data } = await api.post('/ia/questoes', { tema: iaTema, nivel: iaNivel, quantidade: iaQtd })
      const novas = data.questoes.map(q => ({
        enunciado: q.enunciado || '',
        alt_a: q.alternativas?.[0] || '', alt_b: q.alternativas?.[1] || '',
        alt_c: q.alternativas?.[2] || '', alt_d: q.alternativas?.[3] || '',
        resposta_correta: q.resposta_correta ?? 0,
        imagem: null, imagem_pdf: null,
        alt_imagens: [null,null,null,null], alt_pdfs: [null,null,null,null],
      }))
      setQuestoes(prev => { const semVazias = prev.filter(q => q.enunciado.trim()); return [...semVazias, ...novas] })
      setQuestaoAtiva(0); setIaAberto(false); setIaTema('')
    } catch (err) {
      setIaErro(err.response?.data?.erro || 'Erro ao gerar questões.')
    } finally { setIaGerando(false) }
  }

  async function salvar() {
    setErro('')
    if (!form.titulo.trim()) return setErro('O título do quiz é obrigatório.')
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i]
      if (!q.enunciado.trim()) return setErro(`A pergunta ${i + 1} está vazia.`)
      if (!q.alt_a.trim() || !q.alt_b.trim()) return setErro(`A pergunta ${i + 1} precisa ter ao menos 2 alternativas (A e B).`)
    }
    setSalvando(true)
    try {
      const payload = { ...form, questoes }
      if (editando) await api.put(`/quiz/${id}`, payload)
      else          await api.post('/quiz', payload)
      navigate('/quiz')
    } catch (e) {
      const msg = e.response?.data?.erro
        || (e.code === 'ECONNABORTED' ? 'Tempo esgotado — imagem muito grande' : null)
        || e.message || 'Erro ao salvar. Tente novamente.'
      setErro(msg)
    } finally { setSalvando(false) }
  }

  const qAtual = questoes[questaoAtiva] || questaoVazia()

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to="/quiz" className="text-gray-400 hover:text-gray-600">← Voltar</Link>
              <h1 className="text-xl font-bold text-textMain">{editando ? '✏️ Editar Quiz' : '✨ Criar Novo Quiz'}</h1>
            </div>
            <button onClick={salvar} disabled={salvando} className="btn-primary text-sm px-6">
              {salvando ? 'Salvando...' : '💾 Salvar Quiz'}
            </button>
          </div>

          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">⚠️ {erro}</div>}

          {/* Aviso de formatos */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'10px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#1d4ed8', fontWeight:600 }}>
              🖼️ <span><strong>Imagem:</strong> JPG, PNG, GIF, WEBP · máx. <strong>5 MB</strong></span>
            </div>
            <span style={{ color:'#93c5fd' }}>|</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#7c3aed', fontWeight:600 }}>
              📄 <span><strong>PDF:</strong> qualquer PDF · selecione a página · máx. <strong>50 MB</strong></span>
            </div>
            <span style={{ color:'#93c5fd' }}>|</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
              💡 Adicione no <strong>enunciado</strong> e em cada <strong>alternativa</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Coluna esquerda */}
            <div className="lg:col-span-1 space-y-4">
              {/* Configurações */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">⚙️ Configurações</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                    <input className="input-field text-sm" placeholder="Ex: Matemática — Frações" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição</label>
                    <textarea className="input-field text-sm resize-none" rows={2} placeholder="Sobre qual assunto é este quiz?" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">⏱️ Tempo por pergunta</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPOS.map(({ s, label }) => (
                        <button key={s} type="button" onClick={() => setForm(f => ({ ...f, tempo_por_questao: s }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.tempo_por_questao === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1">
                    <button type="button" onClick={() => setForm(f => ({ ...f, auto_avancar: !f.auto_avancar }))}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${form.auto_avancar ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <div className="text-left">
                        <div className={`text-xs font-bold ${form.auto_avancar ? 'text-violet-700' : 'text-gray-700'}`}>⚡ Avançar automático</div>
                        <div className="text-xs text-gray-400 mt-0.5">{form.auto_avancar ? 'Questões avançam sozinhas ao acabar o tempo' : 'Professor controla quando avançar'}</div>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${form.auto_avancar ? 'bg-violet-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${form.auto_avancar ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de questões */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">📋 Perguntas ({questoes.length})</h3>
                <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
                  {questoes.map((q, i) => (
                    <button key={i} onClick={() => setQuestaoAtiva(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 ${questaoAtiva === i ? 'bg-primary text-white font-semibold' : 'hover:bg-gray-50 text-gray-700 border border-gray-100'}`}>
                      <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black ${questaoAtiva === i ? 'bg-white/20' : 'bg-gray-100'}`}>{i + 1}</span>
                      <span className="truncate">{q.enunciado || <span className="opacity-50">Pergunta {i + 1}</span>}</span>
                      {(q.imagem || q.imagem_pdf) && <span style={{ fontSize:10 }}>🖼️</span>}
                    </button>
                  ))}
                </div>
                <button onClick={addQuestao} className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-primary hover:text-primary transition-colors mb-2">
                  + Adicionar pergunta
                </button>
                <button onClick={() => setIaAberto(true)} className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  🤖 Gerar com IA
                </button>
              </div>
            </div>

            {/* Coluna direita: editor */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-800">Pergunta {questaoAtiva + 1} de {questoes.length}</h3>
                  <button onClick={() => removeQuestao(questaoAtiva)} disabled={questoes.length <= 1} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30">
                    🗑️ Remover
                  </button>
                </div>

                {/* ── ENUNCIADO ── */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">Texto da pergunta *</label>
                  <textarea
                    className="input-field text-base font-medium resize-none"
                    rows={3}
                    placeholder="Digite a pergunta aqui..."
                    value={qAtual.enunciado}
                    onChange={e => updateQ(questaoAtiva, 'enunciado', e.target.value)}
                  />
                  {/* Mídia do enunciado */}
                  <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                    <UploadImagem imagem={qAtual.imagem} onChange={v => updateQ(questaoAtiva, 'imagem', v)} label="Adicionar imagem" />
                    <UploadPdf   imagem={qAtual.imagem_pdf} onChange={v => updateQ(questaoAtiva, 'imagem_pdf', v)} label="Recorte de PDF" />
                  </div>
                </div>

                {/* ── ALTERNATIVAS ── */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Alternativas — marque a correta ✓</p>
                  <div className="space-y-3">
                    {getAlts(qAtual).map((alt, aIdx) => (
                      <div key={aIdx} style={{
                        borderRadius: 14, border: qAtual.resposta_correta === aIdx ? '2px solid #22c55e' : '1.5px solid #e5e7eb',
                        background: qAtual.resposta_correta === aIdx ? '#f0fdf4' : '#fff',
                        padding: '10px 12px',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {/* Letra */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${CORES_ALT[aIdx].split(' ')[0]}`}>
                            {LETRAS[aIdx]}
                          </div>
                          {/* Input */}
                          <input
                            className="flex-1 bg-transparent text-sm font-medium outline-none"
                            placeholder={`Alternativa ${LETRAS[aIdx]}${aIdx < 2 ? ' *' : ' (opcional)'}`}
                            value={alt || ''}
                            onChange={e => setAlt(questaoAtiva, aIdx, e.target.value)}
                          />
                          {/* Marcar correta */}
                          <button onClick={() => updateQ(questaoAtiva, 'resposta_correta', aIdx)}
                            style={{ width:24, height:24, borderRadius:'50%', border: qAtual.resposta_correta === aIdx ? '2px solid #22c55e' : '2px solid #d1d5db', background: qAtual.resposta_correta === aIdx ? '#22c55e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                            {qAtual.resposta_correta === aIdx && <span style={{ color:'#fff', fontSize:12, fontWeight:900 }}>✓</span>}
                          </button>
                        </div>
                        {/* Mídia da alternativa */}
                        <div style={{ display:'flex', gap:6, marginTop:6, paddingLeft:40, flexWrap:'wrap' }}>
                          <UploadImagem imagem={(qAtual.alt_imagens||[])[aIdx]} onChange={v => setAltImagem(questaoAtiva, aIdx, v)} label="Img" />
                          <UploadPdf   imagem={(qAtual.alt_pdfs||[])[aIdx]}    onChange={v => setAltPdf(questaoAtiva, aIdx, v)}    label="PDF" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Clique em ✓ para marcar a correta &nbsp;·&nbsp; 🖼️ Imagem: JPG/PNG até 5MB &nbsp;·&nbsp; 📄 PDF: até 50MB, escolha a página
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Preview como aluno vê</p>
                  {(qAtual.imagem || qAtual.imagem_pdf) && (
                    <img src={qAtual.imagem || qAtual.imagem_pdf} alt="preview" style={{ maxHeight:100, borderRadius:8, marginBottom:8, display:'block' }}/>
                  )}
                  <p className="text-white font-semibold text-sm mb-3">{qAtual.enunciado || 'Sua pergunta aparecerá aqui...'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getAlts(qAtual).map((alt, aIdx) => (alt || (qAtual.alt_imagens||[])[aIdx] || (qAtual.alt_pdfs||[])[aIdx]) ? (
                      <div key={aIdx} className={`rounded-lg p-2 flex flex-col gap-1 text-white text-xs font-medium ${['bg-red-500','bg-blue-500','bg-yellow-500','bg-green-600'][aIdx]}`}>
                        <div className="flex items-center gap-1">
                          <span className="bg-black/20 rounded px-1 font-black">{LETRAS[aIdx]}</span>
                          {alt}
                        </div>
                        {((qAtual.alt_imagens||[])[aIdx] || (qAtual.alt_pdfs||[])[aIdx]) && (
                          <img src={(qAtual.alt_imagens||[])[aIdx] || (qAtual.alt_pdfs||[])[aIdx]} alt="" style={{ maxHeight:50, borderRadius:4, display:'block' }}/>
                        )}
                      </div>
                    ) : null)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal IA */}
      {iaAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">🤖 Gerar Questões com IA</h3>
              <button onClick={() => { setIaAberto(false); setIaErro('') }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tema ou assunto *</label>
                <input className="input-field text-sm" placeholder="Ex: Frações, Revolução Francesa..." value={iaTema} onChange={e => setIaTema(e.target.value)} onKeyDown={e => e.key === 'Enter' && gerarComIA()} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nível</label>
                  <select className="input-field text-sm" value={iaNivel} onChange={e => setIaNivel(e.target.value)}>
                    <option value="fácil">Fácil</option>
                    <option value="médio">Médio</option>
                    <option value="difícil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Quantidade</label>
                  <select className="input-field text-sm" value={iaQtd} onChange={e => setIaQtd(parseInt(e.target.value))}>
                    {[3,5,8,10].map(n => <option key={n} value={n}>{n} questões</option>)}
                  </select>
                </div>
              </div>
              {iaErro && <p className="text-red-500 text-sm font-medium">⚠️ {iaErro}</p>}
              <button onClick={gerarComIA} disabled={iaGerando} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:opacity-90 disabled:opacity-60 transition-all">
                {iaGerando ? '⏳ Gerando questões...' : '✨ Gerar Questões'}
              </button>
              <p className="text-xs text-gray-400 text-center">A IA irá criar {iaQtd} questões com 4 alternativas cada</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
