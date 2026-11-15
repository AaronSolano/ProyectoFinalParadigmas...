import { database } from "./database";
import { loadConfig } from "../config/config";
async function main() {
  const db = database(loadConfig());
  await db.initialize();
  try {
    await db.runMigrations();
  } finally {
    await db.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
