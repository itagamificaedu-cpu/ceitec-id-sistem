/**
 * educacaoInclusiva.js — Rota backend para o Gerador de Atividades Adaptativas
 * Chama a API da Anthropic (Claude) com o system prompt de educação inclusiva.
 */
const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `Você é um especialista em educação inclusiva e educação especial.
Crie atividades pedagógicas adaptadas, acessíveis e motivadoras para alunos com necessidades
educacionais especiais, seguindo as diretrizes da Política Nacional de Educação Especial na
Perspectiva da Educação Inclusiva (2008) e da Base Nacional Comum Curricular (BNCC).
As atividades devem respeitar o ritmo de aprendizagem, usar linguagem simples e clara,
incluir elementos visuais quando possível (descreva-os detalhadamente), e ter instruções
passo a passo. Formate a resposta SEMPRE nestas seções com os títulos exatos:

**OBJETIVO**
(1-2 frases sobre o que o aluno vai aprender/desenvolver)

**MATERIAIS**
(lista com bullet points • de cada material necessário)

**PASSO A PASSO**
(etapas numeradas 1. 2. 3. etc., linguagem simples e direta)

**DICA PARA O PROFESSOR**
(1 parágrafo com orientação pedagógica específica para a necessidade)

**ADAPTAÇÕES ADICIONAIS**
(2-3 sugestões extras de adaptação ou diferenciação)`;

/**
 * POST /api/educacao-inclusiva/gerar
 * Body: { nomeAluno, necessidade, nivel, disciplina, tema, tipoAtividade, observacoes, apoio }
 */
router.post('/gerar', async (req, res) => {
  try {
    const {
      nomeAluno,
      necessidade,
      nivel,
      disciplina,
      tema,
      tipoAtividade,
      observacoes,
      apoio,
    } = req.body;

    if (!necessidade || !nivel || !disciplina || !tema || !tipoAtividade) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const referencia = nomeAluno?.trim() || 'o aluno';

    const prompt = `Crie uma atividade adaptada com as seguintes características:

- Aluno: ${referencia}
- Necessidade educacional: ${necessidade}
- Nível/Série: ${nivel}
- Disciplina: ${disciplina}
- Tema da aula: ${tema}
- Tipo de atividade: ${tipoAtividade}
- Nível de apoio necessário: ${apoio}
${observacoes ? `- Observações especiais: ${observacoes}` : ''}

Crie uma atividade completa, prática e motivadora para este perfil.`;

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resposta.ok) {
      const err = await resposta.text();
      console.error('[educacao-inclusiva/gerar] Anthropic error:', err);
      return res.status(502).json({ erro: 'Erro ao chamar a IA. Tente novamente.' });
    }

    const dados = await resposta.json();
    const texto = dados.content?.[0]?.text || '';

    res.json({ atividade: texto });
  } catch (err) {
    console.error('[educacao-inclusiva/gerar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
