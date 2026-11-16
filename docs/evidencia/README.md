# Evidencia de las comprobaciones

Estado de cada comprobación obligatoria del enunciado. Una fila pasa a "Verificado" solo cuando existe una corrida registrada.

| Comprobación | Prueba | Estado |
|---|---|---|
| Acceso y permisos | e2e `2.1` (`apps/web/e2e`) y pruebas de integración de `kahoot-api` | Verificado 2026-11-15: Playwright `2.1` pasa contra Compose (imágenes de Docker Hub) |
| Juego simultáneo con dos salas | e2e `2.2` y pruebas en vivo de `kahoot-api` | Verificado 2026-11-15: Playwright `2.2` pasa contra Compose |
| Respuestas válidas (única, tardía, revelación) | e2e `2.3` y pruebas de dominio e integración | Verificado 2026-11-15: Playwright `2.3` pasa (incluye respuesta tardía y revelación al cierre) |
| Reconexión sin duplicar participación ni puntaje | e2e `2.4` y pruebas en vivo | Verificado 2026-11-15: Playwright `2.4` pasa; el puntaje se conserva al recargar |
| Persistencia tras reiniciar contenedores | e2e `2.5` | Verificado 2026-11-15: Playwright `2.5` pasa tras reiniciar `auth-api` y `kahoot-api` |
| Consumo independiente | Pruebas de `apps/external-client` (4/4) y verificación de independencia | Verificado en local; falta la corrida contra el entorno desplegado |

## Corrida e2e

- Fecha: 2026-11-15. Pila levantada con `./start.sh --images --debug-controls` (imágenes `aaronsc04/rubymind-*:latest` con puntaje por velocidad) en puertos alternos.
- `npm run test:e2e:pw -w @profelink/web`: 4 de 4 pasan (2.1 a 2.5). `npm run test:e2e -w @profelink/web` (canal en vivo y persistencia): pasa.
- La primera corrida encontró fallos reales corregidos en el mismo PR: selectores de prueba desactualizados, carrera al iniciar sin esperar el lobby, aserciones del puntaje de 1 punto, y nginx que conservaba la IP vieja de las APIs tras reiniciarlas (ahora resuelve el DNS de Docker con TTL de 5 s).

## Participantes simultáneos

Medido en local con `kahoot-api` limitado a 0,5 CPU y 512 MiB: **400 participantes sin errores; a 800 falla el P95 de cierre (1288 ms frente al criterio de 1000 ms)**. Método, hardware y resultados por paso: [apps/kahoot-api/LOAD-VERIFICATION.md](../../apps/kahoot-api/LOAD-VERIFICATION.md) y los JSON en `apps/kahoot-api/test/evidence/`.

## Limitaciones conocidas

- La medición de carga usa cliente y servidor en la misma máquina y no representa el hardware de Render ni una base remota.
- `kahoot-api` corre en una sola instancia (temporizadores y salas en el proceso).
- El CI de GitHub no está corriendo por un bloqueo de facturación de la cuenta; las verificaciones se ejecutaron en local.
- Pendiente de completar tras el despliegue: pruebas desde celulares contra las URLs públicas y el consumo del cliente externo desplegado.
