import { DataSource, MigrationExecutor } from 'typeorm';
export async function runStartupMigrations(db: DataSource, enabled = true) {
  if (!enabled) return;
  const runner = db.createQueryRunner();
  await runner.connect();
  let locked = false;
  try {
    await runner.query('SELECT pg_advisory_lock($1,$2)', [400, 2]);
    locked = true;
    // Reuse the locked connection, including migration-history creation.
    const executor = new MigrationExecutor(db, runner);
    executor.transaction = 'all';
    await executor.executePendingMigrations();
  } finally {
    try {
      if (locked)
        await runner.query('SELECT pg_advisory_unlock($1,$2)', [400, 2]);
    } finally {
      await runner.release();
    }
  }
}
