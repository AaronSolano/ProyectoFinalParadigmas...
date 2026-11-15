# Verificación de carga — aporte Codex, fase 7

Fecha: 15 de noviembre de 2026. Backend basado en `32448f1` (F4 adaptada a `main`); ejecución `7a6cefed-6c3f-4dab-8c3a-62a849598afc`, iniciada a las `21:22:15.803Z`.

Se ejecutó `scripts/load.mjs` contra **auth-api, kahoot-api y PostgreSQL en Docker Compose**, usando `test/compose.yaml --profile load`. Se crearon perfiles mediante la API real de autenticación; kahoot verificó sus JWT mediante JWKS por red. El cliente creó un cuestionario con imagen, conectó participantes al namespace `/game`, respondió, cerró la pregunta y consultó la clasificación persistida por REST. Los payloads recibidos se validaron contra los JSON Schemas canónicos.

| Participantes simultáneos | Errores | Payloads inválidos | P95 respuesta (ms) | P95 cierre (ms) | Resultado |
| ------------------------- | ------- | ------------------ | ------------------ | --------------- | --------- |
| 5                         | 0       | 0                  | 15,62              | 12,69           | Aprobado  |
| 10                        | 0       | 0                  | 25,66              | 12,88           | Aprobado  |
| 25                        | 0       | 0                  | 58,81              | 17,49           | Aprobado  |

Máximo **verificado en esta corrida: 25**. No representa la capacidad máxima del sistema: no se probaron cifras mayores. El cliente simuló sockets; esta corrida no sustituye las comprobaciones de interfaz en dispositivos físicos.

Umbrales: P95 de difusión del cierre ≤1000 ms, tasa de fallos ≤1%, timeout por operación de 15000 ms. Un fallo fatal o un paso fuera del umbral produce código de salida 1 y detiene los siguientes pasos. Como comprobación negativa, un paso de dos participantes con `LOAD_MAX_P95_MS=0.001` produjo `passed=false` y código 1 sin error de configuración ni conexión.

Cliente: Windows 10.0.26200, Node v24.19.0, Intel Core i7-13620H, 16 procesadores lógicos, 16.869.351.424 bytes de RAM. Backend: Node 22 en contenedores Linux con Docker Desktop (16 CPUs y 8.170.143.744 bytes de memoria asignada), PostgreSQL 17 Alpine. Las cifras incluyen tráfico local y dependen de estas condiciones.

`npm run lint` de F7 pasó. La base F4 aprobó 56 pruebas de kahoot-api y 30 de auth-api, con integraciones PostgreSQL habilitadas, ESLint, tipos y compilación de ambas APIs. CI se omitió por instrucción del usuario.

Tareas propias verificadas: F7 1.1 (pruebas del backend, con la excepción explícita de CI) y F7 3.1 (script de carga contra Compose). El seguimiento OpenSpec registra estas dos tareas como completadas por solicitud del usuario. La evidencia formal en `docs/evidencia/` y las tareas de frontend quedan a sus responsables. F7 continúa abierta como fase del equipo.
