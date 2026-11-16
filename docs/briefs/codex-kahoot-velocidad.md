# Brief para Codex — Puntaje por velocidad en `kahoot-api`

> Autocontenido. Los contratos ya están en `main` (PR #35). Lee `openspec/changes/kahoot-velocidad-tiempo-sonido/` (`design.md`, `specs/game/scoring-results/spec.md`) antes de empezar.

## Reglas
- Rama desde `main` actualizado: `feat/velocidad-codex`. Un PR.
- Solo `apps/kahoot-api/**`. No toques `packages/contracts`, `openspec/`, `docs/`, `infra/` ni el `package-lock.json` raíz.
- El servidor es la única fuente de tiempo y puntaje: el cliente nunca envía `elapsedMs` ni puntos.
- Respeta N-Capas: la fórmula y la racha son funciones puras en `src/domain/game.ts`, sin HTTP, Socket.IO ni TypeORM.
- Tras cada tarea: `npm run lint`, `npm test` y `npm run build` en `@profelink/kahoot-api`, y el verificador de contrato (`npm run verify:contract -w @profelink/contracts`).

## Tareas (OpenSpec `kahoot-velocidad-tiempo-sonido`)
### 2.1 Dominio
- `points({ answer, correctAnswer, elapsedMs, durationMs, basePoints = 1000 })`:
  - `0` si no respondió, falló o `elapsedMs` es nulo o negativo.
  - `1000` si `elapsedMs < 500`.
  - En otro caso `Math.round((1 - (min(elapsedMs, durationMs) / durationMs) / 2) * basePoints)` (rango 500..1000).
- Cálculo de `streak`: +1 por acierto, vuelve a 0 por error o ausencia. No suma puntos.
- Pruebas unitarias en `test/game-domain.spec.ts`: bordes 0, 499, 500 ms, duración completa, fallo, ausencia, racha.

### 2.2 Aplicación y datos
- Migración nueva: `sessions.question_opened_at timestamptz`, `participants.streak integer NOT NULL DEFAULT 0` y reemplazar el CHECK de `answers.points` por `0..1000`. Compatible con datos existentes.
- Persistir `question_opened_at` al abrir la pregunta. Calcular `elapsedMs = max(0, min(durationMs, receivedAt - openedAt))` al cerrarla, usando `received_at` de cada respuesta.
- Emitir `openedAt` y `durationSeconds` en `question:opened` y en `state_sync.currentQuestion`; `elapsedMs`, `streak` y `pointsAwarded` (0..1000) en `question:closed.results`. `totalScore`, ranking y resultados finales usan la nueva escala.
- La racha sobrevive a reconexión y reinicio (`state_sync` y base de datos). Reenvío de respuesta y respuestas tardías siguen rechazadas como hoy.
- Actualiza las pruebas existentes que esperan `pointsAwarded === 1` y agrega pruebas de integración (PostgreSQL real con `TEST_DATABASE_URL`) del flujo completo.

## Entrega
PR a `main` con descripción, resultado de las pruebas y marcadas 2.1 y 2.2 en `openspec/changes/kahoot-velocidad-tiempo-sonido/tasks.md` **solo si están verificadas** (esa edición de OpenSpec es la única excepción permitida fuera de tu carpeta). Avísame si agregas dependencias para regenerar el lockfile.
