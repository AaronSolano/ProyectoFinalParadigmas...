## Context

Contratos congelados en la fase 1. Responsable: Codex (ver `AGENTS.md`).

## Goals / Non-Goals

**Goals:** servicio autónomo y verificable por otros servicios sin compartir base de datos.
**Non-Goals:** federación, MFA, refresh tokens persistentes.

## Decisions

- **N-Capas:** controladores (presentación) → servicios (aplicación) → entidades/reglas (dominio) → repositorios (datos).
- **JWT firmado con clave asimétrica (RS256)** y endpoint JWKS, de modo que `kahoot-api` valida con la clave pública sin secretos compartidos. Alternativa: HS256 con secreto compartido, descartada por acoplar secretos entre servicios.
- **Hash de contraseña con Argon2** (o bcrypt si hay problemas de compilación en Docker).
- Mensajes de error de login idénticos para correo inexistente y contraseña errónea.

## Risks / Trade-offs

- [Gestión de claves en Render] → Claves por variables de entorno; script para generarlas.
- [Token robado] → Expiración corta y audiencia estricta.
