# Funciones Compartidas de Checklists

## Resumen
Este documento describe las funciones principales que son compartidas entre los diferentes tipos de checklists (atracciones, familias, específicos).

## Funciones Compartidas

### handleResponseChange(itemId, field, value)
Maneja cambios en las respuestas de ítems individuales.

**Parámetros:**
- `itemId`: ID único del ítem del checklist
- `field`: Campo que se está modificando ('response_compliance', 'comment', 'evidence_url', etc.)
- `value`: Nuevo valor para el campo

**Funcionalidad:**
- Actualiza el estado de respuestas del ítem
- Sincroniza campos relacionados (response_type, response_compliance, value)
- Marca el ítem como modificado

### handleResponseTypeChange(itemId, responseType)
Cambia el tipo de respuesta completa para un ítem.

**Parámetros:**
- `itemId`: ID único del ítem
- `responseType`: Tipo de respuesta ('cumple', 'no_cumple', 'observaciones')

**Funcionalidad:**
- Establece response_type, response_compliance y value
- Limpia comentario y evidencia si es 'cumple'
- Marca como modificado

### handleSubmitResponses()
Envía todas las respuestas modificadas al servidor.

**Funcionalidad:**
- Valida que items marcados como 'no_cumple' tengan comentarios
- Bloquea envío si checklist está firmado
- Envía payload al endpoint correspondiente
- Maneja errores y retroalimentación al usuario

### handleFileUpload(itemId, file)
Sube archivos de evidencia para ítems.

**Parámetros:**
- `itemId`: ID del ítem
- `file`: Archivo a subir

**Validaciones:**
- Tipo de archivo (imagen JPEG, PNG, WebP)
- Tamaño máximo (5MB)

### handleMarkAllSiblings(parentItemId, inspectableId, responseType)
Marca todos los ítems hermanos con la misma respuesta.

**Parámetros:**
- `parentItemId`: ID del ítem padre
- `inspectableId`: ID del dispositivo (para familias)
- `responseType`: Tipo de respuesta a aplicar

### Configuración por Tipo de Checklist

#### Atracciones
- `entityType`: 'attraction'
- Endpoint: `/api/checklists/type/{id}/latest`
- Frecuencia: Diaria
- Requiere selección de entidad

#### Familias
- `entityType`: 'family'
- Endpoint: `/api/checklists/family/{id}/generate`
- Frecuencia: Semanal
- Genera plantillas dinámicas
- No requiere selección de entidad (usa checklistTypeId)

#### Específicos (Premios)
- `entityType`: 'inspectable'
- Endpoint: `/api/checklists/type/{id}/latest`
- Frecuencia: Según necesidad
- Manejo especial de respuestas numéricas

## Estados Compartidos

- `checklist`: Datos del checklist actual
- `itemResponses`: Mapa de respuestas por ítem
- `modifiedResponses`: Set de ítems modificados
- `hasExistingResponses`: Indica si hay respuestas guardadas
- `showSignaturePad`: Control del modal de firma

## Hooks y Utilidades

### useAuth()
Proporciona usuario y estado de autenticación.

### dateUtils
- `formatLocalDate()`: Formatea fechas locales
- `formatLocalDateTime()`: Formatea fechas y horas locales

### axiosConfig
Configuración centralizada de Axios con interceptores.