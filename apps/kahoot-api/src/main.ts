import { createApp } from "./app";
import { database } from "./data/database";
import { loadConfig } from "./config/config";
import { startTelemetry } from "./telemetry";
import { runStartupMigrations } from "./data/startup-migrations";
export async function startServer(config = loadConfig()) {
  const telemetry = startTelemetry();
  const db = database(config);
  let app: Awaited<ReturnType<typeof createApp>>["app"] | undefined;
  const close = async () => {
    try {
      await app?.close();
    } finally {
      try {
        if (db.isInitialized) await db.destroy();
      } finally {
        await telemetry?.shutdown().catch(() => undefined);
      }
    }
  };
  try {
    await db.initialize();
    await runStartupMigrations(db, config.runMigrations);
    ({ app } = await createApp(config, db));
    await app.listen(config.port, "0.0.0.0");
    return { app, db, close };
  } catch (error) {
    await close();
    throw error;
  }
}
async function main() {
  const { close } = await startServer();
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void close();
    });
}
if (require.main === module)
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
