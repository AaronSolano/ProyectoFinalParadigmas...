## 1. Dominio

- [x] 1.1 (Codex) Implementar la máquina de estados de la partida y verificar con pruebas unitarias de transiciones válidas e inválidas
- [x] 1.2 (Codex) Implementar reglas de respuesta (única, tardía, cierre) y verificar con pruebas unitarias de reenvío y respuesta tardía
- [x] 1.3 (Codex) Implementar el cálculo de puntaje y clasificación y verificar acierto, error y sin respuesta

## 2. Canal en vivo

- [x] 2.1 (Codex) Implementar el gateway con autenticación de handshake y salas aisladas y verificar que una conexión sin token se rechaza
- [x] 2.2 (Codex) Implementar los eventos de control del anfitrión y verificar que un participante no puede controlar la partida
- [x] 2.3 (Codex) Implementar difusión de pregunta con imagen y plazo y verificar que dos salas simultáneas no mezclan eventos

## 3. Respuestas y resultados

- [x] 3.1 (Codex) Implementar recepción de respuestas con restricción única y verificar que reenvíos y tardías no suman
- [x] 3.2 (Codex) Implementar cierre de pregunta con revelación de respuesta y resultado y verificar que la respuesta correcta no se envía antes
- [x] 3.3 (Codex) Persistir la clasificación final y verificar que sigue disponible por REST tras reiniciar el servicio

## 4. Reconexión

- [x] 4.1 (Codex) Implementar `state_sync` al reconectar y verificar que no se duplican participante ni puntaje
- [x] 4.2 (Codex) Reprogramar temporizadores al arrancar y verificar con una prueba de reinicio durante una pregunta

## 5. Contrato

- [x] 5.1 (Codex) Verificar que los eventos implementados coinciden con el catálogo de la fase 1

## Evidencia de cierre

Aporte Codex. Las 12 tareas fueron implementadas y verificadas con pruebas locales en PostgreSQL real y clientes Socket.IO. La suite de kahoot-api aprobó 56 pruebas y auth-api 30; ESLint, tipos, compilación y formato de kahoot-api también aprobados. La evidencia está en apps/kahoot-api/README.md y las suites game-domain.spec.ts, live.spec.ts y game-telemetry.spec.ts.

Cobertura: transiciones válidas e inválidas, una respuesta por pregunta incluso con dos pestañas concurrentes, respuestas tardías y cerradas, permisos de anfitrión, dos salas aisladas, imagen y plazo compartidos, secreto de respuesta hasta el cierre, puntajes y empates, resultados persistidos consultables por REST, reconexión y restauración de temporizadores tras reinicio antes y después del plazo.

CI omitido como condición de cierre por instrucción expresa del usuario. Implementación presentada en el PR #18; revisión y merge siguen pendientes. Este archivo documenta el trabajo realizado y no certifica aprobación ni despliegue. Las tareas restantes de F7 y del resto del equipo permanecen abiertas.