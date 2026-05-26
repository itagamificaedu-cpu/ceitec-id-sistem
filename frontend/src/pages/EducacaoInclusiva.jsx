/**
 * EducacaoInclusiva.jsx
 * Aba completa de Educação Inclusiva — 3 seções:
 *  1. Plataformas gratuitas (cards filtráveis)
 *  2. Jogos educativos inclusivos
 *  3. Gerador de Atividades Adaptativas (IA)
 */
import React, { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// ─── Paleta visual ────────────────────────────────────────────────────────────
const C = {
  navy:   '#0d1b2e',
  gold:   '#f5a623',
  card:   '#112240',
  border: '#1e3a5f',
  text:   '#e8edf2',
  muted:  '#8899aa',
}

// ─── Badges de necessidade ────────────────────────────────────────────────────
const BADGE = {
  TEA:          { bg: '#6d28d9', label: 'TEA' },
  TDAH:         { bg: '#d97706', label: 'TDAH' },
  Surdez:       { bg: '#1d4ed8', label: 'Surdez' },
  'Baixa Visão':{ bg: '#0f766e', label: 'Baixa Visão' },
  DI:           { bg: '#be185d', label: 'DI' },
  Dislexia:     { bg: '#b45309', label: 'Dislexia' },
  Discalculia:  { bg: '#7c3aed', label: 'Discalculia' },
}

function NecBadge({ n, pequeno }) {
  const b = BADGE[n] || { bg: '#374151', label: n }
  return (
    <span style={{
      background: b.bg, color: '#fff',
      borderRadius: 20, padding: pequeno ? '1px 7px' : '2px 10px',
      fontSize: pequeno ? 10 : 11, fontWeight: 700,
      fontFamily: 'Rajdhani, sans-serif', letterSpacing: '.5px',
      display: 'inline-block', margin: '2px 2px',
    }}>{b.label}</span>
  )
}

// ─── SEÇÃO 1 — Plataformas ────────────────────────────────────────────────────
const PLATAFORMAS = [
  {
    id: 1,
    nome: 'Diversa.org.br',
    url: 'https://diversa.org.br',
    descricao: 'Portal do Instituto Rodrigo Mendes com práticas, vídeos e guias para inclusão escolar.',
    necessidades: ['TEA', 'DI', 'Dislexia', 'TDAH', 'Surdez', 'Baixa Visão'],
    faixa: 'Todas as idades',
    profMaterial: true,
    icon: '🌈',
  },
  {
    id: 2,
    nome: 'Bengala Legal',
    url: 'https://www.bengalalegal.com',
    descricao: 'Referência em tecnologia assistiva e recursos para deficiência visual no Brasil.',
    necessidades: ['Baixa Visão'],
    faixa: 'Todas as idades',
    profMaterial: true,
    icon: '👁️',
  },
  {
    id: 3,
    nome: 'Khan Academy',
    url: 'https://pt.khanacademy.org',
    descricao: 'Exercícios adaptativos de Matemática, Ciências e Programação com progresso individual.',
    necessidades: ['DI', 'TDAH', 'Dislexia', 'Discalculia'],
    faixa: '6 – 18 anos',
    profMaterial: true,
    icon: '🎓',
  },
  {
    id: 4,
    nome: 'Khan Academy Kids',
    url: 'https://khankids.org',
    descricao: 'App e web com histórias, jogos e atividades para alfabetização e numeramento iniciais.',
    necessidades: ['TEA', 'DI', 'TDAH'],
    faixa: '2 – 8 anos',
    profMaterial: false,
    icon: '🧒',
  },
  {
    id: 5,
    nome: 'Escola Digital',
    url: 'https://escoladigital.org.br',
    descricao: 'Acervo com mais de 6 000 objetos educacionais digitais para diferentes habilidades.',
    necessidades: ['TEA', 'DI', 'TDAH', 'Surdez', 'Dislexia'],
    faixa: 'Todas as idades',
    profMaterial: true,
    icon: '💻',
  },
  {
    id: 6,
    nome: 'Nova Escola',
    url: 'https://novaescola.org.br',
    descricao: 'Planos de aula, sequências didáticas e artigos sobre práticas inclusivas alinhados à BNCC.',
    necessidades: ['TEA', 'DI', 'TDAH', 'Dislexia', 'Discalculia'],
    faixa: 'EF e EM',
    profMaterial: true,
    icon: '📚',
  },
  {
    id: 7,
    nome: 'Smartkids',
    url: 'https://www.smartkids.com.br',
    descricao: 'Jogos e atividades educativas gratuitas com foco em alfabetização e matemática.',
    necessidades: ['DI', 'TDAH', 'Dislexia'],
    faixa: '3 – 12 anos',
    profMaterial: false,
    icon: '🎮',
  },
  {
    id: 8,
    nome: 'Scratch',
    url: 'https://scratch.mit.edu',
    descricao: 'Plataforma de programação visual em blocos do MIT — estimula raciocínio lógico e criatividade.',
    necessidades: ['TEA', 'TDAH', 'DI'],
    faixa: '8 – 16 anos',
    profMaterial: true,
    icon: '🐱',
  },
  {
    id: 9,
    nome: 'Cerebrax',
    url: 'https://cerebrax.com.br',
    descricao: 'Jogos de treino cognitivo: atenção, memória e raciocínio — indicado para TDAH e DI.',
    necessidades: ['TDAH', 'DI', 'Discalculia'],
    faixa: '6 – 99 anos',
    profMaterial: false,
    icon: '🧠',
  },
  {
    id: 10,
    nome: 'Hand Talk',
    url: 'https://www.handtalk.me/br',
    descricao: 'Aplicativo que traduz português para LIBRAS em tempo real — apoio fundamental para surdos.',
    necessidades: ['Surdez'],
    faixa: 'Todas as idades',
    profMaterial: true,
    icon: '🤟',
  },
  {
    id: 11,
    nome: 'Portal MEC / RIVED',
    url: 'http://rived.mec.gov.br',
    descricao: 'Animações e simulações educacionais do MEC para diversas disciplinas e anos escolares.',
    necessidades: ['DI', 'TDAH', 'Dislexia', 'Discalculia'],
    faixa: 'EF e EM',
    profMaterial: true,
    icon: '🇧🇷',
  },
  {
    id: 12,
    nome: 'British Council Kids',
    url: 'https://www.britishcouncil.org.br/criancas-e-jovens',
    descricao: 'Jogos e músicas em inglês com abordagem visual e auditiva — ótimo para dislexia.',
    necessidades: ['Dislexia', 'TDAH'],
    faixa: '3 – 12 anos',
    profMaterial: true,
    icon: '🇬🇧',
  },
  {
    id: 13,
    nome: 'Caed / INEP Acessível',
    url: 'https://caed.ufjf.br',
    descricao: 'Avaliações adaptadas e descritores de habilidades para alunos com NEE.',
    necessidades: ['TEA', 'DI', 'Surdez', 'Baixa Visão'],
    faixa: 'EF e EM',
    profMaterial: true,
    icon: '📊',
  },
  {
    id: 14,
    nome: 'Instituto Rodrigo Mendes',
    url: 'https://institutorodrigomendes.org.br',
    descricao: 'Formação de professores, pesquisas e repositório de práticas pedagógicas inclusivas.',
    necessidades: ['TEA', 'DI', 'Surdez', 'Baixa Visão', 'TDAH', 'Dislexia'],
    faixa: 'Formação docente',
    profMaterial: true,
    icon: '🏫',
  },
  {
    id: 15,
    nome: 'Eduplay',
    url: 'https://www.eduplay.com.br',
    descricao: 'Jogos educativos online gratuitos para alfabetização, matemática e raciocínio lógico.',
    necessidades: ['DI', 'TDAH', 'Dislexia', 'Discalculia'],
    faixa: '4 – 12 anos',
    profMaterial: false,
    icon: '🕹️',
  },
]

// ─── SEÇÃO 2 — Jogos ─────────────────────────────────────────────────────────
const JOGOS = [
  {
    id: 1,
    titulo: 'Números com Tux',
    url: 'https://tuxmath.sourceforge.net',
    plataforma: 'Web / Linux',
    necessidades: ['Discalculia', 'DI'],
    disciplina: 'Matemática',
    descricao: 'Operações básicas em formato de jogo espacial — ritmo controlável.',
    thumb: '🧮',
  },
  {
    id: 2,
    titulo: 'Tux Paint',
    url: 'https://tuxpaint.org',
    plataforma: 'Web / Windows / Linux',
    necessidades: ['TEA', 'DI', 'TDAH'],
    disciplina: 'Artes',
    descricao: 'Editor de desenho infantil com sons e interface simplificada, excelente para TEA.',
    thumb: '🎨',
  },
  {
    id: 3,
    titulo: 'Khan Academy — Matemática',
    url: 'https://pt.khanacademy.org/math',
    plataforma: 'Web',
    necessidades: ['Discalculia', 'DI', 'TDAH'],
    disciplina: 'Matemática',
    descricao: 'Exercícios interativos de matemática do básico ao avançado com dicas em vídeo.',
    thumb: '📐',
  },
  {
    id: 4,
    titulo: 'Smartkids — Português',
    url: 'https://www.smartkids.com.br/jogos/portugues',
    plataforma: 'Web',
    necessidades: ['Dislexia', 'DI', 'TDAH'],
    disciplina: 'Português',
    descricao: 'Jogos de alfabetização, leitura e escrita com feedback visual imediato.',
    thumb: '📝',
  },
  {
    id: 5,
    titulo: 'Cerebrax — Memória',
    url: 'https://cerebrax.com.br',
    plataforma: 'Web / Android / iOS',
    necessidades: ['TDAH', 'DI', 'TEA'],
    disciplina: 'Geral',
    descricao: 'Jogos de treino cognitivo: memória, atenção e velocidade de processamento.',
    thumb: '🧠',
  },
  {
    id: 6,
    titulo: 'Scratch — Projetos Inclusivos',
    url: 'https://scratch.mit.edu/search/projects?q=inclusao',
    plataforma: 'Web',
    necessidades: ['TEA', 'TDAH'],
    disciplina: 'Geral',
    descricao: 'Projetos de programação visual criados por e para alunos com NEE.',
    thumb: '🐱',
  },
  {
    id: 7,
    titulo: 'Escola Digital — Jogos de Ciências',
    url: 'https://escoladigital.org.br/busca?q=ciencias&tipo=jogo',
    plataforma: 'Web',
    necessidades: ['DI', 'TDAH', 'Dislexia'],
    disciplina: 'Ciências',
    descricao: 'Simulações e jogos de ciências com interface acessível e textos simplificados.',
    thumb: '🔬',
  },
  {
    id: 8,
    titulo: 'British Council — Games',
    url: 'https://www.britishcouncil.org/children/kids-online/games',
    plataforma: 'Web',
    necessidades: ['Dislexia', 'TDAH'],
    disciplina: 'Inglês',
    descricao: 'Jogos de vocabulário e gramática em inglês com suporte visual e sonoro.',
    thumb: '🇬🇧',
  },
  {
    id: 9,
    titulo: 'Eduplay — Histórias Interativas',
    url: 'https://www.eduplay.com.br/stories',
    plataforma: 'Web',
    necessidades: ['DI', 'TDAH', 'Dislexia'],
    disciplina: 'Português',
    descricao: 'Histórias animadas com narração, estimulando compreensão leitora.',
    thumb: '📖',
  },
  {
    id: 10,
    titulo: 'INES — LIBRAS Online',
    url: 'https://www.ines.gov.br/glossario-libras',
    plataforma: 'Web',
    necessidades: ['Surdez'],
    disciplina: 'Geral',
    descricao: 'Glossário de LIBRAS do Instituto Nacional de Educação de Surdos.',
    thumb: '🤟',
  },
  {
    id: 11,
    titulo: 'Smartkids — Matemática',
    url: 'https://www.smartkids.com.br/jogos/matematica',
    plataforma: 'Web',
    necessidades: ['Discalculia', 'DI'],
    disciplina: 'Matemática',
    descricao: 'Jogos de tabuada, formas geométricas e operações com feedback animado.',
    thumb: '🔢',
  },
  {
    id: 12,
    titulo: 'Portal MEC — Objetos de Aprendizagem',
    url: 'http://objetoseducacionais2.mec.gov.br',
    plataforma: 'Web',
    necessidades: ['DI', 'Dislexia', 'Discalculia'],
    disciplina: 'Geral',
    descricao: 'Repositório federal com centenas de objetos digitais para diversas disciplinas.',
    thumb: '🏛️',
  },
]

const FILTROS = ['Todos', 'TEA', 'TDAH', 'Surdez', 'Baixa Visão', 'DI', 'Dislexia', 'Discalculia']
const DISCIPLINAS = ['Todas', 'Português', 'Matemática', 'Ciências', 'Artes', 'Inglês', 'Geral']

// ─── Seção 1 — Cards de Plataformas ──────────────────────────────────────────
function SecaoPlataformas() {
  const [filtro, setFiltro] = useState('Todos')

  const visiveis = filtro === 'Todos'
    ? PLATAFORMAS
    : PLATAFORMAS.filter(p => p.necessidades.includes(filtro))

  return (
    <div>
      {/* Pills de filtro */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13,
              background: filtro === f ? C.gold : C.border,
              color: filtro === f ? C.navy : C.text,
              transition: 'all .2s',
            }}
          >{f}</button>
        ))}
      </div>

      {/* Grid de cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {visiveis.map(p => (
          <div key={p.id} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'border-color .2s, transform .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none' }}
          >
            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{p.icon}</span>
              <div>
                <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 700 }}>
                  {p.nome}
                </p>
                <p style={{ color: C.muted, fontSize: 11 }}>
                  ♿ {p.faixa} {p.profMaterial && '· 📋 Material prof.'}
                </p>
              </div>
            </div>

            {/* Descrição */}
            <p style={{ color: C.text, fontSize: 13, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.5, flex: 1 }}>
              {p.descricao}
            </p>

            {/* Badges de necessidade */}
            <div>{p.necessidades.map(n => <NecBadge key={n} n={n} pequeno />)}</div>

            {/* Botão */}
            <a
              href={p.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', padding: '8px 0',
                background: C.gold, color: C.navy, borderRadius: 8,
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13,
                textDecoration: 'none', marginTop: 4,
              }}
            >
              Acessar plataforma ↗
            </a>
          </div>
        ))}
      </div>

      {visiveis.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontFamily: 'Rajdhani, sans-serif' }}>
          Nenhuma plataforma encontrada para este filtro.
        </div>
      )}
    </div>
  )
}

