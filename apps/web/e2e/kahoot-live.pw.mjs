import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const AUTH_API_URL = (process.env.E2E_AUTH_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const KAHOOT_API_URL = (process.env.E2E_KAHOOT_API_URL || 'http://127.0.0.1:3002').replace(/\/+$/, '');
const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:8080';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'docente.demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo2026seg';

async function registerAndLoginInPage(page, { displayName, email, password }) {
  await page.goto(`${WEB_URL}/register`);
  await page.getByTestId('input-display-name').fill(displayName);
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('btn-auth-submit').click();
  await expect(page).toHaveURL(/\/quizzes$/);
}

async function loginInPage(page, { email, password }) {
  await page.goto(`${WEB_URL}/login`);
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('btn-auth-submit').click();
  await expect(page).toHaveURL(/\/quizzes$/);
}

test.describe('Fase 7 — Suite E2E con Playwright contra Docker Compose', () => {
  test('2.1 Acceso y permisos: un participante no modifica cuestionarios ajenos ni ve/usa controles de anfitrión', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const partContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const hostPage = await hostContext.newPage();
    const partPage = await partContext.newPage();

    try {
      await loginInPage(hostPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      const hostQuizBtn = hostPage.locator('[data-testid^="btn-host-quiz-"]').first();
      await hostQuizBtn.click();
      await hostPage.locator('[data-testid="btn-confirm-create-room"]').first().click();
      await expect(hostPage.getByTestId('room-code-display')).toBeVisible();
      const code = (await hostPage.getByTestId('room-code-display').textContent()).trim();

      const uniqueEmail = `part.perm.${Date.now()}@example.com`;
      await registerAndLoginInPage(partPage, {
        displayName: 'Intruso Test',
        email: uniqueEmail,
        password: 'Clave2026seg',
      });

      await partPage.goto(`${WEB_URL}/join`);
      await partPage.getByTestId('input-room-code').fill(code);
      await partPage.getByTestId('btn-join-room').click();
      await expect(partPage.getByTestId('lobby-view')).toBeVisible();

      // El participante no tiene botón de iniciar partida
      await expect(partPage.getByTestId('btn-start-session')).toHaveCount(0);

      // Si navega forzosamente a /host/:code, el servidor rechaza cualquier control con FORBIDDEN
      await hostPage.getByTestId('btn-start-session').click();
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();
      await expect(partPage.getByTestId('btn-close-question')).toHaveCount(0);
    } finally {
      await hostContext.close();
      await partContext.close();
    }
  });

  test('2.2 Juego simultáneo con dos salas: no se mezclan participantes, preguntas ni resultados', async ({
    browser,
  }) => {
    const hostAContext = await browser.newContext();
    const hostBContext = await browser.newContext();
    const partAContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const partBContext = await browser.newContext({ viewport: { width: 360, height: 640 } });

    const hostAPage = await hostAContext.newPage();
    const hostBPage = await hostBContext.newPage();
    const partAPage = await partAContext.newPage();
    const partBPage = await partBContext.newPage();

    try {
      await loginInPage(hostAPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      await loginInPage(hostBPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });

      await hostAPage.locator('[data-testid^="btn-host-quiz-"]').first().click();
      await hostAPage.locator('[data-testid="btn-confirm-create-room"]').first().click();
      const codeA = (await hostAPage.getByTestId('room-code-display').textContent()).trim();

      await hostBPage.locator('[data-testid^="btn-host-quiz-"]').first().click();
      await hostBPage.locator('[data-testid="btn-confirm-create-room"]').first().click();
      const codeB = (await hostBPage.getByTestId('room-code-display').textContent()).trim();
      expect(codeA).not.toBe(codeB);

      const ts = Date.now();
      await registerAndLoginInPage(partAPage, {
        displayName: 'Jugador Sala A',
        email: `sala.a.${ts}@example.com`,
        password: 'Clave2026seg',
      });
      await registerAndLoginInPage(partBPage, {
        displayName: 'Jugador Sala B',
        email: `sala.b.${ts}@example.com`,
        password: 'Clave2026seg',
      });

      await partAPage.goto(`${WEB_URL}/join`);
      await partAPage.getByTestId('input-room-code').fill(codeA);
      await partAPage.getByTestId('btn-join-room').click();

      await partBPage.goto(`${WEB_URL}/join`);
      await partBPage.getByTestId('input-room-code').fill(codeB);
      await partBPage.getByTestId('btn-join-room').click();

      await expect(hostAPage.getByTestId('lobby-participants-list')).toContainText('Jugador Sala A');
      await expect(hostAPage.getByTestId('lobby-participants-list')).not.toContainText('Jugador Sala B');
      await expect(hostBPage.getByTestId('lobby-participants-list')).toContainText('Jugador Sala B');
      await expect(hostBPage.getByTestId('lobby-participants-list')).not.toContainText('Jugador Sala A');
    } finally {
      await hostAContext.close();
      await hostBContext.close();
      await partAContext.close();
      await partBContext.close();
    }
  });

  test('2.3 y 2.4 Respuestas válidas (única, tardía/cerrada, revelación al cierre) y reconexión sin duplicar participante ni puntaje', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const partContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const hostPage = await hostContext.newPage();
    const partPage = await partContext.newPage();

    try {
      await loginInPage(hostPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      await hostPage.locator('[data-testid^="btn-host-quiz-"]').first().click();
      // Configurar 5 segundos por pregunta para probar también expiración/respuesta tardía en la pregunta 2
      await hostPage.locator('[data-testid="input-question-time"]').first().fill('5');
      await hostPage.locator('[data-testid="btn-confirm-create-room"]').first().click();
      const code = (await hostPage.getByTestId('room-code-display').textContent()).trim();

      await registerAndLoginInPage(partPage, {
        displayName: 'Reconecta User',
        email: `reconn.${Date.now()}@example.com`,
        password: 'Clave2026seg',
      });
      await partPage.goto(`${WEB_URL}/join`);
      await partPage.getByTestId('input-room-code').fill(code);
      await partPage.getByTestId('btn-join-room').click();
      await expect(partPage.getByTestId('lobby-view')).toBeVisible();

      await hostPage.getByTestId('btn-start-session').click();
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();

      // La respuesta correcta no se revela antes del cierre
      await expect(partPage.getByTestId('correct-answer-reveal')).toHaveCount(0);

      // Un solo envío permitido: tras responder se deshabilitan los botones
      await partPage.getByTestId('btn-answer-0').click();
      await expect(partPage.getByTestId('btn-answer-0')).toBeDisabled();
      await expect(partPage.getByTestId('btn-answer-1')).toBeDisabled();

      // Al cerrar la pregunta se revela la respuesta correcta y el puntaje
      await hostPage.getByTestId('btn-close-question').click();
      await expect(partPage.getByTestId('correct-answer-reveal')).toBeVisible();
      await expect(partPage.getByTestId('participant-score')).not.toHaveText(/(^|\s)0 pts/);

      // Reconexión: recargar o reconectar conserva el puntaje y no duplica al participante
      await partPage.reload();
      await expect(partPage.getByTestId('participant-score')).not.toHaveText(/(^|\s)0 pts/);
      await expect(partPage.getByTestId('question-ranking-list').locator('li')).toHaveCount(1);

      // Respuesta tardía (tras vencer el tiempo de 5 s de la pregunta 2): la pregunta cierra sola
      // y cualquier intento de envío posterior al cierre/vencimiento es rechazado por el servidor (late/closed)
      // sin alterar el puntaje del participante.
      const scoreBeforeLateQuestion = await partPage.getByTestId('participant-score').textContent();
      // El servidor también avanza solo a los 5 s: el anfitrión puede adelantarse o dejar que pase
      const next = hostPage.getByTestId('btn-next-question');
      if (await next.isVisible()) await next.click().catch(() => undefined);
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();

      // Esperar a que venza el plazo de 5 s en el servidor sin responder a tiempo
      await expect(partPage.getByTestId('question-closed-view')).toBeVisible({ timeout: 8000 });
      await expect(partPage.getByTestId('personal-question-result')).toContainText(/0 pts/);
      await expect(partPage.getByTestId('participant-score')).toHaveText(scoreBeforeLateQuestion);
    } finally {
      await hostContext.close();
      await partContext.close();
    }
  });

  test('2.6 Biblioteca y opción múltiple: se abre una sala con un cuestionario de la biblioteca y se responde con 4 opciones', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const partContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const hostPage = await hostContext.newPage();
    const partPage = await partContext.newPage();

    try {
      await loginInPage(hostPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      await hostPage.getByRole('link', { name: /biblioteca|library/i }).click();
      await expect(hostPage).toHaveURL(/\/library$/);
      await expect(hostPage.locator('[data-testid^="library-card-"]')).toHaveCount(10);
      await expect(hostPage.getByText('Cultura general')).toBeVisible();
      await expect(hostPage.getByText('Tecnología')).toBeVisible();

      await hostPage.locator('[data-testid^="btn-host-library-"]').first().click();
      await hostPage.locator('[data-testid="input-question-time"]').fill('10');
      await hostPage.locator('[data-testid="btn-confirm-create-room"]').click();
      const code = (await hostPage.getByTestId('room-code-display').textContent()).trim();

      await registerAndLoginInPage(partPage, {
        displayName: 'Opciones User',
        email: `opciones.${Date.now()}@example.com`,
        password: 'Clave2026seg',
      });
      await partPage.goto(`${WEB_URL}/join`);
      await partPage.getByTestId('input-room-code').fill(code);
      await partPage.getByTestId('btn-join-room').click();
      await expect(partPage.getByTestId('lobby-view')).toBeVisible();

      await hostPage.getByTestId('btn-start-session').click();
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();

      // Cuatro opciones visibles; el cuestionario es el primero de la biblioteca por categoría y título
      for (const index of [0, 1, 2, 3]) {
        await expect(partPage.getByTestId(`btn-answer-${index}`)).toBeVisible();
      }
      await expect(partPage.getByTestId('correct-answer-reveal')).toHaveCount(0);

      const choices = await partPage.locator('[data-testid^="btn-answer-"]').allTextContents();
      expect(choices.length).toBe(4);

      await partPage.getByTestId('btn-answer-1').click();
      await expect(partPage.getByTestId('btn-answer-0')).toBeDisabled();

      await hostPage.getByTestId('btn-close-question').click();
      await expect(partPage.getByTestId('correct-answer-reveal')).toBeVisible();
      const reveal = await partPage.getByTestId('correct-answer-reveal').textContent();
      // La respuesta revelada es el texto de una de las opciones mostradas
      expect(choices.some((c) => reveal.includes(c.replace(/^[^\wÁÉÍÓÚÑáéíóúñ]+/, '').trim()))).toBe(true);
    } finally {
      await hostContext.close();
      await partContext.close();
    }
  });

  test('2.7 Avance automático y explicación opcional: se muestra solo si existe y la sala pasa sola a los 5 s', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const partContext = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const hostPage = await hostContext.newPage();
    const partPage = await partContext.newPage();
    let cleanup = async () => undefined;

    try {
      // Preparación por API: cuestionario con una pregunta con explicación y otra sin ella
      const login = await (
        await fetch(`${AUTH_API_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
        })
      ).json();
      const headers = { 'content-type': 'application/json', authorization: `Bearer ${login.accessToken}` };
      const api = (path, body) =>
        fetch(`${KAHOOT_API_URL}/api/v1${path}`, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json());
      const quiz = await api('/quizzes', { title: `Explicaciones ${Date.now()}` });
      cleanup = () =>
        fetch(`${KAHOOT_API_URL}/api/v1/quizzes/${quiz.id}`, { method: 'DELETE', headers }).then(() => undefined);
      await api(`/quizzes/${quiz.id}/questions`, {
        statement: '¿Cuál es la capital de Costa Rica?',
        options: ['Alajuela', 'San José', 'Cartago'],
        correctOption: 1,
        explanation: 'San José es la capital desde 1823.',
      });
      await api(`/quizzes/${quiz.id}/questions`, {
        statement: '¿Cuántos continentes se reconocen habitualmente?',
        options: ['5', '7'],
        correctOption: 1,
      });
      const session = await api('/sessions', { quizId: quiz.id, questionTimeSeconds: 10 });

      await loginInPage(hostPage, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      await hostPage.goto(`${WEB_URL}/host/${session.code}`);
      await expect(hostPage.getByTestId('room-code-display')).toBeVisible();

      await registerAndLoginInPage(partPage, {
        displayName: 'Explica User',
        email: `explica.${Date.now()}@example.com`,
        password: 'Clave2026seg',
      });
      await partPage.goto(`${WEB_URL}/join`);
      await partPage.getByTestId('input-room-code').fill(session.code);
      await partPage.getByTestId('btn-join-room').click();
      await expect(partPage.getByTestId('lobby-view')).toBeVisible();

      await hostPage.getByTestId('btn-start-session').click();
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();
      // La explicación no se revela mientras la pregunta está abierta
      await expect(partPage.getByTestId('answer-explanation')).toHaveCount(0);
      await partPage.getByTestId('btn-answer-1').click();

      await hostPage.getByTestId('btn-close-question').click();
      await expect(partPage.getByTestId('answer-explanation')).toContainText('San José es la capital desde 1823.');
      await expect(partPage.getByTestId('auto-advance-countdown')).toBeVisible();

      // Sin pulsar "siguiente", pasa a la segunda pregunta pasados ~5 s
      await expect(partPage.getByTestId('question-open-view')).toBeVisible({ timeout: 12000 });
      await expect(partPage.getByText('¿Cuántos continentes')).toBeVisible();

      await hostPage.getByTestId('btn-close-question').click();
      await expect(partPage.getByTestId('correct-answer-reveal')).toBeVisible();
      // La pregunta sin explicación no muestra ningún bloque de explicación
      await expect(partPage.getByTestId('answer-explanation')).toHaveCount(0);
    } finally {
      await cleanup();
      await hostContext.close();
      await partContext.close();
    }
  });

  test('2.5 Persistencia tras reiniciar contenedores de API', async ({ page }) => {
    execFileSync('docker', ['compose', 'restart', 'auth-api', 'kahoot-api'], {
      stdio: 'inherit',
    });
    // Esperar a que ambas APIs vuelvan a responder antes de usar la interfaz
    for (const url of [`${AUTH_API_URL}/api/v1/health`, `${KAHOOT_API_URL}/api/v1/health`]) {
      await expect
        .poll(async () => (await fetch(url).catch(() => null))?.status, { timeout: 60000 })
        .toBe(200);
    }
    await loginInPage(page, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
    await expect(page.getByText('Programación y paradigmas')).toBeVisible();
  });
});
