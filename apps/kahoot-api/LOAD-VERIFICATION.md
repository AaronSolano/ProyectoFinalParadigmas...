# Verificación de F7 — aporte Codex

Fecha: 15 de noviembre de 2026. Base: `origin/main` en `299d463`, después de fusionar F4 y regenerar el lockfile en el PR #22. Ejecución de carga: `d6dc1047-8153-48fe-a1f5-cf6677973b45`, iniciada a las `22:05:43.210Z`.

## Construcción y pruebas con dependencias fijadas

Las imágenes de `auth-api` y `kahoot-api` se construyeron con `test/Dockerfile`, imagen Node 22 fijada por digest y `npm ci --workspaces --include-workspace-root`, usando el lockfile de `main` sin modificarlo. El perfil de Compose terminó con PostgreSQL y ambas APIs sanas. Los procesos de ambas APIs corrieron como UID 1000.

Las suites se ejecutaron dentro de contenedores efímeros derivados de esas mismas imágenes, con los archivos de pruebas/configuración montados en solo lectura y las dependencias instaladas por `npm ci`: **61 pruebas de kahoot-api y 30 de auth-api aprobadas**, con PostgreSQL real y ninguna suite de BD omitida. Incluyen permisos, contratos, dos salas, respuestas concurrentes/tardías, revelación al cierre, reconexión, reinicio, arranque concurrente con migraciones, bundle aislado y límite por socket. Lint, build y formato de kahoot-api también aprobados. CI continúa omitido por instrucción del usuario.

## Carga contra Compose

El cliente registró perfiles por la API real de autenticación. Kahoot validó los JWT por JWKS, creó una sala con imagen, recibió respuestas y publicó cierre/clasificación; el cliente comprobó los resultados por REST y validó los eventos contra los JSON Schemas canónicos.

| Participantes simultáneos | Errores | Payloads inválidos | P95 respuesta (ms) | P95 cierre (ms) | Resultado |
| ------------------------- | ------- | ------------------ | ------------------ | --------------- | --------- |
| 5                         | 0       | 0                  | 26,77              | 13,13           | Aprobado  |
| 10                        | 0       | 0                  | 19,58              | 10,14           | Aprobado  |
| 25                        | 0       | 0                  | 48,87              | 22,20           | Aprobado  |

Máximo verificado: **25 participantes**. No es una medida de capacidad máxima: no se probaron cantidades mayores. Son clientes Socket.IO simulados; no sustituye la verificación de UI en dispositivos físicos.

Umbrales: P95 del cierre ≤1000 ms, tasa de fallos ≤1% y timeout de 15000 ms por operación. La prueba negativa, con dos participantes y `LOAD_MAX_P95_MS=0.001`, produjo `passed=false` y código de salida 1, sin errores de conexión/configuración.

Cliente: Windows 10.0.26200, Node v24.19.0, Intel Core i7-13620H, 16 procesadores lógicos y 16.869.351.424 bytes de RAM. Docker Desktop: 16 CPUs y 8.170.139.648 bytes asignados; APIs con Node 22 y PostgreSQL 17 Alpine. Las cifras corresponden a tráfico local y a estas condiciones.

## Seeds desde bases vacías

Se crearon dos bases nuevas dentro del PostgreSQL desechable (`auth_seed_check` y `kahoot_seed_check`). Tras aplicar migraciones se ejecutaron los dos seeds compilados, dos veces cada uno. Resultado: **1 perfil, 1 cuestionario, 5 preguntas y 2 imágenes**, sin cambios de filas en la segunda ejecución, incluida la identidad/hash del perfil. La contraseña se generó solo para el entorno temporal y no se guarda en los artefactos.

Las dos imágenes quedaron accesibles por HTTP con estado 200 y tamaños de 11.853 y 16.407 bytes. Las pruebas unitarias/integración del seed también verificaron conservación de ediciones y eliminaciones.

## Artefactos y alcance

- [Reporte JSON de carga](./test/evidence/load-compose.json).
- [Rechazo por umbral](./test/evidence/load-threshold-rejection.json).
- [Base, hash del lockfile, imágenes y recursos](./test/evidence/verification-context.json).
- [Seeds sobre bases vacías](./test/evidence/seed-compose.json).

Tareas propias verificadas: F7 1.1 y 3.1; F6 3.1. F7 sigue abierta como fase del equipo: pruebas de frontend/e2e y evidencia formal en `docs/evidencia/` corresponden a sus responsables. Los archivos de Compose/Docker de este aporte son solo infraestructura de pruebas; la infraestructura final pertenece a F6.
