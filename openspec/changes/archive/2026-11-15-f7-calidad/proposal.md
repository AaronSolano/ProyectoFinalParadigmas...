## Why

El enunciado exige comprobar acceso, juego simultáneo, respuestas válidas, reconexión, persistencia y consumo independiente, y registrar el máximo de participantes simultáneos. Sin pruebas automatizadas, esas garantías no se sostienen.

## What Changes

- Completar pruebas unitarias e integración de ambas APIs y del frontend.
- Pruebas e2e con Playwright de los seis casos obligatorios, contra Compose.
- Prueba de carga con participantes simultáneos y registro del máximo probado.
- Documentar evidencia y limitaciones conocidas en `docs/`.
- No cambia el comportamiento del sistema; por eso no declara specs (la evidencia queda especificada en la fase 8).

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- Carpetas de pruebas de cada app, `docs/evidencia/`, CI.
