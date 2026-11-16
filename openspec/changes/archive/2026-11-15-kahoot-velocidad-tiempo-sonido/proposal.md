## Why

Actualmente las partidas asignan un puntaje plano (`0` o `1` punto) sin premiar la rapidez de respuesta ni ofrecer retroalimentación visual y sonora propia de Kahoot. Incorporar el cálculo de puntos por velocidad en el servidor, el registro y visualización del tiempo transcurrido, las rachas visuales/sonoras y los efectos de audio por fase acerca la experiencia en clase al comportamiento real de `kahoot.it` manteniendo al servidor como única fuente de verdad.

## What Changes

- **BREAKING** (`packages/contracts`): Actualizar `question-result.schema.json`, `question-closed.schema.json`, `state-sync.schema.json` y `openapi/kahoot-api.yaml` para que `pointsAwarded` permita el rango `0` a `1000` puntos (entero `0` o `500..1000` por acierto según velocidad) e incluya `elapsedMs` (tiempo transcurrido de respuesta en milisegundos) y `streak` (racha de aciertos consecutivos del participante). En `question:opened` y `state_sync.currentQuestion`, exponer `openedAt` (o `durationSeconds`) para que el cliente muestre la barra de progreso y el tiempo transcurrido con precisión.
- (`apps/kahoot-api`): Calcular en la capa de dominio (`domain/game.ts`) el puntaje por velocidad con la fórmula oficial de Kahoot:
  $$\text{points} = \text{round}\left(\left(1 - \frac{\text{elapsedMs}}{2 \cdot \text{durationMs}}\right) \times 1000\right)$$
  otorgando `1000` puntos si se responde en `< 500 ms`, entre `500` y `1000` puntos según el tiempo transcurrido hasta el cierre, y `0` puntos si es incorrecta o no respondida. Persistir `opened_at` de la pregunta actual, calcular `elapsedMs = receivedAt - openedAt` y la racha (`streak`) de aciertos consecutivos, y flexibilizar la restricción `CHECK` de `answers.points` en PostgreSQL (`points >= 0 AND points <= 1000`).
- (`apps/web`):
  - **Temporizador y tiempo transcurrido**: Barra de progreso y anillo circular regresivo sincronizados con el reloj del servidor (`closesAt` y `durationSeconds`), más visualización del tiempo transcurrido (`elapsedMs`, ej. `1.8 s`) al enviar la respuesta y al revelar el resultado.
  - **Sonidos y música por fase**: Síntesis/reproducción de audio en el navegador (con control de silencio/volumen persistente) para música de lobby, cuenta regresiva (`3, 2, 1`), pulso rítmico durante la pregunta abierta (acelerando en los últimos `5 s`), clic al responder, campana de tiempo agotado, acorde de acierto (con tono ascendente según la racha `1..5+`), acorde de error y fanfarria de podio final.
  - **Rachas y retroalimentación tipo Kahoot**: Insignia visual de racha (*"¡En racha! 🔥 X"*) y desglose de puntos ganados (`+682 pts`) en el cierre de pregunta y podio final.
- **Alcance y lo que queda fuera**:
  - **En alcance**: Contratos OpenAPI y JSON Schema de eventos en vivo, cálculo autoritativo de puntaje por velocidad (`500–1000` pts) y racha en `kahoot-api`, migración de base de datos para `answers.points` y `question_opened_at`, interfaz web con barra/anillo de tiempo, tiempo transcurrido, efectos de sonido con opción de silenciar (`mute`), rachas visuales/sonoras e i18n (`es`/`en`), además de actualización del mock server de `apps/web`.
  - **Fuera de alcance**: Bonificación de puntos extra por racha (la racha es exclusivamente visual y sonora, según lo acordado), preguntas de opción múltiple de 4 colores (se conserva el formato Verdadero/Falso del curso) y cálculo de puntajes en el cliente.

## Capabilities

### New Capabilities
- `ui/kahoot-experience`: Temporizador visual (barra/anillo y tiempo transcurrido), efectos de sonido y música por fase con control de silencio, e indicadores visuales de racha y puntos por velocidad en español e inglés.

### Modified Capabilities
- `game/scoring-results`: El cálculo de puntaje pasa de `0 | 1` fijo a puntaje proporcional a la velocidad de respuesta (`500` a `1000` puntos por acierto y `0` por fallo o ausencia), exponiendo además el tiempo transcurrido (`elapsedMs`) y la racha de aciertos consecutivos (`streak`) al cerrar cada pregunta.

## Impact

- **`packages/contracts`**: `events/schemas/question-result.schema.json`, `events/schemas/question-opened.schema.json`, `events/schemas/question-closed.schema.json`, `events/schemas/state-sync.schema.json`, `openapi/kahoot-api.yaml` y tipos generados (`src/generated/kahoot-api.d.ts`).
- **`apps/kahoot-api`**: `src/domain/game.ts`, `src/application/game-service.ts`, `src/data/game-store.ts`, nueva migración SQL para ampliar el `CHECK` de `answers.points` y almacenar `question_opened_at` en `sessions`, y pruebas unitarias/integración.
- **`apps/web`**: `src/components/CountdownTimer.tsx`, nuevo módulo de audio (`src/audio/soundEngine.ts`), `src/pages/GameRoomPage.tsx`, `src/realtime/useGameSocket.ts`, `mocks/mock-server.mjs`, traducciones `es.ts`/`en.ts` y pruebas en Vitest.
