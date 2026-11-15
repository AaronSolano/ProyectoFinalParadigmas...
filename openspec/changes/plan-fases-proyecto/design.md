## Context

Repositorio vacío, vinculado a GitHub (`main`), con OpenSpec inicializado. Entorno local: Node 24, Docker y Git; sin .NET. El enunciado (`proyectofinal.md`) exige dos APIs independientes (autenticación y actividades), frontend, tiempo real, observabilidad con Grafana, Compose reproducible, imágenes en Docker Hub y despliegue público. Motivación y alcance: ver proposal.md; comportamiento exigido: ver specs.

## Goals / Non-Goals

**Goals:**
- Fijar stack, arquitectura y fases con criterios de salida verificables.
- Permitir trabajo en paralelo de varios agentes sin conflictos, con contratos como punto de integración.

**Non-Goals:**
- Implementar código de aplicación (se hace en cambios `/opsx:propose` por fase).
- Las extensiones opcionales (exportación, webhook, colas) hasta cerrar el juego y sus comprobaciones.

## Decisions

### D1. Stack y arquitectura (acordado por el equipo)
- **Monorepo** con `apps/auth-api`, `apps/kahoot-api`, `apps/web`, `apps/external-client`, `packages/contracts`, `infra/`, `docs/`.
- **Estilo:** monolito modular por API; dos servicios desplegables por separado. El frontend habla con ambos por REST y con `kahoot-api` por WebSocket. El token de `auth-api` lleva la audiencia de `kahoot-api`, que lo valida sin acceder a la base de datos de autenticación.
- **Organización interna:** N-Capas (presentación, aplicación/servicios, dominio, acceso a datos). Las reglas de puntaje y de tiempo viven en la capa de dominio/servicios y no dependen de HTTP ni del gateway.
- **Backend:** NestJS; tiempo real con gateway WebSocket (Socket.IO). **Frontend:** React (Vite). **i18n:** español e inglés.
- Alternativa descartada: .NET + SignalR, por falta de SDK local y mayor costo de arranque. Clean Architecture y Vertical Slice se descartan por mayor ceremonia para el plazo.

### D2. Base de datos: PostgreSQL con Supabase
- Cada servicio tiene su propia base lógica. Supabase se usa como Postgres administrado para el entorno desplegado.
- El enunciado exige que Compose levante la base de datos y los datos de demostración sin cuentas externas, por lo que Compose incluye un contenedor PostgreSQL. La conexión se elige solo por variable de entorno (`DATABASE_URL`), y el código no usa funciones propias de Supabase (Auth, Storage, RLS).
- Las imágenes se guardan en un volumen persistente servido por `kahoot-api`, no en Supabase Storage, para mantener la autonomía del servicio.

### D3. Observabilidad
OpenTelemetry en ambas APIs exportando a un colector; Grafana con Prometheus (métricas), Tempo (trazas) y Loki (logs), todos dentro de Compose, con paneles aprovisionados por archivos.

### D4. Fases y criterios de salida

| Fase | Contenido | Criterio de salida |
|---|---|---|
| 0. Alineación | Alcance, `AGENTS.md`, estructura del monorepo, convenciones, CI básico | Estructura creada, `.env.example`, CI verde |
| 1. Contratos | OpenAPI de ambas APIs, catálogo de eventos en vivo, modelo de datos y diagramas | Contratos revisados y congelados en `packages/contracts` |
| 2. Auth | `auth-api`: registro, login, JWT con audiencia, OpenAPI | Pruebas unitarias e integración verdes |
| 3. Núcleo Kahoot | Cuestionarios, preguntas, imágenes, salas, lobby | CRUD y permisos con pruebas; imágenes persisten |
| 4. Tiempo real | Gateway, temporizador, respuestas únicas, puntajes, reconexión | Pruebas de dominio y de integración WS verdes |
| 5. Frontend | Flujos de creador, anfitrión y participante, i18n, responsive | Partida completa jugable en dos navegadores |
| 6. Plataforma | Dockerfiles, Compose, script de inicio, seed, Grafana, Docker Hub | Arranque desde clon limpio en una sola orden |
| 7. Calidad | Pruebas e2e, carga con límite de participantes, evidencia | Casos obligatorios del enunciado documentados |
| 8. Entrega | Cliente externo, despliegue VPS/cloud, README, spec final, archivado OpenSpec | URL pública funcionando y demo ensayada |
| 9. Opcional | Exportación, webhook, colas | Solo si 0–8 están cerrados |

