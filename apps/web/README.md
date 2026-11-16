# `@rubymind/web` — Cliente Web React (Fase 5)

Interfaz web responsive (computadora y celular) en **español e inglés** para creadores, anfitriones y participantes de la plataforma de evaluaciones en vivo de opción múltiple de ProfeLink.

## Variables de entorno

Configuradas exclusivamente mediante variables Vite (`VITE_*`):

```bash
VITE_AUTH_API_URL=http://localhost:3001
VITE_KAHOOT_API_URL=http://localhost:3002
# Opcional: mostrar controles de depuración en sala (ej. simular reconexión)
VITE_ENABLE_DEBUG_CONTROLS=false
```

### Controles de depuración (`VITE_ENABLE_DEBUG_CONTROLS`)
- **En producción normal:** debe mantenerse en `false` (su valor por defecto) para que los controles de prueba como el botón *Simular reconexión* permanezcan ocultos para los usuarios finales.
- **Para la demostración en clase:** se debe construir la aplicación web con `VITE_ENABLE_DEBUG_CONTROLS=true` (por ejemplo, configurándola en las variables de entorno del proyecto en Vercel antes de compilar) a fin de habilitar el botón de simulación de reconexión durante la defensa.

Para ejecutar contra las APIs reales, inicia la solución con `./start.sh` y define `VITE_AUTH_API_URL` y `VITE_KAHOOT_API_URL` (por ejemplo `http://localhost:3001` y `http://localhost:3002`).
## Comandos principales

```bash
# Generar tipos TypeScript desde los contratos OpenAPI
npm run gen:api -w @rubymind/web

# Iniciar servidor de desarrollo Vite (http://localhost:5173)
npm run dev -w @rubymind/web


# Verificación de tipos, pruebas de componentes y compilación
npm run lint -w @rubymind/web
npm test -w @rubymind/web
npm run build -w @rubymind/web
```
