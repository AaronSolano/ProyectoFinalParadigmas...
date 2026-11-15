import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io as ioClient } from 'socket.io-client';
import i18n, { LANGUAGE_STORAGE_KEY, setAppLanguage } from '../i18n';
import { LanguageSelector } from '../components/LanguageSelector';
import { TrueFalseButtons } from '../components/TrueFalseButtons';
import { CountdownTimer, computeRemainingSeconds } from '../components/CountdownTimer';
import { JoinRoomPage, isValidRoomCode, normalizeRoomCode } from '../pages/JoinRoomPage';
import { QuizzesPage } from '../pages/QuizzesPage';
import { QuizQuestionsPage, validateQuestionImageFile } from '../pages/QuizQuestionsPage';
import { GameRoomPage } from '../pages/GameRoomPage';
import { AuthProvider } from '../auth/AuthContext';
import { clearAuthSession, getStoredToken, saveAuthSession } from '../auth/storage';
import { AuthPage } from '../pages/AuthPage';
import {
  applyStateSync,
  computeClockOffsetMs,
  createInitialGameLiveState,
} from '../realtime/useGameSocket';
import { ApiProblemError, kahootApi, authApi } from '../api/client';
// @ts-expect-error ESM mock server module
import { startMockServers } from '../../mocks/mock-server.mjs';

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter
          initialEntries={initialEntries}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('@profelink/web — Fase 5 unit & component suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearAuthSession();
    setAppLanguage('es');
    vi.restoreAllMocks();
  });

  it('1.1 cambia el idioma entre español e inglés y conserva la preferencia en localStorage', async () => {
    render(<LanguageSelector />);
    const select = screen.getByTestId('language-selector') as HTMLSelectElement;
    expect(select.value).toBe('es');
    expect(i18n.t('game.trueBtn')).toBe('Verdadero');

    fireEvent.change(select, { target: { value: 'en' } });

    await waitFor(() => {
      expect(select.value).toBe('en');
    });
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(i18n.t('game.trueBtn')).toBe('True');
  });

  it('3.3 botones Verdadero/Falso permiten un solo envío por pregunta y muestran confirmación o rechazo', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <TrueFalseButtons
        questionIndex={0}
        hasAnswered={false}
        answerAccepted={false}
        rejectedReason={null}
        onSubmitAnswer={onSubmit}
      />,
    );

    const trueBtn = screen.getByTestId('btn-answer-true');
    const falseBtn = screen.getByTestId('btn-answer-false');

    fireEvent.click(trueBtn);
    fireEvent.click(trueBtn);
    fireEvent.click(falseBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(true);
    expect(trueBtn).toBeDisabled();
    expect(falseBtn).toBeDisabled();
    expect(screen.getByTestId('answer-status')).toBeInTheDocument();

    rerender(
      <TrueFalseButtons
        questionIndex={0}
        hasAnswered={true}
        answerAccepted={false}
        rejectedReason="late"
        onSubmitAnswer={onSubmit}
      />,
    );

    expect(screen.getByTestId('answer-rejected')).toHaveTextContent(/fuera de tiempo/i);
  });

  it('3.3 calcula la cuenta regresiva usando closesAt y el desfase serverTime - Date.now()', () => {
    const clientNow = Date.parse('2026-11-15T15:00:00.000Z');
    const serverTime = '2026-11-15T15:00:10.000Z';
    const closesAt = '2026-11-15T15:00:25.000Z';

    const offsetMs = computeClockOffsetMs(serverTime, clientNow);
    expect(offsetMs).toBe(10_000);

    const remaining = computeRemainingSeconds(closesAt, offsetMs, clientNow);
    expect(remaining).toBe(15);

    render(
      <CountdownTimer
        closesAt={closesAt}
        clockOffsetMs={offsetMs}
        nowProvider={() => clientNow}
      />,
    );

    expect(screen.getByTestId('countdown-timer')).toHaveTextContent('15 s');
  });

  it('3.2 valida formato de código de sala y muestra errores ROOM_NOT_FOUND y ROOM_CLOSED', async () => {
    expect(normalizeRoomCode(' k7m3qx ')).toBe('K7M3QX');
    expect(isValidRoomCode('K7M3QX')).toBe(true);
    expect(isValidRoomCode('K0M1QX')).toBe(false);

    vi.spyOn(kahootApi, 'joinSession')
      .mockRejectedValueOnce(
        new ApiProblemError({
          status: 404,
          code: 'ROOM_NOT_FOUND',
          message: 'No existe una sala con ese código.',
        }),
      )
      .mockRejectedValueOnce(
        new ApiProblemError({
          status: 409,
          code: 'ROOM_CLOSED',
          message: 'La sala ya inició.',
        }),
      );

    renderWithProviders(<JoinRoomPage />, ['/join']);

    const input = screen.getByTestId('input-room-code');
    const submitBtn = screen.getByTestId('btn-join-room');

    fireEvent.change(input, { target: { value: 'A0B1C2' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(/6 caracteres válidos/i);

    fireEvent.change(input, { target: { value: 'K7M3QX' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      /No se encontró ninguna sala con ese código/i,
    );

    fireEvent.change(input, { target: { value: 'K7M3QX' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      /La sala ya inició o terminó/i,
    );
  });

  it('2.1 guarda token en memoria + sessionStorage al iniciar sesión y muestra error 401 INVALID_CREDENTIALS', async () => {
    vi.spyOn(authApi, 'login')
      .mockRejectedValueOnce(
        new ApiProblemError({
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas',
        }),
      )
      .mockResolvedValueOnce({
        accessToken: 'jwt-token-demo',
        tokenType: 'Bearer',
        expiresIn: 3600,
        profile: {
          id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
          email: 'ana.mora@example.com',
          displayName: 'Ana Mora',
          createdAt: '2026-11-15T14:00:00.000Z',
        },
      });

    renderWithProviders(<AuthPage mode="login" />, ['/login']);

    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'ana.mora@example.com' },
    });
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'ClaveIncorrecta1' },
    });
    fireEvent.click(screen.getByTestId('btn-auth-submit'));

    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      /Correo o contraseña incorrectos/i,
    );

    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'Clave2026seg' },
    });
    fireEvent.click(screen.getByTestId('btn-auth-submit'));

    await waitFor(() => {
      expect(getStoredToken()).toBe('jwt-token-demo');
    });
    expect(window.sessionStorage.getItem('profelink_auth_token')).toBe('jwt-token-demo');
  });

  it('2.2 gestiona cuestionarios y preguntas y rechaza imágenes inválidas por tipo o tamaño', async () => {
    const validPng = new File([new Uint8Array(1024)], 'diagrama.png', { type: 'image/png' });
    const invalidGif = new File([new Uint8Array(1024)], 'anim.gif', { type: 'image/gif' });
    const tooLargePng = new File([new Uint8Array(2 * 1024 * 1024 + 10)], 'huge.png', {
      type: 'image/png',
    });

    expect(validateQuestionImageFile(validPng)).toBeNull();
    expect(validateQuestionImageFile(invalidGif)).toBe('IMAGE_UNSUPPORTED');
    expect(validateQuestionImageFile(tooLargePng)).toBe('IMAGE_TOO_LARGE');

    vi.spyOn(kahootApi, 'listQuizzes').mockResolvedValue([
      {
        id: 'quiz-1',
        ownerId: 'user-1',
        title: 'Redes I',
        description: 'Repaso',
        questionCount: 1,
        createdAt: '2026-11-10T14:00:00.000Z',
        updatedAt: '2026-11-10T14:00:00.000Z',
      },
    ]);

    renderWithProviders(<QuizzesPage />, ['/quizzes']);
    expect(await screen.findByText('Redes I')).toBeInTheDocument();

    vi.spyOn(kahootApi, 'getQuiz').mockResolvedValue({
      id: 'quiz-1',
      ownerId: 'user-1',
      title: 'Redes I',
      description: 'Repaso',
      questionCount: 1,
      createdAt: '2026-11-10T14:00:00.000Z',
      updatedAt: '2026-11-10T14:00:00.000Z',
    });
    vi.spyOn(kahootApi, 'listQuestions').mockResolvedValue([
      {
        id: 'q-1',
        quizId: 'quiz-1',
        statement: 'TCP es orientado a conexión.',
        correctAnswer: true,
        imageUrl: null,
        position: 1,
        createdAt: '2026-11-10T14:05:00.000Z',
        updatedAt: '2026-11-10T14:05:00.000Z',
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/quizzes/:quizId/questions" element={<QuizQuestionsPage />} />
      </Routes>,
      ['/quizzes/quiz-1/questions'],
    );

    expect(await screen.findByText('TCP es orientado a conexión.')).toBeInTheDocument();
    const fileInput = screen.getByTestId('input-question-image-q-1');
    fireEvent.change(fileInput, { target: { files: [invalidGif] } });
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      /Formato de imagen no permitido/i,
    );
  });

  it('3.5 reconstruye el estado exclusivamente desde state_sync sin duplicar participantes ni alterar puntaje', () => {
    const initial = createInitialGameLiveState('K7M3QX', false);
    const synced = applyStateSync(
      initial,
      {
        code: 'K7M3QX',
        status: 'question_open',
        isHost: false,
        participantId: 'part-1',
        participants: [
          { id: 'part-1', displayName: 'Ana' },
          { id: 'part-1', displayName: 'Ana' },
          { id: 'part-2', displayName: 'Beto' },
        ],
        totalQuestions: 5,
        currentQuestion: {
          questionIndex: 1,
          total: 5,
          statement: 'El agua hierve a 100 °C al nivel del mar.',
          imageUrl: null,
          closesAt: '2026-11-15T15:00:30.000Z',
        },
        closesAt: '2026-11-15T15:00:30.000Z',
        serverTime: '2026-11-15T15:00:10.000Z',
        myScore: 3,
        hasAnswered: true,
      },
      Date.parse('2026-11-15T15:00:10.000Z'),
    );

    expect(synced.participants).toHaveLength(2);
    expect(synced.myScore).toBe(3);
    expect(synced.hasAnswered).toBe(true);
    expect(synced.currentQuestion?.statement).toBe('El agua hierve a 100 °C al nivel del mar.');
  });

  it('1.2, 3.1, 3.4, 3.5 ejecuta una partida completa con reconexión contra el servidor mock Socket.IO y renderiza GameRoomPage', async () => {
    saveAuthSession('mock-jwt', {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'ana.mora@example.com',
      displayName: 'Ana Mora',
      createdAt: '2026-11-15T14:00:00.000Z',
    });

    renderWithProviders(
      <Routes>
        <Route path="/host/:code" element={<GameRoomPage roleHint="host" />} />
      </Routes>,
      ['/host/K7M3QX'],
    );
    expect(screen.getByTestId('room-code-display')).toHaveTextContent('K7M3QX');

    const mocks = await startMockServers({ authPort: 0, kahootPort: 0 });
    const kahootPort = mocks.kahootServer.address().port;

    const hostToken = Buffer.from(
      JSON.stringify({
        sub: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'Ana Mora',
        email: 'ana.mora@example.com',
      }),
    ).toString('base64url');
    const participantToken = Buffer.from(
      JSON.stringify({
        sub: 'user-beto-99',
        name: 'Beto',
        email: 'beto@example.com',
      }),
    ).toString('base64url');

    const hostSocket = ioClient(`http://localhost:${kahootPort}/game`, {
      auth: { token: `hdr.${hostToken}.sig` },
    });
    const partSocket = ioClient(`http://localhost:${kahootPort}/game`, {
      auth: { token: `hdr.${participantToken}.sig` },
    });

    try {
      const hostSyncPromise = new Promise<any>((resolve) => hostSocket.once('state_sync', resolve));
      hostSocket.emit('session:join', { code: 'K7M3QX' });
      const hostSync = await hostSyncPromise;
      expect(hostSync.isHost).toBe(true);
      expect(hostSync.status).toBe('waiting');

      const joinedPromise = new Promise<any>((resolve) =>
        hostSocket.once('participant:joined', resolve),
      );
      const partSyncPromise = new Promise<any>((resolve) => partSocket.once('state_sync', resolve));
      partSocket.emit('session:join', { code: 'K7M3QX' });

      const [joinedEvt, partSync] = await Promise.all([joinedPromise, partSyncPromise]);
      expect(joinedEvt.participant.displayName).toBe('Beto');
      expect(partSync.isHost).toBe(false);

      const qOpenedPromise = new Promise<any>((resolve) =>
        partSocket.once('question:opened', resolve),
      );
      hostSocket.emit('session:start', { code: 'K7M3QX' });
      const openedEvt = await qOpenedPromise;
      expect(openedEvt.questionIndex).toBe(0);
      expect(openedEvt).not.toHaveProperty('correctAnswer');

      const acceptedPromise = new Promise<any>((resolve) =>
        partSocket.once('answer:accepted', resolve),
      );
      partSocket.emit('answer:submit', { code: 'K7M3QX', questionIndex: 0, answer: true });
      const acceptedEvt = await acceptedPromise;
      expect(acceptedEvt.questionIndex).toBe(0);

      const rejectedPromise = new Promise<any>((resolve) =>
        partSocket.once('answer:rejected', resolve),
      );
      partSocket.emit('answer:submit', { code: 'K7M3QX', questionIndex: 0, answer: false });
      const rejectedEvt = await rejectedPromise;
      expect(rejectedEvt.reason).toBe('already_answered');

      const closedPromise = new Promise<any>((resolve) =>
        partSocket.once('question:closed', resolve),
      );
      hostSocket.emit('question:close', { code: 'K7M3QX' });
      const closedEvt = await closedPromise;
      expect(closedEvt.correctAnswer).toBe(true);
      expect(closedEvt.ranking[0].score).toBe(1);

      const resyncPromise = new Promise<any>((resolve) => partSocket.once('state_sync', resolve));
      partSocket.emit('session:join', { code: 'K7M3QX' });
      const resync = await resyncPromise;
      expect(resync.myScore).toBe(1);
      expect(resync.participants).toHaveLength(1);
    } finally {
      hostSocket.disconnect();
      partSocket.disconnect();
      await mocks.close();
    }
  });
});
