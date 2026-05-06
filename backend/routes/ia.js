const express = require('express');
const multer = require('multer');
const { autenticar } = require('../middleware/auth');
const { gerarPlanoAula } = require('../ia/planoAula');
const { gerarQuestoes } = require('../ia/criadorQuestoes');
const { interpretarFolhaResposta, corrigirRespostas } = require('../ia/corretorProvas');
const { gerarDiagnostico, gerarConteudo } = require('../ia/diagnosticoAluno');
const db = require('../db');

const router = express.Router();
router.use(autenticar);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function checkApiKey(res) {
  if (!process.env.GOOGLE_API_KEY) {
    res.status(503).json({ erro: 'GOOGLE_API_KEY não configurada.' });
    return false;
  }
  return true;
}

router.post('/plano-aula', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const resultado = await gerarPlanoAula(req.body);
    if (req.body.salvar) {
      await db.run('INSERT INTO planos_aula (professor_id, turma_id, disciplina, tema, objetivo, conteudo_json, gerado_por_ia, data_aula) VALUES (?, ?, ?, ?, ?, ?, 1, ?)', [req.body.professor_id || null, req.body.turma_id || null, req.body.disciplina, req.body.tema, req.body.objetivos || null, JSON.stringify({ texto: resultado }), req.body.data_aula || null]);
    }
    res.json({ texto: resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/questoes', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const questoes = await gerarQuestoes(req.body);
    res.json({ questoes });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/corretor/foto', upload.single('folha'), async (req, res) => {
  if (!checkApiKey(res)) return;
  if (!req.file) return res.status(400).json({ erro: 'Arquivo de imagem obrigatório' });
  try {
    const base64 = req.file.buffer.toString('base64');
    const respostas = await interpretarFolhaResposta(base64);
    res.json({ respostas });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/corretor/calcular', (req, res) => {
  const { questoes, respostas } = req.body;
  if (!questoes || !respostas) return res.status(400).json({ erro: 'questoes e respostas são obrigatórios' });
  try {
    const resultado = corrigirRespostas(questoes, respostas);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/diagnostico', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { turma_id, disciplina } = req.body;
    const notas = await db.all('SELECT n.*, a.nome FROM notas n JOIN alunos a ON n.aluno_id = a.id WHERE n.turma_id = ? AND n.disciplina = ? ORDER BY n.nota_final DESC', [turma_id, disciplina]);
    const total = notas.length;
    const aprovados = notas.filter(n => n.nota_final >= 5).length;
    const percentualAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;
    const turma = await db.get('SELECT * FROM turmas WHERE id = ?', [turma_id]);
    const resultado = await gerarDiagnostico({ disciplina, turma: turma?.nome || turma_id, dados: { notas, total, aprovados, percentualAprovacao, emReforco: notas.filter(n => n.nota_final < 5), destaque: notas.filter(n => n.nota_final >= 8), topicosComErro: [] } });
    res.json({ texto: resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/conteudo', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const resultado = await gerarConteudo(req.body);
    res.json({ conteudo: resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/diagnostico/:aluno_id', async (req, res) => {
  try {
    const aluno = await db.get('SELECT * FROM alunos WHERE id = ?', [req.params.aluno_id]);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const notas = await db.all('SELECT n.*, av.titulo, av.disciplina FROM notas n JOIN avaliacoes av ON n.avaliacao_id = av.id WHERE n.aluno_id = ? ORDER BY av.data_aplicacao DESC', [req.params.aluno_id]);
    const disciplinas = {};
    notas.forEach(n => {
      if (!disciplinas[n.disciplina]) disciplinas[n.disciplina] = [];
      disciplinas[n.disciplina].push(n.nota_final);
    });
    const mediasPorDisc = Object.entries(disciplinas).map(([disc, ns]) => ({
      disciplina: disc, media: Math.round((ns.reduce((s, v) => s + v, 0) / ns.length) * 10) / 10
    }));
    const media_geral = notas.length > 0 ? Math.round((notas.reduce((s, n) => s + n.nota_final, 0) / notas.length) * 10) / 10 : null;
    const pior = mediasPorDisc.reduce((m, d) => !m || d.media < m.media ? d : m, null);
    const melhor = mediasPorDisc.reduce((m, d) => !m || d.media > m.media ? d : m, null);

    // Tenta gerar diagnóstico com IA; se falhar, usa análise local
    let diagnostico;
    try {
      const { gerarDiagnosticoAluno } = require('../ia/diagnosticoAluno');
      diagnostico = await gerarDiagnosticoAluno({ aluno: { ...aluno, media_geral }, notas, mediasPorDisc, pior, melhor });
    } catch (_) {
      // Fallback sem IA
      const status = media_geral === null ? 'sem avaliações' : media_geral >= 7 ? 'aprovado' : media_geral >= 5 ? 'em recuperação' : 'em risco';
      const discTexto = mediasPorDisc.map(d => `${d.disciplina}: ${d.media}`).join(', ') || 'sem dados';
      diagnostico = {
        aluno: { nome: aluno.nome, turma: aluno.turma, media_geral },
        diagnostico: `Aluno: ${aluno.nome} | Situação: ${status}\nMédia geral: ${media_geral ?? '—'}\nDesempenho por disciplina: ${discTexto}${melhor ? `\nMelhor disciplina: ${melhor.disciplina} (${melhor.media})` : ''}${pior && pior.disciplina !== melhor?.disciplina ? `\nAtenção: ${pior.disciplina} (${pior.media})` : ''}`,
        recomendacoes: media_geral !== null && media_geral < 5
          ? ['Priorizar reforço nas disciplinas com menor nota', 'Planejar atividades de recuperação', 'Acompanhar frequência nas aulas']
          : media_geral !== null && media_geral < 7
          ? ['Manter dedicação nos estudos', 'Focar nas disciplinas com nota abaixo de 7']
          : ['Continuar o bom desempenho', 'Participar de atividades de aprofundamento'],
        plano_recuperacao: media_geral !== null && media_geral < 5 ? 'Agendar avaliação de recuperação e reforço individualizado.' : null,
        sem_ia: true,
      };
    }
    res.json(diagnostico);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/corrigir-prova', upload.single('imagem'), async (req, res) => {
  try {
    const gabarito = (req.body.gabarito || '').toUpperCase().replace(/\s/g, '');
    if (!gabarito) return res.status(400).json({ erro: 'Gabarito obrigatório' });

    let respostasStr = '';
    if (req.file) {
      if (!checkApiKey(res)) return;
      const base64 = req.file.buffer.toString('base64');
      respostasStr = (await require('../ia/corretorProvas').interpretarFolhaResposta(base64)).toUpperCase().replace(/\s/g, '');
    } else {
      respostasStr = (req.body.respostas || '').toUpperCase().replace(/\s/g, '');
    }

    if (!respostasStr) return res.status(400).json({ erro: 'Respostas não identificadas' });

    const detalhes = gabarito.split('').map((g, i) => ({
      questao: i + 1, esperado: g, respondido: respostasStr[i] || '?', acertou: g === respostasStr[i]
    }));
    const acertos = detalhes.filter(d => d.acertou).length;
    const total = gabarito.length;
    const nota = Math.round((acertos / total) * 10 * 10) / 10;

    res.json({ acertos, total, percentual: Math.round((acertos / total) * 100), nota, detalhes, aluno_nome: req.body.aluno_nome || '' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
