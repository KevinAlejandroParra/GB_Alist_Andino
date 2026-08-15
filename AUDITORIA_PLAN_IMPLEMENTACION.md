# Auditoría del Plan de Implementación: Firmas Propagadas + Eliminar "Aprobar semana"

**Fecha de Auditoría:** 2026-08-15
**Estado General:** ✅ PLAN VÁLIDO CON CORRECCIONES MENORES

---

## 1. Verificaciones Realizadas

### 1.1 Propagación de Firmas (checklistService.js)
**Estado:** ✅ YA IMPLEMENTADO

La lógica de propagación ya está presente en `signChecklist` (líneas ~1280-1310):
```javascript
// === CASO ESPECIAL: Propagar firma a todos los checklists del grupo semanal (solo tipo 2 - Premios) ===
if (Number(checklist.checklist_type_id) === 2 && checklist.week_identifier) {
  const siblingChecklists = await Checklist.findAll({
    where: {
      checklist_type_id: 2,
      week_identifier: checklist.week_identifier,
      checklist_id: { [Op.ne]: checklist.checklist_id }
    },
    transaction
  });
  // ... propagar a cada sibling ...
}
```

**Análisis:**
- ✅ Solo aplica a `checklist_type_id === 2` (premios)
- ✅ Busca hermanos por `week_identifier`
- ✅ Usa transacción para garantizar consistencia
- ✅ Propaga `digital_token`, `role_id`, `user_id`, `signed_at`
- ✅ Maneja actualización de firmas existentes y creación de nuevas

**Conclusión:** NO hay trabajo pendiente en `signChecklist`.

---

### 1.2 Dashboard: Botón "Aprobar semana" (PremiosDashboard.jsx)
**Estado:** ❌ REQUIERE ELIMINACIÓN

Ubicación actual:
- Líneas 131-139: Botón "Aprobar semana" / "Firmar revisión"
- Línea 24: Estado `approveWeek`
- Líneas 248-257: Modal `PremiosApproveModal`
- Línea 163: Estado `setSignatureWeek` (DEBE MANTENERSE - es para consultar firmas existentes)

**Trabajo requerido:**
1. Eliminar botón (líneas 131-139)
2. Eliminar estado `approveWeek` (línea 24)
3. Eliminar manejador `setApproveWeek`
4. Eliminar renderizado del modal (líneas 248-257)
5. **MANTENER** `signatureWeek` y `PremiosSignatureModal` (solo consulta)

---

### 1.3 Cálculo de "Revisado" (premiosAnalyticsService.js)
**Estado:** ⚠️ PARCIALMENTE CORRECTO - FALTA INFO DEL FIRMANTE

Ubicación actual:
- `getPremiosAnalytics` (líneas 261-356)
- Línea 296-297: Ya verifica firmas de admin (`role_id === 4`)
- **FALTA:** Los campos `revisado_por_nombre` y `revisado_en` del rollup

**Análisis del código actual:**

En `getPremiosAnalytics`, línea 296-297:
```javascript
const hasAdminSignature = r.checklist?.signatures?.some(sig => sig.role_id === 4) || false;
if (r.revisado_por != null || hasAdminSignature) acc.revisado = true;
```

**Problemas encontrados:**
1. Se verifica si hay firma admin, pero NO se extrae `signed_at` ni `signed_by_name`
2. El rollup acumula datos pero pierde referencia de quién firmó y cuándo
3. No hay acceso a la información del firmante en el rollup actual

**Trabajo requerido:**
1. Modificar el rollup para incluir `revisado_por_nombre` y `revisado_en`
2. Agregar lógica para obtener la firma admin más reciente de los checklists
3. Incluir esta información en el objeto rollup

---

### 1.4 Rutas y Controladores (checklist.routes.js)
**Estado:** ❌ RUTA NO REGISTRADA - PERO CÓDIGO PRESENTE

**Hallazgos:**
1. La ruta `POST /type/:checklistTypeId/analytics/premios/aprobar` **NO ESTÁ registrada** en `checklist.routes.js`
2. El controlador `approvePremiosWeek` existe en `checklistController.js` (línea 2047) y está exportado (línea 2152)
3. La configuración del cliente referencia la ruta en `checklistTypes.config.js` (línea 136: `analyticsApprove`)
4. El componente `PremiosApproveModal.jsx` hace POST a `/api/checklists/type/{checklistTypeId}/analytics/premios/aprobar` (línea 18)
5. **La ruta NUNCA fue registrada** → El endpoint está huérfano en el frontend

**Trabajo requerido:**
1. ✅ No eliminar la ruta (no existe)
2. ✅ No eliminar el controlador (para evitar sorpresas si algo lo usa)
3. ✅ Eliminar el modal `PremiosApproveModal` que intenta usarlo
4. ✅ Eliminar la referencia de configuración `analyticsApprove`

---

### 1.5 Modelo PremiosAnalisis
**Estado:** ✅ ESTRUCTURA VÁLIDA

