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
EXTERNAL_CLIENT_SESSION_CODE=H9XQTX
EXTERNAL_CLIENT_PORT=5174
```

Por seguridad, `/config.js` y `config.json` **nunca** incluyen contraseñas (solo `authApiUrl`, `kahootApiUrl`, `email` y `sessionCode`), y el parámetro `?password=` en la URL se ignora por completo. La contraseña se escribe siempre en el formulario de la interfaz.

### Configuración de CORS para consumo entre orígenes distintos
Para consumir `auth-api` y `kahoot-api` desde el origen del cliente externo (por ejemplo `http://localhost:5174` o el dominio desplegado), ese origen **debe estar incluido en `CORS_ORIGINS` del `.env` del Compose** (separado por comas):

```bash
CORS_ORIGINS=http://localhost:8080,http://localhost:5174
```

Cualquier otro origen no listado en `CORS_ORIGINS` queda bloqueado por las APIs.

## Comandos

```bash
# Iniciar el servidor estático (por defecto en http://localhost:5174)
npm start -w @profelink/external-client

# Verificar sintaxis e independencia (sin imports de APIs ni acceso a BD)
npm run lint -w @profelink/external-client

# Ejecutar pruebas automatizadas (1.1 consumo HTTP, seguridad de configuración y 1.2 independencia)
npm test -w @profelink/external-client
```

## Despliegue en Vercel

Proyecto aparte con **Root Directory = `apps/external-client`**. `vercel.json` copia `config.vercel.json` sobre `config.json` al compilar (las URLs de las APIs en Render, sin credenciales), de modo que `config.json` sigue apuntando a `localhost` para el uso local. El origen de Vercel debe estar en `CORS_ORIGINS` de `auth-api` y `kahoot-api`.
