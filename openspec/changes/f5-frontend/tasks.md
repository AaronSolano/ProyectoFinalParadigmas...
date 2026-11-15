## 1. Base

- [x] 1.1 (Antigravity) Crear `apps/web` con enrutado, cliente de API tipado e i18n español/inglés y verificar el cambio de idioma y su persistencia
- [x] 1.2 (Antigravity) Agregar un servidor mock de los contratos y verificar que la app corre sin backend

## 2. Cuentas y cuestionarios

- [x] 2.1 (Antigravity) Implementar registro e inicio de sesión y verificar el flujo y los errores de acceso
- [x] 2.2 (Antigravity) Implementar gestión de cuestionarios y preguntas con carga de imagen y verificar el CRUD y el rechazo de imágenes inválidas

## 3. Partida

- [x] 3.1 (Antigravity) Implementar creación de sala, código y lobby del anfitrión y verificar con dos navegadores
- [x] 3.2 (Antigravity) Implementar ingreso por código y verificar el mensaje de código inválido
- [x] 3.3 (Antigravity) Implementar pantalla de participante con imagen, cuenta regresiva y botones Verdadero/Falso y verificar en viewport de celular
- [x] 3.4 (Antigravity) Implementar resultados por pregunta y clasificación final y verificar que se muestran al cierre
- [x] 3.5 (Antigravity) Implementar manejo de desconexión y reconexión y verificar que se recupera el estado sin recargar

## 4. Integración

- [ ] 4.1 (Antigravity) Conectar con las APIs reales y verificar una partida completa en dos navegadores

## Evidencia de cierre

Implementación de `apps/web` (tareas 1.1 a 3.5) realizada por Antigravity y fusionada en `main` (PR #16), con ajustes adicionales de cierre de sesión ante 401, control de depuración y reconexión con backoff en PR #20. Se verificaron `npm run lint`, `npm test` y `npm run build`, así como una partida completa entre anfitrión y participante en escritorio y viewport móvil (`360x640`) contra el servidor HTTP + Socket.IO de contratos (`apps/web/mocks/mock-server.mjs`). La tarea 4.1 sigue pendiente (`[ ]`) hasta probar una partida completa en dos navegadores contra las instancias reales de `auth-api` y `kahoot-api`.
