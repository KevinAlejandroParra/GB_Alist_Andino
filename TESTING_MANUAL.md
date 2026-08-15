# Testing Manual: Firmas Propagadas + Eliminar "Aprobar semana"

**Fecha:** 2026-08-15  
**Objetivo:** Validar que los cambios funcionan correctamente sin regresiones

---

## Pre-requisitos

1. **Base de datos:** Asegurar que haya datos de premios (checklists tipo 2) en la semana actual
2. **Usuario Admin:** Login con rol_id = 1 o 2 (Administrador)
3. **Servidores:** Backend y frontend ejecutándose

---

## Escenarios de Testing

### Escenario 1: Flujo de Firma Propagada (Principal)

#### Paso 1.1: Verificar que NO aparezca botón "Aprobar semana"

**Pasos:**
1. Login como Admin
2. Navegar a: Dashboard → Análisis de Premios (tipo 2)
3. Seleccionar una semana con datos

**Verificación:**
- [ ] ❌ NO aparece botón "Aprobar semana" en el header
- [ ] ❌ NO aparece botón "Aprobar" en la tabla (columna Acciones)
- [ ] ✅ SÍ aparece botón "Configuración de máquinas"
- [ ] ✅ SÍ aparece estado "Semana sin revisar" (inicialmente)

**Evidencia esperada:**
```
Header: [Configuración de máquinas] [Export to Excel]
(No debe haber botón verde "Aprobar semana")
```

---

#### Paso 1.2: Firmar un checklist de premios

**Pasos:**
1. Ir a: Checklists → Premios
2. Seleccionar un checklist sin firmar de la semana actual
3. Completar/diligenciar si es necesario (responder todas las preguntas)
4. Click en: "Firmar"
5. Diligenciar firma digital (usar SignaturePad)

**Verificación:**
- [ ] ✅ Firma se registra exitosamente
- [ ] ✅ Modal muestra "Checklist firmado exitosamente"
- [ ] ✅ Se regresa al formulario (o dashboard según flujo)

**Evidencia esperada:**
```
✓ Checklist firmado exitosamente
```

---

#### Paso 1.3: Verificar que la firma se propague a otros hermanos

**Pasos:**
1. Ir a: Checklists → Premios
2. Seleccionar OTRO checklist de la MISMA semana (hermano)
3. Verificar en la tabla de firmas (si existe modal de "Ver firmas")

**Verificación:**
- [ ] ✅ El hermano también tiene la misma firma
- [ ] ✅ Campo `signed_by_name` es el mismo admin que firmó
- [ ] ✅ Campo `signed_at` es la misma fecha/hora

**Evidencia esperada:**
```
Firma registrada:
- Firmante: [Admin Name]
- Rol: Administrador
- Fecha: 2026-08-15 14:30:00
```

---

#### Paso 1.4: Verificar que el dashboard refleje la firma

**Pasos:**
1. Volver al Dashboard → Análisis de Premios
2. Seleccionar la misma semana

**Verificación:**
- [ ] ✅ Estado "Semana revisada" aparece en verde
- [ ] ✅ En la tabla, columna "Revisado" muestra: `✓ [Admin Name]`
- [ ] ✅ No hay botón "Aprobar"

**Evidencia esperada:**
```
Estado: [Semana revisada] (badge verde)
Columna Revisado: ✓ Juan Pérez
```

---

#### Paso 1.5: Click en "Revisado" para ver firma

**Pasos:**
1. Click en el texto "✓ [Admin Name]" en la columna Revisado

**Verificación:**
- [ ] ✅ Se abre modal `PremiosSignatureModal` (lectura)
- [ ] ✅ Muestra información de la firma (nombre, fecha, imagen)
- [ ] ❌ NO aparece botón "Eliminar" o similar (es solo lectura)

**Evidencia esperada:**
```
Modal: Firma de revisión
- Semana: 2026-W33
- Firmante: Juan Pérez
- Fecha: 2026-08-15 14:30:00
- [Imagen de firma]
```

---

### Escenario 2: Verificar que otros tipos NO se vean afectados

#### Paso 2.1: Firmar checklist de Atracción (tipo 1)

**Pasos:**
1. Ir a: Checklists → Atracción
2. Seleccionar un checklist de tipo 1
3. Completar y firmar

**Verificación:**
- [ ] ✅ Firma se registra en ese checklist
- [ ] ❌ NO se propaga a otros hermanos (si los hay)
- [ ] ✅ Dashboard de Atracción funciona como antes

**Evidencia esperada:**
```
Solo el checklist individual tiene la firma, no se propaga
```

---

### Escenario 3: Validar Rollup enriquecido

#### Paso 3.1: Inspeccionar API response de analytics

**Pasos:**
1. Abrir Developer Tools (F12)
2. Ir a: Network tab
3. Navegar a Dashboard → Análisis de Premios
4. Buscar request: `GET /api/checklists/type/2/analytics/premios`
5. Ver Response

**Verificación esperada en el rollup:**
```json
{
  "week_identifier": "2026-W33",
  "fecha": "2026-08-15",
  "machine_name": "Contadores de Premios",
  "jugadas_desde_ultima": 150,
  "premios_desde_ultima": 12,
  "revisado": true,
  "revisado_por_nombre": "Juan Pérez",    // ← NUEVO
  "revisado_en": "2026-08-15T14:30:00Z",  // ← NUEVO
  "eficiencia_pct": 95.2,
  ...
}
```

