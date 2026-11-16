## 1. Cliente externo

- [ ] 1.1 (Antigravity) Crear `apps/external-client` que consulte una sesión y sus resultados por configuración y verificar contra la API local
- [ ] 1.2 (Antigravity) Verificar que el cliente no importa código de las APIs ni accede a la base de datos

## 2. Despliegue

- [ ] 2.1 (Claude Code) Crear la base en Supabase, aplicar migraciones y verificar la conexión por pooler con SSL
- [ ] 2.2 (Claude Code) Desplegar `auth-api` y `kahoot-api` en Render desde Docker Hub con variables y CORS y verificar `/health` y la documentación Scalar
- [ ] 2.3 (Claude Code) Desplegar `apps/web` en Vercel y verificar una partida completa desde un celular
- [ ] 2.4 (Claude Code) Verificar el almacenamiento de imágenes en el entorno desplegado tras reiniciar el servicio
- [ ] 2.5 (Claude Code) Desplegar el cliente externo y verificar que consulta los resultados de una sesión real

## 3. Documentación

- [ ] 3.1 (Claude Code) Escribir el README (URLs, requisitos, configuración, inicio y detención, datos de prueba, demostración) y verificar siguiéndolo en otra máquina
- [ ] 3.2 (Claude Code) Completar la especificación con alcance, reglas, diagramas de arquitectura y de clases, modelo de datos, API y eventos y verificar contra la lista de entregables del enunciado
- [ ] 3.3 (Equipo) Registrar los aportes identificables de cada integrante y verificar que están en el repositorio

## 4. Cierre

- [ ] 4.1 (Claude Code) Archivar los cambios con `/opsx:archive`, incluirlos en los PR y verificar con `openspec validate --all`
- [ ] 4.2 (Equipo) Ensayar la demostración (cuestionario con imagen, partida multi-dispositivo, resultados, reconexión, cliente externo, inicio local) y verificar los tiempos
- [ ] 4.3 (Equipo) Preparar las respuestas de defensa y verificar que cada integrante explica su aporte
