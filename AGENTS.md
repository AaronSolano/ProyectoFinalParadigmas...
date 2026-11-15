# AGENTS.md — Reglas para agentes y colaboradores

Proyecto: plataforma de evaluaciones en vivo tipo Kahoot para ProfeLink (EIF400, II Ciclo 2026).
Enunciado: `C:\Aaron\Padigmas\proyectofinal.md`. Plan vigente: `openspec/changes/plan-fases-proyecto/`.

## Stack acordado
- Monorepo (npm workspaces). Backend NestJS, frontend React (Vite), PostgreSQL.
- Dos APIs independientes: `auth-api` (autenticación) y `kahoot-api` (actividades, tiempo real con WebSocket/Socket.IO).
- Arquitectura interna de cada API: **N-Capas** (presentación → aplicación → dominio → acceso a datos). Las reglas de puntaje y de tiempo viven en dominio/aplicación y no dependen de HTTP ni del gateway.
- Observabilidad: OpenTelemetry + Grafana. Interfaz en español e inglés.
- Despliegue: frontend en Vercel, base en Supabase, APIs en Render (imágenes de Docker Hub). Modo portátil con Docker Compose.

## Estructura y propiedad de carpetas
| Carpeta | Contenido | Agente responsable |
|---|---|---|
| `apps/auth-api` | Servicio de autenticación | Codex |
| `apps/kahoot-api` | Servicio de actividades y juego en vivo | Codex |
| `apps/web` | Frontend React | Antigravity |
| `apps/external-client` | Cliente de prueba que consume la API | Antigravity |
| `packages/contracts` | OpenAPI, eventos en vivo, tipos compartidos | Claude Code (orquestador) |
| `infra/` | Dockerfiles, Compose, Grafana, scripts | Claude Code |
| `docs/`, `openspec/` | Especificación, diagramas, cambios | Claude Code |

Cada agente edita **solo sus carpetas**. Un cambio en `packages/contracts` solo lo hace el orquestador.

## Flujo de trabajo
1. **Contratos primero:** no se implementa un endpoint ni un evento que no esté en `packages/contracts`.
2. **OpenSpec:** un cambio por fase (`/opsx:propose`), se implementa con `/opsx:apply` y se archiva con `/opsx:archive`. La spec archivada va en el PR.
3. **Ramas:** `feat/<fase>-<agente>` (ej. `feat/f2-codex`). Una rama y un worktree por agente y fase.
4. **PR pequeños** hacia `main`, con descripción, pruebas y spec archivada. Nadie hace merge a `main` sin revisión.
5. **Commits:** mensajes descriptivos en español o inglés; incluir el aporte identificable de cada integrante.

## Calidad
- Pruebas unitarias obligatorias para reglas de dominio (puntaje, tiempo, respuesta única).
- Pruebas de integración recomendadas; e2e con Playwright.
- El servidor es la única fuente de tiempo y de estado de la partida; el cliente nunca decide puntajes.

## Seguridad
- Secretos fuera del repositorio. Solo se versiona `.env.example`.
- Un participante no puede modificar preguntas ni controlar una partida ajena; el canal en vivo exige autenticación.
- La respuesta correcta no se envía a los participantes antes del cierre de la pregunta.

## Comandos útiles
```bash
openspec validate --all    # validar specs y cambios
openspec list              # ver cambios activos
```
