const Anthropic = require('@anthropic-ai/sdk');

async function gerarQuestoes({ disciplina, tema, nivel, nivel: dificuldade, quantidade, ano_escolar }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const nivelFinal = nivel || dificuldade || 'médio';
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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const texto = message.content[0].text.trim();
  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('IA não retornou JSON válido');

  const questoes = JSON.parse(jsonMatch[0]);

  // Normaliza o formato caso a IA retorne alternativa_a/b/c/d em vez de array
  return questoes.map(q => {
    if (Array.isArray(q.alternativas)) return q;
    const alternativas = [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d].filter(Boolean);
    const gabarito = typeof q.gabarito === 'string' ? 'ABCD'.indexOf(q.gabarito.toUpperCase()) : (q.resposta_correta ?? 0);
    return { enunciado: q.enunciado, alternativas, resposta_correta: gabarito, explicacao: q.explicacao || '' };
  });
}

module.exports = { gerarQuestoes };
