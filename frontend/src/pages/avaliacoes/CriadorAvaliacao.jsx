import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

// ── Carrega pdf.js via CDN ────────────────────────────────────────────────────
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

// ── Componente: Upload de Imagem ──────────────────────────────────────────────
function UploadImagem({ imagem, onChange, label = 'Imagem' }) {
  const ref = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const maxMB = 5
    if (file.size > maxMB * 1024 * 1024) {
      alert(`⚠️ Imagem muito grande!\n\nTamanho: ${(file.size/1024/1024).toFixed(1)} MB\nLimite permitido: ${maxMB} MB\n\nRedimensione a imagem antes de usar.`)
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ marginTop: 8 }}>
      {imagem ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={imagem} alt="img questão" style={{
            maxWidth: '100%', maxHeight: 200, borderRadius: 10,
            border: '1.5px solid #e5e7eb', display: 'block'
          }}/>
          <button type="button" onClick={() => onChange(null)} style={{
            position: 'absolute', top: -8, right: -8,
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
            fontSize: 13, fontWeight: 900, display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current.click()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: '#eff6ff', border: '1.5px dashed #1d4ed8',
          color: '#1d4ed8', cursor: 'pointer'
        }}>
          🖼️ {label}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Componente: Upload de PDF com seleção de página ───────────────────────────
function UploadPdf({ imagem, onChange, label = 'PDF' }) {
  const ref = useRef()
  const [paginas, setPaginas] = useState([])       // thumbnails das páginas
  const [abrindo, setAbrindo] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handlePdf(e) {
    const file = e.target.files[0]
    if (!file) return
    setCarregando(true); setAbrindo(true); setPaginas([])
    try {
      const lib  = await carregarPdfJs()
      const buf  = await file.arrayBuffer()
      const pdf  = await lib.getDocument({ data: buf }).promise
      const imgs = []
      for (let p = 1; p <= pdf.numPages; p++) {
        const page    = await pdf.getPage(p)
        const vp      = page.getViewport({ scale: 1.2 })
        const canvas  = document.createElement('canvas')
        canvas.width  = vp.width
        canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        imgs.push(canvas.toDataURL('image/jpeg', 0.85))
      }
      setPaginas(imgs)
    } catch {
      alert('Erro ao abrir PDF. Tente novamente.')
      setAbrindo(false)
    } finally {
      setCarregando(false)
      e.target.value = ''
    }
  }

  function selecionarPagina(img) {
    onChange(img)
    setAbrindo(false)
    setPaginas([])
  }

  return (
    <div style={{ marginTop: 8 }}>
      {imagem ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={imagem} alt="página PDF" style={{
            maxWidth: '100%', maxHeight: 200, borderRadius: 10,
            border: '1.5px solid #e5e7eb', display: 'block'
          }}/>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(29,78,216,.8)', color: '#fff',
            fontSize: 10, textAlign: 'center', padding: '3px',
            borderRadius: '0 0 10px 10px', fontWeight: 700
          }}>📄 Recorte de PDF</div>
          <button type="button" onClick={() => onChange(null)} style={{
            position: 'absolute', top: -8, right: -8,
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
            fontSize: 13, fontWeight: 900, display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current.click()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: '#faf5ff', border: '1.5px dashed #7c3aed',
          color: '#7c3aed', cursor: 'pointer'
        }}>
          {carregando ? '⏳ Abrindo...' : `📄 ${label}`}
        </button>
      )}
      <input ref={ref} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdf} />

      {/* Modal seleção de página */}
      {abrindo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 24,
            maxWidth: 720, width: '100%', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>
                  📄 Selecione a página
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Clique na página que quer usar como imagem da questão
                </div>
              </div>
              <button onClick={() => { setAbrindo(false); setPaginas([]) }} style={{
                background: '#f3f4f6', border: 'none', borderRadius: 8,
                padding: '6px 14px', cursor: 'pointer', fontWeight: 600, color: '#374151'
              }}>Fechar</button>
            </div>

            {carregando ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                ⏳ Carregando páginas do PDF...
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
                gap: 12, overflowY: 'auto', paddingRight: 4
              }}>
                {paginas.map((img, i) => (
                  <div key={i} onClick={() => selecionarPagina(img)} style={{
                    cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
                    border: '2px solid #e5e7eb', transition: 'all .2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none' }}>
                    <img src={img} alt={`Página ${i+1}`} style={{ width: '100%', display: 'block' }}/>
                    <div style={{
                      background: '#f9fafb', textAlign: 'center',
                      fontSize: 11, fontWeight: 700, color: '#374151', padding: '5px'
                    }}>Página {i + 1}</div>
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

// ── Botões de mídia para enunciado/alternativa ────────────────────────────────
function BotoesMedia({ imgKey, pdfKey, dados, onImg, onPdf, tamanho = 'normal' }) {
  const temImg = !!dados[imgKey]
  const temPdf = !!dados[pdfKey]
  const s = tamanho === 'pequeno'

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: s ? 4 : 8 }}>
      {!temImg && (
        <UploadImagem
          imagem={dados[imgKey]}
          onChange={onImg}
          label={s ? 'Img' : 'Adicionar imagem'}
        />
      )}
      {!temPdf && (
        <UploadPdf
          imagem={dados[pdfKey]}
          onChange={onPdf}
          label={s ? 'PDF' : 'Recorte de PDF'}
        />
      )}
      {temImg && (
        <UploadImagem imagem={dados[imgKey]} onChange={onImg} label="Imagem" />
      )}
      {temPdf && (
        <UploadPdf imagem={dados[pdfKey]} onChange={onPdf} label="PDF" />
      )}
    </div>
  )
}

