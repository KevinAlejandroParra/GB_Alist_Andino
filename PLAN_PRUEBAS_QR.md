# Plan de Pruebas: Sistema QR con Guardado Incremental

## Objetivo
Validar que el sistema de validación QR permite guardar progreso incremental mientras mantiene el bloqueo de secciones no autorizadas.

## Configuración Previa

### Requisitos
- Checklist tipo "Atracción" configurado con 3 QR codes
- Usuario con rol de técnico de mantenimiento
- Códigos QR generados y disponibles para escaneo

### Datos de Prueba
```
Checklist: "Inspección Montaña Rusa"
QR Codes:
  - QR #1: Grupo 1 (Sección 1: Items 1-5)
  - QR #2: Grupo 2 (Sección 2: Items 6-10)
  - QR #3: Grupo 3 (Sección 3: Items 11-15)
```

## Casos de Prueba

### ✅ CP-001: Estado Inicial sin QR
**Objetivo:** Verificar estado inicial antes de escanear QR

**Pasos:**
1. Abrir checklist de atracción
2. Observar estado de la interfaz

**Resultado Esperado:**
- ✅ Indicador muestra "0 de 3 códigos escaneados"
- ✅ Barra de progreso QR en 0%
- ✅ Todas las secciones muestran icono 🔒
- ✅ Botón "Guardar" está habilitado (aunque no hay nada que guardar)
- ✅ Botón "Firmar" está bloqueado
- ✅ Mensaje: "Sistema de Validación QR Activo"
- ✅ Botón "📱 Escanear Siguiente QR" visible

---

### ✅ CP-002: Escanear Primer QR
**Objetivo:** Verificar desbloqueo de primera sección

**Pasos:**
1. Click en "📱 Escanear Siguiente QR"
2. Escanear QR #1 (Grupo 1)
3. Observar cambios en la interfaz

**Resultado Esperado:**
- ✅ Modal de QR se cierra automáticamente
- ✅ Toast de éxito: "¡QR Válido! Sección 1 autorizada exitosamente"
- ✅ Indicador muestra "1 de 3 códigos escaneados"
- ✅ Barra de progreso QR en 33%
- ✅ Sección 1 (Items 1-5) desbloqueada (sin icono 🔒)
- ✅ Secciones 2 y 3 siguen bloqueadas (con icono 🔒)
- ✅ Botón "Guardar" sigue habilitado
- ✅ Botón "Firmar" sigue bloqueado

---

### ✅ CP-003: Responder Preguntas de Sección Desbloqueada
**Objetivo:** Verificar que se pueden responder preguntas en sección desbloqueada

**Pasos:**
1. En Sección 1, responder:
   - Item 1: Seleccionar "✅ Cumple"
   - Item 2: Seleccionar "✅ Cumple"
   - Item 3: Seleccionar "⚠️ Observación"
   - Item 4: Seleccionar "❌ No Cumple"
   - Item 5: Seleccionar "✅ Cumple"

**Resultado Esperado:**
- ✅ Todas las respuestas se registran correctamente
- ✅ Items con "Observación" y "No Cumple" muestran modal de fallas
- ✅ Botón "Guardar" permanece habilitado
- ✅ No se puede interactuar con Secciones 2 y 3

---

### ✅ CP-004: Guardar Progreso Parcial
**Objetivo:** Verificar que se puede guardar progreso sin completar todos los QR

**Pasos:**
1. Click en botón "Guardar"
2. Esperar confirmación
3. Verificar en consola del navegador

**Resultado Esperado:**
- ✅ Loading spinner aparece brevemente
- ✅ Toast de éxito: "¡Éxito! Checklist guardado correctamente"
- ✅ Botón cambia de "Guardar" a "Actualizar"
- ✅ Respuestas se guardan en BD (verificar en consola: response_id asignado)
- ✅ Respuestas se guardan en localStorage
- ✅ Botón "Firmar" sigue bloqueado
- ✅ Indicador QR sigue mostrando "1 de 3"

---

### ✅ CP-005: Cerrar y Reabrir Aplicación
**Objetivo:** Verificar persistencia de datos

**Pasos:**
1. Cerrar pestaña del navegador
2. Abrir nueva pestaña
3. Navegar al mismo checklist
4. Observar estado

**Resultado Esperado:**
- ✅ Indicador muestra "1 de 3 códigos escaneados"
- ✅ Sección 1 muestra respuestas guardadas
- ✅ Secciones 2 y 3 siguen bloqueadas
- ✅ Botón "Actualizar" visible (no "Guardar")
- ✅ Botón "Firmar" sigue bloqueado

---

### ✅ CP-006: Intentar Escanear QR Incorrecto
**Objetivo:** Verificar validación de QR correcto

**Pasos:**
1. Click en "📱 Escanear Siguiente QR"
2. Intentar escanear QR #3 (saltando QR #2)

**Resultado Esperado:**
- ✅ Modal NO se cierra
- ✅ Toast de error: "QR incorrecto para la sección actual"
- ✅ Mensaje indica: "Se requiere el QR 'QR-002' (Grupo 2)"
- ✅ Modal se reabre automáticamente para nuevo intento
- ✅ Estado del checklist no cambia

