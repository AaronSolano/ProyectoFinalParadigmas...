## Purpose
Permitir el ingreso seguro a partidas sin una cuenta, compartir salas y personalizar el ritmo de juego y las preferencias de la interfaz.

## ADDED Requirements
### Requirement: Avance por sala
El servidor SHALL conservar el avance automático de cada sala como entero de 0 a 60 segundos, usar la configuración global al omitirlo y recuperar cada sala con su propio valor después de reinicio. Los formularios SHALL ofrecer desactivado, 3, 5, 10, 15 y 30 segundos, con 5 segundos como selección inicial.
#### Scenario: Sala manual
- **WHEN** una sala tiene autoAdvanceSeconds igual a cero
- **THEN** el cierre publica nextQuestionAt null y no programa avance

#### Scenario: Valor fuera de rango
- **WHEN** se intenta crear una sala con 61 segundos de avance
- **THEN** la API responde 400 y no crea la sala
#### Scenario: Avance activado
- **WHEN** termina la espera configurada de una sala con avance activado
- **THEN** el servidor abre la siguiente pregunta o publica el fin de la partida

### Requirement: Identidad de invitado
El sistema SHALL emitir una identidad efímera con apodo recortado de 2 a 40 caracteres, UUID nuevo y token RS256 por seis horas por defecto, sin consultar ni escribir perfiles y sin correo. SHALL rechazar con 403 FORBIDDEN todas las operaciones de cuestionarios, biblioteca y listado o creación de salas para invitados; consultar el perfil con ese token SHALL responder 401.
#### Scenario: Participante sin cuenta
- **WHEN** una persona envía un apodo válido y código de sala
- **THEN** puede unirse, responder, reconectar y ver resultados sin controlar la partida

#### Scenario: Apodo inválido
- **WHEN** se envía un apodo vacío, de un carácter o mayor a 40 caracteres
- **THEN** el servicio responde 400 sin emitir una identidad
#### Scenario: Acceso a rutas docentes
- **WHEN** un invitado intenta navegar a cuestionarios, biblioteca o anfitrión
- **THEN** la web redirige al ingreso público y no muestra enlaces docentes

### Requirement: Facilidades web accesibles
La web SHALL proporcionar QR local, código precargado, búsqueda sin tildes, filtro por categoría y ajustes bilingües persistentes con teclado.
#### Scenario: Enlace de sala
- **WHEN** se abre /join?code= con código válido
- **THEN** el formulario público precarga el código en mayúsculas
#### Scenario: Preferencias
- **WHEN** se cambia idioma o sonido en Ajustes
- **THEN** la preferencia persiste y se sincroniza con el juego

#### Scenario: Búsqueda combinada
- **WHEN** se busca por título o descripción con mayúsculas o sin tildes y se elige una categoría en biblioteca
- **THEN** la web aplica ambos filtros, conserva agrupaciones y anuncia el conteo, con opción de limpiar cuando no hay resultados
#### Scenario: Panel móvil y teclado
- **WHEN** se abre Ajustes desde un teléfono o con teclado
- **THEN** el panel queda dentro de la pantalla, permite cambiar preferencias y devuelve el foco al engranaje al cerrar con Escape
