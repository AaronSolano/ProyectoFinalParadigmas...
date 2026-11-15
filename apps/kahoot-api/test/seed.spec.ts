import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { database } from "../src/data/database";
import { loadConfig } from "../src/config/config";
import { DiskImageStorage } from "../src/modules/images/storage";
import { seedDemo, DEMO_QUIZ_ID } from "../src/data/seed";
const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;
describeDb("Seed idempotente PostgreSQL", () => {
  it("crea una sola demo con imagen y conserva ediciones posteriores", async () => {
    const config = loadConfig({
      KAHOOT_DATABASE_URL: process.env.TEST_DATABASE_URL,
      AUTH_BASE_URL: "http://localhost:3001",
      PUBLIC_API_URL: "http://localhost:3002",
    });
    const db = database(config);
    const root = await mkdtemp(join(tmpdir(), "seed-kahoot-"));
    await db.initialize();
    try {
      await db.runMigrations();
      await db.query(
        "TRUNCATE session_results,participants,session_questions,sessions,questions,quizzes CASCADE",
      );
      const images = new DiskImageStorage(root);
      await Promise.all([seedDemo(db, images), seedDemo(db, images)]);
      expect(
        Number((await db.query("SELECT count(*) FROM quizzes"))[0].count),
      ).toBe(1);
      expect(
        Number((await db.query("SELECT count(*) FROM questions"))[0].count),
      ).toBe(1);
      const q = (await db.query("SELECT * FROM questions"))[0];
      expect((await images.get(q.image_filename)).length).toBeGreaterThan(20);
      await db.query("UPDATE quizzes SET title=$2 WHERE id=$1", [
        DEMO_QUIZ_ID,
        "Titulo editado",
      ]);
      await seedDemo(db, images);
      expect(
        (
          await db.query("SELECT title FROM quizzes WHERE id=$1", [
            DEMO_QUIZ_ID,
          ])
        )[0].title,
      ).toBe("Titulo editado");
    } finally {
      await db.destroy();
      await rm(root, { recursive: true, force: true });
    }
  });
});
