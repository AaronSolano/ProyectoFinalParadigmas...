## Why

El juego en vivo es el corazón del proyecto y la parte más frágil: tiempo, respuestas únicas, puntajes y reconexión deben ser correctos y auditables en el servidor.

## What Changes

- Gateway WebSocket (Socket.IO) autenticado, con una sala lógica por partida.
- Temporizador y estado de la partida en servidor; control exclusivo del anfitrión.
- Una respuesta por participante y pregunta; rechazo de tardías y reenvíos.
- Puntaje (1 punto por acierto), revelación de la respuesta al cerrar, clasificación y resultados persistidos.
- Reconexión con estado vigente sin duplicar participación ni puntaje.
- Fuera de alcance: interfaz (fase 5).

## Capabilities

### New Capabilities
- `game/live-gameplay`: pregunta en vivo, tiempo, respuestas válidas, canal protegido y reconexión.
- `game/scoring-results`: puntaje, revelación, clasificación y persistencia.

### Modified Capabilities

## Impact

- `apps/kahoot-api` (módulo de juego y gateway), tablas de respuestas y resultados, documentación de eventos.
