## Context

Depende de las fases 2 a 6. Responsables: Antigravity (e2e), Codex (unitarias, integración y carga del backend), Claude Code (evidencia).

## Goals / Non-Goals

**Goals:** pruebas repetibles que corran en CI y local; un número honesto de participantes máximos.
**Non-Goals:** pruebas de penetración completas.

## Decisions

- **Pirámide:** muchas unitarias de dominio, integración con base real (Testcontainers o Compose) y e2e centrados en los seis casos del enunciado.
- **e2e con Playwright**, con varios contextos de navegador para simular anfitrión y participantes; alternativa: tester-army/e2e solo si Playwright resulta inviable.
- **Carga:** script con clientes Socket.IO simulados (k6 o un script Node) que escala por pasos hasta que la latencia de cierre o los errores superan un umbral; el máximo se reporta con ese criterio.
- **Evidencia:** una tabla por caso con fecha, versión, resultado y enlace a la corrida.

## Risks / Trade-offs

- [Pruebas inestables por tiempos] → Reloj controlable en dominio; en e2e, esperas basadas en eventos.
- [Cifras de carga dependen del equipo] → Registrar el hardware y el entorno usado.
