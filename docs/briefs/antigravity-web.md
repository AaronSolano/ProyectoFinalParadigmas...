# Brief para Antigravity — Fase 5: `apps/web`

> Este brief es autocontenido. Puedes avanzar **sin backend** usando mocks generados desde los contratos; la integración real es la última tarea.

## Contexto
Plataforma de evaluaciones en vivo tipo Kahoot (Verdadero/Falso) para ProfeLink, curso EIF400. Implementas **`apps/web`**: la interfaz para creadores, anfitriones y participantes, en computadora y celular, en **español e inglés**. El frontend solo presenta estado: el servidor decide tiempos, respuestas y puntajes.

Lee en este orden:
1. `AGENTS.md`.
2. `openspec/changes/f5-frontend/` (proposal, design, `specs/ui/web-client/spec.md`, tasks).
3. **Contratos obligatorios:** `packages/contracts/openapi/auth-api.yaml`, `packages/contracts/openapi/kahoot-api.yaml`, `packages/contracts/events/README.md` y `events/schemas/*.json`.
4. `.env.example` (variables `VITE_*`).

## Rama y carpetas
- Rama: `feat/f5-antigravity` desde `main`.
- **Solo puedes editar `apps/web/**`.** No modifiques `packages/contracts`, `openspec/`, `docs/`, `infra/` ni las APIs. Si el contrato es insuficiente o contradictorio, no lo cambies: documéntalo en el PR.

## Stack fijado
React 18 + Vite + TypeScript estricto, paquete `@profelink/web`. React Router, TanStack Query, `socket.io-client`, `i18next` + `react-i18next` (diccionarios `es` y `en`), Vitest + Testing Library. Estilos con CSS modules o Tailwind (elige uno y sé consistente). Tipos del cliente de API **generados** desde el OpenAPI con `openapi-typescript` (script `npm run gen:api -w @profelink/web`); no escribas a mano tipos que ya estén en el contrato.

## Configuración
Solo por variables Vite: `VITE_AUTH_API_URL` (3001) y `VITE_KAHOOT_API_URL` (3002). Nada de URLs fijas en el código. El socket se conecta a `${VITE_KAHOOT_API_URL}/game` con `auth: { token }`.

## Pantallas y flujos
1. **Registro / inicio de sesión** (`auth-api`). Guardar el token en memoria + `sessionStorage`; cerrar sesión limpia ambos.
2. **Mis cuestionarios:** listar, crear, editar y eliminar; preguntas con enunciado (≤500), respuesta Verdadero/Falso y **carga de imagen** (PNG/JPEG/WebP, ≤2 MiB; validar antes de subir y mostrar el error del servidor 413/415).
3. **Crear sala:** elegir cuestionario y tiempo por pregunta (5–120 s) → mostrar el **código** grande y el lobby en vivo (`participant:joined/left`).
4. **Control del anfitrión:** iniciar, mostrar pregunta, cerrar y avanzar; ver cuántos respondieron y la clasificación.
5. **Unirse:** ingresar el código (`^[2-9A-HJ-NP-Z]{6}$`, normalizar a mayúsculas) con mensaje claro si no existe (`ROOM_NOT_FOUND`) o ya inició (`ROOM_CLOSED`).
6. **Pantalla del participante:** enunciado, imagen, cuenta regresiva y **dos botones grandes Verdadero / Falso**. Tras responder, bloquear los botones y confirmar con `answer:accepted`; mostrar `answer:rejected` según su `reason`.
7. **Resultados por pregunta** (`question:closed`: respuesta correcta, si acertó, puntos) y **clasificación final** (`session:finished`).
8. **Reconexión:** al perder el socket mostrar aviso de "reconectando…", reintentar con backoff y, al volver, aplicar `state_sync` sin recargar ni duplicar nada.
9. **Errores claros** de acceso (401/403), de conexión (sin red, `unauthorized` en el handshake) y de código de sala.
10. **Idioma:** selector ES/EN; detectar el idioma del navegador al inicio y guardar la preferencia en `localStorage` (con `try/catch`).

## Reglas de comportamiento (importantes)
- **No calcules nada de juego en el cliente:** ni puntajes, ni si una respuesta es correcta, ni cuándo cierra. La cuenta regresiva se deriva de `closesAt` y `serverTime` (calcula el desfase `serverTime - Date.now()` al recibir cada evento).
- `correctAnswer` solo aparece en `question:closed`; nunca lo pidas por REST durante la partida.
- Al reconectar, el estado de la UI se reconstruye **solo** desde `state_sync`.
- Mobile-first: probar en 360×640; sin scroll horizontal; botones de juego de al menos 56 px de alto y alto contraste; foco visible y etiquetas accesibles.

## Mocks para trabajar sin backend
- REST: `npx @stoplight/prism-cli mock packages/contracts/openapi/kahoot-api.yaml -p 4010` (y otro para `auth-api` en 4011). Documenta en el README del paquete el script `npm run mock -w @profelink/web`.
- Tiempo real: un pequeño servidor Socket.IO de mock (en `apps/web/mocks/`) que emita la secuencia del catálogo (`state_sync` → `question:opened` → `question:closed` → `session:finished`) y permita simular una desconexión.

## Tareas (de `openspec/changes/f5-frontend/tasks.md`)
1.1 Base con enrutado, cliente tipado e i18n ES/EN · 1.2 Mocks · 2.1 Registro/login · 2.2 Cuestionarios con imágenes · 3.1 Sala y lobby · 3.2 Ingreso por código · 3.3 Pantalla del participante · 3.4 Resultados y clasificación · 3.5 Desconexión y reconexión · 4.1 Integración con las APIs reales (cuando `kahoot-api` y `auth-api` estén fusionadas).

## Definición de terminado
- `npm ci && npm run lint && npm test && npm run build` pasan.
- Pruebas de componentes de: botones Verdadero/Falso (un solo envío), cuenta regresiva a partir de `closesAt`, selector de idioma y errores de código de sala.
- Una partida completa con los mocks en dos ventanas de navegador y en viewport de celular (captura o descripción en el PR).
- Sin secretos ni URLs fijas.

## Entrega
- Commits pequeños; **PR hacia `main`** `Fase 5: apps/web` con: qué hiciste, cómo ejecutar los mocks, capturas, desviaciones del contrato y pendientes.
- No hagas merge; lo revisa el orquestador (Claude Code).
- Lista en el PR las tareas verificadas de `openspec/changes/f5-frontend/tasks.md`.
- Las pruebas e2e con Playwright son de la Fase 7 (no las hagas ahora).
