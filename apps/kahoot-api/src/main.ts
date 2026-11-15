import { createApp } from "./app";
import { database } from "./data/database";
import { loadConfig } from "./config/config";
import { startTelemetry } from "./telemetry";
async function main() {
  const config = loadConfig();
  const telemetry = startTelemetry();
  const db = database(config);
  await db.initialize();
  const { app } = await createApp(config, db);
  await app.listen(config.port, "0.0.0.0");
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app
        .close()
        .then(() => db.destroy())
        .finally(() => telemetry?.shutdown().catch(() => undefined));
    });
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
