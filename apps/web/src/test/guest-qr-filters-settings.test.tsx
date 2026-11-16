import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import {
  clearAuthSession,
  getStoredProfile,
  getStoredToken,
  saveAuthSession,
} from '../auth/storage';
import { authApi, kahootApi, type Quiz } from '../api/client';
import { JoinRoomPage } from '../pages/JoinRoomPage';
import { QuizzesPage } from '../pages/QuizzesPage';
import { LibraryPage } from '../pages/LibraryPage';
import { RoomQr } from '../components/RoomQr';
import { SettingsPanel } from '../components/SettingsPanel';
import { useSoundMuted } from '../audio/useSoundMuted';
import { setSoundMuted, AUDIO_MUTED_STORAGE_KEY } from '../audio/soundEngine';
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n';

function show(ui: React.ReactElement, path = '/join') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
const quiz = (
  id: string,
  title: string,
  description: string,
  category: string,
): Quiz => ({
  id,
  title,
  description,
  category,
  ownerId: 'owner',
  questionCount: 2,
  createdAt: '',
  updatedAt: '',
  isLibrary: true,
});
const quizzes = [
  quiz('one', 'Geografía', 'Países y capitales', 'Cultura general'),
  quiz('two', 'Programación', 'Tecnología digital', 'Tecnología'),
];
function SoundObserver() {
  return (
    <output data-testid="observed-sound">{String(useSoundMuted())}</output>
  );
}

