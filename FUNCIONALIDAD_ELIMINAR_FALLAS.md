# Funcionalidad de Eliminación de Fallas

## 📋 Resumen

Se ha implementado una funcionalidad completa para eliminar órdenes de falla de forma permanente, con múltiples advertencias y confirmaciones para prevenir eliminaciones accidentales.

## ⚠️ Características Principales

### 1. **Eliminación Permanente e Irreversible**
La funcionalidad elimina completamente:
- ✅ La orden de falla (FailureOrder)
- ✅ La orden de trabajo asociada (WorkOrder) si existe
- ✅ Todos los repuestos vinculados (WorkOrderParts)
- ✅ La imagen de evidencia del servidor (archivo físico)
- ✅ Todo el historial y firmas relacionadas

### 2. **Control de Acceso**
- 🔒 **Solo usuarios con rol Admin (1) o Soporte (2)** pueden eliminar fallas
- 🔒 Validación en backend y frontend
- 🔒 Mensaje de error claro si el usuario no tiene permisos

### 3. **Proceso de Confirmación en 3 Pasos**

#### **Paso 1: Advertencia Inicial**
- Muestra todas las consecuencias de la eliminación
- Requiere checkbox de confirmación: "Entiendo que esta acción es permanente e irreversible"
- No permite continuar sin marcar el checkbox

#### **Paso 2: Consecuencias Detalladas**
- Lista detallada de lo que se perderá:
  - ❌ Pérdida de Historial
  - ❌ Pérdida de Evidencia
  - ❌ Pérdida de Trazabilidad
  - ❌ Impacto en Reportes
- Muestra alternativas recomendadas (marcar como cancelada, agregar nota, etc.)
- Permite retroceder al paso anterior

#### **Paso 3: Confirmación Final**
- Requiere escribir exactamente: **"ELIMINAR PERMANENTEMENTE"**
- Validación en tiempo real del texto ingresado
- Botón deshabilitado hasta que el texto coincida exactamente
- Confirmación final adicional con SweetAlert2

### 4. **Indicadores Visuales**
- 🔴 Colores rojos para indicar peligro
- ⚠️ Iconos de advertencia en cada paso
- 📊 Barra de progreso mostrando el paso actual (1/3, 2/3, 3/3)
- 🔄 Spinner de carga durante la eliminación

## 🛠️ Archivos Modificados/Creados

### Backend

#### 1. **server/src/services/FailureOrderService.js**
```javascript
async deleteFailureOrder(failureOrderId)
```
- Elimina la falla y todos sus componentes relacionados
- Elimina la imagen física del servidor usando `fs.unlink()`
- Maneja errores de archivo no encontrado (ENOENT)
- Retorna información detallada de lo eliminado

#### 2. **server/src/controllers/FailureController.js**
```javascript
async deleteFailureOrder(req, res)
```
- Valida permisos del usuario (solo Admin/Soporte)
- Valida el ID de la falla
- Llama al servicio de eliminación
- Retorna respuesta con advertencia de irreversibilidad

#### 3. **server/src/routes/failureRoutes.js**
```javascript
router.delete('/:id', (req, res) => FailureController.deleteFailureOrder(req, res));
```
- Nueva ruta DELETE para eliminar fallas
- Protegida con middleware de autenticación

### Frontend

#### 4. **client/src/components/checklist/DeleteFailureModal.jsx** (NUEVO)
Componente modal completo con:
- Sistema de pasos (1, 2, 3)
- Validaciones en cada paso
- Confirmación de texto exacto
- Integración con SweetAlert2
- Manejo de estados de carga
- Indicador de progreso visual

#### 5. **client/src/components/checklist/FailureDetailModal.jsx**
Modificaciones:
- Importa `DeleteFailureModal`
- Agrega estado `showDeleteModal`
- Botón "Eliminar" visible solo para Admin/Soporte
- Integración del modal de eliminación

## 🔐 Seguridad

### Validaciones Backend
```javascript
// Validación de permisos
if (![1, 2].includes(req.user.role_id)) {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Solo Administradores o Soporte pueden eliminar órdenes de falla'
    }
  });
}
```

### Validaciones Frontend
```javascript
// Botón solo visible para Admin/Soporte
{(user?.role_id === 1 || user?.role_id === 2) && (
  <button onClick={() => setShowDeleteModal(true)}>
    Eliminar
  </button>
)}
```

## 📝 Flujo de Eliminación

```
1. Usuario Admin/Soporte hace clic en "Eliminar"
   ↓
2. Se abre DeleteFailureModal - Paso 1
   ↓
3. Usuario lee advertencias y marca checkbox
   ↓
4. Usuario hace clic en "Continuar" → Paso 2
   ↓
5. Usuario lee consecuencias detalladas
   ↓
6. Usuario hace clic en "Continuar de Todas Formas" → Paso 3
   ↓
7. Usuario escribe "ELIMINAR PERMANENTEMENTE"
   ↓
8. Usuario hace clic en "Eliminar Permanentemente"
   ↓
9. SweetAlert2 muestra confirmación final
   ↓
10. Usuario confirma "Sí, eliminar permanentemente"
    ↓
11. Backend valida permisos
    ↓
12. Backend elimina:
    - WorkOrderParts
    - WorkOrder
    - Imagen del servidor
    - FailureOrder
    ↓
13. Frontend muestra mensaje de éxito
    ↓
14. Se cierra el modal y se actualiza la lista
```

