## Purpose

Asegura que la solución se ejecute igual en cualquier máquina, conserve sus datos, sea observable en Grafana y esté desplegada públicamente.

## ADDED Requirements

### Requirement: Arranque reproducible
Con Git, Docker y Compose instalados, un único script SHALL levantar frontend, APIs, base de datos y componentes de observabilidad, creando el esquema y los datos de demostración (usuario y cuestionario de prueba).

#### Scenario: Arranque desde cero
- **WHEN** se clona el repositorio, se completa el archivo de entorno y se ejecuta el script
- **THEN** todos los servicios quedan activos y el usuario de prueba puede jugar el cuestionario de prueba

### Requirement: Persistencia
Los perfiles, cuestionarios, imágenes y resultados SHALL conservarse tras reiniciar los contenedores.

#### Scenario: Reinicio
- **WHEN** se detienen y vuelven a iniciar los contenedores
- **THEN** los datos y las imágenes siguen disponibles

### Requirement: Observabilidad
Cada servicio SHALL exponer métricas y trazas con OpenTelemetry visibles en paneles de Grafana.

#### Scenario: Panel de servicio
- **WHEN** hay tráfico hacia una API
- **THEN** Grafana muestra sus solicitudes, latencia y errores

### Requirement: Configuración sin secretos en el repositorio
URLs, puertos y credenciales SHALL provenir de variables de entorno con un archivo de ejemplo versionado.

#### Scenario: Repositorio limpio
- **WHEN** se revisa el repositorio
- **THEN** existe un archivo de ejemplo y no hay secretos reales versionados

### Requirement: Ejecución portátil con imágenes publicadas
La solución SHALL poder iniciarse en cualquier dispositivo con Git, Docker y Compose usando las imágenes publicadas en Docker Hub, sin depender de servicios externos de pago.

#### Scenario: Otro dispositivo
- **WHEN** se clona el repositorio en otra máquina y se ejecuta el script con imágenes de Docker Hub
- **THEN** la solución completa funciona de forma local
