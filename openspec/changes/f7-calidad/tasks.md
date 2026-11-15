## 1. Pruebas de código

- [x] 1.1 (Codex) Completar pruebas unitarias e integración de `auth-api` y `kahoot-api` y verificar las suites localmente (CI omitido por instrucción expresa del usuario)
- [ ] 1.2 (Antigravity) Completar pruebas de componentes del frontend y verificar que corren en CI

## 2. e2e con Playwright

- [ ] 2.1 (Antigravity) Escribir e2e de acceso y permisos y verificar que un participante no modifica ni controla una partida ajena
- [ ] 2.2 (Antigravity) Escribir e2e de juego simultáneo con dos salas y verificar que no se mezclan mensajes ni resultados
- [ ] 2.3 (Antigravity) Escribir e2e de respuestas válidas (reenvío, tardía, revelación) y verificar cada regla
- [ ] 2.4 (Antigravity) Escribir e2e de reconexión y verificar que no se duplican participación ni puntaje
- [ ] 2.5 (Antigravity) Escribir e2e de persistencia tras reiniciar contenedores y verificar que perfiles, cuestionarios, imágenes y resultados siguen disponibles

## 3. Carga y evidencia

- [x] 3.1 (Codex) Crear el script de carga y verificar que corre contra Compose
- [ ] 3.2 (Claude Code) Ejecutar la carga por pasos y registrar el máximo de participantes simultáneos y el hardware usado en `docs/evidencia/`
- [ ] 3.3 (Claude Code) Redactar la evidencia de cada comprobación y las limitaciones conocidas y verificar que cubre los seis casos

## Avance verificado de Codex — 15 de noviembre de 2026

Tareas 1.1 y 3.1 completadas. Revalidación sobre `main` en `299d463`: las imágenes construyeron con `npm ci` y el lockfile actualizado, sin modificarlo. Se aprobaron 61 pruebas de kahoot-api y 30 de auth-api dentro de contenedores con esas dependencias y PostgreSQL real, sin suites de BD omitidas. Lint, tipos, build y formato de kahoot-api aprobados. Se omite la comprobación CI por instrucción expresa del usuario; no se certifica CI verde.

El script de carga se verificó contra auth-api, kahoot-api y PostgreSQL en Docker Compose, con pasos de 5, 10 y 25 participantes, sin errores ni payloads inválidos. Con 25 participantes, P95 de cierre de 22,20 ms. Se comprobó además la salida 1 al superar el umbral configurado. Es el máximo probado en esa corrida, no la capacidad máxima del sistema. Informe, hardware y reportes JSON: apps/kahoot-api/LOAD-VERIFICATION.md y apps/kahoot-api/test/evidence/. Implementación presentada en el PR #19; revisión y merge siguen pendientes.

F7 permanece activa: no se dan por realizadas las pruebas de frontend/e2e ni la evidencia formal del equipo en docs/evidencia/.
