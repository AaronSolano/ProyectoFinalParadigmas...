// UI checks against Vite, with isolated HTTP/Socket.IO fixtures. No Docker needed.
// npm run test:ui -w @rubymind/web
import { test, expect } from '@playwright/test';
import { Server } from 'socket.io';

let server;
let socketUrl;
const quizzes = Array.from({ length: 12 }, (_, index) => ({
  id: `library-${index}`,
  title: `Cuestionario de tecnología ${index + 1}`,
  category: 'Tecnología',
  questionCount: 10,
}));

test.beforeAll(async () => {
  server = new Server({ cors: { origin: '*' } });
  server.listen(0);
  await new Promise((resolve) => server.httpServer.once('listening', resolve));
  socketUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
  server.of('/game').on('connection', (socket) => {
    socket.on('session:join', ({ code }) => {
      socket.emit('state_sync', {
        code,
        status: 'waiting',
        isHost: socket.handshake.auth.token === 'host',
        participantId: null,
        totalQuestions: 1,
        currentQuestion: null,
        closesAt: null,
        serverTime: new Date().toISOString(),
        myScore: 0,
        hasAnswered: false,
        participants: Array.from(
          { length: code === 'MANY01' ? 80 : 4 },
          (_, i) => ({
            id: `player-${i}`,
            displayName:
              i === 0
                ? 'María Fernanda Solano Rodríguez'
                : `Participante ${i + 1}`,
          }),
        ),
      });
    });
    socket.on('session:start', () => {
      const now = Date.now();
      socket.emit('question:opened', {
        questionIndex: 0,
        total: 1,
        statement: '¿Cuál es la capital de Costa Rica?',
        options: ['San José', 'Cartago'],
        imageUrl: null,
        serverTime: new Date(now).toISOString(),
        openedAt: new Date(now).toISOString(),
        closesAt: new Date(now + 120000).toISOString(),
        durationSeconds: 120,
      });
    });
  });
});

test.afterAll(async () => {
  await server.close();
});

async function prepare(page, language = 'es', role = 'host') {
  await page.addInitScript(
    ({ language, role }) => {
      sessionStorage.setItem('profelink_auth_token', role);
      sessionStorage.setItem(
        'profelink_auth_profile',
        JSON.stringify({
          id: role,
          displayName: 'Docente',
          email: 'demo@example.com',
        }),
      );
      localStorage.setItem('profelink_lang', language);
    },
    { language, role },
  );
  await page.route('**/src/config/env.ts', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function getAppEnv() { return { authApiUrl: '', kahootApiUrl: '${socketUrl}', enableDebugControls: false }; }`,
    }),
  );
  await page.route('**/api/v1/library', (route) =>
    route.fulfill({ json: quizzes }),
  );
}

test('configura desde el final de la biblioteca sin perder posición ni foco', async ({
  page,
}) => {
  await prepare(page);
  await page.goto('/library');
  const trigger = page.getByTestId('btn-host-library-library-11');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  const scrollY = await page.evaluate(() => window.scrollY);
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(quizzes[11].title);
  await expect(page.getByTestId('input-question-time')).toBeFocused();
  // Native modal makes the background inert and keeps normal field navigation.
  expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
  await trigger.evaluate((el) => el.focus());
  await expect(page.getByTestId('input-question-time')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('select-auto-advance')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('input-question-time')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

  await trigger.click();
  await page.getByTestId('input-question-time').fill('30');
  await page.getByTestId('select-auto-advance').selectOption('10');
  let submission;
  await page.route('**/api/v1/sessions', async (route) => {
    submission = route.request().postDataJSON();
    await route.fulfill({
      status: 500,
      json: { code: 'INTERNAL_ERROR', message: 'Error' },
    });
  });
  await page.getByTestId('btn-confirm-create-room').click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  expect(submission).toEqual({
    quizId: 'library-11',
    questionTimeSeconds: 30,
    autoAdvanceSeconds: 10,
  });
  await page.route('**/api/v1/sessions', (route) =>
    route.fulfill({ json: { code: 'K7M3QX' } }),
  );
  await page.getByTestId('btn-confirm-create-room').click();
  await expect(page).toHaveURL(/\/host\/K7M3QX$/);
  await expect(page.getByTestId('btn-start-session')).toBeEnabled();
});

for (const language of ['es', 'en']) {
  test(`lobby compacto con participantes y QR, y sin código al iniciar (${language})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await prepare(page, language);
    await page.goto('/host/K7M3QX');
    const start = page.getByTestId('btn-start-session');
    await expect(start).toBeEnabled();
    await expect(
      page.getByTestId('lobby-participants-list').locator('li'),
    ).toHaveCount(4);
    const roster = await page.locator('.lobby-roster').boundingBox();
    const share = await page.locator('.lobby-share').boundingBox();
    expect(roster.x + roster.width).toBeLessThan(share.x);
    expect(Math.abs(roster.y - share.y)).toBeLessThan(2);
    const dimensions = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      viewport: innerHeight,
      width: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.width).toBe(dimensions.viewportWidth);
    await page.screenshot({
      path: test.info().outputPath(`lobby-${language}.png`),
      fullPage: true,
    });
    await start.click();
    await expect(page.getByTestId('question-open-view')).toBeVisible();
    await expect(page.getByTestId('room-code-display')).toHaveCount(0);
    await expect(page.getByTestId('room-qr')).toHaveCount(0);
    await expect(page.getByTestId('btn-toggle-sound')).toBeVisible();
  });
}

test('muchos participantes tienen scroll propio y no desplazan los controles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/host/MANY01');
  const list = page.getByTestId('lobby-participants-list');
  await expect(list.locator('li')).toHaveCount(80);
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await list.focus();
  await page.keyboard.press('End');
  await expect(list.locator('li').last()).toBeInViewport();
  await expect(page.getByTestId('btn-start-session')).toBeInViewport();
});

test('en móvil conserva controles, QR legible y modal sin desbordamiento horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto('/library');
  await page.getByTestId('btn-host-library-library-11').click();
  await expect(page.getByRole('dialog')).toBeInViewport();
  await page.screenshot({
    path: test.info().outputPath('modal-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.goto('/host/K7M3QX');
  await expect(page.getByTestId('btn-start-session')).toBeEnabled();
  const roster = await page.locator('.lobby-roster').boundingBox();
  const share = await page.locator('.lobby-share').boundingBox();
  expect(share.y).toBeGreaterThan(roster.y + roster.height);
  expect(
    (await page.getByTestId('room-qr').boundingBox()).width,
  ).toBeGreaterThanOrEqual(180);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: test.info().outputPath('lobby-mobile.png'),
    fullPage: true,
  });
});

test('participante conserva código en espera y acciones durante la partida', async ({
  page,
}) => {
  await prepare(page, 'es', 'participant');
  await page.goto('/play/K7M3QX');
  await expect(page.getByTestId('room-code-display')).toBeVisible();
  await expect(page.getByTestId('room-qr')).toHaveCount(0);
  await expect(
    page.getByTestId('lobby-participants-list').locator('li'),
  ).toHaveCount(4);
  for (const socket of server.of('/game').sockets.values())
    socket.emit('session:finished', { ranking: [] });
  await expect(page.getByTestId('room-code-display')).toHaveCount(0);
  await expect(page.getByTestId('btn-leave-session')).toBeVisible();
});
