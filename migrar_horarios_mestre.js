/**
 * Migração: SCHEDULE_DATA do Mestre da Escola → tabela mestre_horarios
 * ─────────────────────────────────────────────────────────────────────
 * Execute no VPS: node /app/migrar_horarios_mestre.js
 */

const http = require('http');

// ── Dados do PEDF (idênticos ao lib/schedule.ts) ─────────────────────
const HORARIOS = {
  1: { inicio: '07:00', fim: '07:50' },
  2: { inicio: '07:50', fim: '08:40' },
  3: { inicio: '09:00', fim: '09:50' },
  4: { inicio: '09:50', fim: '10:40' },
  5: { inicio: '10:40', fim: '11:30' },
  6: { inicio: '13:00', fim: '13:50' },
  7: { inicio: '13:50', fim: '14:40' },
  8: { inicio: '15:00', fim: '15:50' },
  9: { inicio: '15:50', fim: '16:40' },
};

const TURMAS = ['9º A','9º B','9º C','9º D','9º E','9º F','8º A','8º B','8º C'];

// Mapa: string como aparece no schedule → nome canônico (igual ao banco)
const PROF_MAP = {
  'NATALIA':      'Natalia',
  'ESTER':        'Ester',
  'ALEXANDRE A.': 'Alexandre A.',
  'ALEXANDRE C.': 'Alexandre C.',
  'ENILDA':       'Enilda',
  'BIANCA':       'Bianca',
  'LIVISON':      'Livison',
  'PEDRO S.':     'Pedro S.',
  'LARIANY':      'Lariany',
  'ANTONIO':      'Antonio',
  'MARIO':        'Mario',
  'EZEQUIEL':     'Ezequiel',
  'GENESIO':      'Genesio',
  'ROCHA':        'Rocha',
  'CARLOS':       'Carlos',
  'CIDA':         'Cida',
};

