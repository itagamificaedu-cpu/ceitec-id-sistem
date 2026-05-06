const { chamarGemini } = require('./gemini');

async function gerarQuestoes({ disciplina, tema, nivel, quantidade, ano_escolar }) {
  const nivelFinal = nivel || 'médio';
  const qtd = quantidade || 5;
  const disc = disciplina || 'Geral';

  const prompt = `Você é um professor especialista em ${disc}. Crie ${qtd} questões de múltipla escolha sobre "${tema}".

Nível de dificuldade: ${nivelFinal}
${ano_escolar ? `Ano escolar: ${ano_escolar}º ano` : ''}

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
  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('IA não retornou JSON válido');

  const questoes = JSON.parse(jsonMatch[0]);
  return questoes.map(q => {
    if (Array.isArray(q.alternativas)) return q;
    const alternativas = [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d].filter(Boolean);
    const gabarito = typeof q.gabarito === 'string' ? 'ABCD'.indexOf(q.gabarito.toUpperCase()) : (q.resposta_correta ?? 0);
    return { enunciado: q.enunciado, alternativas, resposta_correta: gabarito, explicacao: q.explicacao || '' };
  });
}

module.exports = { gerarQuestoes };
