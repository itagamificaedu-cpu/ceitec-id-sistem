import React, { useState } from 'react'
import Navbar from '../components/Navbar'

// ─── Dados das 20 atividades ───────────────────────────────────────────────
const ATIVIDADES = [
  {
    id: 1, emoji: '🤖', area: 'Robótica',
    nome: 'Startup de Robôs Educacionais',
    descricao: 'Kit robótico + plataforma de aulas + oficinas para escolas.',
    tags: ['Arduino', 'Sensores', 'Impressão 3D'],
    tipo: 'Produto + Serviço',
  },
  {
    id: 2, emoji: '🎮', area: 'Jogos Digitais',
    nome: 'Plataforma de Gamificação Escolar',
    descricao: 'App/site gamificado com pontos, medalhas e ranking para alunos.',
    tags: ['Web', 'App', 'Gamificação'],
    tipo: 'Plataforma Digital',
  },
  {
    id: 3, emoji: '♟', area: 'Jogos de Tabuleiro',
    nome: 'Empresa de Jogos de Tabuleiro Educativos',
    descricao: 'Protótipo jogável + embalagem com temas de matemática, história e sustentabilidade.',
    tags: ['Design', 'Protótipo', 'Educação'],
    tipo: 'Produto Físico',
  },
  {
    id: 4, emoji: '🛠', area: 'Cultura Maker',
    nome: 'Agência Maker de Impressão 3D',
    descricao: 'Fabricação de chaveiros, suportes, protótipos e troféus sob encomenda.',
    tags: ['Impressão 3D', 'Modelagem', 'Maker'],
    tipo: 'Serviço',
  },
  {
    id: 5, emoji: '🎮', area: 'Jogos Digitais',
    nome: 'Desenvolvimento de Jogo Digital Educativo',
    descricao: 'Jogo para celular/PC com conteúdo educativo usando Scratch, Construct, Godot ou Unity.',
    tags: ['Scratch', 'Unity', 'Godot', 'Construct'],
    tipo: 'Produto Digital',
  },
  {
    id: 6, emoji: '🤖', area: 'Robótica',
    nome: 'Oficina de Automação Residencial',
    descricao: 'Luz automática, alarme, sensor de presença e fechadura digital com Arduino.',
    tags: ['Arduino', 'IoT', 'Automação'],
    tipo: 'Produto + Serviço',
  },
  {
    id: 7, emoji: '💡', area: 'Soluções Educacionais',
    nome: 'Plataforma de Cursos Maker',
    descricao: 'Minicursos online de Arduino, robótica e programação para alunos e professores.',
    tags: ['EaD', 'Vídeo', 'Maker'],
    tipo: 'Plataforma Digital',
  },
  {
    id: 8, emoji: '🎨', area: 'Artesanato Tecnológico',
    nome: 'Empresa de Artesanato Tecnológico',
    descricao: 'Luminárias LED, quadros interativos e objetos decorativos maker com recicláveis.',
    tags: ['LED', 'Reciclagem', 'Design'],
    tipo: 'Produto Físico',
  },
  {
    id: 9, emoji: '🎮', area: 'Jogos Digitais',
    nome: 'Criação de Escape Room Educacional',
    descricao: 'Desafios físicos e digitais com QR Code, sensores e enigmas pedagógicos.',
    tags: ['QR Code', 'Arduino', 'Design'],
    tipo: 'Serviço + Produto',
  },
  {
    id: 10, emoji: '💡', area: 'Soluções Educacionais',
    nome: 'Startup de Inclusão Tecnológica',
    descricao: 'Bengala inteligente, boné sensorial e sistema de alerta sonoro para PcD.',
    tags: ['Acessibilidade', 'Arduino', 'Sensores'],
    tipo: 'Produto Social',
  },
  {
    id: 11, emoji: '📱', area: 'Aplicativos e IA',
    nome: 'Agência de Desenvolvimento de Apps Escolares',
    descricao: 'Agenda escolar, correção online, sistema de frequência — SaaS para escolas.',
    tags: ['App', 'SaaS', 'Web'],
    tipo: 'Plataforma Digital',
  },
  {
    id: 12, emoji: '🛠', area: 'Cultura Maker',
    nome: 'Empresa de Kits Maker para Crianças',
    descricao: 'Kits práticos de energia solar, robôs simples e circuitos elétricos para crianças.',
    tags: ['Energia Solar', 'Eletrônica', 'Educação'],
    tipo: 'Produto Físico',
  },
  {
    id: 13, emoji: '🎨', area: 'Artesanato Tecnológico',
    nome: 'Estúdio de Animação e Jogos 2D',
    descricao: 'Mini game ou animação educativa criada com Piskel, Scratch, Canva ou CapCut.',
    tags: ['Animação', 'Scratch', 'Canva'],
    tipo: 'Produto Digital',
  },
  {
    id: 14, emoji: '🌱', area: 'Sustentabilidade',
    nome: 'Startup de Sustentabilidade Maker',
    descricao: 'Lixeira inteligente, irrigação automática e sensor de desperdício de recursos.',
    tags: ['IoT', 'Arduino', 'Sustentabilidade'],
    tipo: 'Produto Social',
  },
  {
    id: 15, emoji: '📱', area: 'Aplicativos e IA',
    nome: 'Plataforma de Quiz Inteligente',
    descricao: 'Sistema online de provas com ranking, correção automática e inteligência artificial.',
    tags: ['IA', 'Web', 'Educação'],
    tipo: 'Plataforma Digital',
  },
  {
    id: 16, emoji: '🎮', area: 'Jogos Digitais',
    nome: 'Empresa de Eventos Gamer Educacionais',
    descricao: 'Torneios de lógica, Minecraft educativo e desafios maker para escolas.',
    tags: ['Minecraft', 'Eventos', 'Lógica'],
    tipo: 'Serviço',
  },
  {
    id: 17, emoji: '📱', area: 'Aplicativos e IA',
    nome: 'Desenvolvimento de Assistente Virtual Escolar',
    descricao: 'Chatbot para tirar dúvidas, mostrar notas e explicar conteúdos curriculares.',
    tags: ['IA', 'Chatbot', 'NLP'],
    tipo: 'Produto Digital',
  },
  {
    id: 18, emoji: '🌱', area: 'Sustentabilidade',
    nome: 'Startup de Protótipos Inteligentes',
    descricao: 'Sensor de enchente, detector de fumaça e sistema de economia de água.',
    tags: ['Sensores', 'Arduino', 'Segurança'],
    tipo: 'Produto Social',
  },
  {
    id: 19, emoji: '🎨', area: 'Artesanato Tecnológico',
    nome: 'Empresa de Personalização Digital',
    descricao: 'Camisas, canecas, adesivos e placas em MDF com laser, Canva e IA.',
    tags: ['Laser', 'Canva', 'IA'],
    tipo: 'Produto Físico',
  },
  {
    id: 20, emoji: '💡', area: 'Soluções Educacionais',
    nome: 'Plataforma de Feira Maker Virtual',
    descricao: 'Ambiente online com perfil de equipes, vídeos de projeto, votação e loja virtual.',
    tags: ['Web', 'E-commerce', 'Maker'],
    tipo: 'Plataforma Digital',
  },
]

