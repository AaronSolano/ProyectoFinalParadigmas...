import * as liveLogs from "../src/live-log";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { io, Socket } from "socket.io-client";
import request from "supertest";
import { DataSource } from "typeorm";
import { createApp } from "../src/app";
import { database } from "../src/data/database";
import { loadConfig, Config } from "../src/config/config";
import { GameSchemas } from "../src/presentation/game-schemas";
import * as telemetry from "../src/telemetry";

export function event(
  socket: Socket,
  name: string,
  timeout = 10000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, receive);
      reject(new Error(`No llegó ${name}`));
    }, timeout);
    function receive(payload: unknown) {
      clearTimeout(timer);
      resolve(payload);
    }
    socket.once(name, receive);
  });
}
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("partida Socket.IO con PostgreSQL real y contratos canónicos", () => {
  let built: Awaited<ReturnType<typeof createApp>>,
    db: DataSource,
    jwks: Server,
    root: string,
    config: Config,
    url: string;
  let sign: (id: string, aud?: string, expiry?: string) => Promise<string>;
  let now: number;
  const host = randomUUID(),
    ana = randomUUID(),
    beto = randomUUID(),
    carla = randomUUID();
  let hostToken: string;
  const sockets: Socket[] = [],
    violations: unknown[] = [];
  const schemas = new GameSchemas();
  const messages = new Map<Socket, { name: string; payload: any }[]>();
  async function start() {
    db = database(config);
    await db.initialize();
    await db.runMigrations();
    built = await createApp(config, db, undefined, { now: () => now });
    await built.app.listen(0, "127.0.0.1");
    url = await built.app.getUrl();
  }
  async function connect(
    id = host,
    opts: { token?: string; origin?: string; auth?: unknown } = {},
  ) {
    const socket = io(`${url}/game`, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: opts.auth ?? { token: opts.token ?? (await sign(id)) },
      extraHeaders: opts.origin ? { Origin: opts.origin } : undefined,
    });
    sockets.push(socket);
    messages.set(socket, []);
    socket.onAny((name, payload) => {
      messages.get(socket)!.push({ name, payload });
      if (!schemas.valid(name, payload)) violations.push({ name, payload });
    });
    return socket;
  }
  async function ready(id = host) {
    const s = await connect(id);
    const connected = event(s, "connect");
    s.connect();
    await connected;
    return s;
  }
  async function command(
    s: Socket,
    input: string,
    payload: unknown,
    output: string,
  ) {
    const result = event(s, output);
    s.emit(input, payload);
    return result;
  }
  async function enter(s: Socket, code: string) {
    return command(s, "session:join", { code }, "state_sync");
  }
  const api = () => request(built.app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${hostToken}` });
  async function room(count = 2) {
    const quiz = (
      await api()
        .post("/api/v1/quizzes")
        .set(auth())
        .send({ title: "Prueba en vivo" })
        .expect(201)
    ).body;
    for (let i = 0; i < count; i++)
      await api()
        .post(`/api/v1/quizzes/${quiz.id}/questions`)
        .set(auth())
        .send({ statement: `Pregunta ${i}`, correctAnswer: i === 0 })
        .expect(201);
    const session = (
      await api()
        .post("/api/v1/sessions")
        .set(auth())
        .send({ quizId: quiz.id, questionTimeSeconds: 5 })
        .expect(201)
    ).body;
    return { quiz, session, code: session.code as string };
  }
  beforeAll(async () => {
    const pair = await generateKeyPair("RS256"),
      key = {
        ...(await exportJWK(pair.publicKey)),
        kid: "live-test",
        alg: "RS256",
        use: "sig",
      };
    jwks = createServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [key] }));
    });
    await new Promise<void>((resolve) => jwks.listen(0, "127.0.0.1", resolve));
    sign = (id, aud = "kahoot-api", expiry = "1h") =>
      new SignJWT({ name: id === host ? "Docente" : "Estudiante" })
        .setProtectedHeader({ alg: "RS256", kid: "live-test" })
        .setSubject(id)
        .setAudience(aud)
        .setIssuer("auth-api")
        .setIssuedAt()
        .setExpirationTime(expiry)
        .sign(pair.privateKey);
    hostToken = await sign(host);
    root = await mkdtemp(join(tmpdir(), "kahoot-live-"));
    config = loadConfig({
      KAHOOT_DATABASE_URL: process.env.TEST_DATABASE_URL,
      AUTH_BASE_URL: `http://127.0.0.1:${(jwks.address() as AddressInfo).port}`,
      PUBLIC_API_URL: "http://localhost:3002",
      IMAGE_STORAGE_PATH: root,
    });
    now = Date.now();
    await start();
  });
  beforeEach(async () => {
    await db.query("TRUNCATE quizzes CASCADE");
    violations.length = 0;
    now = Date.now();
    await built.game.recover();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    for (const s of sockets.splice(0)) s.disconnect();
    await built.game.onModuleDestroy();
    expect(violations).toEqual([]);
  });
  afterAll(async () => {
    await built?.app.close();
    await db?.destroy();
    await new Promise<void>((resolve) => jwks?.close(() => resolve()));
    if (root) await rm(root, { recursive: true, force: true });
  });
  test("rechaza handshake ausente, expirado, audiencia incorrecta, firma alterada y origen no permitido", async () => {
    const token = await sign(ana);
    for (const opts of [
      { auth: {} },
      { token: await sign(ana, "otra") },
      { token: await sign(ana, "kahoot-api", "0s") },
      { token: token.slice(0, -6) + "AAAAAA" },
      { token, origin: "http://no-permitido.test" },
    ]) {
      const s = await connect(ana, opts),
        rejected = event(s, "connect_error");
      s.connect();
      expect((await rejected).message).toBe("unauthorized");
      expect(s.connected).toBe(false);
    }
  });
  test("inundar answer:submit desconecta solo al emisor y otro participante sigue jugando", async () => {
    const logs = jest.spyOn(liveLogs, "liveEventLog");
    const limited = jest.spyOn(telemetry, "recordLiveRateLimited");
    const answers = jest.spyOn(telemetry, "recordAnswer");
    const { code } = await room(1),
      h = await ready(),
      flood = await ready(ana),
      normal = await ready(beto);
    await enter(h, code);
    await enter(flood, code);
    const me = await enter(normal, code);
    await command(h, "session:start", { code }, "question:opened");
    const disconnected = event(flood, "disconnect");
    for (let i = 0; i < 200; i++)
      flood.emit("answer:submit", { code, questionIndex: 999, answer: true });
    expect(await disconnected).toBe("io server disconnect");
    expect(flood.connected).toBe(false);
    expect(limited).toHaveBeenCalledTimes(1);
    expect(normal.connected).toBe(true);
    expect(
      await command(
        normal,
        "answer:submit",
        { code, questionIndex: 0, answer: true },
        "answer:accepted",
      ),
    ).toEqual({ questionIndex: 0 });
    const closed = await command(
      h,
      "question:close",
      { code },
      "question:closed",
    );
    expect(
      closed.results.find((r: any) => r.participantId === me.participantId),
    ).toMatchObject({ pointsAwarded: 1, totalScore: 1 });
    expect((await enter(normal, code)).myScore).toBe(1);
    expect(answers).toHaveBeenCalledWith("accepted", "none");
    expect(logs).toHaveBeenCalledWith("answer:submit", "rate_limited");
    expect(logs).toHaveBeenCalledWith("answer:submit", "ok");
    expect(logs.mock.calls.every((args) => args.length === 2)).toBe(true);
    logs.mockRestore();
  });
  test("permisos, validación estricta y control solo después de unirse", async () => {
    const { code } = await room(),
      h = await ready(),
      p = await ready(ana);
    expect(await command(h, "session:start", { code }, "error")).toMatchObject({
      code: "FORBIDDEN",
    });
    await enter(h, code);
    await enter(p, code);
    for (const name of ["session:start", "question:next", "question:close"])
      expect(await command(p, name, { code }, "error")).toMatchObject({
        code: "FORBIDDEN",
      });
    for (const payload of [
      { code, other: true },
      { code: code.toLowerCase() },
      null,
      { code, questionIndex: 0, answer: "true" },
    ]) {
      expect(
        await command(
          p,
          typeof payload?.answer === "string"
            ? "answer:submit"
            : "session:join",
          payload,
          "error",
        ),
      ).toMatchObject({ code: "INVALID_PAYLOAD" });
    }
    expect(
      await command(p, "session:join", { code: "ZZZZZZ" }, "error"),
    ).toMatchObject({ code: "ROOM_NOT_FOUND" });
    const opened = await command(
      h,
      "session:start",
      { code },
      "question:opened",
    );
    expect(opened).not.toHaveProperty("correctAnswer");
    expect(await command(h, "question:next", { code }, "error")).toMatchObject({
      code: "INVALID_STATE",
    });
    expect(await command(h, "session:start", { code }, "error")).toMatchObject({
      code: "INVALID_STATE",
    });
  });
  test("partida completa: dos salas, imagen, respuestas concurrentes únicas, cierre, empates y resultados tras reiniciar", async () => {
    const a = await room(),
      b = await room(1);
    const first = (
      await api().get(`/api/v1/quizzes/${a.quiz.id}/questions`).set(auth())
    ).body[0];
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
      "base64",
    );
    await api()
      .put(`/api/v1/quizzes/${a.quiz.id}/questions/${first.id}/image`)
      .set(auth())
      .attach("file", png, "pixel.png")
      .expect(200);
    // Create the room after upload so the immutable snapshot contains its image.
    const code = (
      await api()
        .post("/api/v1/sessions")
        .set(auth())
        .send({ quizId: a.quiz.id, questionTimeSeconds: 5 })
    ).body.code;
    const h = await ready(),
      p = await ready(ana),
      p2 = await ready(ana),
      q = await ready(beto),
      r = await ready(carla),
      otherHost = await ready();
    await enter(h, code);
    const me = await enter(p, code);
    await enter(p2, code);
    await enter(q, code);
    await enter(otherHost, b.code);
    await enter(r, b.code);
    const otherOpened = await command(
      otherHost,
      "session:start",
      { code: b.code },
      "question:opened",
    );
    const pOpened = event(p, "question:opened");
    const opened = await command(
      h,
      "session:start",
      { code },
      "question:opened",
    );
    expect(await pOpened).toEqual(opened);
    expect(opened.imageUrl).toContain("/api/v1/images/");
    expect(
      (await api().get(`/api/v1/sessions/${code}`).set(auth())).body.status,
    ).toBe("in_progress");
    const accepted = event(p, "answer:accepted"),
      rejected = event(p2, "answer:rejected");
    p.emit("answer:submit", { code, questionIndex: 0, answer: true });
    await accepted;
    p2.emit("answer:submit", { code, questionIndex: 0, answer: false });
    expect((await rejected).reason).toBe("already_answered");
    expect(
      await command(
        q,
        "answer:submit",
        { code, questionIndex: 0, answer: false },
        "answer:accepted",
      ),
    ).toEqual({ questionIndex: 0 });
    expect(
      await command(
        r,
        "answer:submit",
        { code, questionIndex: 0, answer: true },
        "answer:rejected",
      ),
    ).toMatchObject({ reason: "not_in_session" });
    const outsider = await ready(randomUUID());
    expect(
      await command(outsider, "session:join", { code }, "error"),
    ).toMatchObject({ code: "INVALID_STATE" });
    // Concurrent duplicate attempts from both tabs cannot add another row or points.
    const rejectedBoth = [
      event(p, "answer:rejected"),
      event(p2, "answer:rejected"),
    ];
    p.emit("answer:submit", { code, questionIndex: 0, answer: true });
    p2.emit("answer:submit", { code, questionIndex: 0, answer: true });
    expect((await Promise.all(rejectedBoth)).map((x) => x.reason)).toEqual([
      "already_answered",
      "already_answered",
    ]);
    const before = await enter(p, code);
    expect(before.myScore).toBe(0);
    expect(before.hasAnswered).toBe(true);
    expect(JSON.stringify(before)).not.toContain("correctAnswer");
    const closed = await command(
      h,
      "question:close",
      { code },
      "question:closed",
    );
    expect(closed.correctAnswer).toBe(true);
    expect(
      closed.results.find((x: any) => x.participantId === me.participantId),
    ).toMatchObject({ pointsAwarded: 1, totalScore: 1 });
    expect(
      await command(
        p,
        "answer:submit",
        { code, questionIndex: 0, answer: true },
        "answer:rejected",
      ),
    ).toMatchObject({ reason: "closed" });
    expect((await enter(p, code)).lastClosed).toEqual(closed);
    p.disconnect();
    const reconnected = await ready(ana),
      synced = await enter(reconnected, code);
    expect(synced.participantId).toBe(me.participantId);
    expect(synced.myScore).toBe(1);
    expect(synced.participants).toHaveLength(2);
    await command(h, "question:next", { code }, "question:opened");
    // Ana omits the second answer; Beto gets it right, tying the final score.
    await command(
      q,
      "answer:submit",
      { code, questionIndex: 1, answer: false },
      "answer:accepted",
    );
    const second = await command(
      h,
      "question:close",
      { code },
      "question:closed",
    );
    expect(
      second.results.find((x: any) => x.participantId === me.participantId),
    ).toMatchObject({ answered: false, pointsAwarded: 0, totalScore: 1 });
    const finished = await command(
      h,
      "question:next",
      { code },
      "session:finished",
    );
    expect(finished.ranking.map((x: any) => x.position)).toEqual([1, 1]);
    const finalSync = await enter(reconnected, code);
    expect(finalSync.status).toBe("finished");
    expect(finalSync.currentQuestion).toBeNull();
    expect(finalSync.ranking).toEqual(finished.ranking);
    expect(
      messages
        .get(r)!
        .filter((x) => x.name === "question:opened")
        .map((x) => x.payload),
    ).toEqual([otherOpened]);
    expect(
      messages
        .get(r)!
        .some(
          (x) => x.name === "question:closed" || x.name === "session:finished",
        ),
    ).toBe(false);
    const results = (
      await api()
        .get(`/api/v1/sessions/${code}/results`)
        .set(auth())
        .expect(200)
    ).body;
    expect(results.ranking.map((x: any) => x.score)).toEqual([1, 1]);
    expect(
      (
        await db.query(
          "SELECT count(*) FROM answers WHERE session_id=(SELECT id FROM sessions WHERE code=$1)",
          [code],
        )
      )[0].count,
    ).toBe("3");
    for (const s of sockets) s.disconnect();
    await built.app.close();
    await db.destroy();
    await start();
    expect(
      (
        await api()
          .get(`/api/v1/sessions/${code}/results`)
          .set(auth())
          .expect(200)
      ).body,
    ).toEqual(results);
  });
  test("ingreso REST avisa al lobby una sola vez y conserva el nombre configurado al abrir Socket.IO", async () => {
    const { code } = await room(1),
      h = await ready();
    await enter(h, code);
    const token = await sign(ana),
      joined = event(h, "participant:joined");
    const participant = (
      await api()
        .post(`/api/v1/sessions/${code}/join`)
        .set({ Authorization: `Bearer ${token}` })
        .send({ displayName: "Ana REST" })
        .expect(200)
    ).body;
    expect(await joined).toEqual({
      participant: { id: participant.id, displayName: "Ana REST" },
    });
    const p = await ready(ana),
      sync = await enter(p, code);
    expect(sync.participants).toEqual([
      { id: participant.id, displayName: "Ana REST" },
    ]);
    await api()
      .post(`/api/v1/sessions/${code}/join`)
      .set({ Authorization: `Bearer ${token}` })
      .send({})
      .expect(200);
    await enter(h, code);
    expect(
      messages.get(h)!.filter((x) => x.name === "participant:joined"),
    ).toHaveLength(1);
    const left = event(h, "participant:left");
    p.emit("session:leave", { code });
    await left;
    expect(
      (await api().get(`/api/v1/sessions/${code}/participants`).set(auth()))
        .body,
    ).toEqual([]);
    expect(
      (await api().get(`/api/v1/sessions/${code}`).set(auth())).body
        .participantCount,
    ).toBe(0);
  });
  test("respuesta tardía no se inserta aunque el temporizador esté pendiente; reinicio recupera y cierra una vez", async () => {
    const { code } = await room(1),
      h = await ready(),
      p = await ready(ana);
    await enter(h, code);
    const me = await enter(p, code);
    await command(h, "session:start", { code }, "question:opened");
    now += 5001;
    expect(
      await command(
        p,
        "answer:submit",
        { code, questionIndex: 0, answer: true },
        "answer:rejected",
      ),
    ).toMatchObject({ reason: "late" });
    for (const s of sockets) s.disconnect();
    await built.app.close();
    await db.destroy();
    await start();
    const again = await ready(ana),
      sync = await enter(again, code);
    expect(sync.status).toBe("question_closed");
    expect(sync.participantId).toBe(me.participantId);
    expect(sync.myScore).toBe(0);
    expect(sync.lastClosed.results[0]).toMatchObject({
      answered: false,
      pointsAwarded: 0,
    });
    await built.game.recover();
    expect((await enter(again, code)).myScore).toBe(0);
  });
  test("dos primeras respuestas simultáneas insertan exactamente una y cierre concurrente puntúa como máximo una vez", async () => {
    const { code } = await room(1),
      h = await ready(),
      p = await ready(ana),
      tab = await ready(ana);
    await enter(h, code);
    await enter(p, code);
    await enter(tab, code);
    await command(h, "session:start", { code }, "question:opened");
    function outcome(socket: Socket) {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          clean();
          reject(new Error("Sin resultado de respuesta"));
        }, 5000);
        const accepted = () => {
            clean();
            resolve("accepted");
          },
          rejected = () => {
            clean();
            resolve("rejected");
          };
        function clean() {
          clearTimeout(timer);
          socket.off("answer:accepted", accepted);
          socket.off("answer:rejected", rejected);
        }
        socket.once("answer:accepted", accepted);
        socket.once("answer:rejected", rejected);
      });
    }
    const replies = [outcome(p), outcome(tab)];
    p.emit("answer:submit", { code, questionIndex: 0, answer: true });
    tab.emit("answer:submit", { code, questionIndex: 0, answer: true });
    expect((await Promise.all(replies)).sort()).toEqual([
      "accepted",
      "rejected",
    ]);
    const closed = event(h, "question:closed"),
      duplicateClose = event(h, "error");
    h.emit("question:close", { code });
    h.emit("question:close", { code });
    expect((await closed).results[0].totalScore).toBe(1);
    expect(await duplicateClose).toMatchObject({ code: "INVALID_STATE" });
    expect((await db.query("SELECT count(*) FROM answers"))[0].count).toBe("1");
    expect((await db.query("SELECT score FROM participants"))[0].score).toBe(1);
  });
  test("reinicio durante pregunta abierta conserva respuesta y restaura cierre automático", async () => {
    const { code } = await room(1),
      h = await ready(),
      p = await ready(ana);
    await enter(h, code);
    await enter(p, code);
    const opened = await command(
      h,
      "session:start",
      { code },
      "question:opened",
    );
    await command(
      p,
      "answer:submit",
      { code, questionIndex: 0, answer: true },
      "answer:accepted",
    );
    for (const s of sockets) s.disconnect();
    await built.app.close();
    await db.destroy();
    await start();
    const reconnected = await ready(ana),
      sync = await enter(reconnected, code);
    expect(sync.status).toBe("question_open");
    expect(sync.hasAnswered).toBe(true);
    expect(sync.closesAt).toBe(opened.closesAt);
    expect(JSON.stringify(sync)).not.toContain("correctAnswer");
    const closed = event(reconnected, "question:closed");
    now += 5000;
    expect((await closed).results[0]).toMatchObject({
      pointsAwarded: 1,
      totalScore: 1,
    });
  });
  test("salida explícita conserva identidad, resultados y otras pestañas; desconexión no emite salida", async () => {
    const { code } = await room(1),
      h = await ready(),
      p = await ready(ana),
      tab = await ready(ana);
    await enter(h, code);
    const me = await enter(p, code);
    await enter(tab, code);
    p.emit("session:leave", { code });
    await enter(tab, code);
    expect(messages.get(h)!.some((x) => x.name === "participant:left")).toBe(
      false,
    );
    const left = event(h, "participant:left");
    tab.emit("session:leave", { code });
    expect(await left).toEqual({ participantId: me.participantId });
    expect(
      await command(
        tab,
        "answer:submit",
        { code, questionIndex: 0, answer: true },
        "answer:rejected",
      ),
    ).toMatchObject({ reason: "not_in_session" });
    expect((await enter(tab, code)).participantId).toBe(me.participantId);
    expect((await db.query("SELECT count(*) FROM participants"))[0].count).toBe(
      "1",
    );
    messages.get(h)!.length = 0;
    tab.disconnect();
    await enter(h, code);
    expect(messages.get(h)!.some((x) => x.name === "participant:left")).toBe(
      false,
    );
  });
});
