const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const CORRETOR_BASE = 'https://correcaoonlineita.pythonanywhere.com';
const CHAVE = 'gamificaedu_secreto_2026';

// Faz login mágico e retorna cookie de sessão (para professores)
async function getCorretorSession(email, nome) {
  const url = `${CORRETOR_BASE}/login-magico/?email=${encodeURIComponent(email)}&nome=${encodeURIComponent(nome || '')}&chave=${CHAVE}&next=/resultados/`;
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/sessionid=([^;]+)/);
  const csrfMatch = setCookie.match(/csrftoken=([^;]+)/);
  if (!sessionMatch) throw new Error('Login no corretor falhou');
  return `sessionid=${sessionMatch[1]}${csrfMatch ? '; csrftoken=' + csrfMatch[1] : ''}`;
}

// Faz parse da tabela HTML de /resultados/ — também extrai o UUID do link de editar
function parseHtml(html) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/);
  if (!tableMatch) return [];
  const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/g) || [];
  const results = [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    if (cells.length >= 8 && cells[0]) {
      // Extrai UUID do link /resultados/{uuid}/editar/ na coluna Ações
      const uuidMatch = row.match(/\/resultados\/([0-9a-f-]{36})\/editar\//);
      results.push({
        id:        uuidMatch ? uuidMatch[1] : null,  // UUID para buscar detalhe
        aluno:     cells[0],
        turma:     cells[1],
        avaliacao: cells[2],
        disciplina: cells[3],
        nota:      parseFloat((cells[4] || '0').replace(',', '.')) || 0,
        acertos:   parseInt(cells[6]) || 0,
        erros:     parseInt(cells[7]) || 0,
        data:      cells[8] || '',
      });
    }
  }
  return results;
}

// Agrupa array de resultados em avaliacoes (objeto com turmas, alunos, médias)
function agruparEmAvaliacoes(resultados) {
  const avalMap = {};
  for (const r of resultados) {
    if (!avalMap[r.avaliacao]) {
      avalMap[r.avaliacao] = {
        titulo: r.avaliacao,
        disciplina: r.disciplina,
        resultados: [],
        turmas: new Set(),
      };
    }
    avalMap[r.avaliacao].resultados.push(r);
    avalMap[r.avaliacao].turmas.add(r.turma);
  }
  return Object.values(avalMap).map(a => ({
    titulo: a.titulo,
    disciplina: a.disciplina,
    total_alunos: a.resultados.length,
    media: a.resultados.length
      ? (a.resultados.reduce((s, r) => s + r.nota, 0) / a.resultados.length).toFixed(1)
      : '0',
    turmas: Array.from(a.turmas).join(', '),
    resultados: a.resultados,
  }));
}

// GET /api/corretor/detalhe/:id — questão por questão de um resultado
router.get('/detalhe/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${CORRETOR_BASE}/api/resultado-detalhe/${id}/?chave=${CHAVE}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`Corretor retornou ${resp.status}`);
    const dados = await resp.json();
    res.json(dados);
  } catch (err) {
    console.error('[corretor/detalhe]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/corretor/resultados — lista plana de resultados
router.get('/resultados', async (req, res) => {
  try {
    const { email, nome, perfil } = req.usuario;
    let resultados = [];

    if (perfil === 'ita_admin') {
      // ita_admin vê TODOS os resultados via endpoint JSON direto
      const resp = await fetch(`${CORRETOR_BASE}/api/resultados-todos/?chave=${CHAVE}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`Corretor retornou ${resp.status}`);
      resultados = await resp.json();
      resultados = resultados.map(r => ({ ...r, nota: parseFloat(r.nota) || 0 }));
    } else {
      // professor vê apenas os seus via scraping
      const cookie = await getCorretorSession(email, nome);
      const pageRes = await fetch(`${CORRETOR_BASE}/resultados/`, {
        headers: { Cookie: cookie, 'User-Agent': 'ITA-CEITEC/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      resultados = parseHtml(await pageRes.text());
    }

    res.json(resultados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/corretor/avaliacoes — resultados agrupados por avaliação
// Query params opcionais: ?turma=8ANO+A  (filtra resultados pela turma)
router.get('/avaliacoes', async (req, res) => {
  try {
    const { email, nome, perfil } = req.usuario;
    const { turma } = req.query; // filtro opcional
    let resultados = [];

    if (perfil === 'ita_admin') {
      // ita_admin vê TODOS os resultados de todos os professores
      const resp = await fetch(`${CORRETOR_BASE}/api/resultados-todos/?chave=${CHAVE}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`Corretor retornou ${resp.status}`);
      resultados = await resp.json();
      resultados = resultados.map(r => ({ ...r, nota: parseFloat(r.nota) || 0 }));
    } else {
      // professor vê apenas os seus via scraping HTML
      const cookie = await getCorretorSession(email, nome);
      const pageRes = await fetch(`${CORRETOR_BASE}/resultados/`, {
        headers: { Cookie: cookie, 'User-Agent': 'ITA-CEITEC/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      resultados = parseHtml(await pageRes.text());
    }

    // Aplica filtro de turma se informado
    if (turma) {
      resultados = resultados.filter(r => r.turma === turma);
    }

    // Extrai lista única de turmas (para o selector no frontend)
    const turmasUnicas = [...new Set(resultados.map(r => r.turma))].filter(Boolean).sort();

    const avaliacoes = agruparEmAvaliacoes(resultados);

    res.json({ avaliacoes, turmas: turmasUnicas });
  } catch (err) {
    console.error('[corretor/avaliacoes]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
