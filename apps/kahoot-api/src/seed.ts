import { loadConfig } from "./config/config";
import { database } from "./data/database";
import { seedDemo } from "./data/seed";
import {
  DiskImageStorage,
  SupabaseImageStorage,
} from "./modules/images/storage";
async function main() {
  const config = loadConfig();
  const db = database(config);
  await db.initialize();
  try {
    await db.runMigrations();
    const images =
      config.storage === "disk"
        ? new DiskImageStorage(config.imagePath)
        : new SupabaseImageStorage(
            config.supabaseUrl,
            config.supabaseKey,
            config.supabaseBucket,
          );
    const result = await seedDemo(db, images, process.env.DEMO_PROFILE_ID);
    for (const warning of result.warnings) console.warn(warning);
    console.log("Cuestionario de demostracion preparado.");
  } finally {
    await db.destroy();
  }
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
