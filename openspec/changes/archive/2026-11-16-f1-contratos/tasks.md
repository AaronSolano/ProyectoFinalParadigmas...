## 1. Contratos de las APIs

- [x] 1.1 (Claude Code) Escribir el OpenAPI de `auth-api` y verificar que valida con un linter de OpenAPI
- [x] 1.2 (Claude Code) Escribir el OpenAPI de `kahoot-api` (cuestionarios, preguntas, imágenes, salas, resultados) y verificar que valida con el linter
- [x] 1.3 (Claude Code) Documentar el catálogo de eventos en vivo, su autenticación y la recuperación de estado y verificar que cada evento tiene datos y ejemplo

## 2. Modelo y diagramas

- [x] 2.1 (Claude Code) Diseñar el modelo de datos y verificar que cubre las 5 funciones mínimas del enunciado
- [x] 2.2 (Claude Code) Dibujar diagrama de clases y de arquitectura en `docs/` y verificar que se renderizan (los 10 bloques Mermaid se validaron con el parser de Mermaid; no se comprobó el renderizado visual)

## 3. Congelado

- [x] 3.1 (Claude Code) Generar tipos compartidos en `packages/contracts` y verificar que compilan sin errores
- [x] 3.2 (Claude Code) Agregar la verificación de contrato al CI y verificar que falla con un endpoint no declarado
- [ ] 3.3 (Equipo) Revisar y congelar la versión 1.0 de los contratos y verificar la aprobación en el PR
