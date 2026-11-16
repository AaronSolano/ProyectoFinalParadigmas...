## Purpose

Asegura que la solución se ejecute igual en cualquier máquina, conserve sus datos, sea observable en Grafana y esté desplegada públicamente.

## ADDED Requirements

### Requirement: Despliegue público
La solución SHALL estar desplegada en un servidor externo con una URL accesible desde los dispositivos de la clase.

#### Scenario: Juego desde celular
- **WHEN** un participante abre la URL pública desde su celular
- **THEN** puede iniciar sesión y unirse a una sala

### Requirement: Evidencia de comprobaciones
El proyecto SHALL documentar los participantes simultáneos probados, los resultados de cada comprobación obligatoria y las limitaciones conocidas.

#### Scenario: Revisión de evidencia
- **WHEN** se revisa la documentación del proyecto
- **THEN** cada caso obligatorio tiene su resultado y el máximo de participantes probado queda registrado
