process.env.DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ita_tecnologia_secret_2024';

const { initDatabase } = require('../backend/database');

let initialized = false;
let expressApp;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (err) {
      console.error('DB init error:', err.message);
    }
  }
  if (!expressApp) {
    expressApp = require('../backend/server');
  }
  return expressApp(req, res);
};
