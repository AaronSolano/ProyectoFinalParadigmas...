## Purpose

Garantiza que otro proyecto pueda consumir la API del servicio de actividades solo por red y por contratos documentados.

## ADDED Requirements

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
