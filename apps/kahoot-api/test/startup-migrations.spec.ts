import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { startServer } from "../src/main";
import { loadConfig } from "../src/config/config";
import { database } from "../src/data/database";
import { runStartupMigrations } from "../src/data/startup-migrations";
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("arranque sobre PostgreSQL vacío con bloqueo asesor", () => {
  let admin: DataSource;
  const name = `kahoot_start_${randomUUID().replaceAll("-", "")}`;
  let url: string;
  beforeAll(async () => {
    admin = new DataSource({
      type: "postgres",
      url: process.env.TEST_DATABASE_URL,
    });
    await admin.initialize();
    await admin.query(`CREATE DATABASE "${name}"`);
    const parsed = new URL(process.env.TEST_DATABASE_URL!);
    parsed.pathname = `/${name}`;
    url = parsed.toString();
  });
  afterAll(async () => {
    if (admin?.isInitialized) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await admin.destroy();
      }
    }
  });
  test("desactivar migraciones deja la base intacta; dos arranques concurrentes migran antes de escuchar", async () => {
    const config = {
      ...loadConfig({
        KAHOOT_DATABASE_URL: url,
        AUTH_BASE_URL: "http://127.0.0.1:1",
        PUBLIC_API_URL: "http://127.0.0.1:3002",
      }),
      port: 0,
    };
    const untouched = database(config);
    await untouched.initialize();
    try {
      await runStartupMigrations(untouched, false);
      expect(
        (await untouched.query("SELECT to_regclass('sessions') AS sessions"))[0]
          .sessions,
      ).toBeNull();
    } finally {
      await untouched.destroy();
    }
    const servers = await Promise.allSettled([
      startServer(config),
      startServer(config),
    ]);
    try {
      expect(servers.every((s) => s.status === "fulfilled")).toBe(true);
      for (const result of servers)
        if (result.status === "fulfilled") {
          const { app, db } = result.value;
          const address = app.getHttpServer().address();
          expect(
            (await fetch(`http://127.0.0.1:${address.port}/api/v1/health`))
              .status,
          ).toBe(200);
          expect(
            (
              await db.query("SELECT name FROM migrations ORDER BY timestamp")
            ).map((r: any) => r.name),
          ).toEqual([
            "InitialKahoot1794780000000",
            "DemoSeedHistory1794780001000",
            "LiveGame1794780002000",
            "SpeedScoring1794780003000",
            "MultipleChoice1794780004000",
            "QuizLibrary1794780005000",
            "QuestionExplanation1794780006000",
            "LibraryExplanations1794780007000",
          ]);
          expect(
            (await db.query("SELECT to_regclass('answers') AS answers"))[0]
              .answers,
          ).toBe("answers");
        }
    } finally {
      await Promise.all(
        servers.map((s) =>
          s.status === "fulfilled" ? s.value.close() : Promise.resolve(),
        ),
      );
    }
    const disabled = await startServer({ ...config, runMigrations: false });
    await disabled.close();
  });
});
