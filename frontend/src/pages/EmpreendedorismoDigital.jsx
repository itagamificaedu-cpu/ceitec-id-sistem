import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// ─── Dados das 20 atividades ───────────────────────────────────────────────
const ATIVIDADES = [
  { id: 1,  emoji: '🤖', area: 'Robótica',               nome: 'Startup de Robôs Educacionais',         tags: ['Arduino', 'Sensores', 'Impressão 3D'],  tipo: 'Produto + Serviço' },
  { id: 2,  emoji: '🎮', area: 'Jogos Digitais',          nome: 'Plataforma de Gamificação Escolar',      tags: ['Web', 'App', 'Gamificação'],             tipo: 'Plataforma Digital' },
  { id: 3,  emoji: '♟',  area: 'Jogos de Tabuleiro',      nome: 'Empresa de Jogos de Tabuleiro Educativos', tags: ['Design', 'Protótipo', 'Educação'],      tipo: 'Produto Físico' },
  { id: 4,  emoji: '🛠',  area: 'Cultura Maker',           nome: 'Agência Maker de Impressão 3D',          tags: ['Impressão 3D', 'Modelagem', 'Maker'],    tipo: 'Serviço' },
  { id: 5,  emoji: '🎮', area: 'Jogos Digitais',          nome: 'Desenvolvimento de Jogo Digital Educativo', tags: ['Scratch', 'Unity', 'Godot'],           tipo: 'Produto Digital' },
  { id: 6,  emoji: '🤖', area: 'Robótica',               nome: 'Oficina de Automação Residencial',        tags: ['Arduino', 'IoT', 'Automação'],           tipo: 'Produto + Serviço' },
  { id: 7,  emoji: '💡', area: 'Soluções Educacionais',   nome: 'Plataforma de Cursos Maker',              tags: ['EaD', 'Vídeo', 'Maker'],                tipo: 'Plataforma Digital' },
  { id: 8,  emoji: '🎨', area: 'Artesanato Tecnológico',  nome: 'Empresa de Artesanato Tecnológico',       tags: ['LED', 'Reciclagem', 'Design'],           tipo: 'Produto Físico' },
  { id: 9,  emoji: '🎮', area: 'Jogos Digitais',          nome: 'Criação de Escape Room Educacional',      tags: ['QR Code', 'Arduino', 'Design'],          tipo: 'Serviço + Produto' },
  { id: 10, emoji: '💡', area: 'Soluções Educacionais',   nome: 'Startup de Inclusão Tecnológica',         tags: ['Acessibilidade', 'Arduino', 'Sensores'], tipo: 'Produto Social' },
  { id: 11, emoji: '📱', area: 'Aplicativos e IA',        nome: 'Agência de Desenvolvimento de Apps Escolares', tags: ['App', 'SaaS', 'Web'],              tipo: 'Plataforma Digital' },
  { id: 12, emoji: '🛠',  area: 'Cultura Maker',           nome: 'Empresa de Kits Maker para Crianças',    tags: ['Energia Solar', 'Eletrônica', 'Educação'], tipo: 'Produto Físico' },
  { id: 13, emoji: '🎨', area: 'Artesanato Tecnológico',  nome: 'Estúdio de Animação e Jogos 2D',          tags: ['Animação', 'Scratch', 'Canva'],          tipo: 'Produto Digital' },
  { id: 14, emoji: '🌱', area: 'Sustentabilidade',         nome: 'Startup de Sustentabilidade Maker',       tags: ['IoT', 'Arduino', 'Sustentabilidade'],   tipo: 'Produto Social' },
  { id: 15, emoji: '📱', area: 'Aplicativos e IA',        nome: 'Plataforma de Quiz Inteligente',          tags: ['IA', 'Web', 'Educação'],                tipo: 'Plataforma Digital' },
  { id: 16, emoji: '🎮', area: 'Jogos Digitais',          nome: 'Empresa de Eventos Gamer Educacionais',   tags: ['Minecraft', 'Eventos', 'Lógica'],        tipo: 'Serviço' },
  { id: 17, emoji: '📱', area: 'Aplicativos e IA',        nome: 'Desenvolvimento de Assistente Virtual Escolar', tags: ['IA', 'Chatbot', 'NLP'],            tipo: 'Produto Digital' },
  { id: 18, emoji: '🌱', area: 'Sustentabilidade',         nome: 'Startup de Protótipos Inteligentes',      tags: ['Sensores', 'Arduino', 'Segurança'],     tipo: 'Produto Social' },
  { id: 19, emoji: '🎨', area: 'Artesanato Tecnológico',  nome: 'Empresa de Personalização Digital',       tags: ['Laser', 'Canva', 'IA'],                 tipo: 'Produto Físico' },
  { id: 20, emoji: '💡', area: 'Soluções Educacionais',   nome: 'Plataforma de Feira Maker Virtual',       tags: ['Web', 'E-commerce', 'Maker'],           tipo: 'Plataforma Digital' },
]

