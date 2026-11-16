# Despliegue del frontend en Vercel

El frontend es estático (Vite). En Vercel **no** hay proxy a las APIs: el navegador llama directo a Render, incluido Socket.IO (las reescrituras de Vercel no soportan WebSocket). Por eso las URLs de las APIs se fijan al compilar.

## Pasos (los hace una persona con acceso a la cuenta)
1. Vercel → **Add New → Project** → importar el repositorio de GitHub. **Root Directory: la raíz del repositorio** (no `apps/web`); `vercel.json` ya define instalación, compilación y salida (`apps/web/dist`) y el fallback de rutas a `index.html`.
2. En **Environment Variables** (Production) agregar:

| Variable | Valor |
|---|---|
| `VITE_AUTH_API_URL` | URL pública de `auth-api` en Render, sin `/` final (ej. `https://profelink-auth-api.onrender.com`) |
| `VITE_KAHOOT_API_URL` | URL pública de `kahoot-api` en Render, sin `/` final |
| `VITE_ENABLE_DEBUG_CONTROLS` | `false` (`true` solo para la demostración de reconexión) |

3. **Deploy**. Cambiar una variable exige volver a desplegar (se compilan en el paquete).
4. Copiar la URL de Vercel (`https://….vercel.app`) y ponerla en `CORS_ORIGINS` de las dos APIs en Render (más `PUBLIC_API_URL`/`PUBLIC_URL` donde aplique); reiniciar ambas.

## Verificación
- Abrir la URL de Vercel, registrarse e iniciar sesión (la consola del navegador no debe mostrar errores de CORS).
- Crear una sala y unirse desde un celular; confirmar que el canal en vivo conecta y que una partida completa termina con resultados.
- Recargar una ruta interna (`/quizzes`) y comprobar que no da 404.
