const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

const ESCOLA_ID = 192;

// 16 professors from usuarios table
const PROFESSORES = [
  { id: 685, nome: 'ALEXANDRE ANDRADE',        email: 'alexandreandrade@gmail.com' },
  { id: 683, nome: 'ALEXANDRE CANDIDO',         email: 'alexandrecandido@gmail.com' },
  { id: 695, nome: 'ALEXANDRE ROCHA',           email: 'alexandrerocha@gmail.com' },
  { id: 690, nome: 'ANTONIO',                   email: 'antonio@gmail.com' },
  { id: 684, nome: 'BIANCA MARA',               email: 'biancamara@gmail.com' },
  { id: 696, nome: 'BRENA GOMES',               email: 'brenagomes@gmail.com' },
  { id: 687, nome: 'CARLOS ROBERTO',            email: 'carlosroberto@gmail.com' },
  { id: 688, nome: 'ENILDA FROTA',              email: 'eneildafrota@gmail.com' },
  { id: 689, nome: 'ESTER',                     email: 'ester@gmail.com' },
  { id: 693, nome: 'EZEQUIEL',                  email: 'ezequiel@gmail.com' },
  { id: 388, nome: 'GENEZIO DE LAVOR OLIVEIRA', email: 'gegeitp@gmail.com' },
  { id: 692, nome: 'LARIANY',                   email: 'lariany@gmail.com' },
  { id: 691, nome: 'LIVISSON',                  email: 'livisson@gmail.com' },
  { id: 686, nome: 'MARIO GLEDSON',             email: 'mariogladson@gmail.com' },
  { id: 694, nome: 'NATALIA RIBEIRO',           email: 'nataliaribeiro@gmail.com' },
  { id: 697, nome: 'PEDRO SANTANA',             email: 'pedrosantana@gmail.com' },
];

// 8 real turmas of CEITEC
const TURMA_IDS = [91, 92, 113, 106, 244, 177, 107, 109];

async function main() {
  const client = await pool.connect();
  try {
    // Step 1: delete demo professors (escola_id=1) and their turma links
    const { rows: demoProfs } = await client.query(
      'SELECT id FROM professores WHERE escola_id = 1'
    );
    if (demoProfs.length > 0) {
      const demoIds = demoProfs.map(p => p.id);
      await client.query(
        'DELETE FROM professor_turma_disciplina WHERE professor_id = ANY($1)',
        [demoIds]
      );
      await client.query('DELETE FROM professores WHERE escola_id = 1');
      console.log('Removidos ' + demoIds.length + ' professores demo e seus vinculos.');
    }

    // Step 2: create professor profiles for missing ones
    let criados = 0;
    const profIdMap = {}; // email -> professor.id

    for (const u of PROFESSORES) {
      const existing = await client.query(
        'SELECT id FROM professores WHERE email = $1 AND escola_id = $2',
        [u.email, ESCOLA_ID]
      );
      if (existing.rows.length > 0) {
        profIdMap[u.email] = existing.rows[0].id;
        console.log('Ja existe: ' + u.nome + ' (id=' + existing.rows[0].id + ')');
      } else {
        const ins = await client.query(
          'INSERT INTO professores (nome, email, escola_id) VALUES ($1, $2, $3) RETURNING id',
          [u.nome, u.email, ESCOLA_ID]
        );
        profIdMap[u.email] = ins.rows[0].id;
        criados++;
        console.log('Criado: ' + u.nome + ' (id=' + ins.rows[0].id + ')');
      }
    }
    console.log('\nPerfis criados: ' + criados);

    // Step 3: clear existing turma links for CEITEC professors and re-create clean
    const allProfIds = Object.values(profIdMap);
    await client.query(
      'DELETE FROM professor_turma_disciplina WHERE professor_id = ANY($1)',
      [allProfIds]
    );
    console.log('Vinculos antigos removidos.');

    // Step 4: link each professor to all 8 turmas
    let vinculos = 0;
    for (const profId of allProfIds) {
      for (const turmaId of TURMA_IDS) {
        await client.query(
          'INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES ($1, $2, $3)',
          [profId, turmaId, 'Geral']
        );
        vinculos++;
      }
    }
    console.log('Vinculos criados: ' + vinculos + ' (' + allProfIds.length + ' professores x ' + TURMA_IDS.length + ' turmas)');
    console.log('\nPRONTO!');

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
