# 📋 Refactorización: Checklists de Familia Semanales

## 🎯 Objetivo
Convertir los checklists de familia de **diarios** a **semanales** (Lunes-Domingo), permitiendo guardar progreso durante la semana sin afectar los checklists de atracciones que siguen siendo diarios.

---

## ✅ Cambios Implementados

### 1. **Base de Datos**

#### Nueva Migración
- **Archivo**: `server/src/migrations/20260429000000-add-week-identifier-to-checklists.js`
- **Cambio**: Agrega campo `week_identifier` (VARCHAR(10)) a la tabla `checklists`
- **Formato**: `YYYY-Wxx` (ejemplo: `2026-W18`)
- **Índice**: Creado índice compuesto `(week_identifier, checklist_type_id)` para búsquedas rápidas

#### Modelo Actualizado
- **Archivo**: `server/src/models/Checklist.js`
- **Campo agregado**: `week_identifier` con comentario descriptivo

**Comando para ejecutar**:
```bash
cd server
npx sequelize-cli db:migrate
```

---

### 2. **Backend - Utilidades de Semana**

#### Nuevo Archivo: `server/src/utils/weekUtils.js`
Funciones para manejo de semanas:

- `getMondayOfWeek(date)` - Obtiene el lunes de una semana
- `getSundayOfWeek(date)` - Obtiene el domingo de una semana
- `getWeekBounds(date)` - Retorna `{ startOfWeek, endOfWeek }`
- `getWeekIdentifier(date)` - Genera identificador `YYYY-Wxx`
- `getDateBoundsForChecklistType(checklistType, referenceDate)` - **FUNCIÓN CLAVE**
  - Para `type_category === 'family'` y `frequency === 'weekly'`: retorna límites semanales
  - Para todos los demás: retorna límites diarios (sin cambios)
- `formatWeekRange(startDate, endDate)` - Formatea rango para UI
- `getDaysRemainingInWeek()` - Calcula días restantes
- `isInCurrentWeek(date)` - Verifica si una fecha está en la semana actual

---

### 3. **Backend - Servicio de Checklists**

#### Archivo Modificado: `server/src/services/checklistService.js`

**Cambios en `ensureChecklistInstance`**:
```javascript
// ANTES: Siempre buscaba por día
const whereClause = {
  checklist_type_id: checklistTypeInstance.checklist_type_id,
  createdAt: { [Op.between]: [startOfDay, endOfDay] }
};

// AHORA: Usa weekUtils para determinar el rango
const { startDate, endDate, identifier, isWeekly } = 
  weekUtils.getDateBoundsForChecklistType(checklistTypeInstance);

const whereClause = {
  checklist_type_id: checklistTypeInstance.checklist_type_id,
  createdAt: { [Op.between]: [startDate, endDate] }
};

// Para checklists semanales, agregar week_identifier
if (isWeekly && identifier) {
  whereClause.week_identifier = identifier;
}
```

**Cambios en `getLatestChecklist`**:
- Usa `weekUtils.getDateBoundsForChecklistType()` para determinar rango de búsqueda
- Agrega `week_info` al resultado para checklists semanales:
  ```javascript
  week_info: {
    week_identifier: "2026-W18",
    week_range: "Lun 28 Abr - Dom 4 May",
    days_remaining: 3,
    start_date: Date,
    end_date: Date
  }
  ```

**Cambios en `getLatestChecklistByType`** (usado por frontend):
- Sección de `family` completamente refactorizada
- Busca por `week_identifier` en lugar de `createdAt` diario
- Crea checklist con `week_identifier` si no existe
- Retorna `week_info` para mostrar en UI

**Cambios en `submitResponses`**:
- Al guardar respuestas de familia, busca checklist por `week_identifier`
- Fallback: crea checklist semanal si no existe

---

### 4. **Frontend - Componentes**

