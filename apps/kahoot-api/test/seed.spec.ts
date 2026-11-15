import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createApp } from "../src/app";
import { database } from "../src/data/database";
import { loadConfig } from "../src/config/config";
import { DiskImageStorage } from "../src/modules/images/storage";
import { seedDemo, DEMO_PROFILE_ID, DEMO_QUIZ_ID, DEMO_QUESTION_ID, DEMO_QUESTIONS } from "../src/data/seed";
const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDb("Seed idempotente PostgreSQL", () => {
  let db: DataSource, images: DiskImageStorage, root: string, app: INestApplication;
  beforeAll(async () => {
    const config = loadConfig({ KAHOOT_DATABASE_URL: process.env.TEST_DATABASE_URL, AUTH_BASE_URL: "http://localhost:3001", PUBLIC_API_URL: "http://localhost:3002" });
    db = database(config);
    root = await mkdtemp(join(tmpdir(), "seed-kahoot-"));
    images = new DiskImageStorage(root);
    await db.initialize();
    await db.runMigrations();
    ({ app } = await createApp(config, db, images));
  });
  beforeEach(async () => {
    await db.query("TRUNCATE demo_seed_versions, session_results,participants,session_questions,sessions,questions,quizzes CASCADE");
  });
  afterAll(async () => {
    await app?.close();
    await db?.destroy();
    if (root) await rm(root, { recursive: true, force: true });
  });
  const questions = () => db.query("SELECT * FROM questions WHERE quiz_id=$1 ORDER BY position", [DEMO_QUIZ_ID]);
  it("crea cinco preguntas, dos imágenes visibles por HTTP y repite sin cambios", async () => {
    await Promise.all([seedDemo(db, images), seedDemo(db, images)]);
    const initial = await questions();
    expect(initial).toHaveLength(5);
    expect(new Set(initial.map((q: {correct_answer: boolean}) => q.correct_answer)).size).toBe(2);
    const illustrated = initial.filter((q: {image_filename: string | null}) => q.image_filename);
    expect(illustrated).toHaveLength(2);
    for (const question of illustrated) {
      const result = await request(app.getHttpServer()).get(`/api/v1/images/${question.image_filename}`)
        .expect(200).expect("Content-Type", /image\/png/)
        .expect("Cache-Control", "public, max-age=31536000, immutable")
        .expect("Cross-Origin-Resource-Policy", "cross-origin");
      expect(result.body.readUInt32BE(16)).toBe(640);
      expect(result.body.readUInt32BE(20)).toBe(360);
      expect(result.body.length).toBeLessThan(100000);
      expect(result.body).toEqual(await images.get(question.image_filename));
    }
    expect(await seedDemo(db, images)).toEqual({ created: [], warnings: [] });
    expect(await questions()).toEqual(initial);
    expect(Number((await db.query("SELECT count(*) FROM quizzes"))[0].count)).toBe(1);
  });
  it("conserva ediciones y no recrea preguntas borradas; avisa", async () => {
    await seedDemo(db, images);
    await db.query("UPDATE questions SET statement='Mi edición',correct_answer=false WHERE id=$1", [DEMO_QUESTION_ID]);
    await db.query("DELETE FROM questions WHERE id=$1", [DEMO_QUESTIONS[4].id]);
    await db.query("UPDATE quizzes SET title='Mi cuestionario' WHERE id=$1", [DEMO_QUIZ_ID]);
    const initial = await questions();
    const report = await seedDemo(db, images);
    expect(await questions()).toEqual(initial);
    expect(report.created).toEqual([]);
    expect(report.warnings).toEqual([expect.stringContaining(DEMO_QUESTIONS[4].id)]);
    expect((await db.query("SELECT title FROM quizzes WHERE id=$1", [DEMO_QUIZ_ID]))[0].title).toBe("Mi cuestionario");
  });
  async function legacyQuiz(includeQuestion = true) {
    await db.query("INSERT INTO quizzes(id,owner_id,title) VALUES($1,$2,'Demo anterior editada')", [DEMO_QUIZ_ID, DEMO_PROFILE_ID]);
    if (includeQuestion) await db.query("INSERT INTO questions(id,quiz_id,statement,correct_answer,position) VALUES($1,$2,'Pregunta anterior editada',false,1)", [DEMO_QUESTION_ID, DEMO_QUIZ_ID]);
  }
  it("actualiza la demo anterior de una pregunta sin sobrescribir ediciones", async () => {
    await legacyQuiz();
    const report = await seedDemo(db, images);
    expect(report.created).toHaveLength(4);
    expect(report.warnings).toContainEqual(expect.stringContaining("Demo anterior"));
    const updated = await questions();
    expect(updated).toHaveLength(5);
    expect(updated[0]).toMatchObject({ statement: "Pregunta anterior editada", correct_answer: false });
    expect(updated.filter((q: {image_filename: string | null}) => q.image_filename)).toHaveLength(2);
    expect((await seedDemo(db, images)).created).toEqual([]);
    expect(await questions()).toEqual(updated);
  });
  it("no resucita la pregunta anterior ni el cuestionario eliminados", async () => {
    await legacyQuiz(false);
    const report = await seedDemo(db, images);
    expect(report.created).toHaveLength(4);
    expect(report.warnings).toContainEqual(expect.stringContaining(DEMO_QUESTION_ID));
    expect(await questions()).toHaveLength(4);
    await db.query("DELETE FROM quizzes WHERE id=$1", [DEMO_QUIZ_ID]);
    expect((await seedDemo(db, images)).warnings).toContainEqual(expect.stringContaining("cuestionario demo fue eliminado"));
    expect(await questions()).toHaveLength(0);
  });
});
