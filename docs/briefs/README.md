# Briefs para agentes

Cada brief es autocontenido: se le entrega tal cual al agente indicado.

| Brief | Agente | Fase | Carpeta que edita | Rama |
|---|---|---|---|---|
| [codex-auth-api.md](codex-auth-api.md) | Codex | 2 | `apps/auth-api` | `feat/f2-codex` |
| [codex-kahoot-api.md](codex-kahoot-api.md) | Codex | 3 y 4 | `apps/kahoot-api` | `feat/f3-codex`, `feat/f4-codex` |
| [antigravity-web.md](antigravity-web.md) | Antigravity | 5 | `apps/web` | `feat/f5-antigravity` |

## Cómo lanzarlos en paralelo
1. Partir de `main` actualizado (contiene los contratos de la Fase 1).
2. Una carpeta de trabajo (git worktree o clon) **por agente**, para que no se pisen:
   ```bash
   git worktree add ../wt-auth     -b feat/f2-codex        origin/main
   git worktree add ../wt-web      -b feat/f5-antigravity  origin/main
   ```
3. Pasar a cada agente el brief completo y pedirle que lo siga sin editar fuera de su carpeta.
4. Pueden correr a la vez: `auth-api` (Codex), `kahoot-api` Fase 3 (Codex, en otra sesión) y `web` (Antigravity). La Fase 4 espera a que la Fase 3 esté fusionada.

## Reglas comunes
- Los contratos de `packages/contracts` están congelados para los agentes. Un cambio de contrato lo hace solo el orquestador (Claude Code) en un PR aparte.
- Nadie fusiona su propio PR. Revisión por el orquestador y el equipo.
- Cada agente agrega su propio `package.json` dentro de su carpeta; el `package.json` raíz ya declara los workspaces.
- **Conflictos en `package-lock.json`:** si dos PR lo modifican, se resuelve tras fusionar con `npm install` en la raíz y un commit de actualización; no se editan a mano.
- Sin secretos en el repositorio; solo `.env.example`.

## Qué revisa el orquestador antes de fusionar
- `npm ci && npm run lint && npm test && npm run build` en verde.
- El agente no tocó archivos fuera de su carpeta (`git diff --stat origin/main`).
- Coincidencia con el contrato (rutas, códigos de error, eventos y formas de payload).
- Reglas críticas: respuesta única, tardías rechazadas, `correctAnswer` solo al cierre, aislamiento entre salas, canal protegido.
- Las tareas marcadas en OpenSpec corresponden a algo realmente verificado.
