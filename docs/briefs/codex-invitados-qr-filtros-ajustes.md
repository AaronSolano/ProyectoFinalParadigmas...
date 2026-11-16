# Brief para Codex: invitados, QR, filtros, ajustes y avance automático por sala

Carpetas: `apps/auth-api`, `apps/kahoot-api`, `apps/web`. Rama sugerida: `feat/invitados-qr-codex`. Partir de `main` actualizado.
Los cambios de `packages/contracts` los hace Claude Code (orquestador) y llegan a `main` antes que este trabajo; si no están, pídelos.

Reglas que no se rompen: el servidor es la única fuente de tiempo y estado; la respuesta correcta y la explicación solo viajan en `question:closed`; interfaz en español e inglés; mobile-first; conservar los `data-testid` existentes (los e2e dependen de ellos); sin secretos en el repo.

## 1. Avance automático ajustable por quien crea la sala

Hoy `AUTO_ADVANCE_SECONDS` (5 por defecto, 0 = apagado) es global. Pasa a ser **por sala**.
- Contrato: `SessionInput.autoAdvanceSeconds` (entero 0..60, por defecto el valor global) y `Session.autoAdvanceSeconds` (requerido).
- API: migración `sessions.auto_advance_seconds integer NOT NULL DEFAULT 5 CHECK (0..60)`; `createSession` lo guarda; `GameSession.autoAdvanceMs` se lee de la sala y se usa en `closeQuestion` (`nextQuestionAt`), `scheduleAdvance` y `recover` (las salas con pregunta cerrada reanudan su temporizador con su propio valor). `GameService` deja de recibir un valor global.
- Web: selector en los dos formularios de crear sala (Mis cuestionarios y Biblioteca): Desactivado, 3, 5, 10, 15, 30 s, con texto de ayuda. Valor por defecto 5 s.
- Pruebas: live.spec (sala con 1 s avanza sola; sala con 0 no avanza y `nextQuestionAt` es null; 61 -> 400) y migración.

## 2. Entrar sin cuenta (invitado) con apodo y código

La persona abre la app, escribe **apodo + código de sala** y juega, sin registrarse ni iniciar sesión.
- Contrato: `POST /auth/guest { displayName (2..40) }` -> `201 { accessToken, tokenType, expiresIn, guest: { id, displayName } }`. Sin `security`.
- auth-api: emite un JWT RS256 **efímero** (por defecto 6 h, `JWT_GUEST_EXPIRES_IN`) con `sub` = UUID v4 nuevo, `name` = apodo, `guest: true`, sin correo. **No** se guarda perfil ni nada en la base. `/auth/me` con un token de invitado responde 401 (no tiene perfil).
- kahoot-api: `AuthGuard` expone `identity.guest`. Un `AccountGuard` (hereda de `AuthGuard`) responde **403 FORBIDDEN** a invitados en: `/quizzes/**`, `/library/**`, `GET /sessions` y `POST /sessions`. Un invitado **sí** puede: `GET /sessions/:code`, `POST /sessions/:code/join`, `GET /sessions/:code/participants` y el canal Socket.IO (unirse y responder). Nunca controla una sala ajena (ya lo impide `hostId`).
- Seguridad: un invitado jamás puede crear/editar cuestionarios, abrir salas ni leer la biblioteca; el apodo se recorta y se limita a 40; añadir pruebas de 403 por cada ruta bloqueada y de que el invitado juega una partida completa (responde, ve resultado, reconecta).
- Web: `/join` pasa a ser pública. Sin sesión muestra **apodo (obligatorio) + código**; al enviar llama `POST /auth/guest`, guarda el token como sesión de invitado (marcar `guest` en el almacenamiento y en `AuthContext`: `isGuest`, `joinAsGuest(nombre)`), hace `join` y entra a `/play/:code`. `/play/:code` sin sesión redirige a `/join?code=CODE`. Las rutas de docente (`/quizzes`, `/library`, `/host`) redirigen a un invitado a `/join`. En la barra: sin sesión, enlace «Unirme con un código» junto a Iniciar sesión / Registrarse; con invitado, «Hola, {apodo}» y «Salir», sin enlaces de docente. Para quien ya tiene cuenta, `/join` sigue como hoy (nombre opcional).
- Pruebas: auth-api (guest válido, apodo inválido, `/me` 401), kahoot-api (403 por ruta, partida completa como invitado), web (formulario de invitado, redirecciones), e2e Playwright nuevo: participante invitado entra con apodo + código y juega.

## 3. Entrar a la sala con QR

- Web: en el lobby del anfitrión (`/host/:code`, estado `waiting`) mostrar un **código QR** que apunte a `${window.location.origin}/join?code=XXXXXX`, junto al código en texto y un botón «Copiar enlace». Generar el QR **en el navegador** con una librería (por ejemplo `qrcode`, SVG), sin servicios externos ni enviar el código a terceros. Tamaño legible en celular y proyector, alto contraste, con texto alternativo.
- `JoinRoomPage` lee `?code=` y lo precarga (normalizado a mayúsculas; si no es válido, lo ignora). Quien escanea sin sesión cae directo en el formulario de invitado con el código ya escrito.
- Pruebas: componente (QR presente, enlace correcto, prellenado desde `?code=`), e2e (abrir `/join?code=` con el código real prellena el campo).

## 4. Filtros de búsqueda

- **Mis cuestionarios**: buscador por texto (título y descripción, sin distinguir mayúsculas ni tildes), contador de resultados y estado «sin resultados» con botón para limpiar.
- **Biblioteca**: el mismo buscador, más filtro por **categoría** (Todas / Cultura general / Tecnología) y, si es fácil, filtro «con explicación». Mantener la agrupación por categoría.
- Filtrado en el cliente (los volúmenes son pequeños), accesible (etiquetas, `role="search"`, anuncio del conteo con `aria-live`), y conservar los `data-testid` existentes. Pruebas de componente para cada filtro.

## 5. Ajustes (engranaje) con idioma y sonido

- Reemplazar el selector de idioma de la barra por un botón **engranaje** que abre un panel/menú de **Ajustes** con: Idioma (Español / English) y **Sonido** (activado / desactivado). Persisten en `localStorage` (con `try/catch`); el sonido reutiliza `isSoundMuted` / `toggleSoundMuted` del motor de audio y debe quedar sincronizado con el botón de silencio de la sala de juego.
- Accesibilidad: `aria-expanded`, `aria-controls`, se cierra con Esc y al hacer clic fuera, el foco vuelve al engranaje, operable con teclado, objetivo táctil >= 44 px. Funciona igual para invitados y sin sesión.
- Pruebas: abrir/cerrar, cambiar idioma, alternar sonido y persistencia.

## Hecho cuando

- `npm run lint`, `npm test` y `npm run build` en verde en las tres apps y `npm run check:types -w @rubymind/contracts`.
- `./start.sh --debug-controls` y `npm run test:e2e:pw -w @rubymind/web` en verde, con e2e nuevos para invitado y QR/`?code=`.
- Documentar variables nuevas (`JWT_GUEST_EXPIRES_IN`) en `.env.example`/README y actualizar `docs/especificacion.md` (invitados y avance por sala).
- PR pequeño o commits claros hacia `main`. El despliegue (Render, Vercel, Docker Hub) lo hace Claude Code.
