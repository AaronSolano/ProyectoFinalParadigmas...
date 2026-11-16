## Why

El proyecto se evalúa por su demostración, su documentación y su despliegue público. Esta fase deja todo entregable: cliente externo, URL pública, README, especificación final y evidencia.

## What Changes

- `apps/external-client`: página sencilla que consulta una sesión y sus resultados por configuración y autenticación.
- Despliegue: frontend en Vercel, base en Supabase, APIs en Render desde imágenes de Docker Hub, con CORS y variables.
- README con URLs, requisitos, configuración, inicio y detención, datos de prueba y pasos de demostración.
- Especificación final: alcance, reglas, diagramas de arquitectura y clases, modelo de datos, API y eventos.
- Archivado de los cambios OpenSpec e inclusión en los PR; ensayo de la demostración y la defensa.

## Capabilities

### New Capabilities
- `platform/external-consumption`: cliente adicional independiente (los contratos vienen de la fase 1).
- `platform/delivery-observability`: despliegue público y evidencia de comprobaciones (el arranque reproducible viene de la fase 6).

### Modified Capabilities

## Impact

- `apps/external-client`, configuración de Vercel, Render y Supabase, `README.md`, `docs/`.
