## Why

El Proyecto Final (EIF400) exige una plataforma de evaluaciones en vivo tipo Kahoot para ProfeLink, con dos APIs independientes, un frontend, tiempo real, observabilidad y despliegue reproducible. Es demasiado grande para improvisarlo: hay que fijar alcance, decisiones y fases antes de escribir código, y repartir el trabajo entre varios agentes sin que se pisen.

## What Changes

- Hoja de ruta general: alcance mínimo (obligatorio) y opcional, decisiones de stack y despliegue acordadas por el equipo, y orquestación con subagentes.
- La Fase 0 (alineación) se ejecuta en este mismo cambio.
- Cada fase siguiente es **su propio cambio de OpenSpec**, con sus specs, diseño y tareas:

| Fase | Cambio | Capacidades |
|---|---|---|
| 1. Contratos | `f1-contratos` | `platform/external-consumption` |
| 2. Auth | `f2-auth` | `identity/auth-service` |
| 3. Núcleo Kahoot | `f3-nucleo-kahoot` | `quizzes/quiz-management`, `game/game-session` |
| 4. Tiempo real | `f4-tiempo-real` | `game/live-gameplay`, `game/scoring-results` |
| 5. Frontend | `f5-frontend` | `ui/web-client` |
| 6. Plataforma | `f6-plataforma` | `platform/delivery-observability` |
| 7. Calidad | `f7-calidad` | (sin specs: no cambia comportamiento) |
| 8. Entrega | `f8-entrega` | `platform/external-consumption`, `platform/delivery-observability` |
| 9. Opcional | `f9-opcional` | (sin specs hasta elegir extensiones) |

- No se escribe código de aplicación en este cambio; solo la estructura de la Fase 0.

## Capabilities

### New Capabilities

### Modified Capabilities

Este cambio no declara specs (`skip_specs`): son hoja de ruta y planificación. Los requisitos viven en los cambios de cada fase.

## Impact

- Monorepo con `apps/auth-api`, `apps/kahoot-api`, `apps/web`, `apps/external-client`, `packages/contracts`, `infra/` y `docs/`.
- Dependencias principales: NestJS, React, Socket.IO, PostgreSQL (Supabase en la nube), OpenTelemetry, Grafana, Docker.
- Define quién edita qué carpeta y cómo se integran los PR.