**Verificación:**
- [ ] ✅ Campo `revisado_por_nombre` está presente
- [ ] ✅ Campo `revisado_en` está presente
- [ ] ✅ Son valores correctos (nombre y fecha del firmante)

---

### Escenario 4: Edge Cases

#### Paso 4.1: Semana sin revisar

**Pasos:**
1. Ir a Dashboard → Análisis de Premios
2. Seleccionar una semana sin firmar

**Verificación:**
- [ ] ✅ Estado "Semana sin revisar" en gris
- [ ] ✅ Columna Revisado: "Sin revisar"
- [ ] ❌ NO aparece botón "Aprobar semana"

---

#### Paso 4.2: Múltiples firmas (sobreescritura)

**Pasos:**
1. Firmar un checklist tipo 2 con admin A
2. Firmar el MISMO checklist con admin B

**Verificación:**
- [ ] ✅ La firma se actualiza (no duplica)
- [ ] ✅ El dashboard muestra la última firma (admin B)
- [ ] ✅ Se propaga a los hermanos también

---

#### Paso 4.3: Transacción rollback si falla propagación

**Pasos:**
1. (Teórico: requiere agregar un break point en el backend)
2. Simular error durante propagación
3. Verificar que NO se registre la firma en ningún checklist

**Verificación:**
- [ ] ✅ La transacción hace rollback correctamente
- [ ] ✅ Base de datos queda en estado consistente

---

## Checklist de Regresión

| Feature | Estado | Notas |
|---------|--------|-------|
| Dashboard Atracción | ✅ | Debe funcionar como antes |
| Dashboard Familia | ✅ | Debe funcionar como antes |
| Dashboard Locativo | ✅ | Debe funcionar como antes |
| Firma individual (no tipo 2) | ✅ | No debe propagarse |
| Export Excel | ✅ | Debe incluir info del firmante |
| SignaturePad modal | ✅ | Debe funcionar en checklists |
| PremiosSignatureModal | ✅ | Modal de consulta debe funcionar |
| PremiosConfigModal | ✅ | Config de máquinas debe funcionar |

---

## Comandos para Testing Local

```bash
# 1. Iniciar backend (en terminal 1)
cd server
npm run dev

# 2. Iniciar frontend (en terminal 2)
cd client
npm run dev

# 3. Ejecutar tests (si existen)
npm run test

# 4. Verificar logs en backend
# Watch: server/logs/ o console.log en terminal

# 5. Verificar Network en DevTools
# F12 → Network → Filtrar por "analytics/premios"
```

---

## Logs Importantes a Verificar

### Backend Logs

Cuando se firma un checklist tipo 2:
```
🔍 [signChecklist] Firmando checklist con role_id: 1
[signChecklist] Propagando firma a X checklists hermanos (semana 2026-W33)
Nueva firma creada para usuario Juan Pérez en checklist 123
[signChecklist] Firma propagada exitosamente a 4 checklists hermanos
```

### Network Logs (DevTools)

1. **GET /api/checklists/type/2/analytics/premios**
   - Status: 200
   - Response includes: `revisado_por_nombre`, `revisado_en`

2. **POST /api/checklists/:id/sign**
   - Status: 200
   - Response: `{ success: true, message: "Checklist firmado exitosamente" }`

---

## Problema? Aquí está el Debug Guide

### ❌ El botón "Aprobar semana" sigue apareciendo
**Solución:**
1. Limpiar browser cache (Ctrl+Shift+Delete)
2. Verificar que `PremiosDashboard.jsx` fue actualizado
3. Buscar `setApproveWeek` en el archivo — debe estar AUSENTE

### ❌ La firma NO se propaga
**Solución:**
1. Verificar backend logs: ¿aparece mensaje de propagación?
2. Verificar que `checklist_type_id === 2`
3. Verificar que `week_identifier` no sea null
4. Conectarse a BD: `SELECT * FROM checklist_signatures WHERE checklist_id IN (...)`

### ❌ El dashboard muestra "Sin revisar" después de firmar
**Solución:**
1. Recargar página (F5)
2. Verificar que API retorna `revisado: true` en rollup
3. Verificar que `enrichRollup` está usando `r.revisado_por_nombre` correctamente

### ❌ Error en PremiosSignatureModal
**Solución:**
1. Verificar que el endpoint de firma NO cambió
2. Asegurar que el modal recibe `weekIdentifier` correctamente
3. Ver console del browser para errores

---

## Evidencia de Testing

Después de completar todos los escenarios, documentar:

1. **Screenshots:**
   - Dashboard sin botón "Aprobar"
   - Modal de firma exitosa
   - Dashboard con estado "Revisado"
   - Modal de lectura de firma

2. **Network Requests:**
   - Captura de request/response de analytics
   - Captura de request/response de firma

3. **Base de Datos:**
   - Query: `SELECT * FROM checklist_signatures WHERE checklist_id IN (SELECT checklist_id FROM checklists WHERE week_identifier = 'X' AND checklist_type_id = 2)`
   - Verificar que todos tienen la misma firma

---

## Conclusión

✅ **Testing Completado:** Cuando todos los escenarios pasen, marcar como COMPLETADO

Cambios exitosos:
- ✅ Propagación de firmas funciona
- ✅ Flujo "Aprobar semana" eliminado
- ✅ Dashboard refleja firmas correctamente
- ✅ No hay regresiones en otros tipos
