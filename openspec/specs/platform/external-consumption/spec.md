# platform/external-consumption Specification

## Purpose
Garantiza que otro proyecto pueda consumir la API del servicio de actividades solo por red y por contratos documentados.

## Requirements

### Requirement: Contratos documentados
Cada API SHALL publicar su documentación OpenAPI/Scalar y el servicio de actividades SHALL documentar sus eventos en vivo, datos y forma de autenticación y recuperación de estado.

#### Scenario: Documentación disponible
- **WHEN** se abre la ruta de documentación de una API
- **THEN** se listan sus endpoints, esquemas y requisitos de autenticación

### Requirement: Contratos como fuente de verdad
Los contratos publicados SHALL ser la única definición de endpoints y eventos; ninguna API ni cliente expone o consume algo que no esté en ellos.

#### Scenario: Endpoint fuera de contrato
- **WHEN** una implementación agrega un endpoint que no está en el contrato
- **THEN** la verificación de contratos falla

### Requirement: Cliente adicional independiente
Un cliente externo sencillo SHALL consultar una sesión y sus resultados mediante configuración (URL y credenciales), sin acceder a la base de datos ni incluir código fuente de la API.

#### Scenario: Consulta de resultados
- **WHEN** el cliente se autentica y solicita los resultados de una sesión
- **THEN** recibe la clasificación por la API documentada
