## 1. Base y autenticación

- [ ] 1.1 (Codex) Crear el proyecto NestJS en `apps/kahoot-api` con capas y verificar que arranca y responde `/health`
- [ ] 1.2 (Codex) Validar tokens de `auth-api` por JWKS y verificar con una prueba de integración con token válido, expirado y de otra audiencia

## 2. Cuestionarios y preguntas

- [ ] 2.1 (Codex) Implementar CRUD de cuestionarios y preguntas con migraciones y verificar con pruebas unitarias y de integración
- [ ] 2.2 (Codex) Aplicar permisos de propietario y verificar que otro usuario recibe 403 al editar o eliminar

## 3. Imágenes

- [ ] 3.1 (Codex) Implementar `ImageStorage` con disco y verificar que una imagen subida se sirve por URL pública
- [ ] 3.2 (Codex) Validar formato real y tamaño y verificar que formatos y tamaños inválidos se rechazan con error claro
- [ ] 3.3 (Codex) Implementar el adaptador de Supabase Storage y verificar que las pruebas de almacenamiento pasan con ambos adaptadores

## 4. Salas

- [ ] 4.1 (Codex) Implementar creación de sala con código único y snapshot del cuestionario y verificar que editar el cuestionario no cambia la sala
- [ ] 4.2 (Codex) Implementar ingreso de participantes y lobby y verificar el error de código inválido y que no se duplican participantes
- [ ] 4.3 (Codex) Verificar con una prueba que dos salas mantienen participantes y resultados separados

## 5. Contrato

- [ ] 5.1 (Codex) Publicar OpenAPI/Scalar y verificar que coincide con el contrato de la fase 1