Campos relevantes:
- `revisado_por` (user_id) ✅
- `revisado_en` (DATEONLY) ✅
- `revisado_firma` (dataURL) ✅

**Conclusión:** Los campos existen y no requieren migraciones.

---

### 1.6 ChecklistSignature
**Estado:** ✅ ESTRUCTURA VÁLIDA

Campos clave:
- `signed_at` (DATE) ✅
- `signed_by_name` (STRING) ✅
- `role_id` ✅
- `user_id` ✅

**Conclusión:** Todos los datos necesarios para propagación ya existen.

---

## 2. Resumen de Cambios Necesarios

| # | Componente | Estado | Acción | Prioridad |
|---|-----------|--------|--------|-----------|
| 1 | checklistService.js | ✅ Listo | Ninguna | N/A |
| 2 | PremiosDashboard.jsx | ❌ Requerido | Eliminar botón + modal | 🔴 Alta |
| 3 | premiosAnalyticsService.js | ⚠️ Incompleto | Enriquecer rollup con firma admin | 🟠 Media |
| 4 | checklist.routes.js | ✅ Listo | Confirmar (no hay ruta) | 🟢 Baja |
| 5 | checklistController.js | ⚠️ Obsoleto | Revisar si `approvePremiosWeek` se usa | 🟠 Media |

---

## 3. Trabajo Pendiente Detallado

### 3.1 [MODIFY] PremiosDashboard.jsx

**Líneas a eliminar:**
- Línea 24: `const [approveWeek, setApproveWeek] = useState(null)`
- Líneas 131-139: Botón "Aprobar semana"
- Línea 163: `onApprove={(week) => setApproveWeek(week)}` (en `<PremiosTable>`)
- Líneas 248-257: Renderizado del modal `PremiosApproveModal`
- Línea 6: Import de `PremiosApproveModal`

**Mantener:**
- Línea 25: `const [signatureWeek, setSignatureWeek] = useState(null)`
- Líneas 258-263: Renderizado del modal `PremiosSignatureModal`

---

### 3.2 [MODIFY] premiosAnalyticsService.js - Enriquecer Rollup

**Objetivo:** Agregar campos `revisado_por_nombre` y `revisado_en` al rollup.

**Estrategia:**
1. Para cada semana en el rollup, buscar la firma admin (role_id === 4) más reciente
2. Extraer `signed_by_name` y `signed_at` de esa firma
3. Incluir estos datos en el objeto rollup

**Pseudocódigo:**
```javascript
// Después de buildear el rollup, enriquecer con información de firma
for (const r of rollup) {
  const signatures = /* buscar firmas admin del checklist de esa semana */
  if (signatures.length > 0) {
    const latestAdminSig = signatures[0]; // Ya ordenadas por fecha DESC
    r.revisado_por_nombre = latestAdminSig.signed_by_name;
    r.revisado_en = latestAdminSig.signed_at;
  }
}
```

---

### 3.3 [VERIFY] Rutas y Controladores

Ejecutar búsqueda global:
```bash
grep -r "approvePremiosWeek" server/
grep -r "analytics/premios/aprobar" server/
```

Si no hay resultados → La ruta nunca fue registrada → No hay trabajo.

---

## 4. Preguntas Abiertas Confirmadas

> **¿Deseas que el modal `PremiosSignatureModal` también se elimine?**

**Respuesta basada en auditoría:**
- El modal es SOLO LECTURA - muestra firmas ya aprobadas
- Es útil para auditoría y consulta
- **Recomendación:** MANTENERLO para que los admins puedan consultar quién y cuándo firmó

---

## 5. Orden de Implementación Recomendado

1. **Primero:** Verificar rutas con grep (5 min)
2. **Segundo:** Modificar `premiosAnalyticsService.js` para enriquecer rollup (30 min)
3. **Tercero:** Eliminar botón/modal de `PremiosDashboard.jsx` (10 min)
4. **Cuarto:** Testing manual (15 min)
   - Firmar un checklist de premios
   - Verificar que la firma se propague
   - Verificar que el dashboard no muestre botón "Aprobar semana"
   - Verificar que "Revisado" refleje la firma del admin

---

## 6. Cambios NO Necesarios

- ✅ **checklistService.js**: Ya implementado
- ✅ **checklist.routes.js**: Ruta nunca fue registrada
- ✅ **Modelo Checklist**: Sin cambios
- ✅ **Modelo ChecklistSignature**: Sin cambios
- ✅ **Modelo PremiosAnalisis**: Sin cambios (ya tiene los campos)

---

## Conclusión

El plan es **válido y viable**. La propagación de firmas ya está implementada. 

El trabajo restante se reduce a:
1. Enriquecer el rollup con info del firmante (premiosAnalyticsService.js)
2. Eliminar el flujo redundante de "Aprobar semana" (PremiosDashboard.jsx)
3. Testing de validación

**Estimado de tiempo:** 1-2 horas con testing incluido.
