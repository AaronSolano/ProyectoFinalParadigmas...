## Purpose

Gestiona salas de juego con código: creación por el anfitrión, ingreso de participantes, lobby e inicio de partida con aislamiento entre salas.

## ADDED Requirements

### Requirement: Creación de sala
Una persona autenticada SHALL poder crear una sala a partir de un cuestionario propio; la API genera un código único y fija una copia estable del cuestionario para esa partida.

#### Scenario: Sala creada
- **WHEN** el anfitrión crea una sala con un cuestionario suyo
- **THEN** recibe un código único y la sala queda en estado de espera

#### Scenario: Cuestionario modificado durante la partida
- **WHEN** el propietario edita el cuestionario después de crear la sala
- **THEN** la partida en curso sigue usando las preguntas originales

### Requirement: Ingreso de participantes
Los participantes autenticados SHALL ingresar con el código de sala y el anfitrión SHALL ver quién se ha unido.

#### Scenario: Código válido
- **WHEN** un participante ingresa un código de una sala en espera
- **THEN** aparece en el lobby del anfitrión sin duplicarse

#### Scenario: Código inválido
- **WHEN** el código no existe o la sala ya terminó
- **THEN** el participante recibe un error claro de código de sala

### Requirement: Aislamiento entre salas
Cada sala SHALL mantener separados sus participantes, mensajes y resultados.

#### Scenario: Dos salas simultáneas
- **WHEN** hay dos salas activas
- **THEN** los eventos y resultados de una no llegan a los participantes de la otra