---

### ✅ CP-007: Escanear Segundo QR
**Objetivo:** Verificar desbloqueo de segunda sección

**Pasos:**
1. Click en "📱 Escanear Siguiente QR"
2. Escanear QR #2 (Grupo 2)
3. Observar cambios

**Resultado Esperado:**
- ✅ Toast de éxito: "¡QR Válido! Sección 2 autorizada exitosamente"
- ✅ Indicador muestra "2 de 3 códigos escaneados"
- ✅ Barra de progreso QR en 66%
- ✅ Secciones 1 y 2 desbloqueadas
- ✅ Sección 3 sigue bloqueada
- ✅ Botón "Actualizar" habilitado
- ✅ Botón "Firmar" sigue bloqueado

---

### ✅ CP-008: Completar Segunda Sección y Guardar
**Objetivo:** Verificar guardado incremental de múltiples secciones

**Pasos:**
1. Responder todas las preguntas de Sección 2
2. Click en "Actualizar"
3. Verificar confirmación

**Resultado Esperado:**
- ✅ Toast de éxito: "¡Éxito! Checklist guardado correctamente"
- ✅ Respuestas de Sección 2 guardadas en BD
- ✅ Respuestas de Sección 1 se mantienen
- ✅ Botón "Firmar" sigue bloqueado
- ✅ Sección 3 sigue bloqueada

---

### ✅ CP-009: Escanear Tercer QR
**Objetivo:** Verificar desbloqueo completo

**Pasos:**
1. Click en "📱 Escanear Siguiente QR"
2. Escanear QR #3 (Grupo 3)
3. Observar cambios

**Resultado Esperado:**
- ✅ Toast de éxito: "¡QR Válido! Sección 3 autorizada exitosamente"
- ✅ Indicador muestra "3 de 3 códigos escaneados ✅"
- ✅ Barra de progreso QR en 100%
- ✅ Mensaje: "🎉 Todas las secciones desbloqueadas"
- ✅ Todas las secciones desbloqueadas
- ✅ Botón "Actualizar" habilitado
- ✅ **Botón "Firmar" ahora HABILITADO** ⭐

---

### ✅ CP-010: Completar y Firmar Checklist
**Objetivo:** Verificar proceso completo de firma

**Pasos:**
1. Responder todas las preguntas de Sección 3
2. Click en "Actualizar"
3. Click en "Firmar"
4. Dibujar firma en el pad
5. Confirmar firma

**Resultado Esperado:**
- ✅ Respuestas de Sección 3 guardadas
- ✅ Modal de firma se abre
- ✅ Firma se registra correctamente
- ✅ Checklist marcado como firmado
- ✅ Botones "Actualizar" y "Firmar" ahora bloqueados
- ✅ Mensaje: "🔒 Bloqueado - Este checklist ha sido firmado"

---

### ✅ CP-011: Intentar Editar Checklist Firmado
**Objetivo:** Verificar bloqueo después de firma

**Pasos:**
1. Intentar cambiar respuesta de cualquier item
2. Intentar guardar
3. Intentar firmar nuevamente

**Resultado Esperado:**
- ✅ Todos los items están deshabilitados
- ✅ Botón "Actualizar" bloqueado
- ✅ Botón "Firmar" bloqueado
- ✅ Mensaje de bloqueo visible

---

### ✅ CP-012: Validación de Items Pendientes
**Objetivo:** Verificar que no se puede guardar con items pendientes de gestión

**Pasos:**
1. Crear nuevo checklist
2. Escanear QR #1
3. Marcar item como "❌ No Cumple"
4. Cerrar modal de fallas sin crear falla
5. Intentar guardar

**Resultado Esperado:**
- ✅ Item marcado con borde amarillo y badge "⚠️ Pendiente de gestión"
- ✅ Al intentar guardar, aparece alerta:
  - Título: "Ítems pendientes"
  - Mensaje: "Tienes X ítem(s) marcados como 'No Cumple' u 'Observación' que aún no han sido gestionados"
- ✅ Guardado bloqueado hasta gestionar fallas

---

### ✅ CP-013: Marcar Todos los Hermanos
**Objetivo:** Verificar función de marcar todos en sección desbloqueada

**Pasos:**
1. Escanear QR #1
2. En Sección 1, click en "Marcar todos como 'Cumple'"
3. Observar cambios

**Resultado Esperado:**
- ✅ Todos los items de Sección 1 marcados como "✅ Cumple"
- ✅ Función NO afecta Secciones 2 y 3 (bloqueadas)
- ✅ Se puede guardar inmediatamente

---

### ✅ CP-014: Trabajo Multi-Turno
**Objetivo:** Simular trabajo colaborativo entre turnos

**Pasos:**
1. **Turno 1 (Usuario A):**
   - Escanear QR #1
   - Completar Sección 1
   - Guardar
   - Cerrar sesión