const SCHEDULE = {
  "Segunda": {
    "1": ["NATALIA – PORT","ESTER – PORT","ARITMÉTICA - ALEXANDRE A.","ALEXANDRE C. – LIT","ARITMÉTICA - BIANCA","GRAMÁTICA - ENILDA","CIDA - LIVISON","ARITMÉTICA - PEDRO S.","LARIANY – PORT"],
    "2": ["NATALIA – PORT","ESTER – PORT","ARITMÉTICA - ALEXANDRE A.","ALEXANDRE C. – LIT","ARITMÉTICA - BIANCA","GRAMÁTICA - ENILDA","ART. - EZEQUIEL","ARITMÉTICA - PEDRO S.","LARIANY – PORT"],
    "3": ["ARITMÉTICA - ALEXANDRE A.","ALEXANDRE C. – LIT","NATALIA – PORT","ESTER – PORT","GRAMÁTICA - ENILDA","ARITMÉTICA - PEDRO S.","HIST. - ANTONIO","LARIANY – REDAÇÃO","GEOMETRIA - BIANCA"],
    "4": ["ARITMÉTICA - ALEXANDRE A.","ALEXANDRE C. – LIT","NATALIA – PORT","ESTER – PORT","GRAMÁTICA - ENILDA","ARITMÉTICA - PEDRO S.","HIST. - ANTONIO","LARIANY – REDAÇÃO","GEOMETRIA - BIANCA"],
    "5": ["CIDA - LIVISON","CIEN - MARIO","CARENCIA ECO","GEO. - EZEQUIEL","REFORÇO","ALEXANDRE C. – LIT","LARIANY – REDAÇÃO","NATALIA – LIT","CONST - ENILDA"],
    "6": ["GRAMÁTICA - ENILDA","ARITMÉTICA - ALEXANDRE A.","ALEXANDRE C. – LIT","ARITMÉTICA - PEDRO S.","HIST. - ANTONIO","ESTER – PORT","LARIANY – REDAÇÃO","CARENCIA ECO","ART. - EZEQUIEL"],
    "7": ["GRAMÁTICA - ENILDA","ÁLGEBRA - ALEXANDRE A.","ALEXANDRE C. – LIT","ARITMÉTICA - PEDRO S.","HIST. - ANTONIO","ESTER – PORT","REFORÇO","NATALIA – LIT","ART. - EZEQUIEL"],
    "8": ["HIST. - ANTONIO","GEO. - EZEQUIEL","CIEN - MARIO","GRAMÁTICA - ENILDA","NATALIA – PORT","ALEXANDRE C. – LIT","EMPRE. - GENESIO","ESTER – PORT","ARITMÉTICA - PEDRO S."],
    "9": ["HIST. - ANTONIO","GEO. - EZEQUIEL","CIEN - MARIO","GRAMÁTICA - ENILDA","NATALIA – PORT","CIDA - LIVISON","EMPRE. - GENESIO","ESTER – PORT","ARITMÉTICA - PEDRO S."],
  },
  "Terça": {
    "1": ["ALEXANDRE C. – LIT","ARITMÉTICA - ALEXANDRE A.","HIST. - ANTONIO","GEO. - EZEQUIEL","CIEN - MARIO","ED. FÍSICA - LIVISON","ARITMÉTICA - BIANCA","CARENCIA CIDADANIA","ARITMÉTICA - PEDRO S."],
    "2": ["ALEXANDRE C. – LIT","ÁLGEBRA - ALEXANDRE A.","HIST. - ANTONIO","REFORÇO","CIEN - MARIO","INGLÊS - CARLOS","ARITMÉTICA - BIANCA","ED. FÍSICA - LIVISON","ARITMÉTICA - PEDRO S."],
    "3": ["ARITMÉTICA - ALEXANDRE A.","HIST. - ANTONIO","MAT. FIN. - ROCHA","OLIMPIADAS - MARIO","EMPRE. - GENESIO","INGLÊS - CARLOS","ART. - EZEQUIEL","ARITMÉTICA - PEDRO S.","ED. FÍSICA - LIVISON"],
    "4": ["ARITMÉTICA - ALEXANDRE A.","HIST. - ANTONIO","MAT. FIN. - ROCHA","GEOMETRIA - BIANCA","EMPRE. - GENESIO","GEO. - EZEQUIEL","INGLÊS - CARLOS","ARITMÉTICA - PEDRO S.","ED. FÍSICA - LIVISON"],
    "5": ["CARENCIA ECO","CIEN - MARIO","REFORÇO","GEOMETRIA - BIANCA","ALEXANDRE C. – LIT","GEO. - EZEQUIEL","INGLÊS - CARLOS","ED. FÍSICA - LIVISON","CARENCIA ECO"],
    "6": ["ART. - EZEQUIEL","OLIMPIADAS - ROCHA","ARITMÉTICA - ALEXANDRE A.","ARITMÉTICA - PEDRO S.","ED. FÍSICA - LIVISON","GEOMETRIA - BIANCA","ALEXANDRE C. – LIT","INGLÊS - CARLOS","HIST. - ANTONIO"],
    "7": ["ART. - EZEQUIEL","OLIMPIADAS - ROCHA","ARITMÉTICA - ALEXANDRE A.","ARITMÉTICA - PEDRO S.","ED. FÍSICA - LIVISON","GEOMETRIA - BIANCA","ALEXANDRE C. – LIT","INGLÊS - CARLOS","HIST. - ANTONIO"],
    "8": ["GEO. - ANTONIO","ART. - EZEQUIEL","OLIMPIADAS - ROCHA","EMPRE. - GENESIO","ALEXANDRE C. – LIT","ARITMÉTICA - PEDRO S.","CIEN - MARIO","GEOMETRIA - BIANCA","INGLÊS - CARLOS"],
    "9": ["GEO. - ANTONIO","ART. - EZEQUIEL","OLIMPIADAS - ROCHA","EMPRE. - GENESIO","REFORÇO","ARITMÉTICA - PEDRO S.","CIEN - MARIO","GEOMETRIA - BIANCA","INGLÊS - CARLOS"],
  },
  "Quarta": {
    "1": ["REFORÇO","GRAMÁTICA - ENILDA","ART. - EZEQUIEL","ED. FÍSICA - LIVISON","MAT. FIN. - ROCHA","EMPRE. - GENESIO","NATALIA – PORT","ESTER – PORT","LARIANY – PORT"],
    "2": ["REFORÇO","GRAMÁTICA - ENILDA","ART. - EZEQUIEL","ED. FÍSICA - LIVISON","MAT. FIN. - ROCHA","EMPRE. - GENESIO","NATALIA – PORT","ESTER – PORT","LARIANY – PORT"],
    "3": ["LARIANY – REDAÇÃO","ED. FÍSICA - LIVISON","GRAMÁTICA - ENILDA","INGLÊS - CARLOS","NATALIA – PORT","ESTER – PORT","GEO. - ANTONIO","ART. - EZEQUIEL","OLIMPIADAS - ROCHA"],
    "4": ["LARIANY – REDAÇÃO","ED. FÍSICA - LIVISON","GRAMÁTICA - ENILDA","INGLÊS - CARLOS","NATALIA – PORT","ESTER – PORT","ECO - EZEQUIEL","HIST. - ANTONIO","OLIMPIADAS - ROCHA"],
    "5": ["INGLÊS - CARLOS","REFORÇO","REFORÇO","CARENCIA ECO","ECO - EZEQUIEL","ED. FÍSICA - LIVISON","LARIANY – CONST","HIST. - ANTONIO","CONST - ENILDA"],
    "6": ["INGLÊS - CARLOS","LARIANY – REDAÇÃO","ED. FÍSICA - LIVISON","ESTER – PORT","ART. - EZEQUIEL","HIST. - ANTONIO","GRAMÁTICA - ENILDA","REFORÇO","EMPRE. - GENESIO"],
    "7": ["REL - CARLOS","LARIANY – REDAÇÃO","ED. FÍSICA - LIVISON","ESTER – PORT","ART. - EZEQUIEL","HIST. - ANTONIO","GRAMÁTICA - ENILDA","REFORÇO","EMPRE. - GENESIO"],
    "8": ["NATALIA – PORT","EMPRE. - GENESIO","INGLÊS - CARLOS","ART. - EZEQUIEL","GEO. - ANTONIO","REFORÇO","MAT. FIN. - ROCHA","GRAMÁTICA - ENILDA","REFORÇO"],
    "9": ["NATALIA – PORT","EMPRE. - GENESIO","INGLÊS - CARLOS","ART. - EZEQUIEL","GEO. - ANTONIO","REFORÇO","MAT. FIN. - ROCHA","GRAMÁTICA - ENILDA","REFORÇO"],
  },
  "Quinta": {
    "1": ["EMPRE. - GENESIO","ESTER – PORT","NATALIA – PORT","ARITMÉTICA - PEDRO S.","CIDA - LIVISON","OLIMPÍADAS - ALEXANDRE A.","ARITMÉTICA - BIANCA","MAT. FIN. - ROCHA","LARIANY – PORT"],
    "2": ["EMPRE. - GENESIO","ESTER – PORT","NATALIA – PORT","ARITMÉTICA - PEDRO S.","INGLÊS - CARLOS","OLIMPÍADAS - ALEXANDRE A.","ARITMÉTICA - BIANCA","MAT. FIN. - ROCHA","LARIANY – PORT"],
    "3": ["MAT. FIN. - ROCHA","INGLÊS - CARLOS","ÁLGEBRA - ALEXANDRE A.","LARIANY – REDAÇÃO","ARITMÉTICA - BIANCA","CONST - ENILDA","NATALIA – PORT","ESTER – PORT","ARITMÉTICA - PEDRO S."],
    "4": ["MAT. FIN. - ROCHA","INGLÊS - CARLOS","ÁLGEBRA - ALEXANDRE A.","LARIANY – REDAÇÃO","ARITMÉTICA - BIANCA","CONST - ENILDA","NATALIA – PORT","ESTER – PORT","ARITMÉTICA - PEDRO S."],
    "5": ["GEOMETRIA - BIANCA","ECO - LIVISON","ESTER – CONST","CONST - ENILDA","INGLÊS - CARLOS","CARENCIA ECO","LARIANY – CONST","CIEN - MARIO","NATALIA – LIT"],
    "6": ["GEOMETRIA - BIANCA","CONST - ENILDA","CIDA - LIVISON","ESTER – PORT","LARIANY – REDAÇÃO","MAT. FIN. - ROCHA","REFORÇO","ARITMÉTICA - PEDRO S.","CIEN - MARIO"],
    "7": ["ÁLGEBRA - ALEXANDRE A.","CONST - ENILDA","REL. - CARLOS","ESTER – PORT","LARIANY – REDAÇÃO","MAT. FIN. - ROCHA","OLIMPIADAS - MARIO","ARITMÉTICA - PEDRO S.","NATALIA – LIT"],
    "8": ["ÁLGEBRA - ALEXANDRE A.","MAT. FIN. - ROCHA","EMPRE. - GENESIO","CONST - ENILDA","NATALIA – PORT","ARITMÉTICA - PEDRO S.","REL. - CARLOS","OLIMPIADAS - BIANCA","CIEN - MARIO"],
    "9": ["CONST - ENILDA","MAT. FIN. - ROCHA","EMPRE. - GENESIO","REFORÇO","NATALIA – PORT","ARITMÉTICA - PEDRO S.","OLIMPIADAS - MARIO","OLIMPIADAS - BIANCA","REL. - CARLOS"],
  },
  "Sexta": {
    "1": ["NATALIA – PORT","ÁLGEBRA - ALEXANDRE A.","GEO. - ANTONIO","CIEN - MARIO","ÁLGEBRA - BIANCA","ESTER – PORT","ED. FÍSICA - LIVISON","LARIANY – CONST","MAT. FIN. - ROCHA"],
    "2": ["NATALIA – PORT","ÁLGEBRA - ALEXANDRE A.","GEO. - ANTONIO","CIEN - MARIO","ÁLGEBRA - BIANCA","ESTER – PORT","ED. FÍSICA - LIVISON","LARIANY – CONST","MAT. FIN. - ROCHA"],
    "3": ["OLIMPIADAS - ROCHA","ESTER – PORT","NATALIA – PORT","CIDA - LIVISON","OLIMPÍADAS - ALEXANDRE A.","LARIANY – REDAÇÃO","GEO. - ANTONIO","CIEN - MARIO","GRAMÁTICA - ENILDA"],
    "4": ["OLIMPIADAS - ROCHA","ESTER – PORT","NATALIA – PORT","HIST. - ANTONIO","OLIMPÍADAS - ALEXANDRE A.","LARIANY – REDAÇÃO","ÁLGEBRA - BIANCA","REL. - CARLOS","GRAMÁTICA - ENILDA"],
    "5": ["CONST - ENILDA","REFORÇO","ESTER – CONST","HIST. - ANTONIO","REL. - CARLOS","CIEN - MARIO","ÁLGEBRA - BIANCA","ART. - EZEQUIEL","CIDA - LIVISON"],
    "6": ["ED. FÍSICA - LIVISON","GEOMETRIA - BIANCA","LARIANY – REDAÇÃO","REL - CARLOS","ESTER – CONST","CIEN - MARIO","GEOMETRIA – PEDRO S.","GEO. - EZEQUIEL","GEO. - ANTONIO"],
    "7": ["ED. FÍSICA - LIVISON","GEOMETRIA - BIANCA","LARIANY – REDAÇÃO","OLIMPIADAS - MARIO","ESTER – CONST","REL. - CARLOS","GEOMETRIA – PEDRO S.","GEO. - EZEQUIEL","GEO. - ANTONIO"],
    "8": ["CIEN - MARIO","REL. - CARLOS","GEOMETRIA - BIANCA","MAT. FIN. - ROCHA","GEOMETRIA – PEDRO S.","ART. - EZEQUIEL","NATALIA – PORT","EMPRE. - GENESIO","LARIANY – REDAÇÃO"],
    "9": ["CIEN - MARIO","CIDA - LIVISON","GEOMETRIA - BIANCA","MAT. FIN. - ROCHA","GEOMETRIA – PEDRO S.","ART. - EZEQUIEL","NATALIA – PORT","EMPRE. - GENESIO","LARIANY – REDAÇÃO"],
  },
};