// ── Componentes curriculares da BNCC — Fundamental Anos Finais (8º e 9º) ─────
const BNCC_COMPONENTES = [
  { nome: 'Língua Portuguesa', sigla: 'LP' },
  { nome: 'Matemática',        sigla: 'MA' },
  { nome: 'Ciências',          sigla: 'CI' },
  { nome: 'História',          sigla: 'HI' },
  { nome: 'Geografia',         sigla: 'GE' },
  { nome: 'Língua Inglesa',    sigla: 'LI' },
  { nome: 'Arte',              sigla: 'AR' },
  { nome: 'Educação Física',   sigla: 'EF' },
]

// Rótulos e ícones dos tipos de questão
const TIPOS_QUESTAO = {
  multipla:     { label: 'Múltipla Escolha', icone: '🔘' },
  dissertativa: { label: 'Resposta Livre',   icone: '✍️' },
  associacao:   { label: 'Associação',       icone: '🔗' },
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CriadorAvaliacao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = !!id

  const [turmas,    setTurmas]    = useState([])
  const [form,      setForm]      = useState({ titulo: '', disciplina: '', tipo: 'prova', turma_id: '', data_aplicacao: '', instrucoes: '', bncc_codigo: '', bncc_ano: '', bncc_componente: '' })
  const [bnccAtivo, setBnccAtivo] = useState(false)
  const [questoes,  setQuestoes]  = useState([])
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')

  // IA
  const [iaAberto,  setIaAberto]  = useState(false)
  const [iaTema,    setIaTema]    = useState('')
  const [iaNivel,   setIaNivel]   = useState('médio')
  const [iaQtd,     setIaQtd]     = useState(5)
  const [iaTipo,    setIaTipo]    = useState('multipla')
  const [iaGerando, setIaGerando] = useState(false)
  const [iaErro,    setIaErro]    = useState('')

  useEffect(() => {
    api.get('/turmas').then(({ data }) => setTurmas(data))
    if (editando) {
      api.get(`/avaliacoes/${id}`).then(({ data }) => {
        setForm({ titulo: data.titulo || '', disciplina: data.disciplina || '', tipo: data.tipo || 'prova', turma_id: data.turma_id || '', data_aplicacao: (data.data_aplicacao || '').slice(0, 10), instrucoes: data.instrucoes || '', bncc_codigo: data.bncc_codigo || '', bncc_ano: data.bncc_ano || '', bncc_componente: data.bncc_componente || '' })
        if (data.bncc_codigo) setBnccAtivo(true)
        const qs = (data.questoes || []).map(q => ({
          ...q,
          tipo_questao: q.tipo_questao || 'multipla',
          alternativas: Array.isArray(q.alternativas) && q.alternativas.some(a => a)
            ? q.alternativas
            : [q.alternativa_a || '', q.alternativa_b || '', q.alternativa_c || '', q.alternativa_d || ''],
          resposta_correta: typeof q.resposta_correta === 'number' ? q.resposta_correta : 0,
          imagem: q.imagem || null,
          imagem_pdf: q.imagem_pdf || null,
          alt_imagens: q.alt_imagens || ['', '', '', ''],
          alt_pdfs:    q.alt_pdfs    || ['', '', '', ''],
          criterios_correcao: q.criterios_correcao || '',
          pares_associacao:   q.pares_associacao   || [],
        }))
        setQuestoes(qs)
      })
    }
  }, [id])

  function addQuestao(tipo = 'multipla') {
    setQuestoes(q => [...q, {
      tipo_questao: tipo,
      enunciado: '', alternativas: ['', '', '', ''], resposta_correta: 0, pontos: 1,
      imagem: null, imagem_pdf: null,
      alt_imagens: ['', '', '', ''],
      alt_pdfs:    ['', '', '', ''],
      criterios_correcao: '',
      pares_associacao: tipo === 'associacao' ? [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }] : [],
    }])
  }

  // ── Pares de associação (coluna A ↔ coluna B) ──
  function updatePar(qIdx, pIdx, lado, valor) {
    setQuestoes(q => q.map((x, i) => i === qIdx
      ? { ...x, pares_associacao: x.pares_associacao.map((p, j) => j === pIdx ? { ...p, [lado]: valor } : p) }
      : x))
  }
  function addPar(qIdx) {
    setQuestoes(q => q.map((x, i) => i === qIdx ? { ...x, pares_associacao: [...x.pares_associacao, { a: '', b: '' }] } : x))
  }
  function removePar(qIdx, pIdx) {
    setQuestoes(q => q.map((x, i) => i === qIdx ? { ...x, pares_associacao: x.pares_associacao.filter((_, j) => j !== pIdx) } : x))
  }

  function updateQuestao(idx, campo, valor) {
    setQuestoes(q => q.map((x, i) => i === idx ? { ...x, [campo]: valor } : x))
  }

  function updateAlternativa(qIdx, aIdx, valor) {
    setQuestoes(q => q.map((x, i) => i === qIdx
      ? { ...x, alternativas: x.alternativas.map((a, j) => j === aIdx ? valor : a) }
      : x))
  }

  function updateAltImagem(qIdx, aIdx, valor) {
    setQuestoes(q => q.map((x, i) => i === qIdx
      ? { ...x, alt_imagens: (x.alt_imagens || ['','','','']).map((a, j) => j === aIdx ? valor : a) }
      : x))
  }

  function updateAltPdf(qIdx, aIdx, valor) {
    setQuestoes(q => q.map((x, i) => i === qIdx
      ? { ...x, alt_pdfs: (x.alt_pdfs || ['','','','']).map((a, j) => j === aIdx ? valor : a) }
      : x))
  }

  function removeQuestao(idx) {
    setQuestoes(q => q.filter((_, i) => i !== idx))
  }

  async function gerarComIA() {
    if (!iaTema) return setIaErro('Informe o tema')
    setIaErro(''); setIaGerando(true)
    try {
      const { data } = await api.post('/ia/questoes', {
        tema: iaTema, nivel: iaNivel, quantidade: iaQtd, disciplina: form.disciplina,
        tipo: iaTipo,
        bncc_codigo: bnccAtivo ? form.bncc_codigo : '',
        bncc_ano: bnccAtivo ? form.bncc_ano : '',
        bncc_componente: bnccAtivo ? form.bncc_componente : '',
      })
      const novas = data.questoes.map(q => ({
        tipo_questao: q.tipo_questao || iaTipo,
        enunciado: q.enunciado,
        alternativas: q.alternativas || ['', '', '', ''],
        resposta_correta: q.resposta_correta ?? 0, pontos: 1,
        explicacao: q.explicacao || '',
        imagem: null, imagem_pdf: null,
        alt_imagens: ['', '', '', ''], alt_pdfs: ['', '', '', ''],
        criterios_correcao: q.criterios_correcao || '',
        pares_associacao:   q.pares_associacao   || [],
      }))
      setQuestoes(prev => [...prev, ...novas])
      setIaAberto(false)
    } catch (err) {
      setIaErro(err.response?.data?.erro || 'Erro ao gerar questões')
    } finally {
      setIaGerando(false)
    }
  }

  async function salvar() {
    setErro('')
    if (!form.titulo || !form.turma_id) return setErro('Título e turma são obrigatórios')
    if (questoes.length === 0) return setErro('Adicione pelo menos uma questão')
    if (bnccAtivo && !form.bncc_codigo) return setErro('Informe o código da habilidade BNCC ou desative o vínculo BNCC')
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i]
      if (q.tipo_questao === 'associacao') {
        const validos = (q.pares_associacao || []).filter(p => p.a?.trim() && p.b?.trim())
        if (validos.length < 2) return setErro(`Questão ${i + 1} (Associação): preencha pelo menos 2 pares completos`)
      }
    }
    // Limpa pares vazios e remove campos BNCC quando o vínculo está desativado
    const questoesLimpas = questoes.map(q => ({
      ...q,
      pares_associacao: (q.pares_associacao || []).filter(p => p.a?.trim() && p.b?.trim()),
    }))
    const dados = bnccAtivo ? { ...form } : { ...form, bncc_codigo: '', bncc_ano: '', bncc_componente: '' }
    setSalvando(true)
    try {
      if (editando) await api.put(`/avaliacoes/${id}`, { ...dados, questoes: questoesLimpas })
      else          await api.post('/avaliacoes',        { ...dados, questoes: questoesLimpas })
      navigate('/avaliacoes')
    } catch (err) {
      const msg = err.response?.data?.erro
        || (err.code === 'ECONNABORTED' ? 'Tempo esgotado — imagem muito grande, tente compactar o PDF' : null)
        || err.message
        || 'Erro ao salvar'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/avaliacoes" className="text-gray-500 hover:text-primary text-sm">← Avaliações</Link>
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-6">
            {editando ? 'Editar Avaliação' : 'Nova Avaliação'}
          </h1>

          {/* Dados gerais */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-5 space-y-4">
            <h3 className="font-semibold text-textMain">Dados Gerais</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input className="input-field" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Prova 1 — Bimestre 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <input className="input-field" value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Matemática" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="prova">Prova</option>
                  <option value="simulado">Simulado</option>
                  <option value="exercicio">Exercício</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label>
                <select className="input-field" value={form.turma_id} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Aplicação</label>
                <input className="input-field" type="date" value={form.data_aplicacao} onChange={e => setForm(f => ({ ...f, data_aplicacao: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instruções</label>
              <textarea className="input-field resize-none" rows={2} value={form.instrucoes} onChange={e => setForm(f => ({ ...f, instrucoes: e.target.value }))} placeholder="Instruções para os alunos..." />
            </div>

            {/* ── Vínculo com habilidade da BNCC ── */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#166534' }}>
                <input type="checkbox" checked={bnccAtivo} onChange={e => setBnccAtivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#00c264' }} />
                📚 Vincular habilidade da BNCC
                <span style={{ fontWeight: 400, fontSize: 12, color: '#16a34a' }}>(Fundamental Anos Finais — 8º e 9º ano)</span>
              </label>

              {bnccAtivo && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginTop: 12 }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                    <select className="input-field" value={form.bncc_ano} onChange={e => setForm(f => ({ ...f, bncc_ano: e.target.value }))}>
                      <option value="">Selecione...</option>
                      <option value="8">8º ano</option>
                      <option value="9">9º ano</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Componente *</label>
                    <select className="input-field" value={form.bncc_componente} onChange={e => setForm(f => ({ ...f, bncc_componente: e.target.value }))}>
                      <option value="">Selecione...</option>
                      {BNCC_COMPONENTES.map(c => <option key={c.sigla} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código da habilidade *</label>
                    <input
                      className="input-field"
                      value={form.bncc_codigo}
                      onChange={e => setForm(f => ({ ...f, bncc_codigo: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                      placeholder={`Ex: EF0${form.bncc_ano || '9'}${BNCC_COMPONENTES.find(c => c.nome === form.bncc_componente)?.sigla || 'MA'}05`}
                      maxLength={10}
                    />
                  </div>
                  <p className="sm:col-span-3 text-xs" style={{ color: '#16a34a', margin: 0 }}>
                    💡 O código aparece na atividade e nos relatórios de desempenho. Consulte as habilidades em basenacionalcomum.mec.gov.br
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Questões */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-textMain">Questões ({questoes.length})</h3>
              <button onClick={() => setIaAberto(true)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">🤖 Gerar com IA</button>
            </div>

            {/* Botões de adicionar por tipo de questão */}
            <div className="flex gap-2 flex-wrap mb-4">
              {Object.entries(TIPOS_QUESTAO).map(([tipo, info]) => (
                <button key={tipo} onClick={() => addQuestao(tipo)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: '#eff6ff', border: '1.5px dashed #1a3fd4',
                  color: '#1a3fd4', cursor: 'pointer'
                }}>
                  {info.icone} + {info.label}
                </button>
              ))}
            </div>

            {/* Modal IA */}
            {iaAberto && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-textMain mb-4">🤖 Gerar Questões com IA</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de questão</label>
                      <select className="input-field" value={iaTipo} onChange={e => setIaTipo(e.target.value)}>
                        {Object.entries(TIPOS_QUESTAO).map(([tipo, info]) => (
                          <option key={tipo} value={tipo}>{info.icone} {info.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tema / Conteúdo *</label>
                      <input className="input-field" value={iaTema} onChange={e => setIaTema(e.target.value)} placeholder="Ex: Equações do 2º grau" />
                    </div>
                    {bnccAtivo && form.bncc_codigo && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600 }}>
                        📚 As questões serão alinhadas à habilidade BNCC <strong>{form.bncc_codigo}</strong>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                        <select className="input-field" value={iaNivel} onChange={e => setIaNivel(e.target.value)}>
                          <option value="fácil">Fácil</option>
                          <option value="médio">Médio</option>
                          <option value="difícil">Difícil</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                        <input className="input-field" type="number" min={1} max={20} value={iaQtd} onChange={e => setIaQtd(Number(e.target.value))} />
                      </div>
                    </div>
                    {iaErro && <p className="text-danger text-sm">{iaErro}</p>}
                    <div className="flex gap-2 pt-2">
                      <button onClick={gerarComIA} disabled={iaGerando} className="btn-primary flex-1">{iaGerando ? '⏳ Gerando...' : '✨ Gerar'}</button>
                      <button onClick={() => setIaAberto(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de formatos e tamanhos permitidos */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16,
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 12, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
                🖼️ <span><strong>Imagem:</strong> JPG, PNG, GIF, WEBP · máx. <strong>5 MB</strong></span>
              </div>
              <span style={{ color: '#93c5fd' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                📄 <span><strong>PDF:</strong> qualquer PDF · selecione a página desejada · máx. <strong>50 MB</strong></span>
              </div>
              <span style={{ color: '#93c5fd' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                💡 Imagem e PDF podem ser adicionados no <strong>enunciado</strong> e em cada <strong>alternativa</strong>
              </div>
            </div>

            {questoes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhuma questão adicionada</p>
            ) : (
              <div className="space-y-5">
                {questoes.map((q, qi) => (
                  <div key={qi} className="border rounded-xl p-4" style={{ borderColor: '#e5e7eb' }}>

                    {/* Cabeçalho da questão */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm" style={{ color: '#111827' }}>
                        Questão {qi + 1}
                        <span style={{
                          marginLeft: 8, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                          background: q.tipo_questao === 'dissertativa' ? '#fef3c7' : q.tipo_questao === 'associacao' ? '#e0e7ff' : '#dbeafe',
                          color:      q.tipo_questao === 'dissertativa' ? '#92400e' : q.tipo_questao === 'associacao' ? '#3730a3' : '#1d4ed8',
                        }}>
                          {TIPOS_QUESTAO[q.tipo_questao || 'multipla'].icone} {TIPOS_QUESTAO[q.tipo_questao || 'multipla'].label}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs" style={{ color: '#374151' }}>Pontos:</label>
                        <input className="w-16 text-center border rounded-lg px-2 py-1 text-sm" type="number" min={0.5} step={0.5} value={q.pontos} onChange={e => updateQuestao(qi, 'pontos', Number(e.target.value))} />
                        <button onClick={() => removeQuestao(qi)} className="text-danger hover:text-red-700 text-sm">✕</button>
                      </div>
                    </div>

                    {/* ── ENUNCIADO ── */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                        Enunciado
                      </div>
                      <textarea
                        className="input-field resize-none"
                        rows={2}
                        placeholder="Enunciado da questão..."
                        value={q.enunciado}
                        onChange={e => updateQuestao(qi, 'enunciado', e.target.value)}
                      />

                      {/* Mídia do enunciado */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <UploadImagem
                          imagem={q.imagem}
                          onChange={v => updateQuestao(qi, 'imagem', v)}
                          label="Adicionar imagem"
                        />
                        <UploadPdf
                          imagem={q.imagem_pdf}
                          onChange={v => updateQuestao(qi, 'imagem_pdf', v)}
                          label="Recorte de PDF"
                        />
                      </div>
                    </div>

                    {/* ── DISSERTATIVA: critérios de correção ── */}
                    {q.tipo_questao === 'dissertativa' && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                          Critérios de correção
                        </div>
                        <textarea
                          className="input-field resize-none"
                          rows={4}
                          placeholder={"Ex:\n- Cita pelo menos 2 causas do fenômeno\n- Usa vocabulário adequado\n- Apresenta conclusão coerente"}
                          value={q.criterios_correcao}
                          onChange={e => updateQuestao(qi, 'criterios_correcao', e.target.value)}
                        />
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                          ✍️ O aluno responde em texto livre. Você corrige manualmente usando estes critérios — com opção de sugestão da IA.
                        </p>
                      </div>
                    )}

                    {/* ── ASSOCIAÇÃO: pares coluna A ↔ coluna B ── */}
                    {q.tipo_questao === 'associacao' && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                          Pares de associação
                        </div>
                        <div className="space-y-2">
                          {(q.pares_associacao || []).map((par, pi) => (
                            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                className="input-field flex-1"
                                placeholder={`Coluna A — item ${pi + 1}`}
                                value={par.a}
                                onChange={e => updatePar(qi, pi, 'a', e.target.value)}
                                style={{ marginBottom: 0 }}
                              />
                              <span style={{ color: '#1a3fd4', fontWeight: 900, flexShrink: 0 }}>↔</span>
                              <input
                                className="input-field flex-1"
                                placeholder={`Coluna B — item ${pi + 1}`}
                                value={par.b}
                                onChange={e => updatePar(qi, pi, 'b', e.target.value)}
                                style={{ marginBottom: 0 }}
                              />
                              <button type="button" onClick={() => removePar(qi, pi)} className="text-danger hover:text-red-700 text-sm flex-shrink-0">✕</button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addPar(qi)} style={{
                          marginTop: 8, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: '#eff6ff', border: '1.5px dashed #1a3fd4', color: '#1a3fd4', cursor: 'pointer'
                        }}>+ Adicionar par</button>
                        <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                          🔗 O aluno verá a coluna B embaralhada e precisará ligar cada item. Correção automática com crédito parcial.
                        </p>
                      </div>
                    )}

                    {/* ── ALTERNATIVAS (só múltipla escolha) ── */}
                    {(q.tipo_questao || 'multipla') === 'multipla' && (<>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                      Alternativas
                    </div>
                    <div className="space-y-3">
                      {q.alternativas.map((alt, ai) => (
                        <div key={ai} style={{
                          background: '#f9fafb', borderRadius: 12, padding: '10px 12px',
                          border: q.resposta_correta === ai ? '1.5px solid #22c55e' : '1.5px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {/* Botão letra */}
                            <button
                              type="button"
                              onClick={() => updateQuestao(qi, 'resposta_correta', ai)}
                              style={{
                                width: 30, height: 30, borderRadius: '50%', border: 'none',
                                flexShrink: 0, fontSize: 13, fontWeight: 900, cursor: 'pointer',
                                background: q.resposta_correta === ai ? '#22c55e' : '#e5e7eb',
                                color: q.resposta_correta === ai ? '#fff' : '#374151',
                                transition: 'all .2s'
                              }}>
                              {String.fromCharCode(65 + ai)}
                            </button>
                            {/* Texto da alternativa */}
                            <input
                              className="input-field flex-1"
                              placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`}
                              value={alt}
                              onChange={e => updateAlternativa(qi, ai, e.target.value)}
                              style={{ background: '#fff', marginBottom: 0 }}
                            />
                          </div>

                          {/* Mídia da alternativa */}
                          <div style={{ display: 'flex', gap: 6, paddingLeft: 38, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <UploadImagem
                              imagem={(q.alt_imagens || [])[ai]}
                              onChange={v => updateAltImagem(qi, ai, v)}
                              label="Img"
                            />
                            <UploadPdf
                              imagem={(q.alt_pdfs || [])[ai]}
                              onChange={v => updateAltPdf(qi, ai, v)}
                              label="PDF"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                      Clique na letra para marcar como correta &nbsp;·&nbsp;
                      🖼️ Imagem: JPG/PNG até 5MB &nbsp;·&nbsp;
                      📄 PDF: qualquer tamanho até 50MB, escolha a página
                    </p>
                    </>)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {erro && <p className="text-danger text-sm text-center mb-4">{erro}</p>}

          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando} className="btn-primary flex-1">
              {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Avaliação'}
            </button>
            <Link to="/avaliacoes" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
