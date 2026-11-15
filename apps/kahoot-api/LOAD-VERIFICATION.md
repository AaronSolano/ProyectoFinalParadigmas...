# Carga con recursos limitados — Codex, F7

Fecha: 15 de noviembre de 2026. Código de aplicación de `main` en `aa10959`, sin modificaciones. Se construyó el Compose de pruebas con `npm ci` y el lockfile de esa revisión. Node 22.23.5 y PostgreSQL 17; las imágenes y el hash del lockfile están en [capacity-context.json](./test/evidence/capacity-context.json).

## Recursos y criterios

El override [test/compose.capacity.yaml](./test/compose.capacity.yaml) limita únicamente el servidor `kahoot-api` a **0,5 CPU y 512 MiB (536.870.912 bytes)**. El límite de RAM más intercambio es también 512 MiB, por lo que no se añade margen de swap. Los límites se verificaron con Docker antes de ejecutar la carga. Auth, PostgreSQL y el cliente no tienen límites adicionales.

Criterios: P95 de cierre ≤1000 ms, tasa de errores ≤1% y timeout por operación de 15000 ms. El P95 de cierre del script mide desde que el cliente anfitrión ordena cerrar hasta recibir `question:closed` en los participantes; incluye persistencia, publicación y entrega local. No es la métrica OTel que mide desde `closesAt`.

## Resultados observados

Se ejecutó primero `LOAD_STEPS=5,50,100,200,400` completo. Al pasar los cinco pasos, se amplió con `800,1600` para observar un primer incumplimiento; el script se detuvo al fallar 800 y no ejecutó 1600. No se modificaron los umbrales entre ambas corridas.

| Participantes | Conectados | Errores | Payloads inválidos | P95 respuesta (ms) | P95 cierre (ms) | Resultado           |
| ------------- | ---------- | ------- | ------------------ | ------------------ | --------------- | ------------------- |
| 5             | 5          | 0%      | 0                  | 14,27              | 8,10            | Aprobado            |
| 50            | 50         | 0%      | 0                  | 311,61             | 33,03           | Aprobado            |
| 100           | 100        | 0%      | 0                  | 277,29             | 57,51           | Aprobado            |
| 200           | 200        | 0%      | 0                  | 698,36             | 145,22          | Aprobado            |
| 400           | 400        | 0%      | 0                  | 2692,12            | 379,76          | Aprobado            |
| 800           | 800        | 0%      | 0                  | 9054,77            | 1288,48         | Falló P95 de cierre |

**Último paso aprobado: 400. Primer paso que falló: 800**, exclusivamente porque el P95 de cierre fue **1288,48 ms >1000 ms**. La tasa de errores permaneció en 0%, por debajo del 1%. La corrida ampliada terminó con código 1. Los pasos 401–799 no se midieron: no se afirma un límite exacto de capacidad ni se garantiza este resultado en Render.

Al terminar, el servidor seguía sano, sin OOM ni reinicios. El pico de memoria del cgroup fue de 138.731.520 bytes (aproximadamente 132,3 MiB), bajo el límite. Las estadísticas de cgroup antes y después de las corridas se conservan en el contexto JSON.

## Hardware y condiciones

**Cliente y servidor comparten la misma máquina física y la VM de Docker Desktop.** Host: Windows 11 Pro, Intel Core i7-13620H, 16 procesadores lógicos y 16.869.351.424 bytes de RAM. Docker Desktop dispone de 16 CPUs y aproximadamente 8,17 GB de RAM. El cliente corre en un contenedor Linux WSL2 (`6.18.33.2-microsoft-standard-WSL2`) con Node 22.23.5, sin cupos adicionales de CPU/RAM; se verificó `NanoCpus=0` y `Memory=0` para ambos clientes.

La red, autenticación y PostgreSQL también son locales. Esta prueba aproxima el cupo del proceso de juego, no la latencia de una base remota ni el hardware real de Render. Las conexiones son clientes Socket.IO simulados, no dispositivos físicos. El rendimiento observado depende de estas condiciones y de la carga compartida del equipo.

## Reproducción

Desde la raíz del repo:

```powershell
docker compose -p codex-f7-capacity -f apps/kahoot-api/test/compose.yaml -f apps/kahoot-api/test/compose.capacity.yaml --profile load up -d --build --wait
docker run --rm --network codex-f7-capacity_default -w /repo/apps/kahoot-api -e AUTH_BASE_URL=http://auth:3001 -e KAHOOT_BASE_URL=http://kahoot:3002 -e LOAD_STEPS=5,50,100,200,400 -e LOAD_MAX_P95_MS=1000 -e LOAD_MAX_ERROR_RATE=0.01 -e LOAD_TIMEOUT_MS=15000 codex-f7-capacity-kahoot node scripts/load.mjs
# Si todos pasan, ampliar usando el mismo comando con LOAD_STEPS=800,1600.
docker compose -p codex-f7-capacity -f apps/kahoot-api/test/compose.yaml -f apps/kahoot-api/test/compose.capacity.yaml --profile load down
```

El cliente se ejecuta con `docker run` para no heredar los límites del servicio `kahoot`. El override elimina los puertos publicados; todas las comunicaciones de esta prueba usan la red de Compose. Las bases son desechables y se pierden al detener el entorno.

## Verificación y evidencia

Antes de publicar: `npm run lint`, `npm run build` y `npm test` en kahoot-api, con PostgreSQL real: **61 pruebas aprobadas**, incluidas las integraciones de BD. El ejecutor de pruebas no se limitó; el cupo se aplica al servidor objeto de la carga. No cambian `src/`, scripts de aplicación, manifiestos, lockfile, contratos ni infraestructura final.

- [Pasos solicitados 5–400](./test/evidence/capacity-0.5cpu-512m.json), ejecución `109d8cf5-68ab-4b50-87ff-d6c8a11039ea`, inicio `22:44:01.872Z`.
- [Ampliación y primer fallo en 800](./test/evidence/capacity-boundary.json), ejecución `0a8c7f71-3097-4f31-9395-51c02abdd493`, inicio `22:45:55.653Z`.
- [Resumen de último aprobado y primer fallo](./test/evidence/capacity-summary.json).
- [Límites, hardware, imágenes, cgroup y estado](./test/evidence/capacity-context.json).

Los reportes previos de carga sin este límite permanecen en `test/evidence/load-compose.json` y no se usan para inferir esta capacidad.
