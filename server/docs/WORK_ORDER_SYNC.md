# Sistema de Sincronización de Órdenes de Trabajo Enlazadas

## Descripción General

Este sistema permite enlazar múltiples fallas (FailureOrders) a una misma orden de trabajo (WorkOrder), manteniendo la información sincronizada entre todas ellas.

## Problema que Resuelve

Cuando múltiples usuarios (por ejemplo, un técnico y un anfitrión) reportan la misma falla, se crean múltiples FailureOrders. Anteriormente, si el técnico ya había creado una WorkOrder, al enlazar la falla del anfitrión se creaba una copia independiente que no se sincronizaba.

## Solución Implementada

### 1. WorkOrders "Espejo"

Debido a la restricción de base de datos donde `failure_order_id` es único en WorkOrders (relación 1:1), creamos WorkOrders "espejo" que:

- Comparten el mismo `work_order_id` base con un sufijo único (ej: `OT-2026-444594-L123`)
- Mantienen un campo `linked_failure_ids` que registra todas las fallas enlazadas
- Se sincronizan automáticamente cuando cualquiera se actualiza

### 2. Sincronización Automática

El servicio `WorkOrderSyncService` se encarga de:

#### Sincronización de Campos
Cuando se actualiza una WorkOrder, automáticamente sincroniza estos campos en todas las WorkOrders enlazadas:
- `status` - Estado de la orden
- `requiere_replacement` - Si requiere repuestos
- `activity_performed` - Actividad realizada
- `evidence_url` - URL de evidencia
- `closure_signature` - Firma de cierre
- `start_time` - Hora de inicio
- `end_time` - Hora de finalización
- `resolved_by_id` - Técnico que resolvió

#### Sincronización de Repuestos
Cuando se agregan o modifican repuestos en una WorkOrder, automáticamente:
- Elimina los repuestos existentes en las WorkOrders enlazadas
- Copia los nuevos repuestos a todas las WorkOrders enlazadas

## Flujo de Uso

### 1. Enlazar una Falla a una WorkOrder Existente

```http
POST /api/failures/:id/link-work-order
Content-Type: application/json

{
  "work_order_id": "OT-2026-444594"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Falla enlazada exitosamente...",
  "data": {
    "failureOrder": { ... },
    "linkedWorkOrder": { ... },
    "originalWorkOrder": { ... },
    "linkedFailureIds": [1, 2, 3],
    "note": "IMPORTANTE: Para mantener sincronización..."
  }
}
```

### 2. Actualizar una WorkOrder

Cuando actualizas una WorkOrder usando el servicio:

```javascript
const workOrderService = require('./services/workOrderService');

await workOrderService.updateWorkOrderFields(workOrderId, {
  status: 'RESUELTA',
  activity_performed: 'Se reemplazó el componente X',
  evidence_url: '/media/evidence.jpg'
});
```

**Automáticamente:**
- Se actualiza la WorkOrder especificada
- Se sincronizan todas las WorkOrders enlazadas
- Se registra en logs cuántas WorkOrders se sincronizaron

### 3. Agregar Repuestos

```javascript
await workOrderService.addUsedPart(workOrderId, {
  inventory_id: 123,
  quantity_used: 2
});
```

**Automáticamente:**
- Se agrega el repuesto a la WorkOrder
- Se sincronizan los repuestos en todas las WorkOrders enlazadas

### 4. Consultar Fallas Enlazadas

```http
GET /api/failures/:id/linked-failures
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "failure_order_id": "OF-2026-ABC123",
      "description": "Falla reportada por técnico",
      "reporter": { ... },
      "affectedInspectable": { ... }
    },
    {
      "id": 2,
      "failure_order_id": "OF-2026-XYZ789",
      "description": "Misma falla reportada por anfitrión",
      "reporter": { ... },
      "affectedInspectable": { ... }
    }
  ],
  "count": 2
}
```

### 5. Desenlazar una Falla

```http
DELETE /api/failures/:id/unlink-work-order
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Falla desenlazada exitosamente",
  "data": {
    "failureOrderId": 123,
    "deletedWorkOrderId": "OT-2026-444594-L123",
    "remainingLinkedFailures": 2,
    "note": "La falla ya no está sincronizada con otras órdenes de trabajo"
  }
}
```

**Importante:**
- Solo se pueden desenlazar WorkOrders "espejo" (con sufijo -L)
- No se puede desenlazar la WorkOrder original
- Se elimina la WorkOrder espejo y sus repuestos
- Las otras fallas enlazadas siguen sincronizadas entre sí

## Estructura de Base de Datos

### Tabla: work_orders

