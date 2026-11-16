import { io } from "socket.io-client";
import { randomBytes, randomUUID } from "node:crypto";
import { cpus, totalmem, platform, release } from "node:os";
import { readFileSync, readdirSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const authUrl = (process.env.AUTH_BASE_URL ?? "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const apiUrl = (process.env.KAHOOT_BASE_URL ?? "http://127.0.0.1:3002").replace(
  /\/$/,
  "",
);
const steps = (process.env.LOAD_STEPS ?? "5,10,25").split(",").map(Number);
const timeout = Number(process.env.LOAD_TIMEOUT_MS ?? 15000),
  maxP95 = Number(process.env.LOAD_MAX_P95_MS ?? 1000),
  maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE ?? 0.01);
if (
  !steps.length ||
  steps.some(
    (n, i) =>
      !Number.isInteger(n) || n < 1 || n > 5000 || (i > 0 && n <= steps[i - 1]),
  ) ||
  ![timeout, maxP95].every((n) => Number.isFinite(n) && n > 0) ||
  !Number.isFinite(maxErrorRate) ||
  maxErrorRate < 0 ||
  maxErrorRate > 1
)
  throw new Error(
    "Configuración LOAD_* inválida. Use pasos crecientes entre 1 y 5000.",
  );
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const schemaRoot = new URL(
  "../../../packages/contracts/events/schemas/",
  import.meta.url,
);
const validators = new Map();
const schemas = readdirSync(schemaRoot)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, schemaRoot), "utf8")));
schemas.forEach((s) => ajv.addSchema(s));
schemas.forEach((s) => validators.set(s.title, ajv.getSchema(s.$id)));
const sockets = new Set(),
  run = randomUUID(),
  password = `Load${randomBytes(16).toString("hex")}`;
