## Context

Núcleo de la fase 3 y catálogo de eventos de la fase 1. Responsable: Codex.

## Goals / Non-Goals

**Goals:** reglas de juego puras y probables; el servidor es la única fuente de tiempo y estado.
**Non-Goals:** varias instancias de `kahoot-api` (escalado horizontal).

## Decisions

- **Máquina de estados de partida** en el dominio: `waiting → question_open → question_closed → … → finished`. Las transiciones inválidas lanzan error de dominio.
- **Tiempo:** el servidor fija `closesAt`; el cierre ocurre por temporizador del servidor y cada respuesta se valida contra el reloj del servidor, nunca el del cliente.
- **Respuesta única:** restricción única `(sesión, participante, pregunta)` en la base; la inserción idempotente garantiza que los reenvíos no suman.
- **Persistencia del estado:** el estado se escribe en la base en cada transición para recuperarlo tras reconexión o reinicio.
- **Reconexión:** al conectar, el cliente envía el token y el código; el servidor lo reasocia por identidad (no crea participante nuevo) y emite `state_sync`.
- **Canal:** el handshake exige JWT; los eventos de control comprueban que el emisor sea el anfitrión.
- La respuesta correcta se envía únicamente en el evento de cierre.
- Una sola instancia, sin adaptador Redis; alternativa descartada por costo y alcance.

## Risks / Trade-offs

- [Reinicio del servicio durante una partida] → Estado persistido; temporizadores reprogramados al arrancar.
- [Desfase de reloj en clientes] → El cliente calcula la cuenta regresiva con `closesAt` y la hora del servidor enviada en `state_sync`.
- [Carrera entre cierre y respuesta] → Validación y cierre serializados por sala.
