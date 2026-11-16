## Context
APIs NestJS por capas, PostgreSQL y web React bilingüe. El brief en docs/briefs/codex-invitados-qr-filtros-ajustes.md define la funcionalidad.

## Goals / Non-Goals
Ingreso sin cuenta sin persistir perfiles de invitado, tiempos decididos por servidor y UX accesible móvil. No desplegar servicios.

## Decisions
- Reutilizar contratos y avance por sala preparados en wt-e2e, sin modificar ese worktree.
- AccountGuard exige cuenta en cuestionarios, biblioteca y listado/creación de salas; JWT invitado funciona en Socket.IO con controles por hostId.
- QR generado en navegador con biblioteca local. Búsqueda en cliente normaliza mayúsculas y diacríticos.
- Panel de ajustes con foco, Escape/clic exterior y sincronización del audio mediante evento local.

## Risks / Trade-offs
Tokens de invitado duran 6h y se conservan en sessionStorage; perder la sesión pierde la identidad. Los permisos dependen del servidor, nunca de las redirecciones web.

## Migration Plan
Añadir auto_advance_seconds con valor 5 y CHECK 0..60. Omitir el campo en POST usa AUTO_ADVANCE_SECONDS. Validar integración PostgreSQL y Playwright antes de publicar main.
