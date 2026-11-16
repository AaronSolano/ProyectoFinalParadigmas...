import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { database } from "../src/data/database";
import { loadConfig } from "../src/config/config";
import { PostgresGameStore } from "../src/data/game-store";
import { GameService } from "../src/application/game-service";
import { GameSchemas } from "../src/presentation/game-schemas";
import { InitialKahoot1794780000000 } from "../src/data/migration";
import { DemoSeedHistory1794780001000 } from "../src/data/seed-migration";
import { LiveGame1794780002000 } from "../src/data/live-migration";

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("migración de velocidad sobre datos de la versión anterior", () => {
  let admin: DataSource, db: DataSource;
  let config: ReturnType<typeof loadConfig>;
  const name = `kahoot_speed_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    admin = new DataSource({
      type: "postgres",
      url: process.env.TEST_DATABASE_URL,
    });
    await admin.initialize();
    await admin.query(`CREATE DATABASE "${name}"`);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.pathname = `/${name}`;
    config = loadConfig({
      KAHOOT_DATABASE_URL: url.toString(),
      AUTH_BASE_URL: "http://localhost:1",
      PUBLIC_API_URL: "http://localhost:3002",
    });
    const options = database(config).options;
    db = new DataSource({
      ...options,
      migrations: [
        InitialKahoot1794780000000,
        DemoSeedHistory1794780001000,
        LiveGame1794780002000,
      ],
    });
    await db.initialize();
    await db.runMigrations();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await admin.destroy();
      }
    }
  });
  test("conserva puntajes, rellena aperturas y snapshots, acepta 0..1000 y recupera una pregunta antigua", async () => {
    const owner = randomUUID(),
      user = randomUUID();
    const quiz = (
      await db.query(
        "INSERT INTO quizzes(owner_id,title) VALUES($1,'Anterior') RETURNING id",
        [owner],
      )
    )[0].id;
    const openedAt = Date.now(),
      deadline = openedAt + 5000;
    const session = (
      await db.query(
        "INSERT INTO sessions(code,quiz_id,quiz_title,host_id,status,game_state,question_time_seconds,current_question_index,question_closes_at) VALUES('ABC234',$1,'Anterior',$2,'in_progress','question_closed',5,0,$3) RETURNING id",
        [quiz, owner, new Date(deadline)],
      )
    )[0].id;
    await db.query(
      "INSERT INTO session_questions(session_id,position,statement,correct_answer) VALUES($1,0,'Anterior',true)",
      [session],
    );
    const participant = (
      await db.query(
        "INSERT INTO participants(session_id,user_id,display_name,score) VALUES($1,$2,'Anterior',1) RETURNING id",
        [session, user],
      )
    )[0].id;
    await db.query(
      "INSERT INTO answers(session_id,participant_id,question_index,answer,received_at,is_correct,points) VALUES($1,$2,0,true,$3,true,1)",
      [session, participant, new Date(openedAt + 1000)],
    );
    await db.query("UPDATE sessions SET last_closed=$2::jsonb WHERE id=$1", [
      session,
      JSON.stringify({
        questionIndex: 0,
        correctAnswer: true,
        results: [
          {
            participantId: participant,
            answered: true,
            correct: true,
            pointsAwarded: 1,
            totalScore: 1,
          },
        ],
        ranking: [
          {
            participantId: participant,
            displayName: "Anterior",
            score: 1,
            position: 1,
          },
        ],
      }),
    ]);
    await db.query(
      "INSERT INTO sessions(code,quiz_id,quiz_title,host_id,status,game_state,question_time_seconds,current_question_index,question_closes_at) VALUES('ABC235',$1,'Abierta',$2,'in_progress','question_open',5,0,$3)",
      [quiz, owner, new Date(deadline)],
    );
    await db.query(
      "INSERT INTO session_questions(session_id,position,statement,correct_answer) SELECT id,0,'Abierta',false FROM sessions WHERE code='ABC235'",
    );
    await db.destroy();
    // Run the actual registered migration, as production does after an upgrade.
    db = database(config);
    await db.initialize();
    expect((await db.runMigrations()).map((m) => m.name)).toEqual([
      "SpeedScoring1794780003000",
    ]);
    expect(await db.runMigrations()).toEqual([]);
    const rows = await db.query(
      "SELECT question_opened_at FROM sessions ORDER BY code",
    );
    expect(rows.map((r: any) => r.question_opened_at.getTime())).toEqual([
      openedAt,
      openedAt,
    ]);
    expect(
      (await db.query("SELECT score,streak FROM participants"))[0],
    ).toEqual({ score: 1, streak: 0 });
    expect((await db.query("SELECT points FROM answers"))[0].points).toBe(1);
    const game = new GameService(
      new PostgresGameStore(db),
      "http://localhost:3002",
      { now: () => openedAt },
    );
    try {
      let state: any;
      await game.join(
        { id: user, name: "Anterior" },
        "ABC234",
        async (sync) => {
          state = sync;
        },
      );
      expect(new GameSchemas().valid("state_sync", state)).toBe(true);
      expect(state.lastClosed.results[0]).toMatchObject({
        pointsAwarded: 1,
        totalScore: 1,
        elapsedMs: 1000,
        streak: 0,
      });
      await game.join({ id: owner, name: "Host" }, "ABC235", async (sync) => {
        state = sync;
      });
      expect(new GameSchemas().valid("state_sync", state)).toBe(true);
      expect(state.currentQuestion).toMatchObject({
        openedAt: new Date(openedAt).toISOString(),
        durationSeconds: 5,
      });
      await game.recover();
      await game.control({ id: owner, name: "Host" }, "ABC235", "close");
    } finally {
      await game.onModuleDestroy();
    }
    await db.query("UPDATE answers SET points=1000");
    await expect(
      db.query("UPDATE answers SET points=1001"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query("UPDATE answers SET points=-1"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(db.undoLastMigration()).rejects.toMatchObject({
      code: "23514",
    });
    expect((await db.query("SELECT points FROM answers"))[0].points).toBe(1000);
    expect((await db.query("SELECT streak FROM participants"))[0].streak).toBe(
      0,
    );
  });
});
