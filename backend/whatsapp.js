const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');

let client = null;
let clientReady = false;

function inicializarWhatsApp() {
  try {
    client = new Client({
      authStrategy: new LocalAuth({ clientId: 'ita-session' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu']
      }
    });

    client.on('qr', (qr) => {
      console.log('\n📱 WHATSAPP — Escaneie o QR Code abaixo com seu celular:');
      console.log('(WhatsApp > Aparelhos Conectados > Conectar um aparelho)\n');
      qrcodeTerminal.generate(qr, { small: true });
    });

    client.on('ready', () => { clientReady = true; console.log('✅ WhatsApp conectado!'); });
    client.on('authenticated', () => console.log('🔐 WhatsApp autenticado'));
    client.on('auth_failure', () => { clientReady = false; });
    client.on('disconnected', () => { clientReady = false; });

    client.initialize().catch(err => {
      console.log('⚠️ WhatsApp indisponível (Chrome não encontrado):', err.message);
      console.log('💡 Para ativar: npx puppeteer browsers install chrome');
      client = null;
      clientReady = false;
    });
    console.log('🔄 Iniciando WhatsApp...');
  } catch (err) {
    console.error('⚠️ WhatsApp não pôde ser iniciado:', err.message);
    client = null;
    clientReady = false;
  }
}

async function enviar(telefone, mensagem) {
  if (!telefone || !client || !clientReady) return;
  try {
    const chatId = telefone.includes('@c.us') ? telefone : `${telefone}@c.us`;
    await client.sendMessage(chatId, mensagem);
    console.log(`✅ WhatsApp enviado para ${telefone}`);
  } catch (err) {
    console.error(`⚠️ Erro WhatsApp para ${telefone}:`, err.message);
  }
}

async function enviarNotificacaoFalta(telefone, nomeAluno, turma, data) {
  const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
  await enviar(telefone, `📚 *ITA TECNOLOGIA EDUCACIONAL*\n\nOlá! Informamos que *${nomeAluno}* não compareceu à aula hoje, *${dataFmt}*.\n\nTurma: ${turma}\n\nCaso precise justificar a falta, entre em contato com a secretaria.\n\n_ITA Tecnologia Educacional_ 🎓`);
}

async function enviarNotificacaoBaixoDesempenho(telefone, nomeAluno, disciplina, nota) {
  await enviar(telefone, `📊 *ITA TECNOLOGIA EDUCACIONAL*\n\nOlá! Informamos que *${nomeAluno}* obteve nota *${nota}* em *${disciplina}*.\n\nPara acompanhar o desempenho completo, entre em contato com a escola.\n\n_ITA Tecnologia Educacional_ 🎓`);
}

async function enviarNotificacaoOcorrencia(telefone, nomeAluno, tipo, descricao, gravidade) {
  const tipoTexto = { comportamento: 'Comportamental', academico: 'Acadêmico', saude: 'Saúde', elogio: 'Elogio', outro: 'Outro' }[tipo] || tipo;
  const emojis = { baixa: 'ℹ️', media: '⚠️', alta: '🚨', elogio: '🌟' };
  const emoji = tipo === 'elogio' ? '🌟' : (emojis[gravidade] || 'ℹ️');
  await enviar(telefone, `${emoji} *ITA TECNOLOGIA EDUCACIONAL*\n\nRegistro para *${nomeAluno}*:\n\nTipo: ${tipoTexto}\nGravidade: ${gravidade?.toUpperCase() || 'N/A'}\n\n"${descricao}"\n\nPara mais informações, entre em contato com a escola.\n\n_ITA Tecnologia Educacional_ 🎓`);
}

function isWhatsAppReady() { return clientReady; }

module.exports = { inicializarWhatsApp, enviarNotificacaoFalta, enviarNotificacaoBaixoDesempenho, enviarNotificacaoOcorrencia, isWhatsAppReady };
