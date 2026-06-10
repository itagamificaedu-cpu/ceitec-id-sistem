const { chamarGemini } = require('./gemini');

/* Extrai o primeiro JSON (array ou objeto) da resposta da IA */
function extrairJson(texto, tipo = 'array') {
  const regex = tipo === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = texto.match(regex);
  if (!match) throw new Error('IA não retornou JSON válido');
  return JSON.parse(match[0]);
}

/* Bloco de contexto BNCC adicionado ao prompt quando o professor vincula uma habilidade */
function contextoBncc({ bncc_codigo, bncc_ano, bncc_componente }) {
  if (!bncc_codigo) return '';
  return `
CONTEXTO BNCC (obrigatório seguir):
- Habilidade da BNCC: ${bncc_codigo}
- Ano escolar: ${bncc_ano || ''}º ano do Ensino Fundamental (Anos Finais)
- Componente curricular: ${bncc_componente || ''}
As questões DEVEM estar rigorosamente alinhadas a essa habilidade da BNCC,
adequadas ao ano escolar indicado.`;
}

/* ── Questões de múltipla escolha (modelo original) ─────────────────────────── */
async function gerarQuestoes(params) {
  const { disciplina, tema, nivel, quantidade, ano_escolar, tipo } = params;

  // Roteia para o gerador do tipo certo
  if (tipo === 'dissertativa')  return gerarDissertativas(params);
  if (tipo === 'associacao')    return gerarAssociacoes(params);
  if (tipo === 'caca_palavras') return gerarCacaPalavrasIA(params);
  if (tipo === 'cruzadinha')    return gerarCruzadinhaIA(params);
  if (tipo === 'lacunas')       return gerarLacunasIA(params);

  const nivelFinal = nivel || 'médio';
  const qtd = quantidade || 5;
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie ${qtd} questões de múltipla escolha sobre "${tema}".

Nível de dificuldade: ${nivelFinal}
${ano_escolar ? `Ano escolar: ${ano_escolar}º ano` : ''}
${contextoBncc(params)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional antes ou depois. Use exatamente este formato:
[
  {
    "enunciado": "texto da questão",
    "alternativas": ["opção A", "opção B", "opção C", "opção D"],
    "resposta_correta": 0,
    "explicacao": "explicação da resposta correta"
  }
]

Regras:
- "alternativas" deve ser um array com exatamente 4 strings
- "resposta_correta" deve ser um número inteiro: 0 para A, 1 para B, 2 para C, 3 para D
- As alternativas devem ser plausíveis e bem elaboradas
- Apenas uma alternativa deve ser correta
- A explicação deve ser clara e educativa`;

  const texto = (await chamarGemini(prompt)).trim();
  const questoes = extrairJson(texto, 'array');
  return questoes.map(q => {
    if (Array.isArray(q.alternativas)) return { ...q, tipo_questao: 'multipla' };
    const alternativas = [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d].filter(Boolean);
    const gabarito = typeof q.gabarito === 'string' ? 'ABCD'.indexOf(q.gabarito.toUpperCase()) : (q.resposta_correta ?? 0);
    return { enunciado: q.enunciado, alternativas, resposta_correta: gabarito, explicacao: q.explicacao || '', tipo_questao: 'multipla' };
  });
}

/* ── Questões dissertativas (resposta livre + critérios de correção) ────────── */
async function gerarDissertativas({ disciplina, tema, nivel, quantidade, ...resto }) {
  const qtd  = quantidade || 3;
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie ${qtd} questões DISSERTATIVAS (resposta livre em texto) sobre "${tema}".

Nível de dificuldade: ${nivel || 'médio'}
${contextoBncc(resto)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
[
  {
    "enunciado": "texto da questão dissertativa",
    "criterios_correcao": "critérios objetivos que o professor deve usar para corrigir, em tópicos separados por quebra de linha",
    "explicacao": "exemplo de resposta esperada"
  }
]

Regras:
- O enunciado deve estimular o aluno a argumentar, explicar ou descrever
- Os critérios de correção devem ser claros, objetivos e mensuráveis (3 a 5 critérios)
- A explicação deve trazer um exemplo de resposta completa e correta`;

  const texto = (await chamarGemini(prompt)).trim();
  const questoes = extrairJson(texto, 'array');
  return questoes.map(q => ({
    enunciado: q.enunciado || '',
    criterios_correcao: q.criterios_correcao || '',
    explicacao: q.explicacao || '',
    tipo_questao: 'dissertativa',
  }));
}

/* ── Questões de associação (ligar colunas A ↔ B) ───────────────────────────── */
async function gerarAssociacoes({ disciplina, tema, nivel, quantidade, ...resto }) {
  const qtd  = quantidade || 2;
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie ${qtd} questões de ASSOCIAÇÃO (ligar itens da coluna A com itens da coluna B) sobre "${tema}".

Nível de dificuldade: ${nivel || 'médio'}
${contextoBncc(resto)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
[
  {
    "enunciado": "instrução da questão (ex: Associe cada conceito à sua definição)",
    "pares": [
      { "a": "item da coluna A", "b": "item correspondente da coluna B" },
      { "a": "outro item A", "b": "item B correspondente" }
    ],
    "explicacao": "breve explicação das associações"
  }
]

Regras:
- Cada questão deve ter de 4 a 6 pares
- Os itens da coluna B devem ser curtos e claros
- Não pode haver ambiguidade: cada item A combina com exatamente um item B`;

  const texto = (await chamarGemini(prompt)).trim();
  const questoes = extrairJson(texto, 'array');
  return questoes.map(q => ({
    enunciado: q.enunciado || '',
    pares_associacao: Array.isArray(q.pares) ? q.pares.filter(p => p.a && p.b) : [],
    explicacao: q.explicacao || '',
    tipo_questao: 'associacao',
  }));
}

/* ── Caça-Palavras (IA gera a lista de palavras; a grade é montada no servidor) ─ */
async function gerarCacaPalavrasIA({ disciplina, tema, nivel, quantidade, ...resto }) {
  const qtd  = Math.min(Math.max(quantidade || 8, 4), 12); // palavras por jogo
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie um CAÇA-PALAVRAS sobre "${tema}".

Nível de dificuldade: ${nivel || 'médio'}
${contextoBncc(resto)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
{
  "enunciado": "instrução para o aluno (ex: Encontre no diagrama as palavras relacionadas a ...)",
  "palavras": ["PALAVRA1", "PALAVRA2"],
  "explicacao": "breve explicação do vocabulário trabalhado"
}

Regras:
- Exatamente ${qtd} palavras, todas relacionadas ao tema
- Cada palavra deve ter entre 3 e 12 letras, SEM espaços nem hífens (uma palavra só)
- Palavras em português, em MAIÚSCULAS, sem repetições`;

  const texto = (await chamarGemini(prompt)).trim();
  const r = extrairJson(texto, 'objeto');
  return [{
    enunciado: r.enunciado || `Encontre as palavras sobre ${tema}`,
    dados_jogo: { palavras: (r.palavras || []).map(p => String(p).toUpperCase().trim()).filter(p => p && !p.includes(' ')) },
    explicacao: r.explicacao || '',
    tipo_questao: 'caca_palavras',
  }];
}

/* ── Cruzadinha (IA gera dicas + palavras; a grade é montada no servidor) ────── */
async function gerarCruzadinhaIA({ disciplina, tema, nivel, quantidade, ...resto }) {
  const qtd  = Math.min(Math.max(quantidade || 6, 3), 10); // palavras por cruzadinha
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie uma PALAVRA CRUZADA (cruzadinha) sobre "${tema}".

Nível de dificuldade: ${nivel || 'médio'}
${contextoBncc(resto)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
{
  "enunciado": "instrução para o aluno (ex: Resolva a cruzadinha sobre ...)",
  "itens": [
    { "dica": "definição ou pista da palavra", "palavra": "RESPOSTA" }
  ],
  "explicacao": "breve explicação do conteúdo trabalhado"
}

Regras:
- Exatamente ${qtd} itens
- Cada palavra deve ter entre 3 e 12 letras, SEM espaços nem hífens (uma palavra só)
- As dicas devem ser claras e adequadas ao ano escolar
- Palavras em MAIÚSCULAS, sem repetições, que compartilhem letras entre si (para cruzar na grade)`;

  const texto = (await chamarGemini(prompt)).trim();
  const r = extrairJson(texto, 'objeto');
  return [{
    enunciado: r.enunciado || `Resolva a cruzadinha sobre ${tema}`,
    dados_jogo: { itens: (r.itens || []).map(it => ({ dica: String(it.dica || '').trim(), palavra: String(it.palavra || '').toUpperCase().trim() })).filter(it => it.dica && it.palavra && !it.palavra.includes(' ')) },
    explicacao: r.explicacao || '',
    tipo_questao: 'cruzadinha',
  }];
}

/* ── Completar Lacunas (IA gera texto com lacunas marcadas como [palavra]) ───── */
async function gerarLacunasIA({ disciplina, tema, nivel, quantidade, ...resto }) {
  const qtd  = Math.min(Math.max(quantidade || 5, 3), 10); // lacunas no texto
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie uma atividade de COMPLETAR LACUNAS sobre "${tema}".

Nível de dificuldade: ${nivel || 'médio'}
${contextoBncc(resto)}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
{
  "enunciado": "instrução para o aluno (ex: Complete o texto com as palavras do banco)",
  "texto": "O [sol] é uma estrela que ilumina a [terra] durante o dia.",
  "explicacao": "breve explicação do conteúdo"
}

Regras:
- O texto deve ter exatamente ${qtd} lacunas, cada uma marcada com a palavra correta entre colchetes: [palavra]
- O texto deve ser educativo, coeso e adequado ao ano escolar (4 a 8 frases)
- Cada lacuna deve ter UMA palavra só entre os colchetes
- As palavras das lacunas devem ser diferentes entre si`;

  const texto = (await chamarGemini(prompt)).trim();
  const r = extrairJson(texto, 'objeto');
  return [{
    enunciado: r.enunciado || 'Complete o texto com as palavras do banco',
    dados_jogo: { texto: r.texto || '' },
    explicacao: r.explicacao || '',
    tipo_questao: 'lacunas',
  }];
}

/* ── Sugestão de correção da dissertativa (IA avalia a resposta do aluno) ───── */
async function sugerirCorrecao({ enunciado, criterios, resposta_aluno, pontos_max }) {
  const max = pontos_max || 1;
  const prompt = `Você é um professor corrigindo a resposta dissertativa de um aluno do Ensino Fundamental.

QUESTÃO: ${enunciado}

CRITÉRIOS DE CORREÇÃO DEFINIDOS PELO PROFESSOR:
${criterios || 'Avalie clareza, correção conceitual e completude da resposta.'}

RESPOSTA DO ALUNO:
${resposta_aluno}

PONTUAÇÃO MÁXIMA DA QUESTÃO: ${max} ponto(s)

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional. Formato exato:
{
  "pontos_sugeridos": 0.0,
  "justificativa": "explicação curta e objetiva da nota sugerida, citando os critérios",
  "feedback_aluno": "comentário construtivo e encorajador para o aluno (2 a 3 frases)"
}

Regras:
- "pontos_sugeridos" deve ser um número entre 0 e ${max}
- Seja justo: valorize acertos parciais
- A sugestão é apenas apoio — a decisão final é do professor`;

  const texto = (await chamarGemini(prompt)).trim();
  const resultado = extrairJson(texto, 'objeto');
  return {
    pontos_sugeridos: Math.max(0, Math.min(Number(resultado.pontos_sugeridos) || 0, max)),
    justificativa: resultado.justificativa || '',
    feedback_aluno: resultado.feedback_aluno || '',
  };
}

module.exports = { gerarQuestoes, sugerirCorrecao };
