const serverless = require('serverless-http');
const { initDatabase } = require('../../backend/database');

let initialized = false;
let app;

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (err) {
      console.error('Erro ao inicializar banco:', err.message);
    }
  }

  if (!app) {
    app = require('../../backend/server');
  }

  return serverless(app)(event, context);
};
