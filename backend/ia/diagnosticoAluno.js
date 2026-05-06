const { chamarGemini } = require('./gemini');

async function gerarDiagnostico({ disciplina, turma, dados }) {
  const resumo = dados.notas?.map(n => `${n.nome}: ${n.nota_final}`).join(', ') || 'sem dados';
  const emReforco = dados.emReforco?.map(n => n.nome).join(', ') || 'nenhum';
  const destaque = dados.destaque?.map(n => n.nome).join(', ') || 'nenhum';

  const prompt = `Você é um pedagogo especialista em tecnologia educacional e análise de dados de aprendizagem.

Analise os seguintes dados de desempenho da turma ${turma} na disciplina de ${disciplina}:

Taxa de aprovação: ${dados.percentualAprovacao}% (${dados.aprovados} de ${dados.total} alunos)
Notas dos alunos: ${resumo}
Alunos que precisam de reforço: ${emReforco}
Alunos em destaque: ${destaque}

Com base nesses dados, forneça:

1. **Diagnóstico Geral** (parágrafo resumindo o desempenho da turma)
2. **Pontos Críticos** (principais dificuldades identificadas)
3. **Estratégias de Reforço** (ações específicas para os alunos com baixo desempenho)
4. **Enriquecimento para Alunos Avançados** (atividades para quem está acima da média)
5. **Recomendações Pedagógicas** (ajustes na metodologia de ensino)
6. **Plano de Ação Semanal** (atividades práticas para as próximas 2 semanas)

Use linguagem clara, objetiva e empática. Foque em soluções práticas e aplicáveis.`;

  return chamarGemini(prompt);
}

async function gerarConteudo({ disciplina, tema, ano_escolar, tipo, instrucoes }) {
  const tipos = {
    resumo: 'um resumo didático completo',
    mapa_mental: 'um mapa mental em formato de texto estruturado com hierarquia clara',
    exercicios: 'uma lista de 5-8 exercícios práticos progressivos',
    projeto: 'uma proposta de projeto maker/robótica completa com etapas',
    rubrica: 'uma rubrica de avaliação detalhada com critérios e níveis de desempenho',
  };

  const prompt = `Você é um professor especialista em ${disciplina} para escola de tecnologia.

Crie ${tipos[tipo] || 'material didático'} sobre o tema "${tema}" para alunos do ${ano_escolar}º ano.

${instrucoes ? `Instruções adicionais do professor: ${instrucoes}` : ''}

O conteúdo deve ser:
- Adequado para o nível do ano escolar
- Contextualizado para uma escola de tecnologia (robótica, programação, maker)
- Prático e engajante
- Bem formatado em Markdown

Crie o conteúdo completo e detalhado.`;

  return chamarGemini(prompt);
}

async function gerarDiagnosticoAluno({ aluno, notas, mediasPorDisc, pior, melhor }) {
  const discResumo = mediasPorDisc.map(d => `${d.disciplina}: ${d.media}`).join(', ') || 'sem dados';

  const prompt = `Você é um pedagogo especialista em educação personalizada.

Analise o perfil acadêmico do(a) aluno(a) ${aluno.nome} (turma: ${aluno.turma || 'N/A'}):

Média geral: ${aluno.media_geral ?? 'sem avaliações'}
Médias por disciplina: ${discResumo}
Melhor disciplina: ${melhor ? `${melhor.disciplina} (${melhor.media})` : 'N/A'}
Disciplina com maior dificuldade: ${pior ? `${pior.disciplina} (${pior.media})` : 'N/A'}
Total de avaliações realizadas: ${notas.length}

Com base nesses dados, forneça um diagnóstico pedagógico personalizado com:

1. **Análise do Perfil** (parágrafo sobre o desempenho geral do aluno)
2. **Pontos Fortes** (disciplinas e habilidades em destaque)
3. **Áreas de Atenção** (onde precisa melhorar e possíveis causas)
4. **Recomendações Personalizadas** (estratégias específicas para este aluno)
5. **Plano de Recuperação** (se necessário — ações práticas para as próximas semanas)

Use linguagem empática, construtiva e focada no desenvolvimento do aluno.`;

  const texto = await chamarGemini(prompt);
  const recomendacoes = [];
  const linhas = texto.split('\n');
  let capturando = false;
  for (const l of linhas) {
    if (l.includes('Recomendações')) { capturando = true; continue; }
    if (capturando && l.match(/^\d\.|^\*\*\d/)) { capturando = false; }
    if (capturando && l.trim().startsWith('-')) recomendacoes.push(l.trim().slice(1).trim());
  }

  return {
    aluno: { nome: aluno.nome, turma: aluno.turma, media_geral: aluno.media_geral },
    diagnostico: texto,
    recomendacoes: recomendacoes.slice(0, 5),
    plano_recuperacao: aluno.media_geral !== null && aluno.media_geral < 5 ? 'Ver diagnóstico completo acima.' : null,
  };
}

module.exports = { gerarDiagnostico, gerarConteudo, gerarDiagnosticoAluno };
