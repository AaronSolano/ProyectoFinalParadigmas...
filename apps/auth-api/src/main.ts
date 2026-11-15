import 'reflect-metadata';
import { settings } from './config/settings';
import { createDataSource } from './data/data-source';
import { PostgresProfiles } from './data/profiles';
import { createApp } from './app';
import { startTelemetry } from './telemetry';
async function main() {
  const config = settings();
  const telemetry = startTelemetry();
  const db = await createDataSource(
    config.databaseUrl,
    config.ssl,
  ).initialize();
  const { app } = await createApp(config, new PostgresProfiles(db));
  await app.listen(config.port, '0.0.0.0');
  const stop = async () => {
    await app.close();
    await db.destroy();
    await telemetry?.shutdown();
  };
  process.once('SIGTERM', () => void stop());
  process.once('SIGINT', () => void stop());
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'No se pudo iniciar auth-api',
  );
  process.exitCode = 1;
});
