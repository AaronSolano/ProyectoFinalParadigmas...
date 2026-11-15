## 1. Base y autenticación

- [x] 1.1 (Codex) Crear el proyecto NestJS en `apps/kahoot-api` con capas y verificar que arranca y responde `/health`
- [x] 1.2 (Codex) Validar tokens de `auth-api` por JWKS y verificar con una prueba de integración con token válido, expirado y de otra audiencia

## 2. Cuestionarios y preguntas

- [x] 2.1 (Codex) Implementar CRUD de cuestionarios y preguntas con migraciones y verificar con pruebas unitarias y de integración
- [x] 2.2 (Codex) Aplicar permisos de propietario y verificar que otro usuario recibe 403 al editar o eliminar

## 3. Imágenes

- [x] 3.1 (Codex) Implementar `ImageStorage` con disco y verificar que una imagen subida se sirve por URL pública
- [x] 3.2 (Codex) Validar formato real y tamaño y verificar que formatos y tamaños inválidos se rechazan con error claro
- [x] 3.3 (Codex) Implementar el adaptador de Supabase Storage y verificar que las pruebas de almacenamiento pasan con ambos adaptadores

## 4. Salas

- [x] 4.1 (Codex) Implementar creación de sala con código único y snapshot del cuestionario y verificar que editar el cuestionario no cambia la sala
- [x] 4.2 (Codex) Implementar ingreso de participantes y lobby y verificar el error de código inválido y que no se duplican participantes
- [x] 4.3 (Codex) Verificar con una prueba que dos salas mantienen participantes y resultados separados

## 5. Contrato

- [x] 5.1 (Codex) Publicar OpenAPI/Scalar y verificar que coincide con el contrato de la fase 1

## Evidencia de cierre

Implementación y revisión de código realizadas por Codex con subagentes. Pruebas locales, compilación y comprobación de tipos aprobadas. PR de implementación fusionado. La comprobación CI del PR figura fallida y su integración sigue pendiente; este registro no certifica CI verde. Supabase Storage (fase 3) se verificó con servidor HTTP de pruebas, no con credenciales de un proyecto remoto.
