process.env.DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ita_tecnologia_secret_2024';

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