// ─── Seção 2 — Jogos ─────────────────────────────────────────────────────────
function SecaoJogos() {
  const [filtroNec, setFiltroNec]   = useState('Todos')
  const [filtroDisc, setFiltroDisc] = useState('Todas')

  const visiveis = JOGOS.filter(j => {
    const passaNec  = filtroNec === 'Todos'   || j.necessidades.includes(filtroNec)
    const passaDisc = filtroDisc === 'Todas'  || j.disciplina === filtroDisc
    return passaNec && passaDisc
  })

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltroNec(f)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 12,
            background: filtroNec === f ? C.gold : C.border,
            color: filtroNec === f ? C.navy : C.text,
          }}>{f}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {DISCIPLINAS.map(d => (
          <button key={d} onClick={() => setFiltroDisc(d)} style={{
            padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.border}`, cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif', fontSize: 12,
            background: filtroDisc === d ? '#1e3a5f' : 'transparent',
            color: filtroDisc === d ? C.gold : C.muted,
          }}>{d}</button>
        ))}
      </div>

      {/* Grid de jogos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {visiveis.map(j => (
          <div key={j.id} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {/* Thumbnail */}
            <div style={{
              background: C.navy, borderRadius: 8, height: 80,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
              border: `1px solid ${C.border}`,
            }}>
              {j.thumb}
            </div>

            <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700 }}>
              {j.titulo}
            </p>
            <p style={{ color: C.muted, fontSize: 11 }}>📱 {j.plataforma} · {j.disciplina}</p>
            <p style={{ color: C.text, fontSize: 12, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.4, flex: 1 }}>
              {j.descricao}
            </p>
            <div>{j.necessidades.map(n => <NecBadge key={n} n={n} pequeno />)}</div>
            <a href={j.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', textAlign: 'center', padding: '7px 0',
              background: C.gold, color: C.navy, borderRadius: 7,
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 12,
              textDecoration: 'none',
            }}>🎮 Jogar agora</a>
          </div>
        ))}
      </div>

      {visiveis.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontFamily: 'Rajdhani, sans-serif' }}>
          Nenhum jogo encontrado para esta combinação de filtros.
        </div>
      )}
    </div>
  )
}

// ─── Seção 3 — Gerador de Atividades (IA) ────────────────────────────────────
const NECESSIDADES    = ['TEA', 'TDAH', 'Deficiência Intelectual', 'Surdez', 'Baixa Visão', 'Dislexia', 'Discalculia', 'Outra']
const NIVEIS          = ['1º ao 5º ano EF', '6º ao 9º ano EF', 'Ensino Médio']
const DISCIPLINAS_IA  = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Ed. Física', 'Inglês']
const TIPOS_ATIVIDADE = [
  'Leitura adaptada', 'Exercício com imagens', 'Jogo com regras simplificadas',
  'Atividade sensorial', 'Sequência lógica visual', 'Cruzadinha adaptada', 'Texto com pictogramas',
]
const NIVEIS_APOIO = ['Independente', 'Com apoio moderado', 'Apoio intenso']

// Parser simples: divide o texto em seções pelo marcador **SEÇÃO**
function parsearAtividade(texto) {
  const secoes = {}
  const chaves = ['OBJETIVO', 'MATERIAIS', 'PASSO A PASSO', 'DICA PARA O PROFESSOR', 'ADAPTAÇÕES ADICIONAIS']
  let atual = null
  texto.split('\n').forEach(linha => {
    const limpa = linha.replace(/\*\*/g, '').trim()
    const chave = chaves.find(c => limpa.toUpperCase().startsWith(c))
    if (chave) {
      atual = chave
      secoes[chave] = []
    } else if (atual && limpa) {
      secoes[atual].push(limpa)
    }
  })
  return secoes
}

function AtividadeCard({ texto, contexto, onNova, onSalvar }) {
  const [aberta, setAberta]   = useState(false)
  const secoes = parsearAtividade(texto)

  function imprimir() {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><title>Atividade Inclusiva — ITA</title>
<style>
  body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a;line-height:1.6}
  h1{color:#0d1b2e;font-size:18px;border-bottom:2px solid #f5a623;padding-bottom:8px}
  h2{color:#0d1b2e;font-size:14px;margin-top:20px}
  .meta{background:#f0f4f8;padding:10px;border-radius:6px;font-size:13px;margin-bottom:16px}
  .dica{background:#fff7e6;border-left:4px solid #f5a623;padding:10px;margin:12px 0}
  ul,ol{padding-left:20px} li{margin:4px 0}
  @media print{body{margin:20px}}
</style></head><body>
<h1>♿ Atividade Adaptada — Educação Inclusiva</h1>
<div class="meta">
  <strong>Necessidade:</strong> ${contexto.necessidade} &nbsp;|&nbsp;
  <strong>Nível:</strong> ${contexto.nivel} &nbsp;|&nbsp;
  <strong>Disciplina:</strong> ${contexto.disciplina} &nbsp;|&nbsp;
  <strong>Tipo:</strong> ${contexto.tipoAtividade}
</div>
${texto.replace(/\*\*(.*?)\*\*/g, '<h2>$1</h2>').replace(/\n/g, '<br/>')}
<p style="margin-top:30px;font-size:11px;color:#888">Gerado pela plataforma ITA Tecnologia Educacional</p>
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const cor = s => {
    if (s === 'OBJETIVO') return '#1d4ed8'
    if (s === 'MATERIAIS') return '#15803d'
    if (s === 'PASSO A PASSO') return '#7c3aed'
    if (s === 'DICA PARA O PROFESSOR') return '#d97706'
    return '#374151'
  }

  return (
    <div style={{
      background: C.card, border: `2px solid ${C.gold}`,
      borderRadius: 14, padding: 24, marginTop: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <div>
          <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700 }}>
            Atividade Gerada
          </p>
          <p style={{ color: C.muted, fontSize: 12 }}>
            {contexto.necessidade} · {contexto.disciplina} · {contexto.nivel}
          </p>
        </div>
      </div>

      {/* Seções */}
      {['OBJETIVO', 'MATERIAIS', 'PASSO A PASSO', 'DICA PARA O PROFESSOR'].map(sec => (
        secoes[sec] && (
          <div key={sec} style={{
            background: C.navy, borderRadius: 10, padding: 14, marginBottom: 12,
            borderLeft: `3px solid ${cor(sec)}`,
          }}>
            <p style={{
              color: cor(sec), fontFamily: 'Orbitron, sans-serif', fontSize: 11,
              fontWeight: 700, letterSpacing: '.5px', marginBottom: 8,
            }}>
              {sec === 'OBJETIVO' && '🎯 '}
              {sec === 'MATERIAIS' && '📦 '}
              {sec === 'PASSO A PASSO' && '📋 '}
              {sec === 'DICA PARA O PROFESSOR' && '💡 '}
              {sec}
            </p>
            {secoes[sec].map((l, i) => (
              <p key={i} style={{ color: C.text, fontSize: 13, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.6, marginBottom: 4 }}>
                {l}
              </p>
            ))}
          </div>
        )
      ))}

      {/* Adaptações (accordeon) */}
      {secoes['ADAPTAÇÕES ADICIONAIS'] && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setAberta(!aberta)} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.muted, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif', fontSize: 13, width: '100%', textAlign: 'left',
          }}>
            {aberta ? '▲' : '▼'} Adaptações Adicionais Sugeridas
          </button>
          {aberta && (
            <div style={{ background: C.navy, borderRadius: '0 0 8px 8px', padding: 14 }}>
              {secoes['ADAPTAÇÕES ADICIONAIS'].map((l, i) => (
                <p key={i} style={{ color: C.text, fontSize: 13, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.6, marginBottom: 4 }}>
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={imprimir} style={{
          padding: '9px 18px', background: '#1e3a5f', color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer',
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13,
        }}>🖨️ Imprimir</button>
        <button onClick={onSalvar} style={{
          padding: '9px 18px', background: '#15803d', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer',
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13,
        }}>💾 Salvar no Banco</button>
        <button onClick={onNova} style={{
          padding: '9px 18px', background: C.gold, color: C.navy,
          border: 'none', borderRadius: 8, cursor: 'pointer',
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13,
        }}>🔄 Nova Versão</button>
      </div>
    </div>
  )
}

function BancoAtividades({ banco, onExcluir }) {
  const [filtroNec,  setFiltroNec]  = useState('Todos')
  const [filtroDisc, setFiltroDisc] = useState('Todas')

  const visiveis = banco.filter(a => {
    const n = filtroNec  === 'Todos'  || a.contexto.necessidade === filtroNec
    const d = filtroDisc === 'Todas'  || a.contexto.disciplina  === filtroDisc
    return n && d
  })

  if (!banco.length) return null

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 14, fontWeight: 700 }}>
          📂 Banco de Atividades
        </p>
        <span style={{
          background: C.gold, color: C.navy, borderRadius: 20, padding: '2px 10px',
          fontSize: 12, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
        }}>{banco.length} salvas</span>
      </div>

      {/* Filtros do banco */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {['Todos', ...NECESSIDADES].map(f => (
          <button key={f} onClick={() => setFiltroNec(f)} style={{
            padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: filtroNec === f ? C.gold : C.border,
            color: filtroNec === f ? C.navy : C.text,
            fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700,
          }}>{f}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {['Todas', ...DISCIPLINAS_IA].map(d => (
          <button key={d} onClick={() => setFiltroDisc(d)} style={{
            padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}`, cursor: 'pointer',
            background: filtroDisc === d ? '#1e3a5f' : 'transparent',
            color: filtroDisc === d ? C.gold : C.muted,
            fontFamily: 'Rajdhani, sans-serif', fontSize: 11,
          }}>{d}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {visiveis.map((a, i) => (
          <div key={a.id} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <NecBadge n={a.contexto.necessidade.split(' ')[0]} pequeno />
                <p style={{ color: C.text, fontFamily: 'Rajdhani, sans-serif', fontSize: 13, marginTop: 6 }}>
                  <strong style={{ color: C.gold }}>{a.contexto.disciplina}</strong> · {a.contexto.nivel}
                </p>
                <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {a.contexto.tema} · {a.contexto.tipoAtividade}
                </p>
                <p style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
                  {new Date(a.data).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => onExcluir(a.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#dc2626', fontSize: 16, padding: '2px 6px',
              }} title="Excluir">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecaoGerador() {
  const [form, setForm] = useState({
    nomeAluno: '', necessidade: '', nivel: '', disciplina: '',
    tema: '', tipoAtividade: '', observacoes: '', apoio: '',
  })
  const [carregando, setCarregando] = useState(false)
  const [atividade, setAtividade]   = useState(null)
  const [contexto, setContexto]     = useState(null)
  const [erro, setErro]             = useState(null)
  const [banco, setBanco]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('ita_atividades_inclusivas') || '[]') }
    catch { return [] }
  })

  const salvarBanco = (novas) => {
    setBanco(novas)
    localStorage.setItem('ita_atividades_inclusivas', JSON.stringify(novas))
  }

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function gerar() {
    if (!form.necessidade || !form.nivel || !form.disciplina || !form.tema || !form.tipoAtividade || !form.apoio) {
      setErro('Preencha todos os campos obrigatórios antes de gerar.')
      return
    }
    setErro(null)
    setCarregando(true)
    setAtividade(null)
    try {
      const { data } = await api.post('/educacao-inclusiva/gerar', form)
      setAtividade(data.atividade)
      setContexto({ ...form })
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao gerar atividade. Verifique sua conexão.')
    } finally {
      setCarregando(false)
    }
  }

  function salvarNosBanco() {
    if (!atividade) return
    const nova = {
      id: Date.now(),
      data: new Date().toISOString(),
      contexto,
      texto: atividade,
    }
    salvarBanco([nova, ...banco])
  }

  function excluirDoBanco(id) {
    salvarBanco(banco.filter(a => a.id !== id))
  }

  const inputStyle = {
    width: '100%', background: C.navy, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 12px', color: C.text,
    fontFamily: 'Rajdhani, sans-serif', fontSize: 14, boxSizing: 'border-box',
    outline: 'none',
  }
  const labelStyle = {
    color: C.muted, fontFamily: 'Rajdhani, sans-serif', fontSize: 13,
    fontWeight: 700, display: 'block', marginBottom: 6,
  }
  const Select = ({ k, opts, placeholder }) => (
    <select value={form[k]} onChange={e => campo(k, e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <div>
      {/* Formulário */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 28, marginBottom: 24,
      }}>
        <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
          🤖 Gerador de Atividades Adaptativas com IA
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Nome do aluno */}
          <div>
            <label style={labelStyle}>Nome do aluno <span style={{ color: C.muted }}>(opcional)</span></label>
            <input
              style={inputStyle} value={form.nomeAluno} placeholder="ex: meu aluno"
              onChange={e => campo('nomeAluno', e.target.value)}
            />
          </div>

          {/* Necessidade */}
          <div>
            <label style={labelStyle}>Tipo de necessidade *</label>
            <Select k="necessidade" opts={NECESSIDADES} placeholder="Selecione..." />
          </div>

          {/* Nível */}
          <div>
            <label style={labelStyle}>Nível / Série *</label>
            <Select k="nivel" opts={NIVEIS} placeholder="Selecione..." />
          </div>

          {/* Disciplina */}
          <div>
            <label style={labelStyle}>Disciplina *</label>
            <Select k="disciplina" opts={DISCIPLINAS_IA} placeholder="Selecione..." />
          </div>

          {/* Tema */}
          <div>
            <label style={labelStyle}>Tema da aula *</label>
            <input
              style={inputStyle} value={form.tema} placeholder="ex: frações, animais da caatinga"
              onChange={e => campo('tema', e.target.value)}
            />
          </div>

          {/* Tipo de atividade */}
          <div>
            <label style={labelStyle}>Tipo de atividade *</label>
            <Select k="tipoAtividade" opts={TIPOS_ATIVIDADE} placeholder="Selecione..." />
          </div>

          {/* Nível de apoio */}
          <div>
            <label style={labelStyle}>Nível de apoio necessário *</label>
            <Select k="apoio" opts={NIVEIS_APOIO} placeholder="Selecione..." />
          </div>

          {/* Observações */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Observações especiais <span style={{ color: C.muted }}>(opcional)</span></label>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
              value={form.observacoes}
              placeholder="ex: aprende melhor com música, não gosta de atividades longas..."
              onChange={e => campo('observacoes', e.target.value)}
            />
          </div>
        </div>

        {erro && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', borderRadius: 8,
            padding: '10px 14px', marginTop: 16, fontFamily: 'Rajdhani, sans-serif', fontSize: 13,
          }}>{erro}</div>
        )}

        <button
          onClick={gerar} disabled={carregando}
          style={{
            marginTop: 20, padding: '12px 32px',
            background: carregando ? C.border : C.gold,
            color: carregando ? C.muted : C.navy,
            border: 'none', borderRadius: 10, cursor: carregando ? 'wait' : 'pointer',
            fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14,
            transition: 'all .2s', width: '100%',
          }}
        >
          {carregando ? '⏳ Gerando atividade...' : '✨ Gerar Atividade Adaptada'}
        </button>
      </div>

      {/* Loading */}
      {carregando && (
        <div style={{
          background: C.card, borderRadius: 14, padding: 32, textAlign: 'center',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 48, height: 48, border: `3px solid ${C.border}`,
            borderTop: `3px solid ${C.gold}`, borderRadius: '50%', margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: C.gold, fontFamily: 'Orbitron, sans-serif', fontSize: 14 }}>
            Criando atividade personalizada para {form.necessidade || 'o aluno'}...
          </p>
          <p style={{ color: C.muted, fontFamily: 'Rajdhani, sans-serif', fontSize: 13, marginTop: 8 }}>
            A IA está preparando uma atividade adaptada às necessidades específicas.
          </p>
        </div>
      )}

      {/* Resultado */}
      {atividade && !carregando && (
        <AtividadeCard
          texto={atividade}
          contexto={contexto}
          onNova={gerar}
          onSalvar={salvarNosBanco}
        />
      )}

      {/* Banco de atividades salvas */}
      <BancoAtividades banco={banco} onExcluir={excluirDoBanco} />
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const ABAS = [
  { id: 'plataformas', label: '🌐 Plataformas & Recursos' },
  { id: 'jogos',       label: '🎮 Jogos Inclusivos' },
  { id: 'gerador',     label: '🤖 Gerador de Atividades' },
]

export default function EducacaoInclusiva() {
  const [aba, setAba] = useState('plataformas')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.navy }}>
      <Navbar />

      <main style={{ flex: 1, marginLeft: 0, padding: '24px', paddingTop: '80px' }}
        className="lg:ml-64 lg:pt-6">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Cabeçalho */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
              fontSize: 22, color: C.gold, marginBottom: 6,
            }}>
              ♿ Educação Inclusiva
            </h1>
            <p style={{ color: C.muted, fontFamily: 'Rajdhani, sans-serif', fontSize: 15 }}>
              Plataformas gratuitas, jogos acessíveis e gerador de atividades adaptativas com IA
            </p>
          </div>

          {/* Abas de navegação */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 28,
            borderBottom: `2px solid ${C.border}`, paddingBottom: 0,
          }}>
            {ABAS.map(a => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                style={{
                  padding: '10px 20px', background: 'none',
                  border: 'none', borderBottom: aba === a.id ? `3px solid ${C.gold}` : '3px solid transparent',
                  cursor: 'pointer', color: aba === a.id ? C.gold : C.muted,
                  fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14,
                  marginBottom: -2, transition: 'all .2s',
                  whiteSpace: 'nowrap',
                }}
              >{a.label}</button>
            ))}
          </div>

          {/* Conteúdo da aba */}
          {aba === 'plataformas' && <SecaoPlataformas />}
          {aba === 'jogos'       && <SecaoJogos />}
          {aba === 'gerador'     && <SecaoGerador />}

        </div>
      </main>
    </div>
  )
}
