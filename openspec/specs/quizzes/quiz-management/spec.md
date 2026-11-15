# quizzes/quiz-management Specification

## Purpose

Permite a los creadores administrar sus cuestionarios y preguntas Verdadero/Falso, incluyendo imágenes almacenadas por la API.

## Requirements

### Requirement: CRUD de cuestionarios y preguntas
La API SHALL permitir al propietario crear, consultar, editar y eliminar sus cuestionarios y preguntas; cada pregunta tiene enunciado, respuesta correcta (Verdadero o Falso) e imagen opcional.

#### Scenario: Propietario administra su cuestionario
- **WHEN** el propietario crea una pregunta en su cuestionario
- **THEN** la pregunta queda guardada y aparece al consultar el cuestionario

#### Scenario: Acceso ajeno
- **WHEN** otro usuario intenta editar o eliminar un cuestionario que no es suyo
- **THEN** la API responde 403 y no modifica datos

### Requirement: Validación y almacenamiento de imágenes
La API SHALL validar formato y tamaño de cada imagen, almacenarla de forma persistente y servirla por URL accesible desde otros dispositivos.

#### Scenario: Imagen válida
- **WHEN** se sube una imagen con formato permitido y tamaño dentro del límite
- **THEN** se guarda y la pregunta expone una URL pública utilizable por los participantes

#### Scenario: Imagen inválida
- **WHEN** el formato no está permitido o el tamaño excede el límite
- **THEN** la API rechaza la carga con un error de validación claro
