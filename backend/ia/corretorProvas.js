const Anthropic = require('@anthropic-ai/sdk');

async function interpretarFolhaResposta(imagemBase64) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imagemBase64 }
        },
        {
          type: 'text',
          text: `Esta é uma folha de respostas de prova. Identifique as alternativas marcadas para cada questão numerada.
Retorne APENAS um JSON válido no formato: [{"questao": 1, "resposta": "A"}, {"questao": 2, "resposta": "B"}...]
Se não conseguir identificar uma resposta, use null. Não inclua texto adicional.`
        }
      ]
    }]
  });

  const texto = message.content[0].text.trim();
  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('IA não retornou JSON válido');
  return JSON.parse(jsonMatch[0]);
}

function corrigirRespostas(questoes, respostas) {
  let pontosTotal = 0;
  let pontosObtidos = 0;
  const resultado = questoes.map(q => {
    const resp = respostas.find(r => r.questao_id === q.id || r.questao === q.ordem);
    const correta = resp && resp.resposta === q.gabarito;
    pontosTotal += q.pontos || 1;
    if (correta) pontosObtidos += q.pontos || 1;
    return { questao_id: q.id, gabarito: q.gabarito, resposta_marcada: resp?.resposta || null, correta: correta || false, pontos_obtidos: correta ? (q.pontos || 1) : 0 };
  });
  const percentual = pontosTotal > 0 ? Math.round((pontosObtidos / pontosTotal) * 100) : 0;
  return { resultado, pontos_obtidos: pontosObtidos, pontos_total: pontosTotal, percentual };
}

module.exports = { interpretarFolhaResposta, corrigirRespostas };
