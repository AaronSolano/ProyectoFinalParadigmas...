## Purpose

Conduce la partida en vivo: una pregunta a la vez, tiempo limitado, una respuesta por participante y recuperación de estado tras desconexión.

## ADDED Requirements

### Requirement: Control de partida por el anfitrión
Solo el anfitrión de la sala SHALL poder iniciar la partida, mostrar la siguiente pregunta y avanzar tras el cierre de la pregunta actual.

#### Scenario: Participante intenta controlar
- **WHEN** un participante envía una orden de control de la partida
- **THEN** la API la rechaza y el estado no cambia

### Requirement: Pregunta en vivo con tiempo de respuesta
La API SHALL difundir a todos los participantes de la sala la misma pregunta con su imagen y un tiempo límite definido, y cerrarla al vencer el plazo.

#### Scenario: Difusión de pregunta
- **WHEN** el anfitrión muestra una pregunta
- **THEN** todos los participantes de esa sala reciben enunciado, imagen y plazo sin recargar la página

### Requirement: Validación de respuestas
La API SHALL aceptar una sola respuesta por participante y pregunta, ignorar reenvíos y rechazar respuestas tardías; la respuesta correcta no se revela antes del cierre.

#### Scenario: Reenvío
- **WHEN** un participante envía una segunda respuesta a la misma pregunta
- **THEN** no se registra y no suma puntos

#### Scenario: Respuesta tardía
- **WHEN** llega una respuesta después del cierre
- **THEN** la API la rechaza

### Requirement: Canal en vivo protegido y reconexión
El canal en vivo SHALL exigir autenticación y, al reconectar, devolver al usuario a la misma sala con el estado vigente sin duplicar su participación ni su puntaje.

#### Scenario: Reconexión
- **WHEN** un participante pierde y recupera la conexión durante una pregunta
- **THEN** recibe el estado actual de la partida y su puntaje previo permanece intacto

#### Scenario: Conexión sin token
- **WHEN** se intenta abrir el canal sin credenciales válidas
- **THEN** la conexión es rechazada
