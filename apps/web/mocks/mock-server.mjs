import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

const AUTH_PORT = Number(process.env.MOCK_AUTH_PORT || 4011);
const KAHOOT_PORT = Number(process.env.MOCK_KAHOOT_PORT || 4010);

const demoSvgDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const users = new Map([
  [
    'ana.mora@example.com',
    {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'ana.mora@example.com',
      displayName: 'Ana Mora',
      password: 'Clave2026seg',
      createdAt: '2026-11-15T14:00:00.000Z',
    },
  ],
]);

const quizzes = new Map([
  [
    '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      ownerId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      title: 'Fundamentos de redes',
      description: 'Repaso de la unidad 1',
      questionCount: 2,
      createdAt: '2026-11-10T14:00:00.000Z',
      updatedAt: '2026-11-12T09:30:00.000Z',
    },
  ],
]);

const questionsByQuiz = new Map([
  [
    '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    [
      {
        id: '9b2f1c4e-2d6a-4a53-8f0e-1a7d5c3b9e10',
        quizId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        statement: 'TCP es un protocolo orientado a conexión.',
        correctAnswer: true,
        imageUrl: demoSvgDataUrl,
        position: 1,
        createdAt: '2026-11-10T14:05:00.000Z',
        updatedAt: '2026-11-10T14:05:00.000Z',
      },
      {
        id: '8a1e0b3d-1c5f-4942-9e1d-0b6c4b2a8d09',
        quizId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        statement: 'UDP garantiza la entrega ordenada de paquetes.',
        correctAnswer: false,
        imageUrl: null,
        position: 2,
        createdAt: '2026-11-10T14:06:00.000Z',
        updatedAt: '2026-11-10T14:06:00.000Z',
      },
    ],
  ],
]);

const sessionsByCode = new Map();

function createSessionRecord(quizId, hostId, questionTimeSeconds = 20, forcedCode) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = forcedCode;
  if (!code) {
    code = '';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  const questions = (questionsByQuiz.get(quizId) || []).map((q) => ({ ...q }));
  const session = {
    id: `1d4f5b0a-6e0c-4a3a-9d64-${ String(Date.now()).slice(-12) }`,
    code,
    quizId,
    hostId,
    status: 'waiting',
    questionTimeSeconds,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    questions,
    currentIndex: -1,
    closesAt: null,
    participants: new Map(),
    answersByQuestion: new Map(),
    lastClosed: null,
    ranking: [],
    timer: null,
  };
  sessionsByCode.set(code, session);
  return session;
}

createSessionRecord(
  '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  20,
  'K7M3QX',
);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function sendJson(res, status, payload) {
  setCors(res);
  res.statusCode = status;
  if (status === 204) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function decodeTokenUser(authHeaderOrToken) {
  const raw = String(authHeaderOrToken || '').replace(/^Bearer\s+/i, '').trim();
  if (!raw || raw === 'invalid') {
    return null;
  }
  try {
    const parts = raw.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return {
        id: payload.sub || '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        email: payload.email || 'ana.mora@example.com',
        displayName: payload.name || 'Ana Mora',
      };
    }
  } catch {
    // fallback below
  }
  return {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'ana.mora@example.com',
    displayName: 'Ana Mora',
  };
}

function makeMockJwt(profile) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      iss: 'auth-api',
      aud: 'kahoot-api',
      sub: profile.id,
      name: profile.displayName,
      email: profile.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return `${header}.${body}.mock-signature`;
}

