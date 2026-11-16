## Why
Permitir participantes sin cuenta, facilitar el ingreso con QR y ajustar el ritmo de cada sala, con búsqueda y ajustes accesibles.

## What Changes
- Avance automático configurable por sala (0..60 segundos).
- JWT de invitado efímero sin perfil persistido y restricciones de cuenta.
- Ingreso público, QR local, filtros y ajustes bilingües persistentes.

## Capabilities
### New Capabilities
- `guest-room-access`: ingreso seguro sin cuenta y controles de sala.

## Impact
apps/auth-api, apps/kahoot-api, apps/web. Se integran los contratos preparados por el orquestador. Sin despliegue ni PR; entrega directa a main autorizada por el usuario.