```sql
CREATE TABLE work_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id VARCHAR(255) UNIQUE NOT NULL,
  failure_order_id INT UNIQUE NOT NULL,
  status ENUM(...),
  activity_performed TEXT,
  evidence_url VARCHAR(255),
  closure_signature VARCHAR(1000),
  start_time DATETIME,
  end_time DATETIME,
  resolved_by_id INT,
  linked_failure_ids TEXT,  -- ✅ NUEVO: JSON array de IDs enlazados
  ...
);
```

### Campo linked_failure_ids

Formato JSON:
```json
[1, 2, 3, 5, 8]
```

Contiene los IDs de todas las FailureOrders que comparten esta información de WorkOrder.

## Migración

Para agregar el campo a la base de datos existente:

```bash
cd server
npx sequelize-cli db:migrate
```

Esto ejecutará la migración `20260424000000-add-linked-failure-ids-to-work-orders.js`

## Servicios Involucrados

### WorkOrderSyncService

**Métodos principales:**

1. `syncLinkedWorkOrders(workOrderId, updateData)`
   - Sincroniza campos de WorkOrders enlazadas
   - Retorna: `{ success, message, synced, fields }`

2. `syncLinkedWorkOrderParts(workOrderId)`
   - Sincroniza repuestos entre WorkOrders enlazadas
   - Retorna: `{ success, message, synced }`

3. `getLinkedFailures(workOrderId)`
   - Obtiene todas las fallas enlazadas a una WorkOrder
   - Retorna: `{ success, data, count }`

### WorkOrderService

Métodos actualizados con sincronización automática:

- `updateWorkOrderFields()` - Sincroniza campos automáticamente
- `addUsedPart()` - Sincroniza repuestos automáticamente

## Consideraciones Importantes

### ✅ Ventajas

1. **Consistencia**: Todas las fallas enlazadas muestran la misma información de OT
2. **Automatización**: No requiere intervención manual para mantener sincronización
3. **Trazabilidad**: Se puede consultar qué fallas están enlazadas
4. **Eficiencia**: Una sola actualización afecta a todas las fallas relacionadas

### ⚠️ Limitaciones

1. **Relación 1:1**: Debido a la restricción de BD, cada falla tiene su propia WorkOrder "espejo"
2. **IDs Diferentes**: Cada WorkOrder tiene un ID único (con sufijo -L)
3. **Sincronización Unidireccional**: La sincronización ocurre desde la WorkOrder actualizada hacia las demás

### 🔧 Mantenimiento

- Los logs incluyen prefijo `[SYNC]` para facilitar debugging
- Errores de sincronización no bloquean la operación principal
- Se recomienda monitorear logs para detectar problemas de sincronización

## Ejemplo de Caso de Uso

### Escenario

1. **Técnico** reporta falla en atracción X → Crea OF-001 y OT-001
2. **Anfitrión** reporta la misma falla → Crea OF-002
3. **Sistema** detecta duplicado y permite enlazar OF-002 a OT-001
4. Se crea OT-001-L2 (espejo) asociada a OF-002
5. **Técnico** actualiza OT-001 con solución y evidencia
6. **Sistema** sincroniza automáticamente OT-001-L2
7. **Anfitrión** ve la misma información actualizada en OF-002

### Resultado

Ambos usuarios (técnico y anfitrión) ven la misma información de la orden de trabajo, manteniendo consistencia en el sistema.

## Preguntas Frecuentes

**P: ¿Qué pasa si actualizo una WorkOrder enlazada?**
R: La sincronización funciona desde cualquier WorkOrder enlazada hacia las demás.

**P: ¿Puedo desenlazar fallas?**
R: Sí, usa el endpoint `DELETE /api/failures/:id/unlink-work-order`. Solo se pueden desenlazar WorkOrders "espejo" (con sufijo -L), no la original.

**P: ¿Qué pasa si desenlazó una falla por error?**
R: Puedes volver a enlazarla usando el endpoint `POST /api/failures/:id/link-work-order` con el work_order_id de una de las fallas que siguen enlazadas.

**P: ¿Afecta el rendimiento?**
R: El impacto es mínimo ya que solo sincroniza cuando hay actualizaciones y solo afecta a las WorkOrders enlazadas.

**P: ¿Qué pasa si falla la sincronización?**
R: La operación principal se completa y se registra el error en logs. La sincronización se puede reintentar manualmente.

**P: ¿Qué pasa con los repuestos al desenlazar?**
R: Los repuestos de la WorkOrder desenlazada se eliminan. Las otras WorkOrders enlazadas mantienen sus repuestos.

## Soporte

Para problemas o preguntas sobre el sistema de sincronización, revisar:
- Logs del servidor con prefijo `[SYNC]`
- Servicio: `server/src/services/WorkOrderSyncService.js`
- Controlador: `server/src/controllers/FailureController.js` (método `linkToWorkOrder`)
