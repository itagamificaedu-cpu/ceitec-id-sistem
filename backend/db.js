const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

function toPos(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  async get(sql, params = []) {
    const { rows } = await pool.query(toPos(sql), params);
    return rows[0] || null;
  },
  async all(sql, params = []) {
    const { rows } = await pool.query(toPos(sql), params);
    return rows;
  },
  async run(sql, params = []) {
    const pgSql = toPos(sql);
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    const finalSql = isInsert ? pgSql + ' RETURNING id' : pgSql;
    const result = await pool.query(finalSql, params);
    return { lastInsertRowid: result.rows[0]?.id || null };
  },
  async exec(sql) {
    await pool.query(sql);
  },
  pool,
};

module.exports = db;