## 🎨 Interfaz de Usuario

### Colores y Estilos
- **Rojo (#dc2626)**: Botones de eliminación, advertencias críticas
- **Amarillo (#fbbf24)**: Advertencias iniciales
- **Gris**: Botones de cancelar y retroceder
- **Verde**: Mensajes de éxito

### Iconos Utilizados
- ⚠️ Advertencias
- 🗑️ Eliminar
- ❌ Pérdidas/Consecuencias
- 💡 Alternativas
- 🔒 Confirmación final
- ✅ Éxito

## 🧪 Casos de Prueba

### 1. Usuario sin permisos
- ❌ No ve el botón de eliminar
- ❌ Si intenta acceder directamente a la API, recibe error 403

### 2. Usuario Admin/Soporte
- ✅ Ve el botón de eliminar
- ✅ Puede iniciar el proceso de eliminación
- ✅ Debe completar los 3 pasos
- ✅ Debe escribir el texto exacto
- ✅ Debe confirmar en SweetAlert2

### 3. Falla con WorkOrder
- ✅ Elimina la WorkOrder y sus repuestos
- ✅ Elimina la falla
- ✅ Elimina la imagen

### 4. Falla sin WorkOrder
- ✅ Elimina solo la falla
- ✅ Elimina la imagen

### 5. Imagen no encontrada
- ✅ Continúa con la eliminación
- ⚠️ Registra advertencia en logs
- ✅ No falla el proceso completo

## 📊 Logs del Sistema

### Backend
```javascript
console.log('🗑️ [DELETE FAILURE] Iniciando eliminación de OF:', failureOrderId);
console.log('🗑️ [DELETE FAILURE] Falla encontrada:', failureOrder.failure_order_id);
console.log('🗑️ [DELETE FAILURE] Intentando eliminar imagen:', mediaPath);
console.log('✅ [DELETE FAILURE] Imagen eliminada exitosamente:', filename);
console.log('⚠️ [DELETE FAILURE] Imagen no encontrada en el servidor:', filename);
console.log('✅ [DELETE FAILURE] Repuestos eliminados:', count);
console.log('✅ [DELETE FAILURE] WorkOrder eliminada');
console.log('✅ [DELETE FAILURE] Orden de Falla eliminada exitosamente');
```

## 🚀 Uso

### Desde el Modal de Detalles de Falla
1. Abrir cualquier falla
2. Si eres Admin/Soporte, verás el botón "🗑️ Eliminar"
3. Hacer clic en el botón
4. Seguir el proceso de 3 pasos
5. Confirmar la eliminación

### Endpoint API
```http
DELETE /api/failures/:id
Authorization: Bearer <token>
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Orden de falla eliminada permanentemente",
  "data": {
    "failure_order_id": "OF-2026-123456",
    "description": "...",
    "evidence_url": "/media/image.jpg",
    "had_work_order": true,
    "work_order_id": "OT-2026-789012",
    "had_parts": true,
    "parts_count": 2
  },
  "warning": "Esta acción no se puede deshacer"
}
```

**Respuesta de Error (Sin permisos):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Solo Administradores o Soporte pueden eliminar órdenes de falla"
  }
}
```

## ⚡ Mejoras Futuras

1. **Auditoría de Eliminaciones**
   - Registrar en tabla de auditoría quién eliminó qué y cuándo
   - Guardar snapshot de la falla antes de eliminar

2. **Papelera de Reciclaje**
   - Soft delete en lugar de hard delete
   - Posibilidad de restaurar en X días

3. **Notificaciones**
   - Enviar email al administrador cuando se elimina una falla
   - Notificar al usuario que reportó la falla

4. **Exportar antes de Eliminar**
   - Opción de descargar PDF con toda la información antes de eliminar
   - Backup automático en formato JSON

## 📞 Soporte

Si tienes problemas con la funcionalidad de eliminación:
1. Verifica que tu usuario tenga rol Admin (1) o Soporte (2)
2. Revisa los logs del servidor para más detalles
3. Asegúrate de que la carpeta `media/` tenga permisos de escritura

## ✅ Checklist de Implementación

- [x] Servicio de eliminación en backend
- [x] Controlador de eliminación en backend
- [x] Ruta DELETE en backend
- [x] Validación de permisos en backend
- [x] Eliminación de imagen física del servidor
- [x] Componente DeleteFailureModal en frontend
- [x] Integración en FailureDetailModal
- [x] Sistema de 3 pasos con advertencias
- [x] Validación de texto de confirmación
- [x] Confirmación final con SweetAlert2
- [x] Manejo de errores y estados de carga
- [x] Indicadores visuales de progreso
- [x] Documentación completa

---

**Fecha de Implementación:** Mayo 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Completado
