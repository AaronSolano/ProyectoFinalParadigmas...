## Context

El sistema actual (ver `proposal.md` para la motivación) implementa partidas Verdadero/Falso en tiempo real sobre una arquitectura distribuida de microservicios independientes (`auth-api` y `kahoot-api`) consumidos por un SPA en React (`apps/web`). Dentro de `kahoot-api`, la organización interna sigue **N-Capas estricta** (`presentation` → `application` → `domain` → `data`):
- `src/domain/game.ts` concentra las funciones puras del juego (`transition`, `answerRejection`, `points`, `rank`).
- `src/application/game-service.ts` coordina las transacciones seriadas por sala, los temporizadores y la emisión de eventos Socket.IO.
- `src/data/game-store.ts` persiste sesiones, participantes y respuestas en PostgreSQL.

Actualmente `points()` devuelve únicamente `0 | 1`, `answers` no expone `received_at` al dominio al calcular el cierre, `sessions` solo almacena `question_closes_at` (no el instante de apertura `question_opened_at`), y la tabla `answers` tiene la restricción `CHECK(points IN (0,1))`.

## Goals / Non-Goals

**Goals:**
- Preservar el estilo de arquitectura (servicios autónomos comunicados por contratos explícitos en `packages/contracts`) y la separación **N-Capas** en `kahoot-api`, manteniendo la fórmula de puntaje por velocidad y el cálculo de racha como funciones puras de la capa de **dominio** sin dependencias de HTTP, Socket.IO ni TypeORM.
- Garantizar que el servidor siga siendo la única fuente de tiempo y puntaje: el cliente nunca envía puntos ni calcula su propio `elapsedMs` oficial, sino que recibe `openedAt`, `closesAt`, `elapsedMs`, `pointsAwarded` y `streak` desde `kahoot-api`.
- Proveer en `apps/web` un motor de sonido ligero basado en **Web Audio API** (sin requerir descarga de decenas de archivos `.mp3` externos ni licencias propietarias de Kahoot) que sintetice los efectos de lobby, cuenta regresiva, reloj de pregunta (acelerando en los últimos 5 segundos), clic de respuesta, tiempo agotado, acierto escalado por racha (`streak 1..5+`), fallo y fanfarria de podio.

**Non-Goals:**
- No se modificará `auth-api` ni el flujo de autenticación JWT.
- No se otorgarán puntos adicionales por racha (la racha solo afecta la insignia visual y el tono del efecto sonoro de acierto).
- No se introducirán activos binarios de audio propietarios de Kahoot! en el repositorio.

## Decisions

### 1. Cálculo de puntaje por velocidad en la capa de Dominio (`N-Capas`)
- **Decisión**: Reemplazar la firma de `points()` en `apps/kahoot-api/src/domain/game.ts` por una función pura que reciba `{ answer, correctAnswer, elapsedMs, durationMs, basePoints = 1000 }`:
  - Si `answer === undefined || answer !== correctAnswer || elapsedMs === null || elapsedMs < 0`: devuelve `0`.
  - Si `elapsedMs < 500`: devuelve `basePoints` (`1000`).
  - En otro caso: `clamped = Math.min(elapsedMs, durationMs)`, `Math.round((1 - (clamped / durationMs) / 2) * basePoints)` (rango `[500, 1000]`).
- **Justificación arquitectónica (N-Capas)**: Mantener esta regla en `src/domain/game.ts` asegura que sea 100 % determinista y verificable mediante pruebas unitarias rápidas sin levantar NestJS, Socket.IO ni PostgreSQL, cumpliendo la separación de responsabilidades exigida por la arquitectura N-Capas.
- **Alternativa descartada**: Calcular el puntaje en `GameService` o en una consulta SQL dentro de `PostgresGameTransaction`. Se descartó porque acoplaría una regla de negocio central a la capa de aplicación o de acceso a datos.

### 2. Registro autoritativo de `openedAt` y `elapsedMs` en el servidor
- **Decisión**:
  - Al abrir una pregunta (`tx.open(index, closesAt, now)`), persistir `question_opened_at = now` en la tabla `sessions` (o derivarlo como `closesAt - questionTimeSeconds * 1000` como respaldo si una sesión previa no tuviera la columna poblada).
  - En `tx.answers(index)`, devolver `receivedAt: number` en cada `GameAnswer` leyendo la columna `received_at` ya existente en la tabla `answers`.
  - Calcular `elapsedMs = Math.max(0, Math.min(durationMs, answer.receivedAt - openedAt))` en el servidor al cerrar la pregunta y exponer `elapsedMs` (`integer | null`, `null` si no respondió) y `streak` (`integer >= 0`) en cada elemento de `QuestionClosed.results`.
  - Agregar `streak` en la tabla `participants` (`integer NOT NULL DEFAULT 0`) para conservar la racha entre preguntas y ante reinicios o reconexiones (`state_sync`).