// ─── Etapas do guia de início ─────────────────────────────────────────────
const ETAPAS = [
  {
    n: 1, titulo: 'Escolher um Problema Real',
    descricao: 'Identifique um problema que existe na escola, bairro ou cidade. Quanto mais real e próximo, melhor a solução. Pergunte: "O que incomoda as pessoas ao nosso redor?"',
  },
  {
    n: 2, titulo: 'Criar a Startup',
    descricao: 'Dê um nome criativo, crie um logo (pode usar Canva) e escreva um slogan curto e impactante. Ex: "TechFácil — Tecnologia para todos".',
  },
  {
    n: 3, titulo: 'Definir o Produto',
    descricao: 'Decida o que será criado: app, robô, jogo, kit físico, plataforma. Descreva em uma frase clara o que é e para quem é.',
  },
  {
    n: 4, titulo: 'Planejamento da Equipe',
    descricao: 'Divida as funções entre os 5 integrantes: CEO (liderança), CTO (tecnologia), Designer, Financeiro e Marketing. Cada um com responsabilidades claras.',
  },
  {
    n: 5, titulo: 'Criar o MVP',
    descricao: 'MVP = Mínimo Produto Viável. Crie a versão mais simples possível que já mostre a ideia funcionando. Não precisa ser perfeito — precisa funcionar!',
  },
  {
    n: 6, titulo: 'Modelo de Negócio',
    descricao: 'Responda: como a startup vai ganhar dinheiro? Assinatura mensal, venda avulsa, freemium, licença, doação? Calcule o preço e o custo de produção.',
  },
  {
    n: 7, titulo: 'Criar o Pitch',
    descricao: 'Prepare uma apresentação de 3 minutos com: Problema → Solução → Público-alvo → Como funciona → Como ganha dinheiro → Equipe → Call to action.',
  },
  {
    n: 8, titulo: 'Protótipo e Demonstração',
    descricao: 'Construa o protótipo funcional (físico ou digital) para mostrar na feira. Teste com pessoas reais e colete feedback antes da apresentação.',
  },
  {
    n: 9, titulo: 'Divulgação',
    descricao: 'Crie perfis no Instagram e TikTok da startup, poste o processo de criação e monte uma landing page simples (Google Sites ou Linktree) para apresentar o projeto.',
  },
]

