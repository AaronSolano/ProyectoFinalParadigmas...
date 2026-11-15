## 1. Imágenes

- [x] 1.1 (Claude Code) Crear Dockerfiles de `auth-api`, `kahoot-api` y `web` y verificar que cada imagen construye y corre sin root
- [x] 1.2 (Claude Code) Agregar `.dockerignore` y verificar que el contexto de construcción no incluye secretos ni `node_modules`

## 2. Compose

- [x] 2.1 (Claude Code) Crear Compose con PostgreSQL, volúmenes y variables de entorno y verificar que todos los servicios quedan sanos con healthchecks
- [ ] 2.2 (Claude Code) Crear los perfiles `build` e `images` y verificar que ambos arrancan la solución. Implementado con `compose.yaml` (imagenes de Docker Hub) y `compose.build.yaml` (construccion local) en lugar de perfiles; el modo local esta verificado y el de Docker Hub queda pendiente hasta publicar las imagenes (5.2)
- [x] 2.3 (Claude Code) Verificar que tras `down` y `up` siguen disponibles perfiles, cuestionarios, imágenes y resultados

## 3. Datos de demostración

- [x] 3.1 (Codex) Crear el seed idempotente con usuario y cuestionario de prueba con imagen y verificar con un arranque desde cero y una segunda ejecución

Evidencia de Codex para 3.1 (15 de noviembre de 2026): imágenes construidas con `npm ci` y el lockfile de `main` en `299d463`; migraciones y seeds compilados ejecutados sobre dos bases nuevas de PostgreSQL en Compose, dos veces cada uno. Se conservaron 1 perfil, 1 cuestionario, 5 preguntas y 2 imágenes, sin cambios de filas en la segunda ejecución. Ambas imágenes se consultaron por HTTP con estado 200. Reportes: `apps/kahoot-api/LOAD-VERIFICATION.md` y `apps/kahoot-api/test/evidence/seed-compose.json`. F6 continúa activa con las tareas de infraestructura de su responsable pendientes.

## 4. Observabilidad

- [x] 4.1 (Claude Code) Agregar Collector, Prometheus, Tempo, Loki (con Alloy para recoger los logs) y Grafana con aprovisionamiento y verificar que las fuentes aparecen conectadas
- [x] 4.2 (Claude Code) Crear paneles de solicitudes, latencia, errores y conexiones activas y verificar que muestran datos de ambas APIs
- [x] 4.3 (Claude Code) Agregar el perfil opcional `observability` y verificar que la solución arranca sin él

## 5. Inicio y publicación

- [x] 5.1 (Claude Code) Escribir `start` y `stop` para PowerShell y Bash y verificar que un clon limpio levanta todo con una sola orden
- [ ] 5.2 (Claude Code) Publicar las imágenes en Docker Hub y verificar que Compose arranca desde ellas en otra máquina

## Evidencia de Claude Code - 15 de noviembre de 2026

Verificado en Docker Desktop (Windows) con los scripts del repositorio, partiendo de cero (sin .env y sin volumenes) con `start.sh` y con `start.ps1`:

- **Imagenes (1.1, 1.2):** las tres construyen; las APIs corren como UID 1000 y la web como nginx sin privilegios; no hay archivos `.env`, pruebas ni URLs de API fijas en ninguna imagen. Tamano: web 74 MB, APIs unos 560 MB (203 MB de node_modules sobre la base Node 22 fijada por digest).
- **Compose y salud (2.1):** postgres, auth-api, kahoot-api y web quedan sanos; las claves JWT se generan y se guardan en un volumen; las migraciones corren al arrancar. Una sola URL (nginx, puerto 8080) sirve la web, la API y Socket.IO.
- **Datos y persistencia (2.3):** tras `stop` y `start` siguen el usuario demo, los cuestionarios (incluido uno creado antes de reiniciar), las imagenes y el login; un token emitido antes de reiniciar sigue siendo valido. El seed repetido no duplica.
- **Partida por nginx:** carga con 5 y 25 participantes por `http://localhost:8080` (WebSocket por el proxy), 0 fallos y 0 payloads invalidos.
- **Observabilidad (4.1 a 4.3):** Prometheus recibe `http_server_requests_total`, `http_server_duration_seconds`, `game_events_total` y `game_connections_active` de ambas APIs; Tempo recibe trazas de ambas; Loki recibe los registros de los contenedores (etiqueta `service`); Grafana provisiona las tres fuentes y el panel "ProfeLink - Resumen" (14 paneles). Sin el perfil, los contenedores de observabilidad no arrancan y las APIs no exportan.
- **Scripts (5.1):** `start/stop` en Bash y PowerShell; se corrigieron tres fallos encontrados al ejecutarlos (purga sin .env, arranque con datos previos sin .env y `docker volume inspect` bajo PowerShell 5.1).

Limitaciones conocidas: 2.2 y 5.2 siguen abiertas (imagenes de Docker Hub); `auth-api` y `kahoot-api` no escriben registros de solicitudes, por lo que en Loki solo se ven los de nginx, PostgreSQL y la infraestructura (pendiente de un ajuste de las APIs); Alloy monta el socket de Docker en solo lectura (aceptable en desarrollo, a evitar en un servidor publico); no se probo en Linux ni macOS.