Las fases 2, 3 y 5 pueden avanzar en paralelo una vez congelados los contratos de la fase 1; la fase 4 depende de la 3; la fase 6 puede iniciar en paralelo desde la fase 2.

### D5. Orquestación con subagentes
- **Claude Code (orquestador):** mantiene OpenSpec, congela contratos, revisa y fusiona PR, resuelve conflictos entre agentes.
- **Codex (backend):** implementa `auth-api` y `kahoot-api` por capas, con pruebas unitarias y de integración.
- **Antigravity (frontend y e2e):** implementa `apps/web`, i18n y pruebas Playwright contra contratos o mocks.
- Reglas comunes (documentadas en `AGENTS.md`): contratos primero; cada agente solo edita sus carpetas; una rama y un worktree por agente y fase (`feat/<fase>-<agente>`); un cambio OpenSpec por fase; PR pequeños con spec archivada; nadie hace merge a `main` sin revisión.
- Limitación: esta sesión puede lanzar subagentes propios de Claude Code, pero no controla Codex ni Antigravity. Para ellos se entregan briefs autocontenidos (alcance, carpetas, contratos, comandos de verificación) que el equipo ejecuta en cada herramienta.

### D6. Alcance
- **Obligatorio:** todo lo exigido en las funciones mínimas, comprobaciones y entregables del enunciado.
- **Límite de participantes:** se mide en la fase 7 y se documenta como máximo probado.
- **Opcional:** exportación de resultados, webhook al terminar, logs/métricas avanzadas, cola de reportes.

### D7. Dos modos de ejecución: portátil (Docker) y desplegado
- **Portátil:** `docker compose` con imágenes de Docker Hub levanta todo (web, APIs, PostgreSQL, Grafana) en cualquier dispositivo con Git, Docker y Compose.
- **Desplegado:** frontend en **Vercel**; base de datos en **Supabase** (Postgres administrado); `auth-api` y `kahoot-api` en un host de contenedores con procesos persistentes (ver Open Questions), usando las mismas imágenes de Docker Hub.
- **Host de las APIs: Render.** Cada API es un Web Service que despliega la imagen de Docker Hub; Render soporta WebSocket. Los servicios gratuitos se duermen tras unos 15 minutos sin tráfico y no admiten disco persistente, así que en ese plan las imágenes van a Supabase Storage; con un plan de pago que no duerma se puede usar disco. Para la demostración se usa un plan que no duerma o se despierta el servicio antes de jugar.
- Supabase no ejecuta servicios NestJS y Vercel no mantiene WebSockets ni temporizadores de servidor, por eso el backend no va en ninguno de los dos.
- Consecuencias de configuración: CORS y URLs de ambas APIs por variables de entorno en Vercel; conexión a Supabase mediante el pooler y `DATABASE_URL` con SSL; una sola instancia de `kahoot-api` (el estado de la partida vive en memoria del proceso y se persiste en la base de datos para recuperarlo).
- Imágenes: el almacenamiento se abstrae tras una interfaz con dos implementaciones, disco con volumen persistente (modo portátil y hosts con volumen) y Supabase Storage (si el host no ofrece volúmenes). La API sigue siendo la dueña de las imágenes y de su URL pública.
- Observabilidad desplegada: las APIs exportan por OTLP a Grafana Cloud (nivel gratuito) o a un Grafana propio, sin cambiar el código.

## Risks / Trade-offs

- [Hosts gratuitos duermen el servicio y cortan el juego] → Elegir un plan que no duerma, o un VPS, para la demostración.
- [Dos APIs duplican infraestructura] → Plantilla común de módulos y configuración compartida en `packages/`.
- [Agentes divergen en contratos] → Contratos congelados antes de paralelizar; cambios de contrato solo vía el orquestador.
- [Supabase ≠ Compose local] → Misma versión de PostgreSQL, solo SQL estándar y migraciones versionadas probadas contra ambos.
- [Temporizador y reconexión son la parte más frágil] → El servidor es la única fuente de tiempo y estado; pruebas dedicadas en la fase 4.
- [Alcance excesivo para el plazo] → Opcionales bloqueados hasta cerrar fase 8.

## Open Questions

- Plan de Render (gratuito o de pago) para la demostración: decide si se usa disco persistente o Supabase Storage para las imágenes; se resuelve antes de la fase 6.
- Dominio propio o los subdominios `onrender.com` y `vercel.app`.
- Cuenta de Docker Hub del equipo y nombres de las imágenes.
