const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

const ESCOLA_ID = 192;

async function main() {
  const client = await pool.connect();
  try {
    const r1 = await client.query('SELECT id, nome FROM turmas WHERE escola_id = $1 ORDER BY nome', [ESCOLA_ID]);
    console.log('TURMAS CEITEC: ' + r1.rows.length);
    r1.rows.forEach(t => console.log('  [' + t.id + '] ' + t.nome));

    const r2 = await client.query("SELECT id, nome, email FROM usuarios WHERE perfil = 'professor' AND escola_id = $1 ORDER BY nome", [ESCOLA_ID]);
    console.log('USUARIOS PROFESSOR: ' + r2.rows.length);
    r2.rows.forEach(u => console.log('  [' + u.id + '] ' + u.nome + ' | ' + u.email));

    const r3 = await client.query('SELECT id, nome, email FROM professores WHERE escola_id = $1 ORDER BY nome', [ESCOLA_ID]);
    console.log('PERFIS PROFESSOR: ' + r3.rows.length);
    r3.rows.forEach(p => console.log('  [' + p.id + '] ' + p.nome + ' | ' + p.email));

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