const report = {
  run,
  date: new Date().toISOString(),
  environment: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    ramBytes: totalmem(),
    node: process.version,
  },
  thresholds: { maxP95Ms: maxP95, maxErrorRate, timeoutMs: timeout },
  steps: [],
  maxVerifiedParticipants: 0,
};
async function http(base, path, { token, body, method = "GET" } = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok)
    throw new Error(`HTTP ${method} ${path}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
async function register(index) {
  return http(authUrl, "/auth/register", {
    method: "POST",
    body: {
      email: `load-${run}-${index}@example.com`,
      displayName: `Carga ${index}`,
      password,
    },
  });
}
async function pool(items, fn, width = 8) {
  const result = new Array(items.length);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(width, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        result[i] = await fn(items[i], i);
      }
    }),
  );
  return result;
}
function wait(socket, name, trigger) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clean();
      reject(new Error(`Timeout ${name}`));
    }, timeout);
    function clean() {
      clearTimeout(timer);
      socket.off(name, receive);
      socket.off("error", fail);
      socket.off("connect_error", fail);
      socket.off("disconnect", disconnected);
    }
    function receive(payload) {
      clean();
      resolve(payload);
    }
    function fail() {
      clean();
      reject(new Error(`Evento rechazado: ${name}`));
    }
    function disconnected() {
      clean();
      reject(new Error(`Desconexión durante ${name}`));
    }
    socket.once(name, receive);
    socket.once("error", fail);
    socket.once("connect_error", fail);
    socket.once("disconnect", disconnected);
    trigger?.();
  });
}
async function connect(token, onInvalid) {
  const socket = io(`${apiUrl}/game`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });
  sockets.add(socket);
  socket.onAny((name, payload) => {
    if (!validators.get(name)?.(payload)) onInvalid();
  });
  await wait(socket, "connect", () => socket.connect());
  return socket;
}
function percentile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.ceil(sorted.length * q) - 1] : null;
}
async function runStep(count, host, people, quizId) {
  const active = [],
    answerMs = [],
    closeMs = [];
  let failures = 0,
    invalidPayloads = 0;
  const session = await http(apiUrl, "/sessions", {
    method: "POST",
    token: host.accessToken,
    body: { quizId, questionTimeSeconds: 120 },
  });
  const code = session.code,
    h = await connect(host.accessToken, () => invalidPayloads++);
  active.push(h);
  await wait(h, "state_sync", () => h.emit("session:join", { code }));
  try {
    const joined = await pool(people.slice(0, count), async (person) => {
      try {
        const p = await connect(person.accessToken, () => invalidPayloads++);
        active.push(p);
        await wait(p, "state_sync", () => p.emit("session:join", { code }));
        return p;
      } catch {
        failures++;
        return null;
      }
    });
    const participants = joined.filter(Boolean);
    const opened = participants.map((p) => wait(p, "question:opened"));
    const questions = (
      await Promise.all([
        ...opened,
        wait(h, "question:opened", () => h.emit("session:start", { code })),
      ])
    ).slice(0, participants.length);
    if (
      questions.some(
        (q) =>
          JSON.stringify(q) !== JSON.stringify(questions[0]) ||
          Object.hasOwn(q, "correctOption"),
      )
    )
      failures++;
    await Promise.all(
      participants.map(async (p) => {
        const began = performance.now();
        try {
          await wait(p, "answer:accepted", () =>
            p.emit("answer:submit", { code, questionIndex: 0, answer: true }),
          );
          answerMs.push(performance.now() - began);
        } catch {
          failures++;
        }
      }),
    );
    const closedAt = performance.now();
    const closed = participants.map((p) =>
      wait(p, "question:closed").then((result) => {
        closeMs.push(performance.now() - closedAt);
        return result;
      }),
    );
    const results = (
      await Promise.all([
        ...closed,
        wait(h, "question:closed", () => h.emit("question:close", { code })),
      ])
    ).slice(0, participants.length);
    if (
      results.some((result) =>
        result.results.some((r) => {
          const expected =
            r.elapsedMs < 500
              ? 1000
              : Math.round((1 - Math.min(r.elapsedMs, 120000) / 240000) * 1000);
          return (
            !r.correct ||
            r.elapsedMs === null ||
            r.streak !== 1 ||
            r.pointsAwarded !== expected ||
            r.totalScore !== expected
          );
        }),
      )
    )
      failures++;
    await wait(h, "session:finished", () => h.emit("question:next", { code }));
    const final = await http(apiUrl, `/sessions/${code}/results`, {
      token: host.accessToken,
    });
    if (
      final.ranking.length !== participants.length ||
      final.ranking.some(
        (r) =>
          r.score !==
          results[0]?.results.find((p) => p.participantId === r.participantId)
            ?.totalScore,
      )
    )
      failures++;
    const errorRate = (failures + invalidPayloads) / count,
      p95CloseMs = percentile(closeMs, 0.95);
    return {
      participants: count,
      connected: participants.length,
      failures,
      invalidPayloads,
      errorRate,
      p95AnswerMs: percentile(answerMs, 0.95),
      p95CloseMs,
      passed:
        participants.length === count &&
        errorRate <= maxErrorRate &&
        p95CloseMs !== null &&
        p95CloseMs <= maxP95,
    };
  } finally {
    for (const s of active) {
      s.disconnect();
      sockets.delete(s);
    }
  }
}
try {
  const host = await register("host");
  const quiz = await http(apiUrl, "/quizzes", {
    method: "POST",
    token: host.accessToken,
    body: { title: `Carga ${run}` },
  });
  const q = await http(apiUrl, `/quizzes/${quiz.id}/questions`, {
    method: "POST",
    token: host.accessToken,
    body: {
      statement: "Esta pregunta de carga es verdadera.",
      options: ["Verdadero", "Falso"], correctOption: 0,
    },
  });
  const image = new FormData();
  image.set(
    "file",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "load.png",
  );
  const upload = await fetch(
    `${apiUrl}/api/v1/quizzes/${quiz.id}/questions/${q.id}/image`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${host.accessToken}` },
      body: image,
      signal: AbortSignal.timeout(timeout),
    },
  );
  if (!upload.ok) throw new Error(`Carga de imagen: HTTP ${upload.status}`);
  let people = [];
  for (const count of steps) {
    console.error(`Verificando ${count} participantes...`);
    const added = await pool(
      Array.from(
        { length: count - people.length },
        (_, i) => people.length + i,
      ),
      register,
      4,
    );
    people = people.concat(added);
    const result = await runStep(count, host, people, quiz.id);
    report.steps.push(result);
    if (!result.passed) {
      process.exitCode = 1;
      break;
    }
    report.maxVerifiedParticipants = count;
  }
} catch (error) {
  report.error = error instanceof Error ? error.message : "Error de carga";
  process.exitCode = 1;
} finally {
  for (const s of sockets) s.disconnect();
  console.log(JSON.stringify(report, null, 2));
}
