## Context

Contratos de la fase 1; el frontend puede avanzar contra mocks mientras las APIs se terminan. Responsable: Antigravity.

## Goals / Non-Goals

**Goals:** interfaz fina que solo presenta estado del servidor; usable con una mano en celular.
**Non-Goals:** calcular puntajes, validar tiempo o decidir resultados en el cliente.

## Decisions

- **React + Vite + TypeScript**, enrutado con React Router, estado remoto con TanStack Query y estado de partida desde eventos del socket.
- **i18n con i18next**, diccionarios `es` y `en` y detección inicial por navegador.
- **Cuenta regresiva** calculada con `closesAt` y la hora del servidor recibida en `state_sync`.
- **Reconexión:** el cliente reintenta con backoff y pide `state_sync` al reconectar; muestra un aviso de conexión perdida.
- **Diseño mobile-first**, botones Verdadero/Falso de gran tamaño y alto contraste.
- Configuración de URLs solo por variables `VITE_*`.

## Risks / Trade-offs

- [Divergencia con el contrato] → Cliente tipado generado de los contratos.
- [Cuentas regresivas desfasadas] → Siempre derivadas del reloj del servidor.
