import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import { readFileSync } from "node:fs";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createApp } from "../src/app";
import { database } from "../src/data/database";
import { loadConfig } from "../src/config/config";
const contract = parse(
  readFileSync(
    join(__dirname, "../../../packages/contracts/openapi/kahoot-api.yaml"),
    "utf8",
  ),
);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
ajv.addSchema({ $id: "contract", ...contract });
function valid(name: string, value: unknown) {
  const check = ajv.compile({ $ref: `contract#/components/schemas/${name}` });
  expect({ valid: check(value), errors: check.errors }).toEqual({
    valid: true,
    errors: null,
  });
}
const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;
describeDb("REST con PostgreSQL y JWKS reales", () => {
  let app: INestApplication,
    db: DataSource,
    jwks: Server,
    root: string,
    owner: string,
    other: string,
    third: string,
    sign: (id: string, aud?: string, expired?: boolean) => Promise<string>;
  const ownerId = randomUUID(),
    otherId = randomUUID(),
    thirdId = randomUUID();
  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    const key = await exportJWK(pair.publicKey);
    key.kid = "test";
    key.alg = "RS256";
    key.use = "sig";
    jwks = createServer((req, res) => {
      if (req.url !== "/.well-known/jwks.json") {
        res.writeHead(404).end();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ keys: [key] }));
    });
    await new Promise<void>((resolve) => jwks.listen(0, "127.0.0.1", resolve));
    sign = (id, aud = "kahoot-api", expired = false) =>
      new SignJWT({ name: "Participante" })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setSubject(id)
        .setIssuer("auth-api")
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime(expired ? "0s" : "1h")
        .sign(pair.privateKey);
    [owner, other, third] = await Promise.all([
      sign(ownerId),
      sign(otherId),
      sign(thirdId),
    ]);
    root = await mkdtemp(join(tmpdir(), "kahoot-test-"));
    const config = loadConfig({
      KAHOOT_DATABASE_URL: process.env.TEST_DATABASE_URL,
      AUTH_BASE_URL: `http://127.0.0.1:${(jwks.address() as AddressInfo).port}`,
      PUBLIC_API_URL: "http://localhost:3002",
      IMAGE_STORAGE_PATH: root,
    });
    db = database(config);
    await db.initialize();
    await db.runMigrations();
    ({ app } = await createApp(config, db));
  });
  afterAll(async () => {
    await app?.close();
    await db?.destroy();
    await new Promise<void>((r) => jwks?.close(() => r()));
    if (root) await rm(root, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await db.query(
      "TRUNCATE session_results,participants,session_questions,sessions,questions,quizzes CASCADE",
    );
  });
  const api = () => request(app.getHttpServer());
  const auth = (token = owner) => ({ Authorization: `Bearer ${token}` });
  async function quiz() {
    const body = (
      await api()
        .post("/api/v1/quizzes")
        .set(auth())
        .send({ title: "Redes" })
        .expect(201)
    ).body;
    valid("Quiz", body);
    return body;
  }
  async function question(id: string, statement = "TCP") {
    const body = (
      await api()
        .post(`/api/v1/quizzes/${id}/questions`)
        .set(auth())
        .send({ statement, correctAnswer: true })
        .expect(201)
    ).body;
    valid("Question", body);
    return body;
  }
  async function room(id: string) {
    const body = (
      await api()
        .post("/api/v1/sessions")
        .set(auth())
        .send({ quizId: id })
        .expect(201)
    ).body;
    valid("Session", body);
    return body;
  }
  it("health, documentación y validación JWT por clave pública", async () => {
    await api().get("/api/v1/health").expect(200);
    await api().get("/docs").expect(200);
    await api().get("/api/v1/quizzes").expect(401);
    await api()
      .get("/api/v1/quizzes")
      .set(auth(await sign(ownerId, "other")))
      .expect(401);
    await api()
      .get("/api/v1/quizzes")
      .set(auth(await sign(ownerId, "kahoot-api", true)))
      .expect(401);
    await api().get("/api/v1/quizzes").set(auth()).expect(200);
    await api()
      .get("/api/v1/quizzes")
      .set(auth(owner.slice(0, -4) + "abcd"))
      .expect(401);
  });
  it("CRUD, ordenamiento y confidencialidad de preguntas", async () => {
    const q = await quiz();
    const a = await question(q.id);
    const b = await question(q.id, "UDP");
    await api()
      .put(`/api/v1/quizzes/${q.id}/questions/${b.id}`)
      .set(auth())
      .send({ statement: "UDP editada", correctAnswer: false, position: 1 })
      .expect(200);
    const list = await api()
      .get(`/api/v1/quizzes/${q.id}/questions`)
      .set(auth())
      .expect(200);
    expect(list.body.map((x: any) => x.id)).toEqual([b.id, a.id]);
    for (const method of ["get", "put", "delete"] as const) {
      const call = api()
        [method](`/api/v1/quizzes/${q.id}/questions/${a.id}`)
        .set(auth(other));
      if (method === "put")
        call.send({ statement: "hack", correctAnswer: false });
      await call.expect(403);
    }
    await api().get("/api/v1/quizzes").set(auth(other)).expect(200, []);
    await api()
      .delete(`/api/v1/quizzes/${q.id}/questions/${b.id}`)
      .set(auth())
      .expect(204);
    expect(
      (await api().get(`/api/v1/quizzes/${q.id}/questions`).set(auth())).body[0]
        .position,
    ).toBe(1);
    await api()
      .put(`/api/v1/quizzes/${q.id}`)
      .set(auth())
      .send({ title: "Editado" })
      .expect(200);
    await api().delete(`/api/v1/quizzes/${q.id}`).set(auth()).expect(204);
    await api().get(`/api/v1/quizzes/${q.id}`).set(auth()).expect(404);
  });
  it("valida datos sin conversiones de booleanos ni campos ajenos", async () => {
    await api()
      .post("/api/v1/quizzes")
      .set(auth())
      .send({ title: " ", ownerId: otherId })
      .expect(400);
    const q = await quiz();
    await api()
      .post(`/api/v1/quizzes/${q.id}/questions`)
      .set(auth())
      .send({ statement: "TCP", correctAnswer: "false" })
      .expect(400);
    await api()
      .post("/api/v1/sessions")
      .set(auth())
      .send({ quizId: q.id })
      .expect(409);
    await api().get("/api/v1/quizzes/invalid").set(auth()).expect(400);
  });
  it("snapshot, join concurrente idempotente, permisos y aislamiento", async () => {
    const q = await quiz();
    const question1 = await question(q.id);
    const a = await room(q.id),
      b = await room(q.id);
    expect(a.code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    await api()
      .put(`/api/v1/quizzes/${q.id}/questions/${question1.id}`)
      .set(auth())
      .send({ statement: "Cambiada", correctAnswer: false })
      .expect(200);
    expect(
      (
        await db.query("SELECT * FROM session_questions WHERE session_id=$1", [
          a.id,
        ])
      )[0],
    ).toMatchObject({ statement: "TCP", correct_answer: true, position: 0 });
    const joins = await Promise.all(
      Array.from({ length: 6 }, () =>
        api()
          .post(`/api/v1/sessions/${a.code.toLowerCase()}/join`)
          .set(auth(other))
          .send({})
          .expect(200),
      ),
    );
    joins.forEach((j) => valid("Participant", j.body));
    expect(new Set(joins.map((j) => j.body.id)).size).toBe(1);
    await api()
      .post(`/api/v1/sessions/${b.code}/join`)
      .set(auth(third))
      .send({})
      .expect(200);
    await api()
      .get(`/api/v1/sessions/${a.code}/participants`)
      .set(auth(third))
      .expect(403);
    const lobby = await api()
      .get(`/api/v1/sessions/${a.code}/participants`)
      .set(auth())
      .expect(200);
    expect(lobby.body).toHaveLength(1);
    expect(lobby.body[0].userId).toBe(otherId);
    await api()
      .get(`/api/v1/sessions/${a.code}/results`)
      .set(auth(other))
      .expect(409);
    await api()
      .get(`/api/v1/sessions/${a.code}/results`)
      .set(auth(third))
      .expect(403);
    await api()
      .post("/api/v1/sessions/ZZZZZZ/join")
      .set(auth())
      .send({})
      .expect(404);
    await db.query(
      "UPDATE sessions SET status='finished',finished_at=now() WHERE id=$1",
      [a.id],
    );
    await api()
      .post(`/api/v1/sessions/${a.code}/join`)
      .set(auth(other))
      .send({})
      .expect(200);
    await api()
      .post(`/api/v1/sessions/${a.code}/join`)
      .set(auth(third))
      .send({})
      .expect(409);
    await api().delete(`/api/v1/quizzes/${q.id}`).set(auth()).expect(204);
    await api().get(`/api/v1/sessions/${a.code}`).set(auth()).expect(200);
    const final = await api()
      .get(`/api/v1/sessions/${a.code}/results`)
      .set(auth(other))
      .expect(200);
    valid("SessionResults", final.body);
  });
  it("imagen pública persistente y snapshot conserva archivo original", async () => {
    const q = await quiz(),
      p = await question(q.id);
    const path = `/api/v1/quizzes/${q.id}/questions/${p.id}/image`;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
      "base64",
    );
    await api()
      .put(path)
      .set(auth())
      .attach("file", Buffer.from("fake"), "fake.png")
      .expect(415);
    await api()
      .put(path)
      .set(auth())
      .attach("file", Buffer.alloc(2097153), "large.png")
      .expect(413);
    const uploaded = await api()
      .put(path)
      .set(auth())
      .attach("file", png, "pixel.png")
      .expect(200);
    valid("Question", uploaded.body);
    const url = new URL(uploaded.body.imageUrl).pathname;
    await api().get(url).expect(200);
    await room(q.id);
    await api().delete(path).set(auth()).expect(200);
    await api().get(url).expect(200);
    const second = await api()
      .put(path)
      .set(auth())
      .attach("file", png, "pixel.png")
      .expect(200);
    await api().delete(path).set(auth()).expect(200);
    await api().get(new URL(second.body.imageUrl).pathname).expect(404);
  });
  it("resultados persistidos separados y disponibles con otra conexi�n", async () => {
    const q = await quiz();
    await question(q.id);
    const a = await room(q.id),
      b = await room(q.id);
    const pa = (
      await api()
        .post(`/api/v1/sessions/${a.code}/join`)
        .set(auth(other))
        .send({})
        .expect(200)
    ).body;
    const pb = (
      await api()
        .post(`/api/v1/sessions/${b.code}/join`)
        .set(auth(third))
        .send({})
        .expect(200)
    ).body;
    await db.query(
      "UPDATE sessions SET status='finished',finished_at=now() WHERE id IN ($1,$2)",
      [a.id, b.id],
    );
    await db.query(
      "INSERT INTO session_results(session_id,participant_id,position,score,correct_answers) VALUES($1,$2,1,1,1),($3,$4,1,0,0)",
      [a.id, pa.id, b.id, pb.id],
    );
    const first = await api()
      .get(`/api/v1/sessions/${a.code}/results`)
      .set(auth(other))
      .expect(200);
    valid("SessionResults", first.body);
    expect(first.body.ranking.map((r: any) => r.participantId)).toEqual([
      pa.id,
    ]);
    const second = await api()
      .get(`/api/v1/sessions/${b.code}/results`)
      .set(auth(third))
      .expect(200);
    expect(second.body.ranking.map((r: any) => r.participantId)).toEqual([
      pb.id,
    ]);
    const independent = new DataSource({ ...db.options });
    await independent.initialize();
    try {
      expect(
        (
          await independent.query(
            "SELECT score FROM session_results WHERE session_id=$1",
            [a.id],
          )
        )[0].score,
      ).toBe(1);
    } finally {
      await independent.destroy();
    }
  });
});
