export const DICTIONARY = {
  es: {
    appTitle: 'ProfeLink — Cliente Externo',
    appSubtitle: 'Consulta independiente de sesiones y resultados por API REST',
    langLabel: 'Idioma',
    configHeading: 'Configuración y credenciales',
    configHint:
      'Valores iniciales cargados desde config.json. Consume únicamente los endpoints documentados en OpenAPI.',
    labelAuthUrl: 'URL de auth-api',
    labelKahootUrl: 'URL de kahoot-api',
    labelEmail: 'Correo electrónico',
    labelPassword: 'Contraseña',
    labelSessionCode: 'Código de sesión (6 caracteres)',
    submitBtn: 'Autenticar y consultar sesión',
    submittingBtn: 'Consultando...',
    sessionHeading: 'Estado de la sesión',
    dtCode: 'Código',
    dtStatus: 'Estado',
    dtQtime: 'Tiempo por pregunta',
    dtProfile: 'Consultado como',
    resultsHeading: 'Resultados y clasificación final',
    thPos: 'Posición',
    thName: 'Participante',
    thCorrect: 'Aciertos',
    thScore: 'Puntaje',
    questionsCount: '{{count}} preguntas',
    emptyRanking: 'No hay participantes registrados en esta sesión.',
    roomNotFinishedNotice:
      'La sesión está en estado "{{status}}". Los resultados finales estarán disponibles cuando termine.',
    errors: {
      INVALID_CODE: 'El código de sesión debe tener 6 caracteres válidos (sin 0, O, 1 ni I).',
      INVALID_CREDENTIALS: 'Credenciales inválidas al autenticar contra auth-api.',
      UNAUTHORIZED: 'No autorizado (401). Verifica las credenciales configuradas.',
      FORBIDDEN: 'Acceso denegado (403). No tienes permiso para consultar esta sesión.',
      ROOM_NOT_FOUND: 'No se encontró ninguna sesión con el código indicado (404).',
      ROOM_NOT_FINISHED: 'La sesión aún no ha finalizado (409 ROOM_NOT_FINISHED).',
      NETWORK_ERROR: 'No se pudo conectar con la API configurada.',
    },
  },
  en: {
    appTitle: 'ProfeLink — External Client',
    appSubtitle: 'Independent session and results viewer via REST API',
    langLabel: 'Language',
    configHeading: 'Configuration & Credentials',
    configHint:
      'Initial values loaded from config.json. Consumes only the documented OpenAPI endpoints.',
    labelAuthUrl: 'auth-api URL',
    labelKahootUrl: 'kahoot-api URL',
    labelEmail: 'Email address',
    labelPassword: 'Password',
    labelSessionCode: 'Session code (6 chars)',
    submitBtn: 'Authenticate & fetch session',
    submittingBtn: 'Fetching...',
    sessionHeading: 'Session Status',
    dtCode: 'Code',
    dtStatus: 'Status',
    dtQtime: 'Time per question',
    dtProfile: 'Queried as',
    resultsHeading: 'Final Results & Leaderboard',
    thPos: 'Rank',
    thName: 'Participant',
    thCorrect: 'Correct',
    thScore: 'Score',
    questionsCount: '{{count}} questions',
    emptyRanking: 'No participants registered in this session.',
    roomNotFinishedNotice:
      'Session status is "{{status}}". Final results will be available once it finishes.',
    errors: {
      INVALID_CODE: 'Session code must be 6 valid characters (excluding 0, O, 1, and I).',
      INVALID_CREDENTIALS: 'Invalid credentials when authenticating with auth-api.',
      UNAUTHORIZED: 'Unauthorized (401). Check your configured credentials.',
      FORBIDDEN: 'Forbidden (403). You do not have permission to view this session.',
      ROOM_NOT_FOUND: 'No session was found with the specified code (404).',
      ROOM_NOT_FINISHED: 'The session has not finished yet (409 ROOM_NOT_FINISHED).',
      NETWORK_ERROR: 'Could not connect to the configured API.',
    },
  },
};

export function normalizeSessionCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase();
}

export function isValidSessionCode(code) {
  return /^[2-9A-HJ-NP-Z]{6}$/.test(normalizeSessionCode(code));
}

