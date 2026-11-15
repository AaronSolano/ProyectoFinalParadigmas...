## Why

El enunciado exige que cualquiera pueda clonar el repositorio y ejecutar todo con una orden, con datos de demostración, persistencia y monitoreo en Grafana. También se deben publicar imágenes en Docker Hub.

## What Changes

- Dockerfiles de `auth-api`, `kahoot-api` y `web`.
- Docker Compose con PostgreSQL, volúmenes persistentes, APIs, web y observabilidad.
- Migraciones y datos de demostración automáticos (usuario y cuestionario de prueba).
- OpenTelemetry Collector, Prometheus, Tempo, Loki y Grafana con paneles aprovisionados.
- Script de inicio y de detención; publicación de imágenes en Docker Hub.
- Fuera de alcance: despliegue público (fase 8).

## Capabilities

### New Capabilities
- `platform/delivery-observability`: arranque reproducible, persistencia, observabilidad, configuración sin secretos y ejecución portátil.

### Modified Capabilities

## Impact

- `infra/`, Dockerfiles en cada app, `.env.example`, scripts en la raíz.
