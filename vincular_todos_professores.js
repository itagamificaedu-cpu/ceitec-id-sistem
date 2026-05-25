// Script: vincula todos os professores cadastrados a todas as turmas da escola
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rDMoTdq14tZh@ep-flat-frost-acnjlhbb-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    // Busca todos os professores ativos
    const { rows: professores } = await client.query(
      "SELECT id, nome, especialidade, escola_id FROM professores ORDER BY nome"
    );
    console.log(`Professores encontrados: ${professores.length}`);
    professores.forEach(p => console.log(`  - [${p.id}] ${p.nome} (escola_id=${p.escola_id})`));

    // Busca todas as turmas ativas
    const { rows: turmas } = await client.query(
      "SELECT id, nome, escola_id FROM turmas ORDER BY nome"
    );
    console.log(`\nTurmas encontradas: ${turmas.length}`);
    turmas.forEach(t => console.log(`  - [${t.id}] ${t.nome} (escola_id=${t.escola_id})`));

    let inseridos = 0;
    let ignorados = 0;

    for (const prof of professores) {
      const turmasDaEscola = turmas.filter(t => t.escola_id === prof.escola_id);

      for (const turma of turmasDaEscola) {
        // Verifica se vínculo já existe
        const { rows: existe } = await client.query(
          'SELECT id FROM professor_turma_disciplina WHERE professor_id = $1 AND turma_id = $2',
          [prof.id, turma.id]
        );

        if (existe.length === 0) {
          const disciplina = prof.especialidade || 'Geral';
          await client.query(
            'INSERT INTO professor_turma_disciplina (professor_id, turma_id, disciplina) VALUES ($1, $2, $3)',
            [prof.id, turma.id, disciplina]
          );
          inseridos++;
          console.log(`  + Vinculado: ${prof.nome} → ${turma.nome} (${disciplina})`);
        } else {
          ignorados++;
        }
      }
    }

    console.log(`\nConcluído: ${inseridos} vínculos criados, ${ignorados} já existiam.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
