import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { io as ioClient } from 'socket.io-client';

const AUTH_API_URL = (process.env.E2E_AUTH_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const KAHOOT_API_URL = (process.env.E2E_KAHOOT_API_URL || 'http://127.0.0.1:3002').replace(
  /\/+$/,
  '',
);
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'docente.demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo2026seg';
const COMPOSE_ARGS = process.env.E2E_COMPOSE_FILE
  ? ['compose', '-f', process.env.E2E_COMPOSE_FILE]
  : ['compose'];

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

function connectSocket(token) {
  return ioClient(`${KAHOOT_API_URL}/game`, {
    auth: { token },
    reconnection: false,
    transports: ['websocket'],
  });
}

function onceEvent(socket, eventName, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event ${eventName}`)),
      timeoutMs,
    );
    socket.once(eventName, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function waitForHealth(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Healthcheck timed out for ${url}`);
}

export async function runLiveE2ESuite() {
  const report = {
    startedAt: new Date().toISOString(),
    authApiUrl: AUTH_API_URL,
    kahootApiUrl: KAHOOT_API_URL,
    cases: {},
  };

  // Autenticar docente demo y registrar dos participantes reales
  const hostLogin = await apiJson(`${AUTH_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  assert.equal(hostLogin.status, 200, 'Docente demo debe iniciar sesión con 200');
  const hostToken = hostLogin.body.accessToken;

  const ts = Date.now();
  const regP1 = await apiJson(`${AUTH_API_URL}/api/v1/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'Participante Uno',
      email: `p1.${ts}@example.com`,
      password: 'Clave2026seg',
    }),
  });
  assert.equal(regP1.status, 201);
  const p1Token = regP1.body.accessToken;

  const regP2 = await apiJson(`${AUTH_API_URL}/api/v1/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'Participante Dos',
      email: `p2.${ts}@example.com`,
      password: 'Clave2026seg',
    }),
  });
  assert.equal(regP2.status, 201);
  const p2Token = regP2.body.accessToken;

  const quizzesRes = await apiJson(`${KAHOOT_API_URL}/api/v1/quizzes`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  assert.equal(quizzesRes.status, 200);
  const demoQuiz = quizzesRes.body[0];
  assert.ok(demoQuiz?.id, 'Debe existir el cuestionario demo');

  // --- CASO 2.1: Acceso y permisos ---
  const putForbidden = await apiJson(`${KAHOOT_API_URL}/api/v1/quizzes/${demoQuiz.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ title: 'Intento Ilegal' }),
  });
  assert.equal(putForbidden.status, 403, 'Participante no puede editar cuestionario ajeno');

  const delForbidden = await apiJson(`${KAHOOT_API_URL}/api/v1/quizzes/${demoQuiz.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  assert.equal(delForbidden.status, 403, 'Participante no puede eliminar cuestionario ajeno');

  const roomRes = await apiJson(`${KAHOOT_API_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ quizId: demoQuiz.id, questionTimeSeconds: 20 }),
  });
  assert.equal(roomRes.status, 201);
  const roomCode = roomRes.body.code;

  await apiJson(`${KAHOOT_API_URL}/api/v1/sessions/${roomCode}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ displayName: 'Participante Uno' }),
  });

  const p1Sock = connectSocket(p1Token);
  const hostSock = connectSocket(hostToken);
  try {
    const p1Sync = onceEvent(p1Sock, 'state_sync');
    p1Sock.emit('session:join', { code: roomCode });
    await p1Sync;

    const errEvtPromise = onceEvent(p1Sock, 'error');
    p1Sock.emit('session:start', { code: roomCode });
    const errEvt = await errEvtPromise;
    assert.equal(errEvt.code, 'FORBIDDEN', 'Participante no puede iniciar partida ajena');

    report.cases['2.1_permisos'] = {
      passed: true,
      putQuizStatus: putForbidden.status,
      deleteQuizStatus: delForbidden.status,
      wsStartError: errEvt.code,
    };

    // --- CASO 2.3 y 2.4: Respuestas válidas (reenvío, tardía/cerrada, revelación) y Reconexión ---
    const hostSync = onceEvent(hostSock, 'state_sync');
    hostSock.emit('session:join', { code: roomCode });
    await hostSync;

    const qOpenPromise = onceEvent(p1Sock, 'question:opened');
    hostSock.emit('session:start', { code: roomCode });
    const qOpen = await qOpenPromise;
    assert.equal(
      'correctAnswer' in qOpen,
      false,
      'question:opened nunca debe incluir correctAnswer',
    );

    const acceptedPromise = onceEvent(p1Sock, 'answer:accepted');
    p1Sock.emit('answer:submit', { code: roomCode, questionIndex: 0, answer: true });
    await acceptedPromise;

    const dupRejectedPromise = onceEvent(p1Sock, 'answer:rejected');
    p1Sock.emit('answer:submit', { code: roomCode, questionIndex: 0, answer: false });
    const dupRejected = await dupRejectedPromise;
    assert.equal(dupRejected.reason, 'already_answered', 'Segundo envío debe rechazarse');

    const qClosedPromise = onceEvent(p1Sock, 'question:closed');
    hostSock.emit('question:close', { code: roomCode });
    const qClosed = await qClosedPromise;
    assert.equal(typeof qClosed.correctAnswer, 'boolean', 'question:closed revela correctAnswer');
    assert.equal(qClosed.ranking[0].score, 1);

    const closedRejPromise = onceEvent(p1Sock, 'answer:rejected');
    p1Sock.emit('answer:submit', { code: roomCode, questionIndex: 0, answer: true });
    const closedRej = await closedRejPromise;
    assert.ok(
      closedRej.reason === 'closed' || closedRej.reason === 'already_answered',
      'Envío tras cierre debe rechazarse',
    );

    report.cases['2.3_respuestas_validas'] = {
      passed: true,
      correctAnswerHiddenOnOpen: !('correctAnswer' in qOpen),
      duplicateReason: dupRejected.reason,
      closedReason: closedRej.reason,
      revealedOnClose: qClosed.correctAnswer,
    };

    // Reconexión (2.4): desconectar socket del participante y reconectar
    p1Sock.disconnect();
    const p1ReconnectSock = connectSocket(p1Token);
    try {
      const reconnSyncPromise = onceEvent(p1ReconnectSock, 'state_sync');
      p1ReconnectSock.emit('session:join', { code: roomCode });
      const reconnSync = await reconnSyncPromise;
      assert.equal(reconnSync.myScore, 1, 'El puntaje se conserva tras reconectar');
      assert.equal(
        reconnSync.participants.length,
        1,
        'El participante no se duplica tras reconectar',
      );
      report.cases['2.4_reconexion'] = {
        passed: true,
        participantsCountAfterReconnect: reconnSync.participants.length,
        scoreAfterReconnect: reconnSync.myScore,
      };
    } finally {
      p1ReconnectSock.disconnect();
    }

    // Avanzar las preguntas restantes (1..4) y cerrar la sesión para verificar persistencia de resultados en 2.5
    for (let qi = 1; qi < 5; qi += 1) {
      const opened = onceEvent(hostSock, 'question:opened');
      hostSock.emit('question:next', { code: roomCode });
      await opened;
      const closed = onceEvent(hostSock, 'question:closed');
      hostSock.emit('question:close', { code: roomCode });
      await closed;
    }
    const finishedPromise = onceEvent(hostSock, 'session:finished');
    hostSock.emit('question:next', { code: roomCode });
    await finishedPromise;
  } finally {
    p1Sock.disconnect();
    hostSock.disconnect();
  }

  // --- CASO 2.2: Dos salas simultáneas ---
  const [roomARes, roomBRes] = await Promise.all([
    apiJson(`${KAHOOT_API_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
      body: JSON.stringify({ quizId: demoQuiz.id, questionTimeSeconds: 20 }),
    }),
    apiJson(`${KAHOOT_API_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
      body: JSON.stringify({ quizId: demoQuiz.id, questionTimeSeconds: 20 }),
    }),
  ]);
  const codeA = roomARes.body.code;
  const codeB = roomBRes.body.code;
  assert.notEqual(codeA, codeB);

  await apiJson(`${KAHOOT_API_URL}/api/v1/sessions/${codeA}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ displayName: 'Participante Uno' }),
  });
  await apiJson(`${KAHOOT_API_URL}/api/v1/sessions/${codeB}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p2Token}` },
    body: JSON.stringify({ displayName: 'Participante Dos' }),
  });

  const sockA = connectSocket(p1Token);
  const sockB = connectSocket(p2Token);
  try {
    const [syncA, syncB] = await Promise.all([
      onceEvent(sockA, 'state_sync'),
      onceEvent(sockB, 'state_sync'),
      (sockA.emit('session:join', { code: codeA }), sockB.emit('session:join', { code: codeB })),
    ]);
    assert.deepEqual(
      syncA.participants.map((p) => p.displayName),
      ['Participante Uno'],
    );
    assert.deepEqual(
      syncB.participants.map((p) => p.displayName),
      ['Participante Dos'],
    );
    report.cases['2.2_dos_salas_simultaneas'] = {
      passed: true,
      roomA: codeA,
      roomB: codeB,
      participantsA: syncA.participants.map((p) => p.displayName),
      participantsB: syncB.participants.map((p) => p.displayName),
    };
  } finally {
    sockA.disconnect();
    sockB.disconnect();
  }

  // --- CASO 2.5: Persistencia tras reiniciar contenedores ---
  if (process.env.E2E_SKIP_RESTART !== 'true') {
    const servicesToRestart = (process.env.E2E_RESTART_SERVICES || 'auth-api,kahoot-api').split(
      ',',
    );
    execFileSync('docker', [...COMPOSE_ARGS, 'restart', ...servicesToRestart], {
      stdio: 'inherit',
    });
    await waitForHealth(`${AUTH_API_URL}/api/v1/health`);
    await waitForHealth(`${KAHOOT_API_URL}/api/v1/health`);
  }

  const loginAfterRestart = await apiJson(`${AUTH_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  assert.equal(loginAfterRestart.status, 200, 'Login sigue funcionando tras reiniciar contenedores');

  const quizzesAfterRestart = await apiJson(`${KAHOOT_API_URL}/api/v1/quizzes`, {
    headers: { Authorization: `Bearer ${loginAfterRestart.body.accessToken}` },
  });
  assert.equal(quizzesAfterRestart.status, 200);
  assert.ok(quizzesAfterRestart.body.length >= 1, 'Cuestionarios persisten tras reiniciar');

  const imgRes = await fetch(
    `${KAHOOT_API_URL}/api/v1/images/00000000-0000-4000-8000-000000000010.png`,
  );
  assert.equal(imgRes.status, 200, 'Imágenes persisten tras reiniciar contenedores');

  const resultsAfterRestart = await apiJson(
    `${KAHOOT_API_URL}/api/v1/sessions/${roomCode}/results`,
    {
      headers: { Authorization: `Bearer ${loginAfterRestart.body.accessToken}` },
    },
  );
  assert.equal(
    resultsAfterRestart.status,
    200,
    'Resultados de sesión finalizada persisten tras reiniciar contenedores',
  );
  assert.equal(resultsAfterRestart.body.ranking[0].score, 1);

  report.cases['2.5_persistencia_reinicio'] = {
    passed: true,
    loginStatus: loginAfterRestart.status,
    quizzesCount: quizzesAfterRestart.body.length,
    imageStatus: imgRes.status,
    resultsStatus: resultsAfterRestart.status,
    persistedSessionCode: roomCode,
    persistedTopScore: resultsAfterRestart.body.ranking[0].score,
  };

  report.finishedAt = new Date().toISOString();
  return report;
}

if (process.argv[1]?.endsWith('run-live-e2e.mjs')) {
  runLiveE2ESuite()
    .then((rep) => {
      console.log(JSON.stringify(rep, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
