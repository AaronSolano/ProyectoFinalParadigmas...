## 1. Contratos y esquemas de eventos

- [x] 1.1 (Claude Code) Actualizar `packages/contracts/events/schemas/question-result.schema.json` y `question-closed.schema.json` para permitir `pointsAwarded` en `0..1000` e incluir `elapsedMs` y `streak`, y verificar ejecutando `npm test --workspace=@profelink/contracts`
- [x] 1.2 (Claude Code) Actualizar `packages/contracts/events/schemas/question-opened.schema.json`, `state-sync.schema.json` y `openapi/kahoot-api.yaml` para incluir `openedAt` y `durationSeconds` y puntajes en escala `0..1000`, y verificar con `npm run build --workspace=@profelink/contracts` y `npm test --workspace=@profelink/contracts`

## 2. Dominio, aplicación y persistencia en `kahoot-api`

- [ ] 2.1 (Codex) Implementar en `apps/kahoot-api/src/domain/game.ts` el cálculo puro de puntos por velocidad (`500..1000` por acierto según `elapsedMs / durationMs`, `1000` si `< 500 ms`, `0` por fallo o ausencia) y el cálculo de racha (`streak`), y verificar con pruebas unitarias en `apps/kahoot-api/test/game-domain.spec.ts`
- [ ] 2.2 (Codex) Agregar migración y soporte en `apps/kahoot-api/src/data/` y `src/application/game-service.ts` para persistir `question_opened_at`, `participants.streak` y `answers.points` (`0..1000`), emitiendo `openedAt`, `durationSeconds`, `elapsedMs` y `streak` en los eventos Socket.IO, y verificar con `npm test --workspace=kahoot-api`

## 3. Temporizador, sonido y experiencia Kahoot en `apps/web`

- [x] 3.1 (Antigravity) Actualizar tipos de eventos (`src/api/events.ts`), `useGameSocket.ts` y `mocks/mock-server.mjs` en `apps/web` con `openedAt`, `durationSeconds`, `elapsedMs`, `streak` y la fórmula de puntos `500..1000`, y verificar que el servidor mock y la compilación (`npm run build --workspace=web`) pasen sin errores
- [x] 3.2 (Antigravity) Implementar `apps/web/src/audio/soundEngine.ts` con Web Audio API (sonidos de lobby, cuenta regresiva, pulso de pregunta con urgencia en `<= 5 s`, envío de respuesta, tiempo agotado, acierto escalado por racha `1..5+`, error y podio) y botón de silencio persistente en `localStorage`, y verificar mediante pruebas unitarias en Vitest
- [x] 3.3 (Antigravity) Actualizar `CountdownTimer.tsx` y `GameRoomPage.tsx` (junto con `es.ts` y `en.ts`) para mostrar barra/anillo de progreso de tiempo, tiempo transcurrido al responder (`elapsedMs` en segundos), insignia de racha (`🔥`) y desglose de puntos ganados, y verificar con `npm test --workspace=web` y `npm run lint --workspace=web`
