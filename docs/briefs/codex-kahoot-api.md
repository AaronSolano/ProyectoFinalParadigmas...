# Brief para Codex — Fases 3 y 4: `kahoot-api`

> Este brief es autocontenido. La Fase 3 (núcleo REST) y la Fase 4 (juego en vivo) se entregan en **dos PR separados**; la Fase 4 empieza cuando la Fase 3 esté fusionada.

## Contexto
Plataforma de evaluaciones en vivo tipo Kahoot (Verdadero/Falso) para ProfeLink, curso EIF400. Implementas **`apps/kahoot-api`**: cuestionarios, preguntas con imagen, salas con código y la partida en vivo (Socket.IO). Es una API independiente: valida los tokens de `auth-api` pero **nunca accede a su base de datos ni importa su código**.

Lee en este orden:
1. `AGENTS.md`.
2. `openspec/changes/f3-nucleo-kahoot/` y `openspec/changes/f4-tiempo-real/` (proposal, design, specs, tasks).
3. **Contratos obligatorios:** `packages/contracts/openapi/kahoot-api.yaml`, `packages/contracts/events/README.md` y `packages/contracts/events/schemas/*.json`.
4. `packages/contracts/openapi/auth-api.yaml` (solo para entender el token y el JWKS).
5. `docs/modelo-datos.md`, `docs/diagramas/clases.md` y `docs/diagramas/arquitectura.md`.
6. `.env.example`.

## Rama y carpetas
- Fase 3: `feat/f3-codex`. Fase 4: `feat/f4-codex` (desde `main` con la Fase 3 ya fusionada).
- **Solo puedes editar `apps/kahoot-api/**`.** No modifiques `packages/contracts`, `openspec/`, `docs/`, `infra/` ni otras apps. Si el contrato es insuficiente o contradictorio, no lo cambies: documéntalo en el PR y sigue el contrato vigente.

## Stack fijado
NestJS 10+ / TypeScript estricto / Node 20+, paquete `@profelink/kahoot-api`. PostgreSQL con **TypeORM + migraciones**. Validación `class-validator`. `@nestjs/swagger` + Scalar. Subida de archivos con `multer` (`@nestjs/platform-express`). Tiempo real: `@nestjs/websockets` + `@nestjs/platform-socket.io`, namespace `/game`. Pruebas: Jest + Supertest + `socket.io-client`. Telemetría: OpenTelemetry (OTLP HTTP).

## Arquitectura interna: N-Capas (monolito modular)
```
src/
  modules/
    quizzes/   presentation/ application/ domain/ data/
    sessions/  presentation/ application/ domain/ data/
    game/      presentation(gateway)/ application/ domain/ data/
    images/    ImageStorage (puerto) + adaptadores disco / Supabase Storage
  auth/        guardia JWT (valida por JWKS)
  config/
```
Regla de dependencia: presentación → aplicación → dominio ← datos. **El dominio es TypeScript puro** (sin Nest, TypeORM ni Socket.IO) y contiene las reglas de puntaje, tiempo y respuesta. El gateway solo traduce eventos a casos de uso.

## Fase 3 — núcleo REST (contrato: `kahoot-api.yaml`)
Prefijo `/api/v1`, puerto `KAHOOT_PORT` (3002).
1. Proyecto Nest con capas y `/health`.
2. Autenticación: validar el JWT RS256 de `auth-api` obteniendo la clave pública desde `${AUTH_BASE_URL}/.well-known/jwks.json` (¡en la raíz del host, no bajo `/api/v1`!), verificando `iss=auth-api` y `aud=kahoot-api`. Caché de claves con reintento. Pruebas con token válido, expirado, de otra audiencia y sin token.
3. CRUD de cuestionarios y preguntas; migraciones según `docs/modelo-datos.md`. Solo el propietario modifica (403 si no). Límites: `title` 120, `description` 500, `statement` 500.
4. Imágenes: puerto `ImageStorage` con adaptador de disco (`IMAGE_STORAGE_PATH`) y adaptador de Supabase Storage (`SUPABASE_*`). Valida **el tipo real por contenido (magic bytes)**, no solo la extensión: PNG/JPEG/WebP, máximo `IMAGE_MAX_BYTES` (2 MiB) → 415 `IMAGE_UNSUPPORTED` / 413 `IMAGE_TOO_LARGE`. Sirve públicamente `GET /api/v1/images/{filename}`; `imageUrl` en las respuestas es **absoluta** y se construye con `PUBLIC_API_URL`.
5. Salas: `POST /sessions` genera código de 6 caracteres `^[2-9A-HJ-NP-Z]{6}$` único entre salas activas (reintento ante colisión) y **guarda un snapshot** del cuestionario en `session_questions`; sin preguntas → 409 `QUIZ_EMPTY`. `join` idempotente. `participants` y `results` con las reglas de acceso del contrato.
6. Ninguna respuesta REST expone `correctAnswer` a participantes antes de terminar la sala.
7. OpenAPI/Scalar en `/docs` y **prueba que compara el documento generado con `kahoot-api.yaml`** (rutas, métodos, códigos).