export function stripTrailingSlash(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

/**
 * Pure HTTP consumer that authenticates against auth-api and fetches session + results
 * from kahoot-api using only documented OpenAPI endpoints.
 */
export async function fetchSessionAndResults(config, fetchImpl = globalThis.fetch) {
  const authApiUrl = stripTrailingSlash(config.authApiUrl);
  const kahootApiUrl = stripTrailingSlash(config.kahootApiUrl);
  const code = normalizeSessionCode(config.sessionCode);

  if (!isValidSessionCode(code)) {
    const err = new Error('INVALID_CODE');
    err.code = 'INVALID_CODE';
    throw err;
  }

  let loginRes;
  try {
    loginRes = await fetchImpl(`${authApiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: String(config.email || '').trim(),
        password: String(config.password || ''),
      }),
    });
  } catch {
    const err = new Error('NETWORK_ERROR');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!loginRes.ok) {
    const body = await loginRes.json().catch(() => ({}));
    const err = new Error(body.message || 'INVALID_CREDENTIALS');
    err.code = body.code || (loginRes.status === 401 ? 'INVALID_CREDENTIALS' : 'UNAUTHORIZED');
    err.status = loginRes.status;
    throw err;
  }

  const authPayload = await loginRes.json();
  const token = authPayload.accessToken;
  const authHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  let sessionRes;
  try {
    sessionRes = await fetchImpl(`${kahootApiUrl}/api/v1/sessions/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: authHeaders,
    });
  } catch {
    const err = new Error('NETWORK_ERROR');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!sessionRes.ok) {
    const body = await sessionRes.json().catch(() => ({}));
    const err = new Error(body.message || 'ROOM_NOT_FOUND');
    err.code = body.code || (sessionRes.status === 404 ? 'ROOM_NOT_FOUND' : 'UNAUTHORIZED');
    err.status = sessionRes.status;
    throw err;
  }

  const session = await sessionRes.json();

  let results = null;
  let resultsPendingReason = null;

  const resultsRes = await fetchImpl(
    `${kahootApiUrl}/api/v1/sessions/${encodeURIComponent(code)}/results`,
    {
      method: 'GET',
      headers: authHeaders,
    },
  );

  if (resultsRes.ok) {
    results = await resultsRes.json();
  } else {
    const body = await resultsRes.json().catch(() => ({}));
    if (resultsRes.status === 409 || body.code === 'ROOM_NOT_FINISHED') {
      resultsPendingReason = 'ROOM_NOT_FINISHED';
    } else {
      const err = new Error(body.message || 'FORBIDDEN');
      err.code = body.code || (resultsRes.status === 403 ? 'FORBIDDEN' : 'ROOM_NOT_FOUND');
      err.status = resultsRes.status;
      throw err;
    }
  }

  return {
    profile: authPayload.profile,
    session,
    results,
    resultsPendingReason,
  };
}

export async function loadInitialConfig(fetchImpl = globalThis.fetch, locationSearch = null) {
  const defaults = {
    authApiUrl: 'http://localhost:3001',
    kahootApiUrl: 'http://localhost:3002',
    email: 'docente.demo@example.com',
    sessionCode: 'K7M3QX',
  };

  let fileConfig = {};
  if (typeof window !== 'undefined' && window.__EXTERNAL_CLIENT_CONFIG__) {
    fileConfig = window.__EXTERNAL_CLIENT_CONFIG__;
  } else {
    try {
      const res = await fetchImpl('./config.json', { cache: 'no-store' });
      if (res.ok) {
        fileConfig = await res.json();
      }
    } catch {
      // Fallback to defaults if config.json is not reachable
    }
  }

  const merged = {
    authApiUrl: fileConfig.authApiUrl ?? defaults.authApiUrl,
    kahootApiUrl: fileConfig.kahootApiUrl ?? defaults.kahootApiUrl,
    email: fileConfig.email ?? defaults.email,
    sessionCode: fileConfig.sessionCode ?? defaults.sessionCode,
  };

  const rawSearch =
    locationSearch !== null
      ? locationSearch
      : typeof window !== 'undefined' && window.location?.search
        ? window.location.search
        : '';

  if (rawSearch) {
    const params = new URLSearchParams(rawSearch);
    if (params.get('authApiUrl')) merged.authApiUrl = params.get('authApiUrl');
    if (params.get('kahootApiUrl')) merged.kahootApiUrl = params.get('kahootApiUrl');
    if (params.get('email')) merged.email = params.get('email');
    if (params.get('code')) merged.sessionCode = params.get('code');
    // Por seguridad, ?password= se ignora deliberadamente: la contraseña solo se ingresa en el formulario.
  }

  return merged;
}