// ─── Critérios de avaliação ───────────────────────────────────────────────
const CRITERIOS = [
  { criterio: 'Criatividade', pontos: 20, cor: 'text-purple-600', bg: 'bg-purple-50' },
  { criterio: 'Inovação', pontos: 20, cor: 'text-blue-600', bg: 'bg-blue-50' },
  { criterio: 'Funcionamento do protótipo', pontos: 20, cor: 'text-green-600', bg: 'bg-green-50' },
  { criterio: 'Impacto social', pontos: 15, cor: 'text-orange-600', bg: 'bg-orange-50' },
  { criterio: 'Pitch e apresentação', pontos: 15, cor: 'text-pink-600', bg: 'bg-pink-50' },
  { criterio: 'Modelo de negócio', pontos: 10, cor: 'text-teal-600', bg: 'bg-teal-50' },
]

// ─── Ferramentas gratuitas ─────────────────────────────────────────────────
const FERRAMENTAS = [
  { area: 'Programação', nome: 'Scratch', url: 'https://scratch.mit.edu', emoji: '🐱', cor: 'bg-orange-50 border-orange-200' },
  { area: 'Robótica', nome: 'Arduino IDE', url: 'https://www.arduino.cc/en/software', emoji: '⚡', cor: 'bg-blue-50 border-blue-200' },
  { area: 'Apps', nome: 'MIT App Inventor', url: 'https://appinventor.mit.edu', emoji: '📱', cor: 'bg-green-50 border-green-200' },
  { area: 'Design', nome: 'Canva', url: 'https://canva.com', emoji: '🎨', cor: 'bg-purple-50 border-purple-200' },
  { area: 'Games', nome: 'Construct 3', url: 'https://construct.net', emoji: '🎮', cor: 'bg-red-50 border-red-200' },
  { area: 'Sites', nome: 'Google Sites', url: 'https://sites.google.com', emoji: '🌐', cor: 'bg-yellow-50 border-yellow-200' },
  { area: 'IA', nome: 'ChatGPT', url: 'https://chat.openai.com', emoji: '🤖', cor: 'bg-teal-50 border-teal-200' },
  { area: 'Protótipos', nome: 'Tinkercad', url: 'https://tinkercad.com', emoji: '🛠', cor: 'bg-indigo-50 border-indigo-200' },
]