- **Alternativa descartada**: Que el cliente envíe `elapsedMs` en `answer:submit`. Se descartó porque viola la regla de seguridad del proyecto (*"El servidor es la única fuente de tiempo y de estado de la partida; el cliente nunca decide puntajes"*).

### 3. Contratos primero (`packages/contracts`)
- **Decisión**:
  - En `packages/contracts/events/schemas/question-result.schema.json`: cambiar `pointsAwarded` de `enum: [0, 1]` a `type: integer, minimum: 0, maximum: 1000`, y añadir `elapsedMs` (`type: ["integer", "null"], minimum: 0`) y `streak` (`type: integer, minimum: 0`).
  - En `packages/contracts/events/schemas/question-opened.schema.json` y `state-sync.schema.json`: añadir `durationSeconds` (`type: integer, minimum: 5, maximum: 240`) y `openedAt` (`type: string, format: date-time`) para que el frontend pueda renderizar el porcentaje exacto de la barra/anillo de tiempo y mostrar el tiempo transcurrido local al hacer clic antes del cierre.
  - En `packages/contracts/openapi/kahoot-api.yaml`: actualizar las descripciones y ejemplos de `score` y `SessionResults` para reflejar el puntaje en escala `0..1000` por pregunta.

### 4. Motor de audio con Web Audio API en `apps/web`
- **Decisión**: Implementar `apps/web/src/audio/soundEngine.ts` utilizando `AudioContext` (Web Audio API) con síntesis de osciladores y envolventes ADSR para generar:
  - Música/pulso de lobby (`130 BPM` suave, activable tras interacción del usuario).
  - Pitidos de cuenta regresiva (`3, 2, 1`).
  - Pulso rítmico de pregunta abierta que duplica su frecuencia de pulso cuando quedan `<= 5 s`.
  - Efecto *pop* al enviar respuesta (`submitAnswer`).
  - Gong/timbre de cierre (`timeUp`).
  - Acorde mayor ascendente en respuesta correcta (`correct`), transponiendo la frecuencia base según `streak` (`1` a `5+`).
  - Acorde descendente en respuesta incorrecta (`wrong`).
  - Redoble y fanfarria al mostrar la clasificación final (`finished`).
  - Estado `muted` persistido en `localStorage` (`profelink.audio.muted`) y botón accesible en la cabecera de la sala.
- **Justificación**: No añade peso al bundle ni depende de archivos `.mp3` externos, no falla por CORS en despliegues y permite degradación limpia (no-op) en entornos de prueba (jsdom/Vitest) donde `AudioContext` no está disponible.

## Risks / Trade-offs

- **[Risk] Bloqueo de autoplay del navegador en el lobby o al abrir pregunta** → **Mitigación**: Reanudar `AudioContext` (`ctx.resume()`) en el primer clic del usuario (al pulsar *"Iniciar partida"*, *"Unirse"* o el botón de sonido) y manejar silenciosamente cualquier rechazo de autoplay sin lanzar errores en consola ni interrumpir el flujo visual.
- **[Risk] Ruptura de pruebas existentes que esperan `pointsAwarded === 1`** → **Mitigación**: Actualizar de forma coordinada los esquemas de `packages/contracts`, las pruebas unitarias e integración de `apps/kahoot-api`, el servidor mock (`apps/web/mocks/mock-server.mjs`) y las pruebas de `apps/web`.
- **[Risk] Sesiones en curso durante migración de base de datos** → **Mitigación**: La nueva migración SQL reemplaza la restricción `CHECK(points IN (0,1))` por `CHECK(points >= 0 AND points <= 1000)` y añade `question_opened_at timestamptz` y `streak integer NOT NULL DEFAULT 0` de forma compatible hacia atrás (`0` y `1` siguen siendo valores válidos dentro de `0..1000`).

## Migration Plan

1. Actualizar esquemas en `packages/contracts` (`events/schemas/*.json` y `openapi/kahoot-api.yaml`) y regenerar tipos TypeScript (`npm run generate --workspace=@profelink/contracts` / sincronización en `apps/web`).
2. Agregar migración en `apps/kahoot-api/src/data/` que:
   - Agregue `question_opened_at timestamptz` a `sessions`.
   - Agregue `streak integer NOT NULL DEFAULT 0` a `participants`.
   - Reemplace el constraint `CHECK` de `answers.points` para permitir `0 <= points <= 1000`.
3. Actualizar `domain/game.ts`, `application/game-service.ts` y `data/game-store.ts` en `apps/kahoot-api` junto con sus pruebas.
4. Actualizar `apps/web` (temporizador con barra/anillo y tiempo transcurrido, motor de sonido Web Audio API con control de silencio, vista de resultados con puntos y racha, y `mock-server.mjs`).