2. **Turno 2 (Usuario B):**
   - Abrir mismo checklist
   - Verificar Sección 1 completada
   - Escanear QR #2
   - Completar Sección 2
   - Guardar
   - Cerrar sesión

3. **Turno 3 (Usuario C):**
   - Abrir mismo checklist
   - Verificar Secciones 1 y 2 completadas
   - Escanear QR #3
   - Completar Sección 3
   - Guardar y Firmar

**Resultado Esperado:**
- ✅ Cada usuario ve el progreso del anterior
- ✅ Cada usuario puede continuar donde el anterior lo dejó
- ✅ Historial de QR muestra quién escaneó cada código
- ✅ Checklist se completa exitosamente

---

### ✅ CP-015: Verificar Historial de QR
**Objetivo:** Verificar que se registra historial de escaneos

**Pasos:**
1. Completar proceso de 3 QR
2. Observar sección de historial de QR

**Resultado Esperado:**
- ✅ Historial muestra 3 escaneos
- ✅ Cada escaneo muestra:
  - Código QR escaneado
  - Grupo/Sección desbloqueada
  - Usuario que escaneó
  - Fecha y hora
  - Items desbloqueados
- ✅ Escaneos ordenados cronológicamente

---

## Pruebas de Regresión

### ✅ PR-001: Checklist sin QR
**Objetivo:** Verificar que checklists sin QR siguen funcionando normal

**Pasos:**
1. Abrir checklist tipo "Familia" (sin QR)
2. Responder preguntas
3. Guardar

**Resultado Esperado:**
- ✅ No aparece indicador de QR
- ✅ Todas las secciones desbloqueadas desde el inicio
- ✅ Botón "Guardar" habilitado
- ✅ Botón "Firmar" habilitado después de guardar
- ✅ Funcionalidad normal sin cambios

---

### ✅ PR-002: Checklist con 1 Solo QR
**Objetivo:** Verificar funcionamiento con configuración mínima

**Pasos:**
1. Abrir checklist con 1 QR
2. Escanear QR único
3. Completar y guardar

**Resultado Esperado:**
- ✅ Indicador muestra "1 de 1 códigos escaneados"
- ✅ Después de escanear, todas las secciones desbloqueadas
- ✅ Botón "Firmar" se habilita inmediatamente
- ✅ Proceso completo funciona correctamente

---

## Pruebas de Rendimiento

### ⚡ PERF-001: Guardado con Muchas Respuestas
**Objetivo:** Verificar rendimiento con checklist grande

**Configuración:**
- Checklist con 50+ items
- 3 QR codes

**Pasos:**
1. Completar todas las secciones
2. Guardar

**Resultado Esperado:**
- ✅ Guardado completa en < 3 segundos
- ✅ No hay lag en la interfaz
- ✅ Todas las respuestas se guardan correctamente

---

### ⚡ PERF-002: Múltiples Guardados Rápidos
**Objetivo:** Verificar que no hay problemas con guardados frecuentes

**Pasos:**
1. Responder 1 pregunta
2. Guardar
3. Responder otra pregunta
4. Guardar
5. Repetir 10 veces

**Resultado Esperado:**
- ✅ Cada guardado exitoso
- ✅ No hay duplicación de respuestas
- ✅ No hay errores de concurrencia
- ✅ Estado se mantiene consistente

---

## Checklist de Validación Final

Antes de considerar la funcionalidad completa, verificar:

- [ ] ✅ Botón "Guardar" nunca se bloquea por falta de QR
- [ ] ✅ Botón "Firmar" se bloquea hasta completar todos los QR
- [ ] ✅ Items bloqueados no se pueden editar
- [ ] ✅ Items desbloqueados se pueden editar y guardar
- [ ] ✅ Progreso se persiste en BD y localStorage
- [ ] ✅ Indicador visual de progreso QR funciona
- [ ] ✅ Mensajes informativos son claros
- [ ] ✅ Validación de QR correcto funciona
- [ ] ✅ Historial de QR se registra correctamente
- [ ] ✅ Trabajo multi-turno funciona
- [ ] ✅ Checklists sin QR no se afectan
- [ ] ✅ No hay errores en consola
- [ ] ✅ No hay warnings de React
- [ ] ✅ Rendimiento es aceptable

---

## Reporte de Bugs

Si encuentras algún problema, documentar:

```
ID: BUG-XXX
Título: [Descripción breve]
Severidad: [Crítica/Alta/Media/Baja]
Pasos para reproducir:
1. ...
2. ...
3. ...

Resultado esperado:
...

Resultado actual:
...

Capturas de pantalla:
[Adjuntar si es posible]

Información adicional:
- Navegador: ...
- Versión: ...
- Consola: [Errores en consola]
```

---

## Criterios de Aceptación

La funcionalidad se considera completa cuando:

1. ✅ Todos los casos de prueba pasan exitosamente
2. ✅ No hay bugs críticos o de alta severidad
3. ✅ Rendimiento es aceptable (< 3s para guardado)
4. ✅ Documentación está actualizada
5. ✅ Código revisado y aprobado
6. ✅ Pruebas de regresión pasan
7. ✅ Usuario final valida la funcionalidad
