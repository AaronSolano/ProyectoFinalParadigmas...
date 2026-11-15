## 1. Pruebas de código

- [ ] 1.1 (Codex) Completar pruebas unitarias e integración de `auth-api` y `kahoot-api` y verificar que la suite corre en CI
- [ ] 1.2 (Antigravity) Completar pruebas de componentes del frontend y verificar que corren en CI

## 2. e2e con Playwright

- [ ] 2.1 (Antigravity) Escribir e2e de acceso y permisos y verificar que un participante no modifica ni controla una partida ajena
- [ ] 2.2 (Antigravity) Escribir e2e de juego simultáneo con dos salas y verificar que no se mezclan mensajes ni resultados
- [ ] 2.3 (Antigravity) Escribir e2e de respuestas válidas (reenvío, tardía, revelación) y verificar cada regla
- [ ] 2.4 (Antigravity) Escribir e2e de reconexión y verificar que no se duplican participación ni puntaje
- [ ] 2.5 (Antigravity) Escribir e2e de persistencia tras reiniciar contenedores y verificar que perfiles, cuestionarios, imágenes y resultados siguen disponibles

## 3. Carga y evidencia

- [ ] 3.1 (Codex) Crear el script de carga y verificar que corre contra Compose
- [ ] 3.2 (Claude Code) Ejecutar la carga por pasos y registrar el máximo de participantes simultáneos y el hardware usado en `docs/evidencia/`
- [ ] 3.3 (Claude Code) Redactar la evidencia de cada comprobación y las limitaciones conocidas y verificar que cubre los seis casos
