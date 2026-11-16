## Purpose

Proporciona retroalimentación audiovisual tipo Kahoot durante la partida en vivo, incluyendo barra y anillo de tiempo restante, visualización del tiempo transcurrido al responder, indicadores de racha de aciertos consecutivos y efectos de sonido sincronizados con cada fase del juego con control de silencio.

## ADDED Requirements

### Requirement: Indicador visual de tiempo restante y tiempo transcurrido
La interfaz SHALL mostrar durante cada pregunta abierta una representación gráfica continua del tiempo restante sincronizada con el servidor y, cuando el participante envía su respuesta o se cierra la pregunta, el tiempo transcurrido empleado para responder.

#### Scenario: Progreso visual durante pregunta abierta
- **WHEN** se abre una pregunta con un tiempo límite definido
- **THEN** el anfitrión y los participantes ven la cuenta regresiva en segundos junto con un indicador gráfico de progreso que cambia a estado urgente en los últimos 5 segundos

#### Scenario: Visualización del tiempo transcurrido al responder
- **WHEN** un participante envía su respuesta dentro del plazo y luego se revela el resultado de la pregunta
- **THEN** la interfaz muestra el tiempo transcurrido que tardó en responder expresado en segundos con precisión decimal

### Requirement: Efectos de sonido y música por fase con control de silencio
La interfaz SHALL reproducir efectos sonoros diferenciados para la espera en el lobby, la apertura y cuenta regresiva de la pregunta, el envío de respuesta, el agotamiento del tiempo, el resultado (acierto o fallo) y el podio final, permitiendo al usuario silenciar o reactivar el audio en cualquier momento y conservando esa preferencia.

#### Scenario: Retroalimentación sonora al cerrar pregunta
- **WHEN** se cierra una pregunta y el audio no está silenciado
- **THEN** el participante que acertó escucha un tono celebratorio cuyo timbre asciende según su racha actual y quien falló o no respondió escucha un tono de error o tiempo agotado

#### Scenario: Silenciar audio
- **WHEN** el usuario activa el control de silencio en la sala de juego
- **THEN** ningún efecto sonoro ni pista de ambiente se reproduce en fases posteriores y la preferencia se mantiene al recargar la página

### Requirement: Visualización de puntos por velocidad y racha de aciertos
La interfaz SHALL mostrar al cierre de cada pregunta los puntos exactos ganados por velocidad de respuesta (entre 500 y 1000 puntos por acierto) y un indicador visual de racha cuando el participante acumula respuestas correctas consecutivas, tanto en español como en inglés.

#### Scenario: Participante en racha de aciertos
- **WHEN** un participante acierta dos o más preguntas consecutivas
- **THEN** la pantalla de resultado de la pregunta muestra los puntos obtenidos en esa ronda y una insignia de racha con el número de aciertos seguidos
