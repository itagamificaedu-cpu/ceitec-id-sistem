const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const CORRETOR_BASE = 'https://correcaoonlineita.pythonanywhere.com';
const CHAVE = 'gamificaedu_secreto_2026';

async function getCorretorSession(email, nome) {
  const url = `${CORRETOR_BASE}/login-magico/?email=${encodeURIComponent(email)}&nome=${encodeURIComponent(nome || '')}&chave=${CHAVE}&next=/resultados/`;
  const res = await fetch(url, { redirect: 'manual' });
  const setCookie = res.headers.get('set-cookie') || '';
  const sessionMatch = setCookie.match(/sessionid=([^;]+)/);
  const csrfMatch = setCookie.match(/csrftoken=([^;]+)/);
  if (!sessionMatch) throw new Error('Login no corretor falhou');
  return `sessionid=${sessionMatch[1]}${csrfMatch ? '; csrftoken=' + csrfMatch[1] : ''}`;
}

function parseHtml(html) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/);
  if (!tableMatch) return [];
  const rows = tableMatch[0].match(/<tr>([\s\S]*?)<\/tr>/g) || [];
  const results = [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    if (cells.length >= 8 && cells[0]) {
      results.push({
        aluno: cells[0],
        turma: cells[1],
        avaliacao: cells[2],
        disciplina: cells[3],
        nota: parseFloat((cells[4] || '0').replace(',', '.')) || 0,
        acertos: parseInt(cells[6]) || 0,
        erros: parseInt(cells[7]) || 0,
        data: cells[8] || '',
      });
    }
  }
  return results;
}

router.get('/resultados', async (req, res) => {
  try {
    const { email, nome } = req.usuario;
    const cookie = await getCorretorSession(email, nome);
    const pageRes = await fetch(`${CORRETOR_BASE}/resultados/`, {
      headers: { Cookie: cookie, 'User-Agent': 'ITA-CEITEC/1.0' }
    });
    const html = await pageRes.text();
    const resultados = parseHtml(html);
    res.json(resultados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/avaliacoes', async (req, res) => {
  try {
    const { email, nome } = req.usuario;
    const cookie = await getCorretorSession(email, nome);
    const resultRes = await fetch(`${CORRETOR_BASE}/resultados/`, {
      headers: { Cookie: cookie, 'User-Agent': 'ITA-CEITEC/1.0' }
    });
    const resultHtml = await resultRes.text();
    const resultados = parseHtml(resultHtml);
    // Group by avaliacao
    const avalMap = {};
    for (const r of resultados) {
      if (!avalMap[r.avaliacao]) {
        avalMap[r.avaliacao] = { titulo: r.avaliacao, disciplina: r.disciplina, resultados: [], turmas: new Set() };
      }
      avalMap[r.avaliacao].resultados.push(r);
      avalMap[r.avaliacao].turmas.add(r.turma);
    }
    const avaliacoes = Object.values(avalMap).map(a => ({
      titulo: a.titulo,
      disciplina: a.disciplina,
      total_alunos: a.resultados.length,
      media: a.resultados.length ? (a.resultados.reduce((s,r) => s + r.nota, 0) / a.resultados.length).toFixed(1) : '0',
      turmas: Array.from(a.turmas).join(', '),
      resultados: a.resultados,
    }));
    res.json(avaliacoes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
