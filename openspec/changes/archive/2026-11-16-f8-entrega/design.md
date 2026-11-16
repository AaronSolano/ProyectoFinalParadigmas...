## Context

Depende de las fases 1 a 7. Ver `plan-fases-proyecto/design.md` (D2, D7).

## Goals / Non-Goals

**Goals:** una URL pública estable para la clase y un cliente que demuestre el consumo independiente.
**Non-Goals:** alta disponibilidad o dominio propio (opcional).

## Decisions

- **Cliente externo:** HTML + JavaScript estático sin importar código de las APIs; lee `API_URL` y credenciales de un archivo de configuración y usa los endpoints documentados. Se despliega aparte (Vercel o página estática).
- **Render:** un Web Service por API apuntando a la imagen de Docker Hub; variables por panel; healthcheck en `/health`. Para la demostración se usa un plan que no duerma o se despierta el servicio antes.
- **Supabase:** base con conexión por pooler y SSL; las migraciones se aplican desde el pipeline o a mano con un comando documentado. Storage se usa solo si Render no ofrece disco.
- **Vercel:** variables `VITE_*` apuntando a las URLs de Render; reescritura de rutas para SPA.
- **Documentación:** diagramas versionados en `docs/` y enlazados desde el README; las specs archivadas de OpenSpec se incluyen en los PR.

## Risks / Trade-offs

- [Render gratuito duerme y corta la partida] → Plan sin suspensión o calentamiento previo a la demostración.
- [CORS mal configurado] → Lista explícita de orígenes y prueba desde un celular antes de la clase.
- [Costo] → Confirmar plan y gasto con el equipo antes de contratarlo.
