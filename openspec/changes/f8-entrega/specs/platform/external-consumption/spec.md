## Purpose

Garantiza que otro proyecto pueda consumir la API del servicio de actividades solo por red y por contratos documentados.

## ADDED Requirements

### Requirement: Cliente adicional independiente
Un cliente externo sencillo SHALL consultar una sesión y sus resultados mediante configuración (URL y credenciales), sin acceder a la base de datos ni incluir código fuente de la API.

#### Scenario: Consulta de resultados
- **WHEN** el cliente se autentica y solicita los resultados de una sesión
- **THEN** recibe la clasificación por la API documentada
