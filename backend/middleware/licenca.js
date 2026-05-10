const db = require('../db');

// Verifica se a licença da escola está ativa.
// Contas sem licenca_expira (demo ou provisionadas manualmente) sempre passam.
async function verificarLicenca(req, res, next) {
  try {
    const escola_id = req.usuario?.escola_id;
    if (!escola_id) return next();

    const admin = await db.get(
      'SELECT licenca_expira, plano_ativo FROM usuarios WHERE id = ?',
      [escola_id]
    );

    if (!admin || !admin.licenca_expira) return next(); // sem expiração = conta demo/ilimitada

    if (admin.plano_ativo === 0) {
      return res.status(402).json({
        erro: 'Plano suspenso. Renove sua assinatura para continuar.',
        codigo: 'PLANO_SUSPENSO',
        renovar: '/planos',
      });
    }

    const expira = new Date(admin.licenca_expira);
    if (expira < new Date()) {
      return res.status(402).json({
        erro: 'Sua licença expirou. Renove para continuar usando o sistema.',
        codigo: 'LICENCA_EXPIRADA',
        expira: admin.licenca_expira,
        renovar: '/planos',
      });
    }

    next();
  } catch (_) {
    next(); // em caso de erro no check, não bloqueia o usuário
  }
}

module.exports = { verificarLicenca };