// ─── Cores de badge por área ───────────────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────
export default function EmpreendedorismoDigital() {
  // Aba ativa: atividades | guia | equipe | criterios | ferramentas
  const [aba, setAba] = useState('atividades')
  // Etapa expandida no accordion
  const [etapaAberta, setEtapaAberta] = useState(null)
  // Filtro de área nas atividades
  const [filtroArea, setFiltroArea] = useState('Todas')

  const areas = ['Todas', ...Array.from(new Set(ATIVIDADES.map(a => a.area)))]

  const atividadesFiltradas = filtroArea === 'Todas'
    ? ATIVIDADES
    : ATIVIDADES.filter(a => a.area === filtroArea)

  const ABAS = [
    { id: 'atividades', label: '🚀 Atividades', },
    { id: 'guia',       label: '📋 Guia de Início', },
    { id: 'equipe',     label: '👥 Ficha da Equipe', },
    { id: 'criterios',  label: '🏆 Critérios', },
    { id: 'ferramentas',label: '🛠 Ferramentas', },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-6">
        <div className="max-w-6xl mx-auto">

          {/* ── Cabeçalho da área ─────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-3xl">💼</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-textMain leading-tight">
                  Empreendedorismo Digital
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Robótica · Cultura Maker · Jogos · Artesanato · Soluções Educacionais
                </p>
                <p className="text-sm text-gray-600 mt-2 max-w-2xl">
                  Cada equipe cria uma <strong>startup</strong>, produto físico/digital ou serviço real —
                  com apresentação em feira, pitch de 3 minutos e prototipagem hands-on.
                </p>
              </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { valor: '20', label: 'Atividades disponíveis', cor: 'text-secondary' },
                { valor: '9',  label: 'Etapas no guia',         cor: 'text-blue-600' },
                { valor: '5',  label: 'Integrantes por equipe',  cor: 'text-green-600' },
                { valor: '100', label: 'Pontos na avaliação',    cor: 'text-purple-600' },
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
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  aba === a.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════
              ABA 1 — ATIVIDADES
          ══════════════════════════════════════════════════════════ */}
          {aba === 'atividades' && (
            <div>
              {/* Filtro por área */}
              <div className="flex gap-2 flex-wrap mb-4">
                {areas.map(area => (
                  <button
                    key={area}
                    onClick={() => setFiltroArea(area)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      filtroArea === area
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-secondary'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Grid de cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {atividadesFiltradas.map(at => (
                  <div
                    key={at.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col"
                  >
                    {/* Número + emoji */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{at.emoji}</span>
                      <span className="text-xs font-black text-gray-300">#{String(at.id).padStart(2, '0')}</span>
                    </div>

                    {/* Badge de área */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-2 ${COR_AREA[at.area] || 'bg-gray-100 text-gray-600'}`}>
                      {at.area}
                    </span>

                    {/* Nome */}
                    <h3 className="text-sm font-bold text-textMain leading-snug mb-1">
                      {at.nome}
                    </h3>

                    {/* Descrição */}
                    <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-3">
                      {at.descricao}
                    </p>

                    {/* Tipo */}
                    <span className="text-xs text-secondary font-semibold mb-2">
                      {at.tipo}
                    </span>

                    {/* Tags de tecnologias */}
                    <div className="flex flex-wrap gap-1">
                      {at.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 2 — GUIA DE INÍCIO (accordion)
          ══════════════════════════════════════════════════════════ */}
          {aba === 'guia' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Siga as 9 etapas abaixo para transformar uma ideia em uma startup real.
                Clique em cada etapa para ver os detalhes.
              </p>

              {ETAPAS.map(etapa => (
                <div
                  key={etapa.n}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Cabeçalho da etapa */}
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setEtapaAberta(etapaAberta === etapa.n ? null : etapa.n)}
                  >
                    {/* Número */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm transition-colors ${
                      etapaAberta === etapa.n ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {etapa.n}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-textMain text-sm">{etapa.titulo}</p>
                    </div>

                    {/* Seta */}
                    <span className={`text-gray-400 transition-transform ${etapaAberta === etapa.n ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Conteúdo expandido */}
                  {etapaAberta === etapa.n && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                      <div className="pl-13 ml-[52px]">
                        <p className="text-sm text-gray-600 leading-relaxed mt-3">
                          {etapa.descricao}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 3 — FICHA DA EQUIPE
          ══════════════════════════════════════════════════════════ */}
          {aba === 'equipe' && (
            <div className="max-w-2xl">
              <p className="text-sm text-gray-500 mb-5">
                Cada equipe deve preencher os campos abaixo para cadastrar sua startup na feira.
              </p>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabeçalho da ficha */}
                <div className="bg-primary px-5 py-4">
                  <p className="text-white font-bold">📋 Ficha da Startup</p>
                  <p className="text-white/60 text-xs mt-0.5">Modelo de preenchimento — Empreendedorismo Digital</p>
                </div>

                {/* Campos da ficha */}
                <div className="divide-y divide-gray-50">
                  {[
                    { campo: 'Nome da Startup', placeholder: 'Ex: TechFácil, RoboEdu, GameLearn...', tipo: 'text' },
                    { campo: 'Integrantes', placeholder: 'Nomes dos 5 participantes (CEO, CTO, Designer, Financeiro, Marketing)', tipo: 'textarea' },
                    { campo: 'Problema identificado', placeholder: 'Que problema vocês querem resolver?', tipo: 'textarea' },
                    { campo: 'Solução criada', placeholder: 'Como vocês vão resolver o problema?', tipo: 'textarea' },
                    { campo: 'Público-alvo', placeholder: 'Para quem é o produto/serviço?', tipo: 'text' },
                    { campo: 'Tecnologias usadas', placeholder: 'Ex: Arduino, Scratch, Canva, Impressão 3D...', tipo: 'text' },
                    { campo: 'Como ganhar dinheiro', placeholder: 'Ex: Venda avulsa, assinatura mensal, oficinas...', tipo: 'textarea' },
                    { campo: 'Diferencial da ideia', placeholder: 'O que torna a solução de vocês única?', tipo: 'textarea' },
                    { campo: 'Protótipo criado', placeholder: 'Descreva o protótipo / MVP que será apresentado na feira', tipo: 'textarea' },
                  ].map(({ campo, placeholder, tipo }) => (
                    <div key={campo} className="px-5 py-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        {campo}
                      </label>
                      {tipo === 'textarea' ? (
                        <textarea
                          rows={2}
                          placeholder={placeholder}
                          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-textMain placeholder-gray-400 focus:outline-none focus:border-secondary resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={placeholder}
                          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-textMain placeholder-gray-400 focus:outline-none focus:border-secondary"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Rodapé */}
                <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors"
                    onClick={() => window.print()}
                  >
                    🖨️ Imprimir ficha
                  </button>
                </div>
              </div>

              {/* Funções da equipe */}
              <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-bold text-textMain mb-4">👤 Funções da Equipe (5 integrantes)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { cargo: 'CEO', descricao: 'Líder da startup — coordena a equipe e o pitch' },
                    { cargo: 'CTO', descricao: 'Responsável pela tecnologia e protótipo' },
                    { cargo: 'Designer', descricao: 'Cuida do visual — logo, embalagem, identidade' },
                    { cargo: 'Financeiro', descricao: 'Calcula custos, preços e modelo de negócio' },
                    { cargo: 'Marketing', descricao: 'Divulgação nas redes sociais e landing page' },
                  ].map(({ cargo, descricao }) => (
                    <div key={cargo} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <span className="text-xs font-black text-white bg-secondary px-2 py-1 rounded-md flex-shrink-0">
                        {cargo}
                      </span>
                      <p className="text-xs text-gray-600 leading-relaxed">{descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 4 — CRITÉRIOS DE AVALIAÇÃO
          ══════════════════════════════════════════════════════════ */}
          {aba === 'criterios' && (
            <div className="max-w-2xl">
              <p className="text-sm text-gray-500 mb-5">
                Total de <strong>100 pontos</strong> distribuídos entre os critérios abaixo.
                A banca avaliadora pontua cada equipe individualmente.
              </p>

              {/* Tabela visual */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                <div className="bg-primary px-5 py-3 flex">
                  <p className="text-white text-sm font-bold flex-1">Critério</p>
                  <p className="text-white text-sm font-bold w-20 text-right">Pontos</p>
                </div>

                <div className="divide-y divide-gray-50">
                  {CRITERIOS.map(({ criterio, pontos, cor, bg }) => (
                    <div key={criterio} className={`flex items-center px-5 py-4 ${bg}`}>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-textMain">{criterio}</p>
                      </div>
                      <div className="w-20 text-right">
                        <span className={`text-xl font-black ${cor}`}>{pontos}</span>
                        <span className="text-xs text-gray-400 ml-0.5">pts</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center px-5 py-4 bg-primary">
                  <p className="flex-1 text-white font-bold text-sm">Total</p>
                  <span className="text-2xl font-black text-secondary">100</span>
                  <span className="text-xs text-white/60 ml-1">pts</span>
                </div>
              </div>

              {/* Barra visual de distribuição */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Distribuição dos pontos
                </p>
                {CRITERIOS.map(({ criterio, pontos, cor }) => (
                  <div key={criterio} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{criterio}</span>
                      <span className={`font-bold ${cor}`}>{pontos}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-secondary transition-all"
                        style={{ width: `${pontos}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ABA 5 — FERRAMENTAS GRATUITAS
          ══════════════════════════════════════════════════════════ */}
          {aba === 'ferramentas' && (
            <div>
              <p className="text-sm text-gray-500 mb-5">
                Todas as ferramentas abaixo são <strong>gratuitas</strong> e podem ser usadas
                diretamente no navegador — sem precisar instalar nada.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FERRAMENTAS.map(f => (
                  <a
                    key={f.nome}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col items-center text-center group ${f.cor}`}
                  >
                    <span className="text-4xl mb-3">{f.emoji}</span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {f.area}
                    </p>
                    <p className="text-base font-bold text-textMain group-hover:text-primary transition-colors">
                      {f.nome}
                    </p>
                    <span className="mt-3 text-xs text-gray-400 group-hover:text-secondary transition-colors">
                      Abrir ferramenta ↗
                    </span>
                  </a>
                ))}
              </div>

              {/* Dica extra */}
              <div className="mt-6 bg-secondary/10 border border-secondary/20 rounded-xl p-4 flex gap-3">
                <span className="text-2xl flex-shrink-0">💡</span>
                <div>
                  <p className="text-sm font-bold text-textMain">Dica para a equipe</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Não tente usar todas as ferramentas ao mesmo tempo. Escolha as <strong>2 ou 3</strong> mais
                    adequadas para o seu projeto e domine-as bem. Qualidade é melhor que quantidade!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
