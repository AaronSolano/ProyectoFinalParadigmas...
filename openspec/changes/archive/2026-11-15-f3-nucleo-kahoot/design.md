## Context

Contratos de la fase 1 y `auth-api` de la fase 2. Responsable: Codex.

## Goals / Non-Goals

**Goals:** capas claras y reglas de permisos en la capa de aplicación; almacenamiento de imágenes intercambiable.
**Non-Goals:** WebSocket y temporizador.

## Decisions

- **N-Capas** con módulos por contexto (`quizzes`, `sessions`) dentro de un monolito modular. Los repositorios son la única capa que habla con la base.
- **Copia estable:** al crear la sala se guarda una instantánea (snapshot) de las preguntas en la sala; editar el cuestionario no afecta partidas existentes.
- **Código de sala:** 6 caracteres sin ambiguos (sin 0/O/1/I), único entre salas activas.
- **Imágenes:** interfaz `ImageStorage` con implementaciones de disco y Supabase Storage; validación por tipo real del archivo (magic bytes), extensión y tamaño máximo.
- **Permisos:** guardia de autenticación más comprobación de propiedad en el caso de uso.

## Risks / Trade-offs

- [Imágenes grandes saturan el servidor] → Límite estricto de tamaño y tipos permitidos.
- [Colisión de códigos] → Reintento en la generación con restricción de unicidad.
