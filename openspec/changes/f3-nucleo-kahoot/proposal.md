## Why

Antes del juego en vivo hace falta lo que lo alimenta: cuestionarios, preguntas con imagen, salas con código y lobby, con permisos correctos.

## What Changes

- `apps/kahoot-api` en NestJS (N-Capas): CRUD de cuestionarios y preguntas, validación y almacenamiento de imágenes, creación de salas con código, ingreso de participantes y lobby.
- Validación de tokens de `auth-api` (audiencia `kahoot-api`).
- Copia estable del cuestionario al crear la sala.
- Fuera de alcance: partida en vivo y puntajes (fase 4).

## Capabilities

### New Capabilities
- `quizzes/quiz-management`: CRUD de cuestionarios y preguntas con imágenes.
- `game/game-session`: salas con código, ingreso de participantes y aislamiento entre salas.

### Modified Capabilities

## Impact

- `apps/kahoot-api`, base de datos del servicio, volumen o bucket de imágenes, variables `IMAGE_*`.
