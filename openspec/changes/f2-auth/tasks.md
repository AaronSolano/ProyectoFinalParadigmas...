## 1. Base del servicio

- [ ] 1.1 (Codex) Crear el proyecto NestJS en `apps/auth-api` con capas y verificar que arranca y responde `/health`
- [ ] 1.2 (Codex) Modelar la tabla de perfiles con migración y verificar que se aplica en PostgreSQL

## 2. Registro e inicio de sesión

- [ ] 2.1 (Codex) Implementar registro con validación y hash de contraseña y verificar con pruebas unitarias (duplicado, contraseña débil)
- [ ] 2.2 (Codex) Implementar inicio de sesión con JWT con audiencia `kahoot-api` y verificar que credenciales inválidas devuelven 401 uniforme

## 3. Contratos y documentación

- [ ] 3.1 (Codex) Exponer la clave pública (JWKS) y verificar que una prueba de integración valida un token sin acceso a la base
- [ ] 3.2 (Codex) Publicar OpenAPI/Scalar y verificar que coincide con el contrato de la fase 1
- [ ] 3.3 (Codex) Agregar OpenTelemetry y verificar que se emiten trazas al colector
