# game/scoring-results Specification

## Purpose

Calcula puntajes, revela resultados al cerrar cada pregunta y conserva la clasificación final de cada sesión.

## Requirements

### Requirement: Puntaje básico
La API SHALL calcular el puntaje de cada respuesta correcta en función del tiempo transcurrido entre la apertura de la pregunta y la recepción de la respuesta en el servidor, otorgando entre 500 y 1000 puntos según la fórmula de decaimiento lineal por tiempo (1000 puntos para respuestas en menos de 0,5 segundos y hasta un mínimo de 500 puntos en el instante límite), y cero puntos por respuesta incorrecta o ausente.

#### Scenario: Acierto y falta de respuesta
- **WHEN** se cierra una pregunta
- **THEN** quien acertó suma entre 500 y 1000 puntos según su velocidad de respuesta y quien falló o no respondió suma 0

#### Scenario: Acierto rápido frente a acierto lento
- **WHEN** dos participantes aciertan la misma pregunta dentro del plazo pero el primero responde antes que el segundo
- **THEN** el primer participante recibe un puntaje mayor que el segundo dentro del rango de 500 a 1000 puntos

### Requirement: Revelación al cerrar
Al cerrar cada pregunta la API SHALL mostrar la respuesta correcta y el resultado de cada participante, incluyendo los puntos otorgados en la pregunta, el puntaje acumulado total, el tiempo transcurrido de respuesta en milisegundos y la racha actual de aciertos consecutivos.

#### Scenario: Cierre de pregunta
- **WHEN** vence el tiempo o el anfitrión cierra la pregunta
- **THEN** los participantes reciben la respuesta correcta, los puntos obtenidos en esa pregunta, su puntaje total actualizado, el tiempo que tardaron en responder y su contador de racha de aciertos consecutivos

### Requirement: Clasificación y persistencia
Al finalizar la partida la API SHALL presentar la clasificación y guardar los resultados de forma persistente.

#### Scenario: Resultados tras reinicio
- **WHEN** los contenedores se reinician después de terminar una partida
- **THEN** los resultados de esa sesión siguen disponibles por la API

### Requirement: Racha de aciertos consecutivos
La API SHALL llevar el conteo de respuestas correctas consecutivas de cada participante durante la sesión, incrementándolo en uno por cada acierto y reiniciándolo a cero cuando el participante falla o deja una pregunta sin responder, sin alterar el puntaje numérico otorgado por velocidad.

#### Scenario: Reinicio de racha tras fallo
- **WHEN** un participante con racha de aciertos consecutivos responde incorrectamente o no responde una pregunta
- **THEN** su contador de racha pasa a 0 y los puntos otorgados en esa pregunta son 0
