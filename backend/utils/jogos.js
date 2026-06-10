/* ── Geradores de jogos educativos: Caça-Palavras e Cruzadinha ─────────────────
   As grades são geradas no servidor a partir das palavras salvas em dados_jogo.
   Usa gerador aleatório com semente (id da questão) para a grade ser sempre
   a mesma quando o aluno recarrega a página. */

/* Gerador pseudoaleatório com semente (mulberry32) */
function criarRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Remove acentos e deixa maiúsculo (padrão de comparação dos jogos) */
function normalizar(palavra) {
  return String(palavra || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '');
}

/* ── CAÇA-PALAVRAS ────────────────────────────────────────────────────────────
   Monta grade NxN com as palavras em horizontal, vertical e diagonal.
   Retorna { grade, palavras } — palavras na forma normalizada (como na grade). */
function gerarCacaPalavras(palavrasOrig, seed = 1) {
  const rng = criarRng(seed);
  const palavras = palavrasOrig.map(normalizar).filter(p => p.length >= 2);
  const maior = Math.max(...palavras.map(p => p.length), 5);
  const tam = Math.min(14, Math.max(8, maior + 2, Math.ceil(Math.sqrt(palavras.join('').length * 2.2))));

  const grade = Array.from({ length: tam }, () => Array(tam).fill(null));
  // Direções: horizontal, vertical, diagonal ↘ e diagonal ↗
  const direcoes = [[0, 1], [1, 0], [1, 1], [-1, 1]];

  function tentarColocar(palavra) {
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      const [dr, dc] = direcoes[Math.floor(rng() * direcoes.length)];
      const r0 = Math.floor(rng() * tam);
      const c0 = Math.floor(rng() * tam);
      const rFim = r0 + dr * (palavra.length - 1);
      const cFim = c0 + dc * (palavra.length - 1);
      if (rFim < 0 || rFim >= tam || cFim < 0 || cFim >= tam) continue;
      // Verifica conflito (permite cruzamento na mesma letra)
      let ok = true;
      for (let i = 0; i < palavra.length; i++) {
        const cel = grade[r0 + dr * i][c0 + dc * i];
        if (cel !== null && cel !== palavra[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < palavra.length; i++) grade[r0 + dr * i][c0 + dc * i] = palavra[i];
      return true;
    }
    return false;
  }

  const colocadas = [];
  // Coloca as maiores primeiro (mais difíceis de encaixar)
  for (const p of [...palavras].sort((a, b) => b.length - a.length)) {
    if (tentarColocar(p)) colocadas.push(p);
  }

  // Preenche células vazias com letras aleatórias
  const ALFA = 'ABCDEFGHIJLMNOPRSTUV';
  for (let r = 0; r < tam; r++) {
    for (let c = 0; c < tam; c++) {
      if (grade[r][c] === null) grade[r][c] = ALFA[Math.floor(rng() * ALFA.length)];
    }
  }

  return { grade, palavras: colocadas };
}

/* ── CRUZADINHA ───────────────────────────────────────────────────────────────
   Monta grade cruzando as palavras em letras comuns (1ª horizontal, demais
   tentam cruzar; sem cruzamento possível, entram em linha paralela livre).
   Retorna estrutura SEM as letras (não vaza gabarito):
   { linhas, colunas, celulas: [{r,c}], palavras: [{numero, dica, direcao, linha, coluna, tamanho}] } */
function gerarCruzadinha(itens, seed = 1) {
  const lista = itens
    .map(it => ({ dica: String(it.dica || '').trim(), palavra: normalizar(it.palavra) }))
    .filter(it => it.dica && it.palavra.length >= 2);
  if (lista.length === 0) return null;

  const TAM = 30; // grade de trabalho grande; recortada no final
  const grade = Array.from({ length: TAM }, () => Array(TAM).fill(null));
  const colocadas = [];

  function podeColocar(palavra, r, c, dr, dc) {
    const rFim = r + dr * (palavra.length - 1);
    const cFim = c + dc * (palavra.length - 1);
    if (r < 0 || c < 0 || rFim < 0 || cFim < 0 || rFim >= TAM || cFim >= TAM || r >= TAM || c >= TAM) return false;
    // Célula antes e depois da palavra devem estar vazias (não emendar palavras)
    const antesR = r - dr, antesC = c - dc, depoisR = rFim + dr, depoisC = cFim + dc;
    if (antesR >= 0 && antesC >= 0 && antesR < TAM && antesC < TAM && grade[antesR][antesC] !== null) return false;
    if (depoisR >= 0 && depoisC >= 0 && depoisR < TAM && depoisC < TAM && grade[depoisR][depoisC] !== null) return false;
    for (let i = 0; i < palavra.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const cel = grade[rr][cc];
      if (cel !== null) {
        if (cel !== palavra[i]) return false; // conflito de letra
        continue; // cruzamento válido — vizinhos já validados pela palavra existente
      }
      // Célula vazia: vizinhos perpendiculares devem estar vazios (evita palavras coladas)
      const v1r = rr + dc, v1c = cc + dr, v2r = rr - dc, v2c = cc - dr;
      if (v1r >= 0 && v1c >= 0 && v1r < TAM && v1c < TAM && grade[v1r][v1c] !== null) return false;
      if (v2r >= 0 && v2c >= 0 && v2r < TAM && v2c < TAM && grade[v2r][v2c] !== null) return false;
    }
    return true;
  }

  function colocar(item, r, c, dr, dc) {
    for (let i = 0; i < item.palavra.length; i++) grade[r + dr * i][c + dc * i] = item.palavra[i];
    colocadas.push({ ...item, r, c, dr, dc });
  }

  // 1ª palavra: horizontal no centro
  const meio = Math.floor(TAM / 2);
  colocar(lista[0], meio, Math.floor((TAM - lista[0].palavra.length) / 2), 0, 1);

  for (let li = 1; li < lista.length; li++) {
    const item = lista[li];
    let colocada = false;
    // Tenta cruzar com alguma palavra já colocada (letra em comum)
    for (const fixa of colocadas) {
      if (colocada) break;
      for (let fi = 0; fi < fixa.palavra.length && !colocada; fi++) {
        for (let pi = 0; pi < item.palavra.length && !colocada; pi++) {
          if (fixa.palavra[fi] !== item.palavra[pi]) continue;
          // Direção perpendicular à palavra fixa
          const dr = fixa.dr === 0 ? 1 : 0;
          const dc = fixa.dc === 0 ? 1 : 0;
          const r = fixa.r + fixa.dr * fi - dr * pi;
          const c = fixa.c + fixa.dc * fi - dc * pi;
          if (podeColocar(item.palavra, r, c, dr, dc)) {
            colocar(item, r, c, dr, dc);
            colocada = true;
          }
        }
      }
    }
    // Sem cruzamento possível: coloca horizontal em uma linha livre abaixo
    if (!colocada) {
      for (let r = 0; r < TAM && !colocada; r += 2) {
        for (let c = 0; c < TAM - item.palavra.length && !colocada; c++) {
          if (podeColocar(item.palavra, r, c, 0, 1)) {
            colocar(item, r, c, 0, 1);
            colocada = true;
          }
        }
      }
    }
  }

  // Recorta a grade ao retângulo usado
  let rMin = TAM, rMax = 0, cMin = TAM, cMax = 0;
  for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) {
    if (grade[r][c] !== null) { rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); cMin = Math.min(cMin, c); cMax = Math.max(cMax, c); }
  }

  const celulas = [];
  for (let r = rMin; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) {
    if (grade[r][c] !== null) celulas.push({ r: r - rMin, c: c - cMin });
  }

  // Numera na ordem de leitura (linha, coluna)
  const ordenadas = [...colocadas].sort((a, b) => (a.r - b.r) || (a.c - b.c));
  const palavras = ordenadas.map((p, i) => ({
    numero: i + 1,
    dica: p.dica,
    direcao: p.dc === 1 ? 'horizontal' : 'vertical',
    linha: p.r - rMin,
    coluna: p.c - cMin,
    tamanho: p.palavra.length,
    palavra: p.palavra, // removida antes de enviar ao aluno
  }));

  return { linhas: rMax - rMin + 1, colunas: cMax - cMin + 1, celulas, palavras };
}

/* ── COMPLETAR LACUNAS ────────────────────────────────────────────────────────
   Texto com lacunas marcadas como [palavra]. Retorna partes do texto e o
   banco de palavras (as respostas ficam só no servidor). */
function parsearLacunas(texto) {
  const partes = [];     // segmentos de texto e marcadores de lacuna
  const respostas = [];  // resposta correta de cada lacuna, na ordem
  const regex = /\[([^\]]+)\]/g;
  let ultimo = 0, m;
  while ((m = regex.exec(texto)) !== null) {
    partes.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) });
    partes.push({ tipo: 'lacuna', indice: respostas.length });
    respostas.push(m[1].trim());
    ultimo = m.index + m[0].length;
  }
  partes.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  return { partes, respostas };
}

module.exports = { gerarCacaPalavras, gerarCruzadinha, parsearLacunas, normalizar, criarRng };
