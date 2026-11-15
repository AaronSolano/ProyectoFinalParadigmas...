# game/scoring-results Specification

## Purpose

Calcula puntajes, revela resultados al cerrar cada pregunta y conserva la clasificación final de cada sesión.

## Requirements

### Requirement: Puntaje básico
La API SHALL asignar un punto por respuesta correcta y cero por respuesta incorrecta o ausente.

#### Scenario: Acierto y falta de respuesta
- **WHEN** se cierra una pregunta
- **THEN** quien acertó suma 1 punto y quien falló o no respondió suma 0

### Requirement: Revelación al cerrar
Al cerrar cada pregunta la API SHALL mostrar la respuesta correcta y el resultado de cada participante.

#### Scenario: Cierre de pregunta
- **WHEN** vence el tiempo o el anfitrión cierra la pregunta
- **THEN** los participantes reciben la respuesta correcta y su resultado

### Requirement: Clasificación y persistencia
Al finalizar la partida la API SHALL presentar la clasificación y guardar los resultados de forma persistente.

#### Scenario: Resultados tras reinicio
- **WHEN** los contenedores se reinician después de terminar una partida
- **THEN** los resultados de esa sesión siguen disponibles por la API