describe('invitados, QR, filtros y ajustes', () => {
  beforeEach(async () => {
    clearAuthSession();
    sessionStorage.clear();
    localStorage.clear();
    await i18n.changeLanguage('es');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('precarga código normalizado y exige apodo antes de solicitar un token', async () => {
    const guest = vi.spyOn(authApi, 'guest');
    show(<JoinRoomPage />, '/join?code=k7m3qx');
    expect(screen.getByTestId('input-room-code')).toHaveValue('K7M3QX');
    expect(screen.getByTestId('input-join-display-name')).toBeRequired();
    fireEvent.click(screen.getByTestId('btn-join-room'));
    expect(await screen.findByTestId('error-banner')).toHaveTextContent(
      'apodo',
    );
    expect(guest).not.toHaveBeenCalled();
  });
  it('ignora código inválido del enlace', () => {
    show(<JoinRoomPage />, '/join?code=ABC012');
    expect(screen.getByTestId('input-room-code')).toHaveValue('');
  });
  it('obtiene token, guarda identidad de invitado antes del join y entra a jugar', async () => {
    vi.spyOn(authApi, 'guest').mockResolvedValue({
      accessToken: 'guest-jwt',
      tokenType: 'Bearer',
      expiresIn: 21600,
      guest: { id: 'guest-id', displayName: 'Ruby' },
    });
    const join = vi
      .spyOn(kahootApi, 'joinSession')
      .mockImplementation(async () => {
        expect(getStoredToken()).toBe('guest-jwt');
        return {} as never;
      });
    show(
      <Routes>
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/play/:code" element={<p>Jugando</p>} />
      </Routes>,
      '/join?code=K7M3QX',
    );
    fireEvent.change(screen.getByTestId('input-join-display-name'), {
      target: { value: '  Ruby  ' },
    });
    fireEvent.click(screen.getByTestId('btn-join-room'));
    expect(await screen.findByText('Jugando')).toBeVisible();
    expect(join).toHaveBeenCalledWith('K7M3QX', { displayName: 'Ruby' });
    expect(getStoredProfile()).toEqual({
      id: 'guest-id',
      displayName: 'Ruby',
      guest: true,
    });
    expect(
      JSON.parse(sessionStorage.getItem('profelink_auth_profile')!),
    ).toHaveProperty('guest', true);
  });
  it.each(['/quizzes', '/library', '/host/K7M3QX'])(
    'redirige invitado desde %s y oculta enlaces de docente',
    async (path) => {
      saveAuthSession('guest', {
        id: 'guest-id',
        displayName: 'Ruby',
        guest: true,
      });
      show(<App />, path);
      expect(await screen.findByTestId('input-room-code')).toBeVisible();
      expect(
        screen.queryByRole('link', { name: 'Mis cuestionarios' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Biblioteca' }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('nav-user-name')).toHaveTextContent('Ruby');
    },
  );
  it('redirige un enlace de juego sin sesión al formulario con su código', async () => {
    show(<App />, '/play/K7M3QX');
    expect(await screen.findByTestId('input-room-code')).toHaveValue('K7M3QX');
    expect(
      screen.getByRole('link', { name: 'Unirme con un código' }),
    ).toBeVisible();
  });
  it('genera QR SVG local y permite copiar el enlace', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: copy },
    });
    show(<RoomQr code="K7M3QX" />);
    expect(
      screen.getByRole('img', { name: /QR.*K7M3QX/ }).tagName.toLowerCase(),
    ).toBe('svg');
    expect(screen.getByTestId('room-join-link')).toHaveAttribute(
      'href',
      `${location.origin}/join?code=K7M3QX`,
    );
    fireEvent.click(screen.getByTestId('btn-copy-room-link'));
    await waitFor(() =>
      expect(copy).toHaveBeenCalledWith(`${location.origin}/join?code=K7M3QX`),
    );
    expect(await screen.findByText('Enlace copiado')).toBeVisible();
  });
  it('filtra Mis cuestionarios por título y descripción sin tildes y limpia el estado vacío', async () => {
    vi.spyOn(kahootApi, 'listQuizzes').mockResolvedValue(quizzes);
    show(<QuizzesPage />);
    await screen.findByTestId('quiz-card-one');
    fireEvent.change(screen.getByTestId('input-quiz-search'), {
      target: { value: 'PAISES' },
    });
    expect(screen.getByTestId('quiz-card-one')).toBeVisible();
    expect(screen.queryByTestId('quiz-card-two')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('input-quiz-search'), {
      target: { value: 'programacion' },
    });
    expect(screen.getByTestId('quiz-card-two')).toBeVisible();
    fireEvent.change(screen.getByTestId('input-quiz-search'), {
      target: { value: 'nada' },
    });
    expect(
      screen.getByText('No hay resultados para estos filtros.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByTestId('quiz-card-one')).toBeVisible();
    expect(screen.getByTestId('quiz-card-two')).toBeVisible();
  });
  it('combina búsqueda y categoría conservando agrupación en biblioteca', async () => {
    vi.spyOn(kahootApi, 'listLibrary').mockResolvedValue(quizzes);
    show(<LibraryPage />);
    await screen.findByTestId('library-card-one');
    fireEvent.change(screen.getByTestId('filter-category'), {
      target: { value: 'Tecnología' },
    });
    expect(screen.queryByTestId('library-card-one')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-card-two')).toBeVisible();
    fireEvent.change(screen.getByTestId('input-quiz-search'), {
      target: { value: 'DIGITAL' },
    });
    expect(screen.getByTestId('library-card-two')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    fireEvent.change(screen.getByTestId('input-quiz-search'), {
      target: { value: 'geografia' },
    });
    expect(screen.queryByTestId('library-card-two')).not.toBeInTheDocument();
  });
  it.each(['quizzes', 'library'])(
    'envía el avance elegido desde el formulario de %s',
    async (page) => {
      vi.spyOn(kahootApi, 'listQuizzes').mockResolvedValue(quizzes);
      vi.spyOn(kahootApi, 'listLibrary').mockResolvedValue(quizzes);
      const create = vi
        .spyOn(kahootApi, 'createSession')
        .mockResolvedValue({ code: 'K7M3QX' } as never);
      show(page === 'quizzes' ? <QuizzesPage /> : <LibraryPage />);
      fireEvent.click(
        await screen.findByTestId(
          page === 'quizzes' ? 'btn-host-quiz-one' : 'btn-host-library-one',
        ),
      );
      const select = screen.getByTestId('select-auto-advance');
      expect(select).toHaveValue('5');
      expect(
        [...select.querySelectorAll('option')].map((o) => o.value),
      ).toEqual(['0', '3', '5', '10', '15', '30']);
      fireEvent.change(select, { target: { value: '0' } });
      fireEvent.click(screen.getByTestId('btn-confirm-create-room'));
      await waitFor(() =>
        expect(create).toHaveBeenCalledWith({
          quizId: 'one',
          questionTimeSeconds: 20,
          autoAdvanceSeconds: 0,
        }),
      );
    },
  );
  it('abre ajustes, persiste idioma y sonido, sincroniza cambios externos y devuelve foco con Esc', async () => {
    show(
      <>
        <SettingsPanel />
        <SoundObserver />
      </>,
    );
    const button = screen.getByTestId('btn-settings');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    // Al abrir se ve el menú, no las opciones de idioma
    expect(screen.getByTestId('settings-language-toggle')).toHaveFocus();
    expect(screen.getByTestId('settings-language-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('language-selector')).not.toBeVisible();
    fireEvent.click(screen.getByTestId('settings-language-toggle'));
    expect(screen.getByTestId('settings-language-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('language-selector')).toBeVisible();
    fireEvent.change(screen.getByTestId('language-selector'), {
      target: { value: 'en' },
    });
    await waitFor(() =>
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en'),
    );
    fireEvent.click(screen.getByTestId('settings-sound'));
    expect(localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe('true');
    expect(screen.getByTestId('observed-sound')).toHaveTextContent('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByTestId('settings-sound')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.pointerDown(document.body);
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    cleanup();
    show(<SettingsPanel />);
    fireEvent.click(screen.getByTestId('btn-settings'));
    expect(screen.getByTestId('settings-sound')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByTestId('settings-sound'));
    expect(screen.getByTestId('settings-sound')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('mantiene sonido en memoria cuando localStorage no está disponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    show(<SettingsPanel />);
    fireEvent.click(screen.getByTestId('btn-settings'));
    fireEvent.click(screen.getByTestId('settings-sound'));
    expect(screen.getByTestId('settings-sound')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    cleanup();
    setSoundMuted(false);
  });
});
