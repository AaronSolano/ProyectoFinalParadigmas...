## Context

Fase condicionada: se activa solo con las fases 1 a 8 cerradas y tiempo disponible.

## Goals / Non-Goals

**Goals:** elegir como máximo una o dos extensiones con valor demostrable.
**Non-Goals:** ampliar el alcance obligatorio.

## Decisions

| Extensión | Problema que resuelve | Costo | Recomendación |
|---|---|---|---|
| Exportación de resultados (CSV) | El profesor quiere llevar notas a otra herramienta | Bajo | Primera opción |
| Webhook al terminar | ProfeLink se entera sin consultar | Medio | Segunda opción |
| Dashboards avanzados en Grafana | Ver participantes y latencia en vivo | Bajo (ya hay Grafana) | Si sobra tiempo |
| Cola de reportes | Reportes pesados sin bloquear la API | Alto | Descartada salvo necesidad |

Al elegir una extensión se crea su propio cambio OpenSpec con specs, y este cambio se archiva.

## Risks / Trade-offs

- [Desviar tiempo del núcleo] → Entrada solo con el checklist de la fase 8 completo.
