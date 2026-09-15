/**
 * whatsapp-meta.js — Envio de mensagens via WhatsApp Business Cloud API (Meta oficial)
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

function getToken() {
  return process.env.WHATSAPP_TOKEN;
}

function formatarNumero(telefone) {
  const apenas = String(telefone).replace(/\D/g, '');
  return apenas.startsWith('55') ? apenas : '55' + apenas;
}

async function enviarTexto(telefone, mensagem) {
  const numero = formatarNumero(telefone);
  const body = {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'text',
    text: { body: mensagem }
  };
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(data.error));
  console.log(`✅ WhatsApp Meta enviado para ${numero}`);
  return data;
}

async function enviarTemplate(telefone, templateName, languageCode = 'pt_BR', components = []) {
  const numero = formatarNumero(telefone);
  const body = {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'template',
    template: { name: templateName, language: { code: languageCode }, components }
  };
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(data.error));
  return data;
}

async function enviarNotificacaoFalta(telefone, nomeAluno, turma, data) {
  const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
  return enviarTexto(telefone, `📚 *ITA TECNOLOGIA EDUCACIONAL*\n\nOlá! Informamos que *${nomeAluno}* não compareceu à aula hoje, *${dataFmt}*.\n\nTurma: ${turma}\n\nCaso precise justificar a falta, entre em contato com a secretaria.\n\n_ITA Tecnologia Educacional_ 🎓`);
}

async function enviarNotificacaoBaixoDesempenho(telefone, nomeAluno, disciplina, nota) {
  return enviarTexto(telefone, `📊 *ITA TECNOLOGIA EDUCACIONAL*\n\nOlá! Informamos que *${nomeAluno}* obteve nota *${nota}* em *${disciplina}*.\n\nPara mais informações, entre em contato com a escola.\n\n_ITA Tecnologia Educacional_ 🎓`);
}

async function enviarNotificacaoOcorrencia(telefone, nomeAluno, tipo, descricao, gravidade) {
  const tipoTexto = { comportamento: 'Comportamental', academico: 'Acadêmico', saude: 'Saúde', elogio: 'Elogio', outro: 'Outro' }[tipo] || tipo;
  const emoji = tipo === 'elogio' ? '🌟' : ({ baixa: 'ℹ️', media: '⚠️', alta: '🚨' }[gravidade] || 'ℹ️');
  return enviarTexto(telefone, `${emoji} *ITA TECNOLOGIA EDUCACIONAL*\n\nRegistro para *${nomeAluno}*:\n\nTipo: ${tipoTexto}\nGravidade: ${gravidade?.toUpperCase() || 'N/A'}\n\n"${descricao}"\n\n_ITA Tecnologia Educacional_ 🎓`);
}

module.exports = { enviarTexto, enviarTemplate, enviarNotificacaoFalta, enviarNotificacaoBaixoDesempenho, enviarNotificacaoOcorrencia };
