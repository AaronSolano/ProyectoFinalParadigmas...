# Evidencia de las comprobaciones

Estado de cada comprobación obligatoria del enunciado. Una fila pasa a "Verificado" solo cuando existe una corrida registrada.

| Comprobación | Prueba | Estado |
|---|---|---|
| Acceso y permisos | e2e `2.1` (`apps/web/e2e`) y pruebas de integración de `kahoot-api` | Pendiente: e2e en el PR #31 sin mergear |
| Juego simultáneo con dos salas | e2e `2.2` y pruebas en vivo de `kahoot-api` | Pendiente: e2e en el PR #31 |
| Respuestas válidas (única, tardía, revelación) | e2e `2.3` y pruebas de dominio e integración | Pendiente: falta el caso de respuesta tardía en el e2e |
| Reconexión sin duplicar participación ni puntaje | e2e `2.4` y pruebas en vivo | Pendiente: e2e en el PR #31 |
| Persistencia tras reiniciar contenedores | e2e `2.5` | Pendiente: e2e en el PR #31 |
| Consumo independiente | Pruebas de `apps/external-client` (4/4) y verificación de independencia | Verificado en local; falta la corrida contra el entorno desplegado |

## Participantes simultáneos

Medido en local con `kahoot-api` limitado a 0,5 CPU y 512 MiB: **400 participantes sin errores; a 800 falla el P95 de cierre (1288 ms frente al criterio de 1000 ms)**. Método, hardware y resultados por paso: [apps/kahoot-api/LOAD-VERIFICATION.md](../../apps/kahoot-api/LOAD-VERIFICATION.md) y los JSON en `apps/kahoot-api/test/evidence/`.

## Limitaciones conocidas

- La medición de carga usa cliente y servidor en la misma máquina y no representa el hardware de Render ni una base remota.
- `kahoot-api` corre en una sola instancia (temporizadores y salas en el proceso).
- El CI de GitHub no está corriendo por un bloqueo de facturación de la cuenta; las verificaciones se ejecutaron en local.
- Pendiente de completar tras el despliegue: pruebas desde celulares contra las URLs públicas y el consumo del cliente externo desplegado.