const ETAPAS = [
  { n: 1, titulo: 'Escolher um Problema Real',      descricao: 'Identifique um problema que existe na escola, bairro ou cidade. Quanto mais real e próximo, melhor a solução.' },
  { n: 2, titulo: 'Criar a Startup',                descricao: 'Dê um nome criativo, crie um logo (pode usar Canva) e escreva um slogan curto e impactante.' },
  { n: 3, titulo: 'Definir o Produto',              descricao: 'Decida o que será criado: app, robô, jogo, kit físico, plataforma. Descreva em uma frase clara.' },
  { n: 4, titulo: 'Planejamento da Equipe',         descricao: 'Divida as funções entre os 5 integrantes: CEO, CTO, Designer, Financeiro e Marketing.' },
  { n: 5, titulo: 'Criar o MVP',                    descricao: 'MVP = Mínimo Produto Viável. Crie a versão mais simples possível que já mostre a ideia funcionando.' },
  { n: 6, titulo: 'Modelo de Negócio',              descricao: 'Como a startup vai ganhar dinheiro? Assinatura, venda avulsa, freemium, licença, doação?' },
  { n: 7, titulo: 'Criar o Pitch',                  descricao: 'Apresentação de 3 minutos: Problema → Solução → Público → Funcionamento → Dinheiro → Equipe → CTA.' },
  { n: 8, titulo: 'Protótipo e Demonstração',       descricao: 'Construa o protótipo funcional para mostrar na feira. Teste com pessoas reais antes da apresentação.' },
  { n: 9, titulo: 'Divulgação',                     descricao: 'Crie perfis no Instagram e TikTok da startup, poste o processo e monte uma landing page.' },
]

const CRITERIOS = [
  { criterio: 'Criatividade',               pontos: 20, cor: 'text-purple-600', bg: 'bg-purple-50' },
  { criterio: 'Inovação',                   pontos: 20, cor: 'text-blue-600',   bg: 'bg-blue-50' },
  { criterio: 'Funcionamento do protótipo', pontos: 20, cor: 'text-green-600',  bg: 'bg-green-50' },
  { criterio: 'Impacto social',             pontos: 15, cor: 'text-orange-600', bg: 'bg-orange-50' },
  { criterio: 'Pitch e apresentação',       pontos: 15, cor: 'text-pink-600',   bg: 'bg-pink-50' },
  { criterio: 'Modelo de negócio',          pontos: 10, cor: 'text-teal-600',   bg: 'bg-teal-50' },
]

const FERRAMENTAS = [
  { area: 'Programação', nome: 'Scratch',           url: 'https://scratch.mit.edu',      emoji: '🐱', cor: 'bg-orange-50 border-orange-200' },
  { area: 'Robótica',    nome: 'Arduino IDE',        url: 'https://www.arduino.cc/en/software', emoji: '⚡', cor: 'bg-blue-50 border-blue-200' },
  { area: 'Apps',        nome: 'MIT App Inventor',   url: 'https://appinventor.mit.edu',  emoji: '📱', cor: 'bg-green-50 border-green-200' },
  { area: 'Design',      nome: 'Canva',              url: 'https://canva.com',            emoji: '🎨', cor: 'bg-purple-50 border-purple-200' },
  { area: 'Games',       nome: 'Construct 3',        url: 'https://construct.net',        emoji: '🎮', cor: 'bg-red-50 border-red-200' },
  { area: 'Sites',       nome: 'Google Sites',       url: 'https://sites.google.com',     emoji: '🌐', cor: 'bg-yellow-50 border-yellow-200' },
  { area: 'IA',          nome: 'ChatGPT',            url: 'https://chat.openai.com',      emoji: '🤖', cor: 'bg-teal-50 border-teal-200' },
  { area: 'Protótipos',  nome: 'Tinkercad',          url: 'https://tinkercad.com',        emoji: '🛠',  cor: 'bg-indigo-50 border-indigo-200' },
]