## Fase 4 — juego en vivo (contrato: `events/README.md` + schemas)
- Gateway Socket.IO en `/game`. El handshake exige `auth: { token }`; sin token válido → `connect_error` con `unauthorized`.
- Salas lógicas `session:<code>`; los eventos de una sala jamás llegan a otra.
- Eventos exactamente como el catálogo: `session:join`, `session:start`, `question:next`, `question:close`, `answer:submit`, `session:leave` (cliente→servidor) y `state_sync`, `participant:joined/left`, `session:started`, `question:opened`, `answer:accepted/rejected`, `question:closed`, `session:finished`, `error` (servidor→cliente). Valida cada payload contra su JSON Schema en pruebas.
- **Dominio puro y probado con pruebas unitarias:** `GameStateMachine` (`waiting → question_open → question_closed → … → finished`, transiciones inválidas lanzan error de dominio), `AnswerPolicy` (una respuesta por participante y pregunta, tardías y cerradas rechazadas) y `ScoreCalculator` (1 punto por acierto; 0 por error o sin respuesta; empates comparten posición). Usa un `Clock` inyectable para controlar el tiempo en pruebas.
- **El servidor es la única fuente de tiempo y estado:** fija `closesAt`, cierra por temporizador y valida cada respuesta contra su propio reloj. `correctAnswer` viaja **solo** en `question:closed`.
- Respuesta única garantizada por `UNIQUE(session_id, participant_id, question_index)` con inserción idempotente (`ON CONFLICT DO NOTHING`); un reenvío no suma.
- Solo el anfitrión puede `session:start`, `question:next` y `question:close`; si no, `error {code:"FORBIDDEN"}` y el estado no cambia.
- Persiste el estado en cada transición. **Reconexión:** al conectar y emitir `session:join`, reasocia por identidad (sin crear participante nuevo) y emite `state_sync` con el estado vigente. Al arrancar el servicio, reprograma los temporizadores de preguntas abiertas.
- Al terminar: escribe `session_results` y deja `GET /sessions/{code}/results` disponible incluso tras reiniciar el servicio.
- Una sola instancia del servicio (sin adaptador Redis).

## Variables de entorno
`KAHOOT_PORT`, `KAHOOT_DATABASE_URL`, `DATABASE_SSL`, `AUTH_BASE_URL`, `JWT_AUDIENCE`, `JWT_ISSUER`, `CORS_ORIGINS`, `QUESTION_TIME_SECONDS`, `IMAGE_STORAGE`, `IMAGE_STORAGE_PATH`, `IMAGE_MAX_BYTES`, `IMAGE_ALLOWED_TYPES`, `PUBLIC_API_URL`, `SUPABASE_*`, `OTEL_EXPORTER_OTLP_ENDPOINT`. Configura CORS con `CORS_ORIGINS` también para Socket.IO.

## Definición de terminado
- `npm ci && npm run lint && npm test && npm run build` pasan.
- Fase 3: CRUD, permisos 403, validación de imágenes, salas y aislamiento verificados con pruebas de integración contra PostgreSQL real.
- Fase 4: una partida completa de extremo a extremo en pruebas (anfitrión + 2 participantes + segunda sala simultánea), reenvío no suma, tardía rechazada, reconexión sin duplicar y reinicio durante pregunta abierta.
- Sin secretos versionados.

## Entrega
- Un PR por fase hacia `main` (`Fase 3: kahoot-api núcleo`, `Fase 4: kahoot-api juego en vivo`) con: qué hiciste, cómo probarlo, desviaciones del contrato y pendientes.
- No hagas merge; lo revisa el orquestador (Claude Code).
- Lista en el PR las tareas verificadas de `openspec/changes/f3-nucleo-kahoot/tasks.md` y `f4-tiempo-real/tasks.md`.
