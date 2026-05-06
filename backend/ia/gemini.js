const MODELOS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

async function chamarGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada');

  let ultimoErro;
  for (const modelo of MODELOS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (res.status === 429 || res.status === 503) {
        ultimoErro = `Modelo ${modelo} sem cota (${res.status})`;
        continue; // tenta o próximo modelo
      }
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e) {
      if (e.message.startsWith('Gemini error')) throw e; // erro real, não tenta outro
      ultimoErro = e.message;
    }
  }
  throw new Error(`Todos os modelos Gemini falharam. Último erro: ${ultimoErro}`);
}

module.exports = { chamarGemini };