const COR_AREA = {
  'Robótica':               'bg-blue-100 text-blue-700',
  'Jogos Digitais':         'bg-purple-100 text-purple-700',
  'Jogos de Tabuleiro':     'bg-amber-100 text-amber-700',
  'Cultura Maker':          'bg-orange-100 text-orange-700',
  'Artesanato Tecnológico': 'bg-pink-100 text-pink-700',
  'Soluções Educacionais':  'bg-green-100 text-green-700',
  'Sustentabilidade':       'bg-emerald-100 text-emerald-700',
  'Aplicativos e IA':       'bg-indigo-100 text-indigo-700',
}

// ─── Estado vazio para nova equipe ────────────────────────────────────────
const EQUIPE_VAZIA = {
  nome_startup: '', lider_id: null, lider_nome: '',
  atividade_id: null, atividade_nome: '',
  membros: [],
  problema: '', solucao: '', publico_alvo: '',
  tecnologias: '', modelo_negocio: '', diferencial: '', prototipo: '',
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function EmpreendedorismoDigital() {
  const [aba, setAba]                   = useState('equipes')
  const [etapaAberta, setEtapaAberta]   = useState(null)
  const [filtroArea, setFiltroArea]     = useState('Todas')

  // Dados do backend
  const [alunos9, setAlunos9]           = useState([])   // alunos elegíveis (9º ano)
  const [equipes, setEquipes]           = useState([])   // equipes cadastradas
  const [carregando, setCarregando]     = useState(true)

  // Modal de equipe (criar / editar)
  const [modalAberto, setModalAberto]   = useState(false)
  const [editando, setEditando]         = useState(null) // id da equipe em edição ou null
  const [form, setForm]                 = useState(EQUIPE_VAZIA)
  const [salvando, setSalvando]         = useState(false)

  // Popup de seleção de membros
  const [popupMembros, setPopupMembros] = useState(false)
  const [buscaMembro, setBuscaMembro]   = useState('')

  // Upload de arquivo
  const [uploadEquipeId, setUploadEquipeId] = useState(null)
  const [uploadMembro, setUploadMembro]     = useState('')
  const fileRef = useRef()

  // ── Carrega dados ao montar ────────────────────────────────────────────
  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    try {
      const [rAlunos, rEquipes] = await Promise.all([
        api.get('/empreendedorismo/alunos-9ano'),
        api.get('/empreendedorismo/equipes'),
      ])
      setAlunos9(rAlunos.data)
      setEquipes(rEquipes.data)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }

  // ── Abre modal para criar ──────────────────────────────────────────────
  function abrirCriar() {
    setEditando(null)
    setForm(EQUIPE_VAZIA)
    setModalAberto(true)
  }

  // ── Abre modal para editar ─────────────────────────────────────────────
  function abrirEditar(equipe) {
    setEditando(equipe.id)
    // Se tem nome mas não tem lider_id, restaura como "outro" (lider_id = -1)
    const lider_id = equipe.lider_id
      ? equipe.lider_id
      : (equipe.lider_nome ? -1 : null)
    setForm({
      nome_startup:   equipe.nome_startup   || '',
      lider_id,
      lider_nome:     equipe.lider_nome     || '',
      atividade_id:   equipe.atividade_id   || null,
      atividade_nome: equipe.atividade_nome || '',
      membros:        equipe.membros        || [],
      problema:       equipe.problema       || '',
      solucao:        equipe.solucao        || '',
      publico_alvo:   equipe.publico_alvo   || '',
      tecnologias:    equipe.tecnologias    || '',
      modelo_negocio: equipe.modelo_negocio || '',
      diferencial:    equipe.diferencial    || '',
      prototipo:      equipe.prototipo      || '',
    })
    setModalAberto(true)
  }

  // ── Salvar equipe (criar ou editar) ───────────────────────────────────
  async function salvarEquipe() {
    if (!form.nome_startup.trim()) {
      alert('Informe o nome da startup!')
      return
    }
    setSalvando(true)
    try {
      // lider_id = -1 é sinal interno de "outro" — envia null para o banco
      const payload = {
        ...form,
        lider_id: form.lider_id === -1 ? null : form.lider_id,
      }
      if (editando) {
        await api.put(`/empreendedorismo/equipes/${editando}`, payload)
      } else {
        await api.post('/empreendedorismo/equipes', payload)
      }
      setModalAberto(false)
      await carregarDados()
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.erro || err.message))
    } finally {
      setSalvando(false)
    }
  }

  // ── Excluir equipe ────────────────────────────────────────────────────
  async function excluirEquipe(id, nome) {
    if (!confirm(`Excluir a equipe "${nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/empreendedorismo/equipes/${id}`)
      await carregarDados()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.response?.data?.erro || err.message))
    }
  }

  // ── Toggle membro no form ─────────────────────────────────────────────
  function toggleMembro(aluno) {
    const jaEsta = form.membros.some(m => m.id === aluno.id)
    if (jaEsta) {
      setForm(f => ({ ...f, membros: f.membros.filter(m => m.id !== aluno.id) }))
    } else {
      if (form.membros.length >= 5) {
        alert('Máximo de 5 membros por equipe!')
        return
      }
      setForm(f => ({ ...f, membros: [...f.membros, { id: aluno.id, nome: aluno.nome, turma: aluno.turma }] }))
    }
  }

  // ── Escolhe líder ─────────────────────────────────────────────────────
  function escolherLider(aluno) {
    setForm(f => ({ ...f, lider_id: aluno.id, lider_nome: aluno.nome }))
  }

  // ── Upload de arquivo ─────────────────────────────────────────────────
  async function enviarArquivo(equipeId, file) {
    const fd = new FormData()
    fd.append('arquivo', file)
    fd.append('membro_nome', uploadMembro)
    try {
      await api.post(`/empreendedorismo/equipes/${equipeId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadEquipeId(null)
      setUploadMembro('')
      await carregarDados()
    } catch (err) {
      alert('Erro no upload: ' + (err.response?.data?.erro || err.message))
    }
  }

  // ── Excluir arquivo ────────────────────────────────────────────────────
  async function excluirArquivo(arqId) {
    if (!confirm('Excluir este arquivo?')) return
    try {
      await api.delete(`/empreendedorismo/arquivos/${arqId}`)
      await carregarDados()
    } catch (err) {
      alert('Erro: ' + (err.response?.data?.erro || err.message))
    }
  }

  // ── Alunos filtrados para popup de membros ────────────────────────────
  const alunosFiltrados = alunos9.filter(a =>
    a.nome.toLowerCase().includes(buscaMembro.toLowerCase())
  )

  const areas = ['Todas', ...Array.from(new Set(ATIVIDADES.map(a => a.area)))]
  const atividadesFiltradas = filtroArea === 'Todas' ? ATIVIDADES : ATIVIDADES.filter(a => a.area === filtroArea)

  const ABAS = [
    { id: 'equipes',     label: '👥 Equipes' },
    { id: 'atividades',  label: '🚀 Atividades' },
    { id: 'guia',        label: '📋 Guia de Início' },
    { id: 'criterios',   label: '🏆 Critérios' },
    { id: 'ferramentas', label: '🛠 Ferramentas' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* ── Cabeçalho ─────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-3xl">💼</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-textMain">Empreendedorismo Digital</h1>
                <p className="text-sm text-gray-500 mt-0.5">Robótica · Cultura Maker · Jogos · Artesanato · Soluções Educacionais</p>
                <p className="text-sm text-gray-600 mt-1">
                  Alunos do <strong>9º ano</strong> criam uma startup, produto ou serviço real —
                  com pitch, prototipagem e apresentação na feira.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { valor: alunos9.length,  label: 'Alunos elegíveis (9º ano)', cor: 'text-secondary' },
                { valor: equipes.length,  label: 'Equipes cadastradas',        cor: 'text-blue-600' },
                { valor: '20',            label: 'Atividades disponíveis',     cor: 'text-green-600' },
                { valor: '100',           label: 'Pontos na avaliação',         cor: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className={`text-2xl font-black ${s.cor}`}>{s.valor}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Navegação por abas ────────────────────────────────────── */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  aba === a.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                }`}>
                {a.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════════
              ABA — EQUIPES (principal)
          ════════════════════════════════════════════════════════════ */}
          {aba === 'equipes' && (
            <div>
              {/* Botão criar */}
              <div className="flex justify-end mb-4">
                <button onClick={abrirCriar}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl text-sm font-bold shadow hover:bg-secondary/90 transition-colors">
                  ➕ Nova Equipe
                </button>
              </div>

              {carregando ? (
                <div className="text-center py-16 text-gray-400">Carregando...</div>
              ) : equipes.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-4xl mb-3">💼</p>
                  <p className="font-semibold">Nenhuma equipe cadastrada ainda</p>
                  <p className="text-sm mt-1">Clique em "Nova Equipe" para começar</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {equipes.map(eq => (
                    <div key={eq.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Header do card */}
                      <div className="bg-primary px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">{eq.nome_startup}</p>
                          {eq.atividade_nome && (
                            <p className="text-white/60 text-xs">{eq.atividade_nome}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => abrirEditar(eq)}
                            className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                            ✏️ Editar
                          </button>
                          <button onClick={() => excluirEquipe(eq.id, eq.nome_startup)}
                            className="px-2 py-1 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors">
                            🗑 Excluir
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Líder */}
                        {eq.lider_nome && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">👑 Líder</span>
                            <span className="text-sm text-textMain font-medium">{eq.lider_nome}</span>
                          </div>
                        )}

                        {/* Membros */}
                        {eq.membros?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Membros</p>
                            <div className="flex flex-wrap gap-1.5">
                              {eq.membros.map(m => (
                                <span key={m.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                                  {m.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Campos preenchidos */}
                        {eq.problema && (
                          <div>
                            <p className="text-xs font-bold text-gray-400">Problema</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{eq.problema}</p>
                          </div>
                        )}

                        {/* Arquivos */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arquivos</p>
                            <button
                              onClick={() => { setUploadEquipeId(eq.id); fileRef.current?.click() }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                              + Enviar arquivo
                            </button>
                          </div>

                          {/* Input de upload oculto — compartilhado */}
                          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" className="hidden"
                            onChange={e => {
                              const file = e.target.files[0]
                              if (file && uploadEquipeId) {
                                enviarArquivo(uploadEquipeId, file)
                              }
                              e.target.value = ''
                            }}
                          />

                          {eq.arquivos?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nenhum arquivo enviado</p>
                          ) : (
                            <div className="space-y-1">
                              {eq.arquivos.map(arq => (
                                <div key={arq.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm flex-shrink-0">
                                      {arq.tipo_arquivo?.includes('pdf') ? '📄' : '🖼️'}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-gray-700 truncate">{arq.nome_arquivo}</p>
                                      {arq.membro_nome && (
                                        <p className="text-xs text-gray-400">{arq.membro_nome}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <a href={arq.caminho} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline">Ver</a>
                                    <button onClick={() => excluirArquivo(arq.id)}
                                      className="text-xs text-red-400 hover:text-red-600">✕</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ABA — ATIVIDADES
          ════════════════════════════════════════════════════════════ */}
          {aba === 'atividades' && (
            <div>
              <div className="flex gap-2 flex-wrap mb-4">
                {areas.map(area => (
                  <button key={area} onClick={() => setFiltroArea(area)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      filtroArea === area
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-secondary'
                    }`}>
                    {area}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {atividadesFiltradas.map(at => (
                  <div key={at.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{at.emoji}</span>
                      <span className="text-xs font-black text-gray-300">#{String(at.id).padStart(2,'0')}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-2 ${COR_AREA[at.area] || 'bg-gray-100 text-gray-600'}`}>
                      {at.area}
                    </span>
                    <h3 className="text-sm font-bold text-textMain leading-snug mb-2 flex-1">{at.nome}</h3>
                    <span className="text-xs text-secondary font-semibold mb-2">{at.tipo}</span>
                    <div className="flex flex-wrap gap-1">
                      {at.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ABA — GUIA
          ════════════════════════════════════════════════════════════ */}
          {aba === 'guia' && (
            <div className="space-y-3 max-w-2xl">
              {ETAPAS.map(etapa => (
                <div key={etapa.n} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setEtapaAberta(etapaAberta === etapa.n ? null : etapa.n)}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm ${
                      etapaAberta === etapa.n ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600'
                    }`}>{etapa.n}</div>
                    <p className="flex-1 font-semibold text-textMain text-sm">{etapa.titulo}</p>
                    <span className={`text-gray-400 transition-transform ${etapaAberta === etapa.n ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {etapaAberta === etapa.n && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      <p className="text-sm text-gray-600 leading-relaxed mt-3 ml-[52px]">{etapa.descricao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ABA — CRITÉRIOS
          ════════════════════════════════════════════════════════════ */}
          {aba === 'criterios' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                <div className="bg-primary px-5 py-3 flex">
                  <p className="text-white text-sm font-bold flex-1">Critério</p>
                  <p className="text-white text-sm font-bold w-20 text-right">Pontos</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {CRITERIOS.map(({ criterio, pontos, cor, bg }) => (
                    <div key={criterio} className={`flex items-center px-5 py-4 ${bg}`}>
                      <p className="flex-1 text-sm font-semibold text-textMain">{criterio}</p>
                      <span className={`text-xl font-black ${cor}`}>{pontos}</span>
                      <span className="text-xs text-gray-400 ml-1">pts</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center px-5 py-4 bg-primary">
                  <p className="flex-1 text-white font-bold text-sm">Total</p>
                  <span className="text-2xl font-black text-secondary">100</span>
                  <span className="text-xs text-white/60 ml-1">pts</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                {CRITERIOS.map(({ criterio, pontos, cor }) => (
                  <div key={criterio} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{criterio}</span>
                      <span className={`font-bold ${cor}`}>{pontos}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-secondary" style={{ width: `${pontos}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ABA — FERRAMENTAS
          ════════════════════════════════════════════════════════════ */}
          {aba === 'ferramentas' && (
            <div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FERRAMENTAS.map(f => (
                  <a key={f.nome} href={f.url} target="_blank" rel="noopener noreferrer"
                    className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col items-center text-center group ${f.cor}`}>
                    <span className="text-4xl mb-3">{f.emoji}</span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{f.area}</p>
                    <p className="text-base font-bold text-textMain group-hover:text-primary">{f.nome}</p>
                    <span className="mt-3 text-xs text-gray-400 group-hover:text-secondary">Abrir ↗</span>
                  </a>
                ))}
              </div>
              <div className="mt-6 bg-secondary/10 border border-secondary/20 rounded-xl p-4 flex gap-3">
                <span className="text-2xl flex-shrink-0">💡</span>
                <p className="text-sm text-gray-600">
                  Escolha as <strong>2 ou 3</strong> ferramentas mais adequadas para o seu projeto e domine-as.
                  Qualidade é melhor que quantidade!
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Criar / Editar Equipe
      ══════════════════════════════════════════════════════════════════════ */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-textMain">
                {editando ? '✏️ Editar Equipe' : '➕ Nova Equipe'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Nome da startup */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome da Startup *</label>
                <input type="text" placeholder="Ex: TechFácil, RoboEdu, GameLearn..."
                  className="input-field w-full"
                  value={form.nome_startup}
                  onChange={e => setForm(f => ({ ...f, nome_startup: e.target.value }))}
                />
              </div>

              {/* Atividade escolhida */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Atividade do Projeto</label>
                <select className="input-field w-full"
                  value={form.atividade_id || ''}
                  onChange={e => {
                    const at = ATIVIDADES.find(a => a.id === Number(e.target.value))
                    setForm(f => ({
                      ...f,
                      atividade_id:   at?.id   || null,
                      atividade_nome: at?.nome  || '',
                    }))
                  }}>
                  <option value="">Selecione uma atividade...</option>
                  {ATIVIDADES.map(at => (
                    <option key={at.id} value={at.id}>{at.emoji} {at.nome}</option>
                  ))}
                </select>
              </div>

              {/* Líder da equipe */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">👑 Líder da Equipe</label>

                {/* Dropdown: alunos do 9º ano + opção "Outro" */}
                <select className="input-field w-full"
                  value={form.lider_id === -1 ? 'outro' : (form.lider_id || '')}
                  onChange={e => {
                    if (e.target.value === 'outro') {
                      // Modo livre: lider_id = -1 sinaliza "outro"
                      setForm(f => ({ ...f, lider_id: -1, lider_nome: '' }))
                    } else if (e.target.value === '') {
                      setForm(f => ({ ...f, lider_id: null, lider_nome: '' }))
                    } else {
                      const aluno = alunos9.find(a => a.id === Number(e.target.value))
                      if (aluno) setForm(f => ({ ...f, lider_id: aluno.id, lider_nome: aluno.nome }))
                    }
                  }}>
                  <option value="">— Selecione o líder —</option>
                  {alunos9.length > 0 && (
                    <optgroup label="Alunos do 9º Ano">
                      {alunos9.map(a => (
                        <option key={a.id} value={a.id}>{a.nome} — {a.turma}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Outro">
                    <option value="outro">✏️ Outro (Professor ou digitar nome)</option>
                  </optgroup>
                </select>

                {/* Campo livre — aparece quando "Outro" está selecionado */}
                {form.lider_id === -1 && (
                  <input
                    type="text"
                    placeholder="Digite o nome do líder (ex: Prof. Carlos)"
                    className="input-field w-full mt-2"
                    value={form.lider_nome}
                    onChange={e => setForm(f => ({ ...f, lider_nome: e.target.value }))}
                    autoFocus
                  />
                )}

                {/* Exibe o líder selecionado (aluno do 9º ano) */}
                {form.lider_id && form.lider_id !== -1 && (
                  <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-lg">
                    <span className="text-sm font-bold text-secondary flex-1">👑 {form.lider_nome}</span>
                  </div>
                )}
              </div>

              {/* Membros — botão abre popup */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Membros ({form.membros.length}/5)
                  </label>
                  <button onClick={() => { setPopupMembros(true); setBuscaMembro('') }}
                    className="text-xs text-blue-600 font-bold hover:underline">
                    + Escolher alunos
                  </button>
                </div>

                {form.membros.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum membro selecionado</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {form.membros.map(m => (
                      <span key={m.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full">
                        {m.nome}
                        <button onClick={() => toggleMembro(m)} className="text-blue-400 hover:text-red-500 ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Campos da ficha */}
              {[
                { key: 'problema',       label: 'Problema identificado',  placeholder: 'Que problema vocês querem resolver?' },
                { key: 'solucao',        label: 'Solução criada',          placeholder: 'Como vocês vão resolver o problema?' },
                { key: 'publico_alvo',   label: 'Público-alvo',           placeholder: 'Para quem é o produto/serviço?' },
                { key: 'tecnologias',    label: 'Tecnologias usadas',      placeholder: 'Ex: Arduino, Scratch, Canva...' },
                { key: 'modelo_negocio', label: 'Como ganhar dinheiro',    placeholder: 'Ex: Venda avulsa, assinatura...' },
                { key: 'diferencial',    label: 'Diferencial da ideia',    placeholder: 'O que torna a solução de vocês única?' },
                { key: 'prototipo',      label: 'Protótipo criado',        placeholder: 'Descreva o MVP que será apresentado...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                  <textarea rows={2} placeholder={placeholder} className="input-field w-full resize-none"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Footer do modal */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={salvarEquipe} disabled={salvando}
                className="px-5 py-2 text-sm font-bold bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50">
                {salvando ? 'Salvando...' : editando ? '💾 Salvar alterações' : '✅ Criar equipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP — Seleção de membros (alunos do 9º ano)
      ══════════════════════════════════════════════════════════════════════ */}
      {popupMembros && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-textMain">👥 Escolher Membros — 9º Ano</h3>
              <button onClick={() => setPopupMembros(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Busca */}
            <div className="px-4 pt-3 pb-2">
              <input type="text" placeholder="Buscar aluno pelo nome..."
                className="input-field w-full"
                value={buscaMembro}
                onChange={e => setBuscaMembro(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.membros.length}/5 selecionados · Clique para adicionar ou remover
              </p>
            </div>

            {/* Lista de alunos */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {alunos9.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📚</p>
                  <p className="text-sm">Nenhum aluno do 9º ano encontrado</p>
                  <p className="text-xs mt-1">Cadastre turmas com "9" no nome para liberar os alunos</p>
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Nenhum resultado para "{buscaMembro}"</p>
              ) : (
                <div className="space-y-1.5">
                  {alunosFiltrados.map(aluno => {
                    const selecionado = form.membros.some(m => m.id === aluno.id)
                    return (
                      <button key={aluno.id}
                        onClick={() => toggleMembro(aluno)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                          selecionado
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-transparent hover:border-gray-200 text-textMain'
                        }`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          selecionado ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {selecionado ? '✓' : ''}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{aluno.nome}</p>
                          <p className="text-xs opacity-70">{aluno.turma}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={() => setPopupMembros(false)}
                className="w-full py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
                ✅ Confirmar seleção ({form.membros.length} membro{form.membros.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
