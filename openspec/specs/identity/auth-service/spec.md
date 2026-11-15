# identity/auth-service Specification

## Purpose

Servicio de autenticación independiente que registra perfiles, inicia sesión y emite tokens que el servicio de actividades reconoce como audiencia.

## Requirements

### Requirement: Registro de perfil
El servicio SHALL permitir registrar un perfil con nombre visible, correo y contraseña, rechazando correos duplicados y contraseñas débiles.

#### Scenario: Registro exitoso
- **WHEN** se envía un registro con datos válidos y correo nuevo
- **THEN** el perfil se crea y la contraseña se almacena solo como hash

#### Scenario: Correo duplicado
- **WHEN** se registra un correo ya existente
- **THEN** el servicio responde con un error de conflicto sin crear otro perfil

### Requirement: Inicio de sesión y token
El servicio SHALL emitir un token firmado con la audiencia del servicio de actividades tras un inicio de sesión válido.

#### Scenario: Credenciales válidas
- **WHEN** el usuario inicia sesión con credenciales correctas
- **THEN** recibe un token con identificador, nombre visible y audiencia del servicio de actividades

#### Scenario: Credenciales inválidas
- **WHEN** las credenciales son incorrectas
- **THEN** el servicio responde 401 sin revelar si el correo existe

### Requirement: Despliegue independiente
El servicio SHALL ejecutarse como API separada con su propia base de datos y su propia documentación OpenAPI.

#### Scenario: Validación por el servicio de actividades
- **WHEN** el servicio de actividades recibe un token
- **THEN** lo valida con la clave pública o configuración del servicio de autenticación, sin acceder a su base de datos
