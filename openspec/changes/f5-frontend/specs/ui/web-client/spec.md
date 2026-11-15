## Purpose

Interfaz web responsive para creadores, anfitriones y participantes, disponible en español e inglés.

## ADDED Requirements

### Requirement: Flujos de usuario
La interfaz SHALL ofrecer registro, inicio de sesión, gestión de cuestionarios, creación de sala, lobby, pregunta en vivo con botones grandes Verdadero y Falso, resultados y clasificación.

#### Scenario: Participante responde
- **WHEN** llega una pregunta
- **THEN** el participante ve enunciado, imagen, tiempo restante y dos botones grandes

### Requirement: Responsive
La interfaz SHALL funcionar en computadora y celular.

#### Scenario: Pantalla pequeña
- **WHEN** se usa en un viewport de celular
- **THEN** los controles de juego son legibles y utilizables sin desplazamiento horizontal

### Requirement: Idioma
La interfaz SHALL permitir elegir entre español e inglés.

#### Scenario: Cambio de idioma
- **WHEN** el usuario cambia el idioma
- **THEN** los textos de la interfaz se muestran en el idioma elegido y la preferencia se conserva

### Requirement: Errores claros
La interfaz SHALL mostrar mensajes comprensibles ante errores de acceso, pérdida de conexión o código de sala inválido.

#### Scenario: Código inválido
- **WHEN** el participante escribe un código que no existe
- **THEN** ve un mensaje que indica que la sala no se encontró
