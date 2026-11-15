import { DataSource, MigrationExecutor } from "typeorm";
/** The lock and migrations share one PostgreSQL session, including the migration table creation. */
export async function runStartupMigrations(
  db: DataSource,
  enabled = true,
): Promise<void> {
  if (!enabled) return;
  const runner = db.createQueryRunner();
  await runner.connect();
  let locked = false;
  try {
    await runner.query("SELECT pg_advisory_lock($1,$2)", [400, 4]);
    locked = true;
    const executor = new MigrationExecutor(db, runner);
    executor.transaction = "all";
    await executor.executePendingMigrations();
  } finally {
    try {
      if (locked)
        await runner.query("SELECT pg_advisory_unlock($1,$2)", [400, 4]);
    } finally {
      await runner.release();
    }
  }
}
