## Why

Los usuarios solo ven la interfaz: sin ella el juego no existe para la clase. Debe funcionar en computadora y celular y en español e inglés.

## What Changes

- `apps/web` en React (Vite): registro, inicio de sesión, gestión de cuestionarios con imágenes, creación de sala, lobby, control del anfitrión, pantalla del participante, resultados y clasificación.
- Cliente de API generado desde los contratos y cliente Socket.IO con reconexión.
- i18n español/inglés con preferencia guardada.
- Mensajes claros de errores de acceso, conexión y código de sala.
- Fuera de alcance: lógica de juego (siempre en el servidor).

## Capabilities

### New Capabilities
- `ui/web-client`: flujos de usuario, diseño responsive, idiomas y manejo de errores.

### Modified Capabilities

## Impact

- `apps/web`, variables `VITE_*`. Desplegable en Vercel y como imagen Docker.
