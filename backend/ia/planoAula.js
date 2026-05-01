const Anthropic = require('@anthropic-ai/sdk');

async function gerarPlanoAula({ disciplina, turma, nivel, tema, duracao, recursos, objetivos }) {
  turma = turma || nivel || 'Ensino Fundamental';
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Você é um pedagogo especialista em tecnologia educacional. Crie um plano de aula completo e detalhado para:

Disciplina: ${disciplina}
Turma: ${turma}
Tema: ${tema}
Duração: ${duracao} minutos
Recursos disponíveis: ${recursos || 'quadro branco, computadores'}
${objetivos ? `Objetivos sugeridos pelo professor: ${objetivos}` : ''}

Crie um plano de aula estruturado com as seguintes seções:
1. **Objetivos de Aprendizagem** (3-4 objetivos claros e mensuráveis)
2. **Conteúdo Programático** (tópicos e subtópicos)
3. **Metodologia** (estratégias pedagógicas e abordagens)
4. **Sequência Didática** (passo a passo com tempos estimados)
5. **Atividades Práticas** (pelo menos 1 atividade hands-on)
6. **Recursos e Materiais**
7. **Avaliação** (como verificar se os objetivos foram atingidos)
8. **Referências** (sugestões de materiais complementares)

Use linguagem clara, didática e adequada para o contexto de escola de tecnologia.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
}

module.exports = { gerarPlanoAula };
