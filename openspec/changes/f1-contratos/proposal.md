## Why

Varios agentes (Claude Code, Codex, Antigravity) van a trabajar en paralelo. Sin contratos congelados antes, las APIs y el frontend divergen. Esta fase fija el punto de integración: qué endpoints, eventos y datos existen.

## What Changes

- OpenAPI de `auth-api` y de `kahoot-api` en `packages/contracts/openapi/`.
- Catálogo de eventos en vivo (nombres, datos, autenticación, recuperación de estado) en `packages/contracts/events/`.
- Modelo de datos y diagrama de clases en `docs/`.
- Verificación automática de que lo implementado coincide con el contrato.
- Fuera de alcance: implementar cualquier endpoint.

## Capabilities

### New Capabilities
- `platform/external-consumption`: contratos documentados como única fuente de verdad (el cliente externo llega en la fase 8).

### Modified Capabilities

## Impact

- `packages/contracts`, `docs/`. Todas las fases siguientes dependen de este contrato; cambiarlo después exige pasar por el orquestador.
