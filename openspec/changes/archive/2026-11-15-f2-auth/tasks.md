## 1. Base del servicio

- [x] 1.1 (Codex) Crear el proyecto NestJS en `apps/auth-api` con capas y verificar que arranca y responde `/health`
- [x] 1.2 (Codex) Modelar la tabla de perfiles con migración y verificar que se aplica en PostgreSQL

## 2. Registro e inicio de sesión

- [x] 2.1 (Codex) Implementar registro con validación y hash de contraseña y verificar con pruebas unitarias (duplicado, contraseña débil)
- [x] 2.2 (Codex) Implementar inicio de sesión con JWT con audiencia `kahoot-api` y verificar que credenciales inválidas devuelven 401 uniforme

## 3. Contratos y documentación

- [x] 3.1 (Codex) Exponer la clave pública (JWKS) y verificar que una prueba de integración valida un token sin acceso a la base
- [x] 3.2 (Codex) Publicar OpenAPI/Scalar y verificar que coincide con el contrato de la fase 1
- [x] 3.3 (Codex) Agregar OpenTelemetry y verificar que se emiten trazas al colector

## Evidencia de cierre

Implementación y revisión de código realizadas por Codex con subagentes. Pruebas locales, compilación y comprobación de tipos aprobadas. PR de implementación fusionado. La comprobación CI del PR figura fallida y su integración sigue pendiente; este registro no certifica CI verde. Supabase Storage (fase 3) se verificó con servidor HTTP de pruebas, no con credenciales de un proyecto remoto.
