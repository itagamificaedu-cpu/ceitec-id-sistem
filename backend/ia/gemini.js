const MODELOS_GEMINI = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function chamarGemini(prompt) {
  const geminiKey = process.env.GOOGLE_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;

  // Tenta Gemini primeiro
  if (geminiKey) {
    for (const modelo of MODELOS_GEMINI) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (res.status === 429 || res.status === 503) continue;
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e) {
        if (e.message.startsWith('Gemini error')) throw e;
      }
    }
  }

  // Fallback: Groq (llama gratuito)
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('Cota Gemini esgotada e GROQ_API_KEY não configurada. Adicione uma chave Groq gratuita em console.groq.com');
}

module.exports = { chamarGemini };