// ── Parser ────────────────────────────────────────────────────────────
function parseEntry(entry) {
  let parts = null;
  if (entry.includes('–')) {
    parts = entry.split('–').map(s => s.trim());
  } else if (entry.includes(' - ')) {
    parts = entry.split(' - ').map(s => s.trim());
  }
  if (!parts || parts.length < 2) return null;

  const [p1, p2] = parts;

  // Prioridade: lado direito = professor (formato mais comum: DISC - PROF)
  for (const [key, nome] of Object.entries(PROF_MAP)) {
    if (p2 === key || p2.startsWith(key + ' ')) {
      return { professor: nome, disciplina: p1 };
    }
  }
  // Fallback: lado esquerdo = professor (formato: PROF – DISC)
  for (const [key, nome] of Object.entries(PROF_MAP)) {
    if (p1 === key || p1.startsWith(key + ' ')) {
      return { professor: nome, disciplina: p2 };
    }
  }
  return null;
}

// ── Inserção via API ──────────────────────────────────────────────────
function postHorario(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/mestre/horarios',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────
async function migrar() {
  let ok = 0, skip = 0, erros = 0;

  for (const [dia, aulas] of Object.entries(SCHEDULE)) {
    for (const [aulaNum, turmasArr] of Object.entries(aulas)) {
      const h = HORARIOS[parseInt(aulaNum)];
      if (!h) continue;

      for (let i = 0; i < turmasArr.length; i++) {
        const entry = turmasArr[i];
        const parsed = parseEntry(entry);
        if (!parsed) { skip++; continue; }

        const body = {
          professor_nome:  parsed.professor,
          dia_semana:      dia,
          aula_numero:     parseInt(aulaNum),
          horario_inicio:  h.inicio,
          horario_fim:     h.fim,
          disciplina:      parsed.disciplina,
          turma:           TURMAS[i],
          sala:            '',
        };

        try {
          const r = await postHorario(body);
          if (r.status === 201) { ok++; }
          else { erros++; console.error(`ERRO ${r.status}: ${r.body} | ${JSON.stringify(body)}`); }
        } catch (e) {
          erros++; console.error('Falha de rede:', e.message);
        }
      }
    }
  }

  console.log(`\n✅ Migração concluída: ${ok} inseridos | ${skip} pulados (sem professor) | ${erros} erros`);
}

migrar().catch(console.error);
