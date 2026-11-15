# `@profelink/external-client` — Cliente Externo Independiente (Fase 8)

Aplicación web estática ligera (**HTML + JavaScript ES Module + CSS**, sin dependencias de las APIs ni acceso a base de datos) que demuestra el consumo independiente de `auth-api` y `kahoot-api` usando exclusivamente los endpoints documentados en `packages/contracts/openapi/`:

1. `POST /api/v1/auth/login` (`auth-api`) — obtiene el token Bearer para el usuario configurado.
2. `GET /api/v1/sessions/{code}` (`kahoot-api`) — consulta el estado y metadatos de la sesión.
3. `GET /api/v1/sessions/{code}/results` (`kahoot-api`) — consulta el título del cuestionario, total de preguntas y tabla de clasificación final (`ranking`).

## Configuración

Se configura mediante `apps/external-client/config.json` (cuando se sirve como sitio estático en Vercel/GitHub Pages) o mediante variables de entorno al iniciar `server.mjs`:

```bash
EXTERNAL_AUTH_API_URL=http://localhost:3001
EXTERNAL_KAHOOT_API_URL=http://localhost:3002
EXTERNAL_CLIENT_EMAIL=docente.demo@example.com
EXTERNAL_CLIENT_PASSWORD=tu_clave_demo
EXTERNAL_CLIENT_SESSION_CODE=H9XQTX
EXTERNAL_CLIENT_PORT=5174
```

También permite indicar o modificar parámetros directamente en la interfaz o por query string (`?code=H9XQTX&authApiUrl=http://localhost:3001&kahootApiUrl=http://localhost:3002`).

## Comandos

```bash
# Iniciar el servidor estático (por defecto en http://localhost:5174)
npm start -w @profelink/external-client

# Verificar sintaxis e independencia (sin imports de APIs ni acceso a BD)
npm run lint -w @profelink/external-client

# Ejecutar pruebas automatizadas (1.1 consumo HTTP y 1.2 independencia)
npm test -w @profelink/external-client
```
