## Context

Puede iniciar en paralelo desde la fase 2 con servicios de ejemplo. Responsable: Claude Code. Ver `plan-fases-proyecto/design.md` (D2, D3, D7).

## Goals / Non-Goals

**Goals:** mismo resultado en cualquier máquina con Git, Docker y Compose.
**Non-Goals:** Kubernetes, alta disponibilidad.

## Decisions

- **Dockerfiles multi-etapa** con imágenes finales ligeras y usuario sin privilegios.
- **Compose con perfiles:** `build` (construye local) y `images` (usa Docker Hub); un solo archivo base más sobrescrituras.
- **Base:** un contenedor PostgreSQL con dos bases lógicas (`auth`, `kahoot`) creadas por script de inicialización; volumen nombrado.
- **Migraciones** aplicadas al arrancar cada API; **seed** idempotente (usuario y cuestionario de prueba con una imagen).
- **Observabilidad:** las APIs exportan OTLP al Collector, que reparte a Prometheus (métricas), Tempo (trazas) y Loki (logs); Grafana con fuentes y paneles aprovisionados por archivos.
- **Script de inicio** (`start.ps1` y `start.sh`) que valida requisitos, crea `.env` desde `.env.example` si falta y ejecuta Compose.
- **Imágenes** etiquetadas por versión y `latest`, publicadas manualmente o por CI.

## Risks / Trade-offs

- [Pila de observabilidad pesada en laptops] → Perfil `observability` opcional para ahorrar memoria.
- [Secretos de ejemplo en producción] → El script advierte si encuentra valores `cambiar_esto`.
