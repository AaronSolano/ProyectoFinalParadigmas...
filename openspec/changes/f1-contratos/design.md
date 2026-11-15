## Context

Monorepo vacío con carpetas creadas en la fase 0. Ver `plan-fases-proyecto/design.md` (D1, D5) para stack y orquestación.

## Goals / Non-Goals

**Goals:** contratos revisables por humanos y utilizables por herramientas (generación de tipos, validación).
**Non-Goals:** código de las APIs o del frontend.

## Decisions

- **OpenAPI 3.1 en YAML** por servicio; los tipos TypeScript compartidos se generan desde el YAML (no a mano) para evitar divergencias.
- **Eventos en vivo** descritos en un documento versionado (estilo AsyncAPI simplificado en Markdown + JSON Schema), con sección de autenticación del canal y del evento de recuperación de estado.
- **Modelo de datos:** una base lógica por servicio; entidades: Perfil (auth); Cuestionario, Pregunta, Sala, Participante, Respuesta, Resultado (kahoot).
- **Verificación de contrato:** pruebas que comparan el OpenAPI generado por Nest con el contrato congelado.
- Alternativa descartada: code-first sin contrato previo; no permite trabajo en paralelo.

## Risks / Trade-offs

- [Contrato incompleto bloquea a los agentes] → Revisión del orquestador y ronda de revisión con el equipo antes de congelar.
- [Cambios posteriores al contrato] → Solo vía PR del orquestador con versión incrementada.
