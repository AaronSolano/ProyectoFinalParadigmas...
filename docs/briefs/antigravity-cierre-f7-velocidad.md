# Brief para Antigravity — Cierre de F7 y experiencia de velocidad/sonido

> Autocontenido. Dos bloques, en este orden. Los contratos de velocidad ya están en `main` (PR #35). Lee `openspec/changes/kahoot-velocidad-tiempo-sonido/` (`design.md`, `specs/ui/kahoot-experience/spec.md`).

## Reglas
- Solo `apps/web/**` y `apps/external-client/**`. No toques `packages/contracts`, `openspec/` (salvo marcar tus tareas), `docs/`, `infra/` ni el `package-lock.json` raíz; si agregas dependencias avísame y regenero el lockfile con `npm install`.
- El cliente nunca decide puntajes: solo muestra `elapsedMs`, `pointsAwarded` y `streak` que manda el servidor.
- Antes de cada PR: `npm run lint`, `npm test` y `npm run build` en `@profelink/web`.

## Bloque 1 — Ajustes al PR #31 (prioridad, antes que nada)
1. Declara `@playwright/test` en `devDependencies` de `apps/web/package.json`. Hoy `npm run test:e2e:pw` falla en un clon limpio.
2. Agrega a `e2e/kahoot-live.pw.mjs` el caso de respuesta tardía de la tarea 2.3 (respuesta tras el cierre del tiempo, debe rechazarse) o indica en qué prueba ya está cubierto.
3. Actualiza la rama `feat/f7-antigravity` con `main`, vuelve a correr lint, tests y build, y avísame para mergear. Con eso se marcan f7 1.2 y 2.1 a 2.5.

## Bloque 2 — Velocidad y sonido (rama `feat/velocidad-antigravity`, un PR)
### 3.1 Tipos y mock
Actualiza `src/api/events.ts`, `useGameSocket.ts` y `mocks/mock-server.mjs` con `openedAt`, `durationSeconds`, `elapsedMs`, `streak` y la fórmula de puntos `500..1000` (1000 si `< 500 ms`). El mock debe emitir los campos nuevos (ahora son obligatorios en el contrato).

### 3.2 Motor de sonido
`src/audio/soundEngine.ts` con Web Audio API (sin archivos de audio): lobby, cuenta regresiva, pulso de pregunta (más rápido con `<= 5 s`), envío de respuesta, tiempo agotado, acierto escalado por racha `1..5+`, error y podio. Botón de silencio persistente en `localStorage` (con try/catch). Reanudar `AudioContext` en el primer clic; sin errores en jsdom/Vitest (no-op). Pruebas unitarias en Vitest.

### 3.3 Interfaz
`CountdownTimer.tsx` y `GameRoomPage.tsx` (y `es.ts`/`en.ts`): barra o anillo de progreso, tiempo de respuesta en segundos, insignia de racha y desglose de puntos ganados. Textos en español e inglés.

## Entrega
PR a `main` con descripción y resultados. Marca 3.1 a 3.3 en `tasks.md` del cambio solo si están verificadas.
