import 'reflect-metadata';
import { settings } from './config/settings';
import { createDataSource } from './data/data-source';
import { PostgresProfiles } from './data/profiles';
import { createApp } from './app';
import { startTelemetry } from './telemetry';
import { runStartupMigrations } from './data/startup-migrations';
export async function startServer(config = settings()) {
  const telemetry = startTelemetry();
  const db = createDataSource(
    config.databaseUrl,
    config.ssl,
    config.sslCa,
    config.databaseSchema,
  );
  let app: Awaited<ReturnType<typeof createApp>>['app'] | undefined;
  const close = async () => {
    try {
      await app?.close();
    } finally {
      try {
        if (db.isInitialized) await db.destroy();
      } finally {
        await telemetry?.shutdown();
      }
    }
  };
  try {
    await db.initialize();
    await runStartupMigrations(db, config.runMigrations);
    ({ app } = await createApp(config, new PostgresProfiles(db)));
    await app.listen(config.port, '0.0.0.0');
    return { app, db, close };
  } catch (error) {
    await close();
    throw error;
  }
}
async function main() {
  const { close } = await startServer();
  process.once('SIGTERM', () => void close());
  process.once('SIGINT', () => void close());
}
if (require.main === module)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'No se pudo iniciar auth-api',
    );
    process.exitCode = 1;
  });
