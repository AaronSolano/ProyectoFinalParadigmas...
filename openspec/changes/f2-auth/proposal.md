## Why

El enunciado exige que la autenticación sea un proyecto aparte, desplegado por separado, que emite tokens con la API de actividades como audiencia.

## What Changes

- `apps/auth-api` en NestJS (N-Capas): registro, inicio de sesión y emisión de JWT con audiencia `kahoot-api`.
- Base de datos propia, OpenAPI/Scalar y telemetría básica con OpenTelemetry.
- Fuera de alcance: roles avanzados, recuperación de contraseña, proveedores externos.

## Capabilities

### New Capabilities
- `identity/auth-service`: registro, inicio de sesión y emisión de tokens.

### Modified Capabilities

## Impact

- `apps/auth-api`, tabla de perfiles, variables `JWT_*`. `kahoot-api` valida sus tokens (fases 3 y 4).