#### Nuevo Componente: `client/src/components/checklist/WeeklyChecklistBanner.jsx`
Banner informativo que muestra:
- 📅 Identificador de semana (ej: "2026-W18")
- 📆 Rango de fechas (ej: "Lun 28 Abr - Dom 4 May")
- ⏰ Días restantes con código de colores:
  - 🔵 Azul: 3+ días restantes
  - 🟠 Naranja: 1-2 días restantes
  - 🔴 Rojo: ¡Último día!
- ℹ️ Mensaje informativo sobre guardar progreso

#### Archivo Modificado: `client/src/components/checklist/BaseChecklistPage.jsx`
- Import de `WeeklyChecklistBanner`
- Renderiza banner si `checklistData.checklist?.week_info` existe
- Banner se muestra solo para checklists semanales (familias)

---

## 🔒 Garantías de Seguridad

### ✅ Checklists de Atracciones NO Afectados
1. **Condición estricta**: Todos los cambios están dentro de bloques `if (type_category === 'family')`
2. **Función centralizada**: `getDateBoundsForChecklistType()` retorna límites diarios para todo excepto familias
3. **Sin cambios en lógica de atracciones**: La lógica de `attraction`, `specific` y `static` permanece intacta

### ✅ Compatibilidad hacia atrás
- Checklists de familia antiguos (sin `week_identifier`) seguirán funcionando
- La búsqueda por `createdAt` sigue siendo válida como fallback

---

## 🧪 Plan de Pruebas

### Prueba 1: Crear Checklist de Familia (Lunes)
**Pasos**:
1. Ir a la página de checklists de familia un lunes
2. Verificar que se crea un nuevo checklist
3. Verificar en BD que tiene `week_identifier` (ej: `2026-W18`)
4. Verificar que el banner muestra "6 días restantes"

**Resultado esperado**: ✅ Checklist creado con identificador semanal

---

### Prueba 2: Continuar Checklist de Familia (Miércoles)
**Pasos**:
1. Crear checklist el lunes y guardar algunas respuestas
2. Cerrar sesión o salir de la página
3. El miércoles, volver a la página de checklists de familia
4. Verificar que se carga el MISMO checklist del lunes
5. Verificar que las respuestas guardadas están presentes
6. Verificar que el banner muestra "4 días restantes"

**Resultado esperado**: ✅ Se recupera el checklist de la semana, no se crea uno nuevo

---

### Prueba 3: Checklist de Familia Expira el Domingo
**Pasos**:
1. Crear checklist el viernes
2. Verificar que el banner muestra "2 días restantes"
3. El domingo, verificar que muestra "¡Último día!"
4. El lunes siguiente, verificar que se crea un NUEVO checklist
5. Verificar que el `week_identifier` cambió (ej: de `2026-W18` a `2026-W19`)

**Resultado esperado**: ✅ Nueva semana = nuevo checklist

---

### Prueba 4: Checklist de Atracción Sigue Siendo Diario
**Pasos**:
1. Ir a un checklist de atracción hoy
2. Crear y guardar respuestas
3. Mañana, volver al mismo checklist de atracción
4. Verificar que se crea un NUEVO checklist (no continúa el de ayer)
5. Verificar en BD que NO tiene `week_identifier` (debe ser NULL)

**Resultado esperado**: ✅ Checklists de atracción siguen siendo diarios

---

### Prueba 5: Firmar Checklist de Familia
**Pasos**:
1. Completar un checklist de familia
2. Firmar como técnico
3. Firmar como jefe de operaciones
4. Verificar que no se puede editar después de ambas firmas
5. El lunes siguiente, verificar que se puede crear un nuevo checklist

**Resultado esperado**: ✅ Firmas funcionan igual que antes

---

### Prueba 6: Historial de Checklists de Familia
**Pasos**:
1. Crear y completar checklists de familia en 3 semanas diferentes
2. Ir al historial de checklists
3. Verificar que se muestran agrupados por semana

**Resultado esperado**: ✅ Historial muestra checklists semanales

---

## 🔍 Verificación en Base de Datos

