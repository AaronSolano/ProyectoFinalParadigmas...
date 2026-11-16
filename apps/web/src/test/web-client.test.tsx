import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n, { LANGUAGE_STORAGE_KEY, setAppLanguage } from '../i18n';
import { App } from '../App';
import { LanguageSelector } from '../components/LanguageSelector';
import { OptionButtons } from '../components/OptionButtons';
import {
  CountdownTimer,
  computeRemainingSeconds,
} from '../components/CountdownTimer';
import { JoinRoomPage, isValidRoomCode, normalizeRoomCode } from '../pages/JoinRoomPage';
import { QuizzesPage } from '../pages/QuizzesPage';
import { GameRoomPage } from '../pages/GameRoomPage';
import { QuizQuestionsPage, validateQuestionImageFile } from '../pages/QuizQuestionsPage';
import { AuthProvider } from '../auth/AuthContext';
import { clearAuthSession, getStoredToken, saveAuthSession } from '../auth/storage';
import { AuthPage } from '../pages/AuthPage';
import {
  applyStateSync,
  computeClockOffsetMs,
  createInitialGameLiveState,
} from '../realtime/useGameSocket';
import { ApiProblemError, kahootApi, authApi } from '../api/client';

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

describe('@rubymind/web — Fase 5 unit & component suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearAuthSession();
    setAppLanguage('es');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('3.3 las opciones de respuesta (2 a 4) permiten un solo envío por pregunta y muestran confirmación o rechazo', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <OptionButtons
        questionIndex={0}
        options={['Alajuela', 'San José', 'Cartago', 'Heredia']}
        hasAnswered={false}
        answerAccepted={false}
        rejectedReason={null}
        onSubmitAnswer={onSubmit}
      />,
    );

    const second = screen.getByTestId('btn-answer-1');
    const fourth = screen.getByTestId('btn-answer-3');
    expect(screen.getByText('San José')).toBeInTheDocument();

    fireEvent.click(second);
    fireEvent.click(second);
    fireEvent.click(fourth);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(1);
    expect(second).toBeDisabled();
    expect(fourth).toBeDisabled();
    expect(screen.getByTestId('answer-status')).toBeInTheDocument();

    rerender(
      <OptionButtons
        questionIndex={0}
        options={['Alajuela', 'San José', 'Cartago', 'Heredia']}
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

    saveAuthSession('account-token', { id: 'user', displayName: 'Ana', email: 'ana@example.com', createdAt: new Date().toISOString() });
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
        options: ['Verdadero', 'Falso'],
        correctOption: 0,
        explanation: null,
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
          options: ['Verdadero', 'Falso'],
          imageUrl: null,
          closesAt: '2026-11-15T15:00:30.000Z',
          openedAt: '2026-11-15T15:00:00.000Z',
          durationSeconds: 30,
        },
        closesAt: '2026-11-15T15:00:30.000Z',
        serverTime: '2026-11-15T15:00:10.000Z',
        myScore: 950,
        hasAnswered: true,
      },
      Date.parse('2026-11-15T15:00:10.000Z'),
    );

    expect(synced.participants).toHaveLength(2);
    expect(synced.myScore).toBe(950);
    expect(synced.hasAnswered).toBe(true);
    expect(synced.currentQuestion?.statement).toBe('El agua hierve a 100 °C al nivel del mar.');
    expect(synced.currentQuestion?.durationSeconds).toBe(30);
  });

  it('ajuste 1: un 401 en una llamada REST autenticada limpia el token y redirige a /login con aviso de sesión expirada (ES y EN)', async () => {
    saveAuthSession('expired-jwt-token', {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'ana.mora@example.com',
      displayName: 'Ana Mora',
      createdAt: '2026-11-15T14:00:00.000Z',
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Token inválido o vencido',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderWithProviders(<App />, ['/quizzes']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });
    expect(getStoredToken()).toBeNull();
    expect(window.sessionStorage.getItem('profelink_auth_token')).toBeNull();
    expect(screen.getByTestId('error-banner')).toHaveTextContent(
      'Tu sesión expiró, inicia sesión de nuevo.',
    );

    // Verificar traducción al inglés del aviso
    fireEvent.change(screen.getByTestId('language-selector'), { target: { value: 'en' } });
    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toHaveTextContent(
        'Your session expired, please log in again.',
      );
    });
  });

  it('ajuste 2: oculta el botón de simular reconexión por defecto y lo muestra cuando VITE_ENABLE_DEBUG_CONTROLS=true', () => {
    saveAuthSession('mock-jwt', {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'ana.mora@example.com',
      displayName: 'Ana Mora',
      createdAt: '2026-11-15T14:00:00.000Z',
    });

    vi.stubEnv('VITE_ENABLE_DEBUG_CONTROLS', 'false');
    const firstRender = renderWithProviders(
      <Routes>
        <Route path="/host/:code" element={<GameRoomPage roleHint="host" />} />
      </Routes>,
      ['/host/K7M3QX'],
    );
    expect(screen.queryByTestId('btn-simulate-reconnect')).not.toBeInTheDocument();
    firstRender.unmount();

    vi.stubEnv('VITE_ENABLE_DEBUG_CONTROLS', 'true');
    renderWithProviders(
      <Routes>
        <Route path="/host/:code" element={<GameRoomPage roleHint="host" />} />
      </Routes>,
      ['/host/K7M3QX'],
    );
    expect(screen.getByTestId('btn-simulate-reconnect')).toBeInTheDocument();
  });

  it('7.1.2a (permisos en UI): un participante no ve controles de anfitrión y un 403 FORBIDDEN al modificar un cuestionario ajeno muestra aviso claro', async () => {
    saveAuthSession('part-jwt', {
      id: 'user-part-1',
      email: 'part@example.com',
      displayName: 'Participante',
      createdAt: '2026-11-15T14:00:00.000Z',
    });

    const participantRender = renderWithProviders(
      <Routes>
        <Route path="/play/:code" element={<GameRoomPage roleHint="participant" />} />
      </Routes>,
      ['/play/K7M3QX'],
    );

    expect(screen.queryByTestId('btn-start-session')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-close-question')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-next-question')).not.toBeInTheDocument();
    participantRender.unmount();

    vi.spyOn(kahootApi, 'listQuizzes').mockResolvedValue([
      {
        id: 'quiz-other',
        ownerId: 'other-owner',
        title: 'Cuestionario Ajeno',
        description: 'No editable',
        questionCount: 2,
        createdAt: '2026-11-10T14:00:00.000Z',
        updatedAt: '2026-11-10T14:00:00.000Z',
      },
    ]);
    vi.spyOn(kahootApi, 'deleteQuiz').mockRejectedValueOnce(
      new ApiProblemError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'No eres propietario de este cuestionario.',
      }),
    );

    renderWithProviders(<QuizzesPage />, ['/quizzes']);
    expect(await screen.findByText('Cuestionario Ajeno')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-delete-quiz-quiz-other'));

    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      /No tienes permiso para realizar esta acción/i,
    );
  });

});
