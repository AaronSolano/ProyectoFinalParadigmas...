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

- [x] 4.1 (Antigravity) Conectar con las APIs reales y verificar una partida completa en dos navegadores

## Evidencia de cierre

Implementación de `apps/web` (tareas 1.1 a 4.1) realizada por Antigravity y fusionada en `main` (PR #16 y PR #20). Se verificaron `npm run lint`, `npm test` (12/12 pruebas pasando) y `npm run build`. Tras fusionarse la Fase 4 (PR #18), se ejecutó la tarea 4.1 levantando `postgres`, `auth-api` y `kahoot-api` reales en Docker Compose con el seed de demostración (`docente.demo@example.com`, cuestionario *"Programación y paradigmas"* de 5 preguntas y 2 imágenes PNG servidas por `/api/v1/images/`). Se completó una partida real de principio a fin entre anfitrión en escritorio (`1280x800`) y participante en viewport móvil (`360x640`, sin scroll horizontal y botones `>= 56px`) en la sala `H9XQTX` (y verificación visual adicional en `Z74HSS`), incluyendo carga de imágenes reales (`00000000-0000-4000-8000-000000000010.png` y `00000000-0000-4000-8000-000000000011.png`), simulación de reconexión con `state_sync` sin duplicar participante ni alterar puntaje, cierre de las 5 preguntas (`5/5` aciertos, `5 pts`) y persistencia de resultados verificada en `GET /api/v1/sessions/H9XQTX/results`. No se encontraron discrepancias entre `apps/web` y los contratos REST/WebSocket de `auth-api` y `kahoot-api`.
