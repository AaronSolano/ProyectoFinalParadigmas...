## 1. Imágenes

- [ ] 1.1 (Claude Code) Crear Dockerfiles de `auth-api`, `kahoot-api` y `web` y verificar que cada imagen construye y corre sin root
- [ ] 1.2 (Claude Code) Agregar `.dockerignore` y verificar que el contexto de construcción no incluye secretos ni `node_modules`

## 2. Compose

- [ ] 2.1 (Claude Code) Crear Compose con PostgreSQL, volúmenes y variables de entorno y verificar que todos los servicios quedan sanos con healthchecks
- [ ] 2.2 (Claude Code) Crear los perfiles `build` e `images` y verificar que ambos arrancan la solución
- [ ] 2.3 (Claude Code) Verificar que tras `down` y `up` siguen disponibles perfiles, cuestionarios, imágenes y resultados

## 3. Datos de demostración

- [x] 3.1 (Codex) Crear el seed idempotente con usuario y cuestionario de prueba con imagen y verificar con un arranque desde cero y una segunda ejecución

Evidencia de Codex para 3.1 (15 de noviembre de 2026): imágenes construidas con `npm ci` y el lockfile de `main` en `299d463`; migraciones y seeds compilados ejecutados sobre dos bases nuevas de PostgreSQL en Compose, dos veces cada uno. Se conservaron 1 perfil, 1 cuestionario, 5 preguntas y 2 imágenes, sin cambios de filas en la segunda ejecución. Ambas imágenes se consultaron por HTTP con estado 200. Reportes: `apps/kahoot-api/LOAD-VERIFICATION.md` y `apps/kahoot-api/test/evidence/seed-compose.json`. F6 continúa activa con las tareas de infraestructura de su responsable pendientes.

## 4. Observabilidad

- [ ] 4.1 (Claude Code) Agregar Collector, Prometheus, Tempo, Loki y Grafana con aprovisionamiento y verificar que las fuentes aparecen conectadas
- [ ] 4.2 (Claude Code) Crear paneles de solicitudes, latencia, errores y conexiones activas y verificar que muestran datos de ambas APIs
- [ ] 4.3 (Claude Code) Agregar el perfil opcional `observability` y verificar que la solución arranca sin él

## 5. Inicio y publicación

- [ ] 5.1 (Claude Code) Escribir `start` y `stop` para PowerShell y Bash y verificar que un clon limpio levanta todo con una sola orden
- [ ] 5.2 (Claude Code) Publicar las imágenes en Docker Hub y verificar que Compose arranca desde ellas en otra máquina