export function startMockServers({ authPort = AUTH_PORT, kahootPort = KAHOOT_PORT } = {}) {
  const authServer = http.createServer(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${authPort}`);

    if (req.method === 'GET' && url.pathname === '/api/v1/health') {
      sendJson(res, 200, { status: 'ok', service: 'auth-api', timestamp: new Date().toISOString() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/register') {
      const body = await readBody(req);
      if (!body.email || !body.password || !body.displayName) {
        sendJson(res, 400, {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Datos de registro inválidos.',
        });
        return;
      }
      if (users.has(body.email)) {
        sendJson(res, 409, {
          status: 409,
          code: 'EMAIL_TAKEN',
          message: 'Ya existe un perfil registrado con ese correo.',
        });
        return;
      }
      const profile = {
        id: `user-${Date.now()}`,
        email: body.email,
        displayName: body.displayName,
        createdAt: new Date().toISOString(),
      };
      users.set(body.email, { ...profile, password: body.password });
      sendJson(res, 201, {
        accessToken: makeMockJwt(profile),
        tokenType: 'Bearer',
        expiresIn: 3600,
        profile,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
      const body = await readBody(req);
      const user = users.get(body.email);
      if (!user || user.password !== body.password) {
        sendJson(res, 401, {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.',
        });
        return;
      }
      const profile = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      };
      sendJson(res, 200, {
        accessToken: makeMockJwt(profile),
        tokenType: 'Bearer',
        expiresIn: 3600,
        profile,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
      const user = decodeTokenUser(req.headers.authorization);
      if (!user) {
        sendJson(res, 401, {
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Token ausente o inválido.',
        });
        return;
      }
      sendJson(res, 200, {
        ...user,
        createdAt: '2026-11-15T14:00:00.000Z',
      });
      return;
    }

    sendJson(res, 404, { status: 404, code: 'NOT_FOUND', message: 'Ruta no encontrada.' });
  });

  const kahootServer = http.createServer(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${kahootPort}`);

    if (req.method === 'GET' && url.pathname === '/api/v1/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'kahoot-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = decodeTokenUser(req.headers.authorization);
    if (!user) {
      sendJson(res, 401, {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Token de acceso ausente o inválido.',
      });
      return;
    }

    if (url.pathname === '/api/v1/quizzes' && req.method === 'GET') {
      sendJson(res, 200, Array.from(quizzes.values()));
      return;
    }

    if (url.pathname === '/api/v1/quizzes' && req.method === 'POST') {
      const body = await readBody(req);
      const id = `quiz-${Date.now()}`;
      const quiz = {
        id,
        ownerId: user.id,
        title: body.title || 'Nuevo cuestionario',
        description: body.description || '',
        questionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      quizzes.set(id, quiz);
      questionsByQuiz.set(id, []);
      sendJson(res, 201, quiz);
      return;
    }

    const quizMatch = url.pathname.match(/^\/api\/v1\/quizzes\/([^/]+)$/);
    if (quizMatch) {
      const quizId = quizMatch[1];
      const quiz = quizzes.get(quizId);
      if (!quiz) {
        sendJson(res, 404, { status: 404, code: 'NOT_FOUND', message: 'No encontrado.' });
        return;
      }
      if (req.method === 'GET') {
        sendJson(res, 200, quiz);
        return;
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        quiz.title = body.title ?? quiz.title;
        quiz.description = body.description ?? quiz.description;
        quiz.updatedAt = new Date().toISOString();
        sendJson(res, 200, quiz);
        return;
      }
      if (req.method === 'DELETE') {
        quizzes.delete(quizId);
        questionsByQuiz.delete(quizId);
        sendJson(res, 204, null);
        return;
      }
    }

    const questionsMatch = url.pathname.match(/^\/api\/v1\/quizzes\/([^/]+)\/questions$/);
    if (questionsMatch) {
      const quizId = questionsMatch[1];
      const list = questionsByQuiz.get(quizId) || [];
      if (req.method === 'GET') {
        sendJson(res, 200, list);
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const q = {
          id: `q-${Date.now()}`,
          quizId,
          statement: body.statement,
          correctAnswer: Boolean(body.correctAnswer),
          imageUrl: null,
          position: list.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(q);
        questionsByQuiz.set(quizId, list);
        const quiz = quizzes.get(quizId);
        if (quiz) {
          quiz.questionCount = list.length;
        }
        sendJson(res, 201, q);
        return;
      }
    }

    const questionImageMatch = url.pathname.match(
      /^\/api\/v1\/quizzes\/([^/]+)\/questions\/([^/]+)\/image$/,
    );
    if (questionImageMatch) {
      const [, quizId, questionId] = questionImageMatch;
      const list = questionsByQuiz.get(quizId) || [];
      const q = list.find((item) => item.id === questionId);
      if (!q) {
        sendJson(res, 404, { status: 404, code: 'NOT_FOUND', message: 'Pregunta no encontrada.' });
        return;
      }
      if (req.method === 'PUT') {
        q.imageUrl = demoSvgDataUrl;
        q.updatedAt = new Date().toISOString();
        sendJson(res, 200, q);
        return;
      }
      if (req.method === 'DELETE') {
        q.imageUrl = null;
        q.updatedAt = new Date().toISOString();
        sendJson(res, 200, q);
        return;
      }
    }

    const questionItemMatch = url.pathname.match(
      /^\/api\/v1\/quizzes\/([^/]+)\/questions\/([^/]+)$/,
    );
    if (questionItemMatch) {
      const [, quizId, questionId] = questionItemMatch;
      const list = questionsByQuiz.get(quizId) || [];
      const idx = list.findIndex((item) => item.id === questionId);
      if (idx === -1) {
        sendJson(res, 404, { status: 404, code: 'NOT_FOUND', message: 'Pregunta no encontrada.' });
        return;
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        list[idx] = {
          ...list[idx],
          statement: body.statement ?? list[idx].statement,
          correctAnswer:
            body.correctAnswer !== undefined ? Boolean(body.correctAnswer) : list[idx].correctAnswer,
          updatedAt: new Date().toISOString(),
        };
        sendJson(res, 200, list[idx]);
        return;
      }
      if (req.method === 'DELETE') {
        list.splice(idx, 1);
        const quiz = quizzes.get(quizId);
        if (quiz) {
          quiz.questionCount = list.length;
        }
        sendJson(res, 204, null);
        return;
      }
    }

    if (url.pathname === '/api/v1/sessions' && req.method === 'POST') {
      const body = await readBody(req);
      const list = questionsByQuiz.get(body.quizId) || [];
      if (list.length === 0) {
        sendJson(res, 409, {
          status: 409,
          code: 'QUIZ_EMPTY',
          message: 'El cuestionario no tiene preguntas.',
        });
        return;
      }
      const s = createSessionRecord(body.quizId, user.id, body.questionTimeSeconds || 20);
      sendJson(res, 201, {
        id: s.id,
        code: s.code,
        quizId: s.quizId,
        hostId: s.hostId,
        status: 'waiting',
        questionTimeSeconds: s.questionTimeSeconds,
        participantCount: s.participants.size,
        createdAt: s.createdAt,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      });
      return;
    }

    const joinMatch = url.pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/join$/);
    if (joinMatch && req.method === 'POST') {
      const code = decodeURIComponent(joinMatch[1]).toUpperCase();
      const s = sessionsByCode.get(code);
      if (!s) {
        sendJson(res, 404, {
          status: 404,
          code: 'ROOM_NOT_FOUND',
          message: 'No existe una sala con ese código.',
        });
        return;
      }
      const existing = s.participants.get(user.id);
      if (existing) {
        sendJson(res, 200, existing);
        return;
      }
      if (s.status !== 'waiting') {
        sendJson(res, 409, {
          status: 409,
          code: 'ROOM_CLOSED',
          message: 'La sala ya no admite nuevos participantes.',
        });
        return;
      }
      const body = await readBody(req);
      const participant = {
        id: `part-${user.id}`,
        sessionId: s.id,
        userId: user.id,
        displayName: body.displayName || user.displayName,
        joinedAt: new Date().toISOString(),
        score: 0,
      };
      s.participants.set(user.id, participant);
      s.participantCount = s.participants.size;
      sendJson(res, 200, participant);
      return;
    }

    sendJson(res, 404, { status: 404, code: 'NOT_FOUND', message: 'Ruta no encontrada.' });
  });

  const io = new SocketIOServer(kahootServer, {
    cors: { origin: '*' },
  });

  const gameNs = io.of('/game');

  gameNs.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = decodeTokenUser(token);
    if (!user) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.user = user;
    next();
  });

  function computeRanking(session) {
    const entries = Array.from(session.participants.values()).sort((a, b) => b.score - a.score);
    let currentPos = 1;
    return entries.map((p, idx) => {
      if (idx > 0 && p.score < entries[idx - 1].score) {
        currentPos = idx + 1;
      }
      return {
        position: currentPos,
        participantId: p.id,
        displayName: p.displayName,
        score: p.score,
      };
    });
  }

  function closeCurrentQuestion(session) {
    if (session.status !== 'question_open') {
      return;
    }
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    session.status = 'question_closed';
    session.closesAt = null;
    const q = session.questions[session.currentIndex];
    const qAnswers = session.answersByQuestion.get(session.currentIndex) || new Map();

    const results = Array.from(session.participants.values()).map((p) => {
      const submitted = qAnswers.get(p.id);
      const answered = submitted !== undefined;
      const correct = answered && submitted === q.correctAnswer;
      const pointsAwarded = correct ? 1 : 0;
      p.score += pointsAwarded;
      return {
        participantId: p.id,
        answered,
        correct,
        pointsAwarded,
        totalScore: p.score,
      };
    });

    const ranking = computeRanking(session);
    session.ranking = ranking;
    const closedPayload = {
      questionIndex: session.currentIndex,
      correctAnswer: q.correctAnswer,
      results,
      ranking,
    };
    session.lastClosed = closedPayload;
    gameNs.to(`session:${session.code}`).emit('question:closed', closedPayload);
  }

  function openQuestion(session, index) {
    session.currentIndex = index;
    session.status = 'question_open';
    session.lastClosed = null;
    const now = Date.now();
    const closesAt = new Date(now + session.questionTimeSeconds * 1000).toISOString();
    session.closesAt = closesAt;
    session.answersByQuestion.set(index, new Map());

    const q = session.questions[index];
    gameNs.to(`session:${session.code}`).emit('question:opened', {
      questionIndex: index,
      total: session.questions.length,
      statement: q.statement,
      imageUrl: q.imageUrl,
      closesAt,
      serverTime: new Date(now).toISOString(),
    });

    if (session.timer) {
      clearTimeout(session.timer);
    }
    session.timer = setTimeout(() => {
      closeCurrentQuestion(session);
    }, session.questionTimeSeconds * 1000);
  }

  gameNs.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('session:join', ({ code }) => {
      const normalized = String(code || '').toUpperCase();
      const session = sessionsByCode.get(normalized);
      if (!session) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Sala no encontrada.' });
        return;
      }

      const isHost = session.hostId === user.id;
      let participant = session.participants.get(user.id);
      let isNewParticipant = false;

      if (!isHost && !participant) {
        participant = {
          id: `part-${user.id}`,
          sessionId: session.id,
          userId: user.id,
          displayName: user.displayName,
          joinedAt: new Date().toISOString(),
          score: 0,
        };
        session.participants.set(user.id, participant);
        session.participantCount = session.participants.size;
        isNewParticipant = true;
      }

      socket.join(`session:${session.code}`);

      if (isNewParticipant && participant) {
        socket.to(`session:${session.code}`).emit('participant:joined', {
          participant: { id: participant.id, displayName: participant.displayName },
        });
      }

      const currentQ =
        session.currentIndex >= 0 && session.questions[session.currentIndex]
          ? {
              questionIndex: session.currentIndex,
              total: session.questions.length,
              statement: session.questions[session.currentIndex].statement,
              imageUrl: session.questions[session.currentIndex].imageUrl,
              closesAt: session.closesAt || new Date().toISOString(),
            }
          : null;

      const qAnswers = session.answersByQuestion.get(session.currentIndex);
      const hasAnswered = Boolean(participant && qAnswers && qAnswers.has(participant.id));

      socket.emit('state_sync', {
        code: session.code,
        status: session.status,
        isHost,
        participantId: participant ? participant.id : null,
        participants: Array.from(session.participants.values()).map((p) => ({
          id: p.id,
          displayName: p.displayName,
        })),
        totalQuestions: session.questions.length,
        currentQuestion:
          session.status === 'question_open' || session.status === 'question_closed'
            ? currentQ
            : null,
        closesAt: session.status === 'question_open' ? session.closesAt : null,
        serverTime: new Date().toISOString(),
        myScore: participant ? participant.score : 0,
        hasAnswered,
        lastClosed: session.status === 'question_closed' ? session.lastClosed : null,
        ranking: session.status === 'finished' ? session.ranking : null,
      });
    });

    socket.on('session:start', ({ code }) => {
      const session = sessionsByCode.get(String(code || '').toUpperCase());
      if (!session) return;
      if (session.hostId !== user.id) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Solo el anfitrión puede iniciar.' });
        return;
      }
      if (session.status !== 'waiting') {
        socket.emit('error', { code: 'INVALID_STATE', message: 'La partida ya inició.' });
        return;
      }
      gameNs.to(`session:${session.code}`).emit('session:started', {
        totalQuestions: session.questions.length,
      });
      openQuestion(session, 0);
    });

    socket.on('question:close', ({ code }) => {
      const session = sessionsByCode.get(String(code || '').toUpperCase());
      if (!session) return;
      if (session.hostId !== user.id) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Solo el anfitrión puede cerrar.' });
        return;
      }
      closeCurrentQuestion(session);
    });

    socket.on('question:next', ({ code }) => {
      const session = sessionsByCode.get(String(code || '').toUpperCase());
      if (!session) return;
      if (session.hostId !== user.id) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Solo el anfitrión puede avanzar.' });
        return;
      }
      if (session.status !== 'question_closed') {
        socket.emit('error', { code: 'INVALID_STATE', message: 'La pregunta sigue abierta.' });
        return;
      }
      const nextIdx = session.currentIndex + 1;
      if (nextIdx < session.questions.length) {
        openQuestion(session, nextIdx);
      } else {
        session.status = 'finished';
        session.finishedAt = new Date().toISOString();
        gameNs.to(`session:${session.code}`).emit('session:finished', {
          ranking: session.ranking,
        });
      }
    });

    socket.on('answer:submit', ({ code, questionIndex, answer }) => {
      const session = sessionsByCode.get(String(code || '').toUpperCase());
      if (!session) return;
      const participant = session.participants.get(user.id);
      if (!participant) {
        socket.emit('answer:rejected', { questionIndex, reason: 'not_in_session' });
        return;
      }
      if (session.status === 'question_closed') {
        socket.emit('answer:rejected', { questionIndex, reason: 'closed' });
        return;
      }
      if (session.status !== 'question_open' || questionIndex !== session.currentIndex) {
        socket.emit('answer:rejected', { questionIndex, reason: 'invalid_state' });
        return;
      }
      if (session.closesAt && Date.now() > Date.parse(session.closesAt)) {
        socket.emit('answer:rejected', { questionIndex, reason: 'late' });
        return;
      }
      const qAnswers = session.answersByQuestion.get(questionIndex);
      if (qAnswers.has(participant.id)) {
        socket.emit('answer:rejected', { questionIndex, reason: 'already_answered' });
        return;
      }
      qAnswers.set(participant.id, Boolean(answer));
      socket.emit('answer:accepted', { questionIndex });
    });

    socket.on('session:leave', ({ code }) => {
      const session = sessionsByCode.get(String(code || '').toUpperCase());
      if (!session) return;
      const participant = session.participants.get(user.id);
      if (participant) {
        session.participants.delete(user.id);
        socket.to(`session:${session.code}`).emit('participant:left', {
          participantId: participant.id,
        });
      }
      socket.leave(`session:${session.code}`);
    });
  });

  return new Promise((resolve) => {
    authServer.listen(authPort, () => {
      kahootServer.listen(kahootPort, () => {
        console.log(`[mock] auth-api mock listening on http://localhost:${authPort}`);
        console.log(`[mock] kahoot-api REST + Socket.IO (/game) on http://localhost:${kahootPort}`);
        console.log(`[mock] Demo user: ana.mora@example.com / Clave2026seg | Demo room: K7M3QX`);
        resolve({
          authServer,
          kahootServer,
          io,
          close: () =>
            Promise.all([
              new Promise((r) => io.close(() => r())),
              new Promise((r) => authServer.close(() => r())),
              new Promise((r) => kahootServer.close(() => r())),
            ]),
        });
      });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  startMockServers();
}
