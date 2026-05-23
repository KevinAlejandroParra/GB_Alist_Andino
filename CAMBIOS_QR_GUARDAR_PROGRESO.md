# Cambios: Permitir Guardar Progreso con QR Parcialmente Completado

## Problema Identificado

El sistema de validación QR bloqueaba completamente el botón "Guardar" cuando había secciones pendientes de desbloquear con QR. Esto impedía que los usuarios guardaran su progreso en las secciones ya desbloqueadas.

### Comportamiento Anterior
- Usuario escanea QR #1 → Desbloquea sección 1
- Usuario responde preguntas de sección 1
- Usuario intenta guardar → ❌ **BLOQUEADO** (porque falta escanear QR #2 y #3)
- Usuario pierde su progreso si cierra la aplicación

## Solución Implementada

Se separaron dos conceptos que antes estaban acoplados:

1. **Items bloqueados por QR**: Los items que no se han desbloqueado con QR permanecen bloqueados para edición
2. **Botón de guardar**: Ahora está siempre habilitado para guardar el progreso de items desbloqueados

### Comportamiento Nuevo
- Usuario escanea QR #1 → Desbloquea sección 1
- Usuario responde preguntas de sección 1
- Usuario guarda → ✅ **PERMITIDO** (guarda progreso de sección 1)
- Usuario escanea QR #2 → Desbloquea sección 2
- Usuario responde preguntas de sección 2
- Usuario guarda → ✅ **PERMITIDO** (guarda progreso de secciones 1 y 2)
- Usuario escanea QR #3 → Desbloquea sección 3
- Usuario completa todo y firma → ✅ **PERMITIDO**

## Archivos Modificados

### 1. `client/src/components/checklist/BaseChecklistPage.jsx`

**Cambio en ChecklistActions:**
```javascript
// ANTES
disabled={isLocked || qrManager.isQrRequired}

// DESPUÉS
disabled={isLocked}
disableSignature={qrManager.isQrRequired}
```

**Nuevo indicador visual de progreso QR:**
- Muestra cuántos QR se han escaneado (ej: "2 de 3 códigos escaneados")
- Barra de progreso visual
- Botón para escanear siguiente QR cuando sea necesario
- Mensaje informativo: "Puedes guardar tu progreso en las secciones desbloqueadas en cualquier momento"

### 2. `client/src/components/checklist/components/ChecklistActions.jsx`

**Nueva prop `disableSignature`:**
```javascript
export default function ChecklistActions({ 
  onSign, 
  onSave, 
  onDownload, 
  allowDownload, 
  disabled = false,           // Bloquea TODO (cuando checklist está firmado)
  disableSignature = false,   // Bloquea SOLO el botón de firma (cuando falta QR)
  hasExistingResponses = false 
})
```

**Lógica de bloqueo:**
- **Botón Guardar**: Solo se bloquea si `disabled=true` (checklist firmado/bloqueado)
- **Botón Firmar**: Se bloquea si `disabled=true` O `disableSignature=true` (falta completar QR)

### 3. `client/src/components/checklist/ChecklistSection.jsx`

**Mensajes informativos mejorados:**
- Mensaje cuando hay secciones bloqueadas por QR
- Mensaje cuando se requiere el siguiente QR
- Ambos mensajes aclaran que se puede guardar el progreso actual

## Flujo de Usuario Mejorado

### Escenario: Checklist con 3 QR Codes

1. **Inicio**: Usuario abre checklist
   - Estado: 0/3 QR escaneados
   - Todas las secciones bloqueadas
   - Botón "Guardar": ✅ Habilitado (aunque no hay nada que guardar aún)
   - Botón "Firmar": 🔒 Bloqueado

2. **Escanea QR #1**
   - Estado: 1/3 QR escaneados
   - Sección 1: ✅ Desbloqueada
   - Secciones 2-3: 🔒 Bloqueadas
   - Botón "Guardar": ✅ Habilitado
   - Botón "Firmar": 🔒 Bloqueado

3. **Responde preguntas de Sección 1**
   - Usuario puede guardar en cualquier momento
   - Si cierra la app, su progreso se mantiene

4. **Escanea QR #2**
   - Estado: 2/3 QR escaneados
   - Secciones 1-2: ✅ Desbloqueadas
   - Sección 3: 🔒 Bloqueada
   - Botón "Guardar": ✅ Habilitado
   - Botón "Firmar": 🔒 Bloqueado

5. **Escanea QR #3**
   - Estado: 3/3 QR escaneados
   - Todas las secciones: ✅ Desbloqueadas
   - Botón "Guardar": ✅ Habilitado
   - Botón "Firmar": ✅ Habilitado (ahora puede firmar)

## Beneficios

1. **Mejor UX**: Los usuarios pueden guardar su progreso incremental
2. **Prevención de pérdida de datos**: Si el usuario cierra la app, no pierde su trabajo
3. **Flexibilidad**: Permite trabajar por secciones sin presión de completar todo de una vez
4. **Claridad**: Indicadores visuales claros del progreso de QR
5. **Lógica consistente**: El botón de firma sigue bloqueado hasta completar todos los QR (mantiene la integridad del proceso)

## Validaciones Mantenidas

- ✅ Items bloqueados por QR no se pueden editar
- ✅ No se puede firmar hasta completar todos los QR
- ✅ No se puede guardar si hay items pendientes de gestión (no cumple/observación sin falla creada)
- ✅ No se puede guardar si el checklist ya está firmado y bloqueado

## Testing Recomendado

1. Crear checklist de atracción con 3 QR codes
2. Escanear solo el primer QR
3. Responder preguntas de la primera sección
4. Verificar que el botón "Guardar" esté habilitado ✅
5. Guardar el progreso
6. Cerrar y reabrir la aplicación
7. Verificar que las respuestas se mantienen ✅
8. Verificar que el botón "Firmar" sigue bloqueado 🔒
9. Escanear los QR restantes
10. Verificar que el botón "Firmar" se habilita ✅

## Notas Técnicas

- La prop `isQrRequired` del hook `useQrCode` sigue funcionando igual
- Solo cambió dónde se aplica: ahora solo afecta al botón de firma, no al de guardar
- El sistema de validación QR en el backend no requiere cambios
- Los items individuales siguen respetando el bloqueo por QR