### Consulta para ver checklists semanales:
```sql
SELECT 
  checklist_id,
  week_identifier,
  checklist_type_id,
  createdAt,
  updatedAt
FROM checklists
WHERE week_identifier IS NOT NULL
ORDER BY week_identifier DESC;
```

### Consulta para verificar que atracciones NO tienen week_identifier:
```sql
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.type_category,
  ct.frequency
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE ct.type_category = 'attraction';
```
**Resultado esperado**: Todas las filas deben tener `week_identifier = NULL`

---

## 📊 Resumen de Archivos Modificados

### Nuevos Archivos (3)
1. ✅ `server/src/migrations/20260429000000-add-week-identifier-to-checklists.js`
2. ✅ `server/src/utils/weekUtils.js`
3. ✅ `client/src/components/checklist/WeeklyChecklistBanner.jsx`

### Archivos Modificados (3)
1. ✅ `server/src/models/Checklist.js` - Agregado campo `week_identifier`
2. ✅ `server/src/services/checklistService.js` - Lógica semanal para familias
3. ✅ `client/src/components/checklist/BaseChecklistPage.jsx` - Banner semanal

---

## 🚀 Despliegue

### Pasos para producción:
1. **Backup de BD**: Hacer respaldo antes de migrar
2. **Ejecutar migración**: `npx sequelize-cli db:migrate`
3. **Verificar migración**: Confirmar que el campo existe
4. **Deploy backend**: Subir cambios del servidor
5. **Deploy frontend**: Subir cambios del cliente
6. **Pruebas en producción**: Ejecutar plan de pruebas

### Rollback (si es necesario):
```bash
cd server
npx sequelize-cli db:migrate:undo
```

---

## 📝 Notas Importantes

### Comportamiento Clave:
- ✅ **Lunes 00:00:00** - Inicia nueva semana, se puede crear nuevo checklist
- ✅ **Martes-Sábado** - Se continúa el checklist de la semana actual
- ✅ **Domingo 23:59:59** - Último momento para completar el checklist
- ✅ **Lunes siguiente** - Checklist anterior ya no es accesible (falta si no se completó)

### Reglas de Negocio:
1. Un checklist de familia por semana (Lunes-Domingo)
2. Se puede crear cualquier día de la semana
3. Se puede guardar progreso y continuar hasta el domingo
4. Si se crea el viernes, solo tiene viernes, sábado y domingo para terminarlo
5. No se puede continuar checklists de semanas anteriores
6. Las firmas siguen siendo obligatorias (técnico + jefe)

---

## 🐛 Troubleshooting

### Problema: "No se crea el checklist semanal"
**Solución**: Verificar que el `ChecklistType` tiene:
- `type_category = 'family'`
- `frequency = 'weekly'`

### Problema: "Se crea un nuevo checklist cada día"
**Solución**: Verificar que la migración se ejecutó correctamente y el campo `week_identifier` existe

### Problema: "El banner no se muestra"
**Solución**: Verificar que el backend está retornando `week_info` en la respuesta

### Problema: "Checklists de atracción dejaron de funcionar"
**Solución**: Revisar logs del servidor, verificar que `getDateBoundsForChecklistType()` retorna límites diarios para atracciones

---

## 📞 Contacto y Soporte

Si encuentras algún problema durante las pruebas, revisa:
1. Logs del servidor (`console.log` en `checklistService.js`)
2. Respuestas de la API en DevTools (Network tab)
3. Estado de la BD (consultas SQL arriba)

---

## ✨ Mejoras Futuras (Opcional)

1. **Dashboard semanal**: Mostrar progreso de la semana en un gráfico
2. **Notificaciones**: Alertar cuando quedan 2 días para terminar
3. **Reportes semanales**: Generar PDF con resumen de la semana
4. **Comparación semanal**: Comparar rendimiento entre semanas
5. **Migración de datos**: Script para convertir checklists antiguos a formato semanal

---

**Fecha de implementación**: 29 de Abril, 2026
**Versión**: 1.0.0
**Estado**: ✅ Implementado - Pendiente de pruebas
