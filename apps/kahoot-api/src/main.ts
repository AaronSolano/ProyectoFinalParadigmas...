import { createApp } from "./app";
import { database } from "./data/database";
import { loadConfig } from "./config/config";
async function main() {
  const config = loadConfig();
  const db = database(config);
  await db.initialize();
  const { app } = await createApp(config, db);
  await app.listen(config.port, "0.0.0.0");
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close().then(() => db.destroy());
    });
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
