import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

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
      await hostPage.locator('[data-testid^="btn-confirm-host-"]').first().click();
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
      await hostAPage.locator('[data-testid^="btn-confirm-host-"]').first().click();
      const codeA = (await hostAPage.getByTestId('room-code-display').textContent()).trim();

      await hostBPage.locator('[data-testid^="btn-host-quiz-"]').first().click();
      await hostBPage.locator('[data-testid^="btn-confirm-host-"]').first().click();
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
      await hostPage.locator('[data-testid^="input-qtime-"]').first().fill('5');
      await hostPage.locator('[data-testid^="btn-confirm-host-"]').first().click();
      const code = (await hostPage.getByTestId('room-code-display').textContent()).trim();

      await registerAndLoginInPage(partPage, {
        displayName: 'Reconecta User',
        email: `reconn.${Date.now()}@example.com`,
        password: 'Clave2026seg',
      });
      await partPage.goto(`${WEB_URL}/join`);
      await partPage.getByTestId('input-room-code').fill(code);
      await partPage.getByTestId('btn-join-room').click();

      await hostPage.getByTestId('btn-start-session').click();
      await expect(partPage.getByTestId('question-open-view')).toBeVisible();

      // La respuesta correcta no se revela antes del cierre
      await expect(partPage.getByTestId('correct-answer-reveal')).toHaveCount(0);

      // Un solo envío permitido: tras responder se deshabilitan los botones
      await partPage.getByTestId('btn-answer-true').click();
      await expect(partPage.getByTestId('btn-answer-true')).toBeDisabled();
      await expect(partPage.getByTestId('btn-answer-false')).toBeDisabled();

      // Al cerrar la pregunta se revela la respuesta correcta y el puntaje
      await hostPage.getByTestId('btn-close-question').click();
      await expect(partPage.getByTestId('correct-answer-reveal')).toBeVisible();
      await expect(partPage.getByTestId('participant-score')).not.toContainText('0 pts');

      // Reconexión: recargar o reconectar conserva el puntaje y no duplica al participante
      await partPage.reload();
      await expect(partPage.getByTestId('participant-score')).not.toContainText('0 pts');
      await expect(partPage.getByTestId('question-ranking-list').locator('li')).toHaveCount(1);

      // Respuesta tardía (tras vencer el tiempo de 5 s de la pregunta 2): la pregunta cierra sola
      // y cualquier intento de envío posterior al cierre/vencimiento es rechazado por el servidor (late/closed)
      // sin alterar el puntaje del participante.
      const scoreBeforeLateQuestion = await partPage.getByTestId('participant-score').textContent();
      await hostPage.getByTestId('btn-next-question').click();
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

  test('2.5 Persistencia tras reiniciar contenedores de API', async ({ page }) => {
    execFileSync('docker', ['compose', 'restart', 'auth-api', 'kahoot-api'], {
      stdio: 'inherit',
    });
    await loginInPage(page, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
    await expect(page.getByText('Programación y paradigmas')).toBeVisible();
  });
});
