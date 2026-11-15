import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {
  DICTIONARY,
  fetchSessionAndResults,
  isValidSessionCode,
  normalizeSessionCode,
} from '../app.js';
import { createExternalClientServer } from '../server.mjs';

function startFakeApiServers() {
  const authServer = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/auth/login') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const parsed = JSON.parse(body || '{}');
      if (parsed.email === 'docente.demo@example.com' && parsed.password === 'Demo2026seg') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            accessToken: 'external-jwt-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            profile: {
              id: '00000000-0000-4000-8000-000000000001',
              email: 'docente.demo@example.com',
              displayName: 'Docente demo',
              createdAt: '2026-11-15T14:00:00.000Z',
            },
          }),
        );
        return;
      }
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.',
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const kahootServer = http.createServer((req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer external-jwt-token') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 401, code: 'UNAUTHORIZED', message: 'No autorizado' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/v1/sessions/H9XQTX') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'f1807f32-1bad-4774-8b65-448481265cd9',
          code: 'H9XQTX',
          quizId: '00000000-0000-4000-8000-000000000002',
          hostId: '00000000-0000-4000-8000-000000000001',
          status: 'finished',
          questionTimeSeconds: 20,
          createdAt: '2026-11-15T22:25:00.000Z',
          startedAt: '2026-11-15T22:26:00.000Z',
          finishedAt: '2026-11-15T22:28:15.105Z',
        }),
      );
      return;
    }

    if (req.method === 'GET' && req.url === '/api/v1/sessions/H9XQTX/results') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          sessionId: 'f1807f32-1bad-4774-8b65-448481265cd9',
          code: 'H9XQTX',
          quizTitle: 'Programación y paradigmas',
          finishedAt: '2026-11-15T22:28:15.105Z',
          totalQuestions: 5,
          ranking: [
            {
              position: 1,
              participantId: 'aa4a45a2-5041-4aae-9235-95f022217f2a',
              displayName: 'Estudiante Demo',
              score: 5,
              correctAnswers: 5,
            },
          ],
        }),
      );
      return;
    }

    if (req.method === 'GET' && req.url === '/api/v1/sessions/W23456') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'session-waiting',
          code: 'W23456',
          quizId: '00000000-0000-4000-8000-000000000002',
          hostId: '00000000-0000-4000-8000-000000000001',
          status: 'waiting',
          questionTimeSeconds: 20,
          createdAt: '2026-11-15T22:25:00.000Z',
          startedAt: null,
          finishedAt: null,
        }),
      );
      return;
    }

    if (req.method === 'GET' && req.url === '/api/v1/sessions/W23456/results') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 409,
          code: 'ROOM_NOT_FINISHED',
          message: 'La sala aún no ha terminado.',
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 404,
        code: 'ROOM_NOT_FOUND',
        message: 'Sala no encontrada.',
      }),
    );
  });

  return new Promise((resolve) => {
    authServer.listen(0, '127.0.0.1', () => {
      kahootServer.listen(0, '127.0.0.1', () => {
        const authPort = authServer.address().port;
        const kahootPort = kahootServer.address().port;
        resolve({
          authApiUrl: `http://127.0.0.1:${authPort}`,
          kahootApiUrl: `http://127.0.0.1:${kahootPort}`,
          close: () =>
            new Promise((r) => authServer.close(() => kahootServer.close(() => r()))),
        });
      });
    });
  });
}

test('1.1 consulta una sesión y su clasificación final por configuración y maneja errores de contrato', async () => {
  assert.equal(normalizeSessionCode(' h9xqtx '), 'H9XQTX');
  assert.equal(isValidSessionCode('H9XQTX'), true);
  assert.equal(isValidSessionCode('A0B1C2'), false);
  assert.deepEqual(Object.keys(DICTIONARY.es), Object.keys(DICTIONARY.en));

  const servers = await startFakeApiServers();
  try {
    const outcome = await fetchSessionAndResults({
      authApiUrl: servers.authApiUrl,
      kahootApiUrl: servers.kahootApiUrl,
      email: 'docente.demo@example.com',
      password: 'Demo2026seg',
      sessionCode: 'h9xqtx',
    });

    assert.equal(outcome.profile.displayName, 'Docente demo');
    assert.equal(outcome.session.code, 'H9XQTX');
    assert.equal(outcome.session.status, 'finished');
    assert.equal(outcome.results.quizTitle, 'Programación y paradigmas');
    assert.equal(outcome.results.ranking.length, 1);
    assert.equal(outcome.results.ranking[0].displayName, 'Estudiante Demo');
    assert.equal(outcome.results.ranking[0].score, 5);

    const waitingOutcome = await fetchSessionAndResults({
      authApiUrl: servers.authApiUrl,
      kahootApiUrl: servers.kahootApiUrl,
      email: 'docente.demo@example.com',
      password: 'Demo2026seg',
      sessionCode: 'W23456',
    });
    assert.equal(waitingOutcome.session.status, 'waiting');
    assert.equal(waitingOutcome.results, null);
    assert.equal(waitingOutcome.resultsPendingReason, 'ROOM_NOT_FINISHED');

    await assert.rejects(
      () =>
        fetchSessionAndResults({
          authApiUrl: servers.authApiUrl,
          kahootApiUrl: servers.kahootApiUrl,
          email: 'docente.demo@example.com',
          password: 'WrongPassword1',
          sessionCode: 'H9XQTX',
        }),
      (err) => err.code === 'INVALID_CREDENTIALS',
    );
  } finally {
    await servers.close();
  }
});

test('1.1 sirve index.html y /config.js estático con la configuración inyectada por entorno', async () => {
  const server = createExternalClientServer({
    EXTERNAL_AUTH_API_URL: 'http://127.0.0.1:55435',
    EXTERNAL_KAHOOT_API_URL: 'http://127.0.0.1:55436',
    EXTERNAL_CLIENT_EMAIL: 'docente.demo@example.com',
    EXTERNAL_CLIENT_SESSION_CODE: 'H9XQTX',
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const htmlRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.match(html, /ProfeLink — Cliente Externo/);

    const cfgRes = await fetch(`http://127.0.0.1:${port}/config.js`);
    assert.equal(cfgRes.status, 200);
    const cfgScript = await cfgRes.text();
    assert.match(cfgScript, /"sessionCode":"H9XQTX"/);
    assert.match(cfgScript, /"kahootApiUrl":"http:\/\/127\.0\.0\.1:55436"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