export function initBrowserApp() {
  if (typeof document === 'undefined') {
    return;
  }

  let currentLang = 'es';
  const langSelect = document.getElementById('lang-select');
  const form = document.getElementById('query-form');
  const inputAuthUrl = document.getElementById('input-auth-url');
  const inputKahootUrl = document.getElementById('input-kahoot-url');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const inputSessionCode = document.getElementById('input-session-code');
  const errorBox = document.getElementById('error-box');
  const sessionCard = document.getElementById('session-card');
  const resultsCard = document.getElementById('results-card');

  const applyTranslations = () => {
    const t = DICTIONARY[currentLang];
    document.documentElement.lang = currentLang;
    document.getElementById('app-title').textContent = t.appTitle;
    document.getElementById('app-subtitle').textContent = t.appSubtitle;
    document.getElementById('lang-label').textContent = t.langLabel;
    document.getElementById('config-heading').textContent = t.configHeading;
    document.getElementById('config-hint').textContent = t.configHint;
    document.getElementById('label-auth-url').textContent = t.labelAuthUrl;
    document.getElementById('label-kahoot-url').textContent = t.labelKahootUrl;
    document.getElementById('label-email').textContent = t.labelEmail;
    document.getElementById('label-password').textContent = t.labelPassword;
    document.getElementById('label-session-code').textContent = t.labelSessionCode;
    document.getElementById('btn-submit').textContent = t.submitBtn;
    document.getElementById('session-heading').textContent = t.sessionHeading;
    document.getElementById('dt-code').textContent = t.dtCode;
    document.getElementById('dt-status').textContent = t.dtStatus;
    document.getElementById('dt-qtime').textContent = t.dtQtime;
    document.getElementById('dt-profile').textContent = t.dtProfile;
    document.getElementById('results-heading').textContent = t.resultsHeading;
    document.getElementById('th-pos').textContent = t.thPos;
    document.getElementById('th-name').textContent = t.thName;
    document.getElementById('th-correct').textContent = t.thCorrect;
    document.getElementById('th-score').textContent = t.thScore;
  };

  langSelect?.addEventListener('change', (e) => {
    currentLang = e.target.value === 'en' ? 'en' : 'es';
    applyTranslations();
  });

  const renderOutcome = (outcome) => {
    const t = DICTIONARY[currentLang];
    errorBox.classList.add('hidden');
    sessionCard.classList.remove('hidden');

    document.getElementById('dd-code').textContent = outcome.session.code;
    document.getElementById('dd-status').textContent = outcome.session.status;
    document.getElementById('dd-qtime').textContent = `${outcome.session.questionTimeSeconds} s`;
    document.getElementById('dd-profile').textContent =
      `${outcome.profile.displayName} (${outcome.profile.email})`;

    if (outcome.results) {
      resultsCard.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent = outcome.results.quizTitle;
      document.getElementById('results-badge').textContent = t.questionsCount.replace(
        '{{count}}',
        String(outcome.results.totalQuestions),
      );
      const tbody = document.getElementById('ranking-tbody');
      tbody.innerHTML = '';
      if (!outcome.results.ranking || outcome.results.ranking.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = t.emptyRanking;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        for (const row of outcome.results.ranking) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${row.position}</td>
            <td></td>
            <td>${row.correctAnswers} / ${outcome.results.totalQuestions}</td>
            <td><strong>${row.score} pts</strong></td>
          `;
          tr.children[1].textContent = row.displayName;
          tbody.appendChild(tr);
        }
      }
    } else {
      resultsCard.classList.add('hidden');
      if (outcome.resultsPendingReason === 'ROOM_NOT_FINISHED') {
        errorBox.textContent = t.roomNotFinishedNotice.replace(
          '{{status}}',
          outcome.session.status,
        );
        errorBox.classList.remove('hidden');
      }
    }
  };

  const runQuery = async () => {
    const t = DICTIONARY[currentLang];
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = t.submittingBtn;
    errorBox.classList.add('hidden');

    try {
      const outcome = await fetchSessionAndResults({
        authApiUrl: inputAuthUrl.value,
        kahootApiUrl: inputKahootUrl.value,
        email: inputEmail.value,
        password: inputPassword.value,
        sessionCode: inputSessionCode.value,
      });
      renderOutcome(outcome);
    } catch (err) {
      sessionCard.classList.add('hidden');
      resultsCard.classList.add('hidden');
      const code = err?.code || 'NETWORK_ERROR';
      errorBox.textContent = t.errors[code] || err?.message || t.errors.NETWORK_ERROR;
      errorBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = t.submitBtn;
    }
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    void runQuery();
  });

  applyTranslations();

  void loadInitialConfig().then((cfg) => {
    inputAuthUrl.value = cfg.authApiUrl || '';
    inputKahootUrl.value = cfg.kahootApiUrl || '';
    inputEmail.value = cfg.email || '';
    inputPassword.value = '';
    inputSessionCode.value = cfg.sessionCode || '';
  });
}

initBrowserApp();
