## 1. Dominio

- [ ] 1.1 (Codex) Implementar la máquina de estados de la partida y verificar con pruebas unitarias de transiciones válidas e inválidas
- [ ] 1.2 (Codex) Implementar reglas de respuesta (única, tardía, cierre) y verificar con pruebas unitarias de reenvío y respuesta tardía
- [ ] 1.3 (Codex) Implementar el cálculo de puntaje y clasificación y verificar acierto, error y sin respuesta

## 2. Canal en vivo

- [ ] 2.1 (Codex) Implementar el gateway con autenticación de handshake y salas aisladas y verificar que una conexión sin token se rechaza
- [ ] 2.2 (Codex) Implementar los eventos de control del anfitrión y verificar que un participante no puede controlar la partida
- [ ] 2.3 (Codex) Implementar difusión de pregunta con imagen y plazo y verificar que dos salas simultáneas no mezclan eventos

## 3. Respuestas y resultados

- [ ] 3.1 (Codex) Implementar recepción de respuestas con restricción única y verificar que reenvíos y tardías no suman
- [ ] 3.2 (Codex) Implementar cierre de pregunta con revelación de respuesta y resultado y verificar que la respuesta correcta no se envía antes
- [ ] 3.3 (Codex) Persistir la clasificación final y verificar que sigue disponible por REST tras reiniciar el servicio

## 4. Reconexión

- [ ] 4.1 (Codex) Implementar `state_sync` al reconectar y verificar que no se duplican participante ni puntaje
- [ ] 4.2 (Codex) Reprogramar temporizadores al arrancar y verificar con una prueba de reinicio durante una pregunta

## 5. Contrato

- [ ] 5.1 (Codex) Verificar que los eventos implementados coinciden con el catálogo de la fase 1
