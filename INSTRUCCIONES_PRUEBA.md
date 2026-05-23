# 🚀 Instrucciones para Probar Checklists Semanales

## ✅ Paso 1: Ejecutar Migración de Base de Datos

```bash
cd server
npx sequelize-cli db:migrate
```

**Resultado esperado**: 
```
== 20260429000000-add-week-identifier-to-checklists: migrating =======
== 20260429000000-add-week-identifier-to-checklists: migrated (0.XXXs)
```

---

## ✅ Paso 2: Verificar que la Migración Funcionó

### Opción A: Ejecutar script de verificación
```bash
node server/scripts/verify-weekly-checklists.js
```

### Opción B: Consulta SQL directa
```sql
DESCRIBE checklists;
-- Debe aparecer el campo: week_identifier VARCHAR(10)
```

---

## ✅ Paso 3: Probar Funciones de Utilidad

```bash
node server/src/utils/__tests__/weekUtils.test.js
```

**Resultado esperado**: Todos los tests en verde ✓

---

## ✅ Paso 4: Reiniciar el Servidor

```bash
# Detener el servidor actual (Ctrl+C)
# Luego reiniciar
cd server
npm start
# o
npm run dev
```

---

## ✅ Paso 5: Probar en el Frontend

### Prueba 1: Crear Checklist de Familia
1. Abrir el navegador e ir a la página de checklists de familia
2. **Verificar**: Debe aparecer un banner azul con:
   - 📅 "Checklist Semanal - 2026-Wxx"
   - Rango de fechas (Lun XX - Dom XX)
   - Días restantes
3. Llenar algunas respuestas
4. Hacer clic en "Guardar Progreso"
5. **Verificar**: Mensaje de éxito

### Prueba 2: Continuar Checklist
1. Cerrar el navegador o refrescar la página
2. Volver a la página de checklists de familia
3. **Verificar**: 
   - Se carga el MISMO checklist (no crea uno nuevo)
   - Las respuestas guardadas están presentes
   - El banner sigue mostrando la misma semana

### Prueba 3: Verificar Checklists de Atracción
1. Ir a un checklist de atracción
2. **Verificar**: 
   - NO debe aparecer el banner semanal
   - Debe funcionar como siempre (diario)
3. Al día siguiente, volver al mismo checklist
4. **Verificar**: Se crea un NUEVO checklist (no continúa el de ayer)

---

## ✅ Paso 6: Verificar en Base de Datos

### Ver checklists semanales creados:
```sql
SELECT 
  checklist_id,
  week_identifier,
  checklist_type_id,
  createdAt
FROM checklists
WHERE week_identifier IS NOT NULL
ORDER BY createdAt DESC
LIMIT 10;
```

### Verificar que atracciones NO tienen week_identifier:
```sql
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.type_category,
  ct.name
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE ct.type_category = 'attraction'
LIMIT 10;
```
**Resultado esperado**: Todas las filas deben tener `week_identifier = NULL`

---

## 🐛 Solución de Problemas

### Problema: "Error: Column 'week_identifier' doesn't exist"
**Solución**: La migración no se ejecutó. Ejecutar:
```bash
cd server
npx sequelize-cli db:migrate
```

### Problema: "Se crea un nuevo checklist cada día para familias"
**Solución**: Verificar en el código que `checklistType.frequency === 'weekly'`
```sql
SELECT checklist_type_id, name, frequency, type_category 
FROM checklist_types 
WHERE type_category = 'family';
```
Si `frequency` no es `'weekly'`, actualizar:
```sql
UPDATE checklist_types 
SET frequency = 'weekly' 
WHERE type_category = 'family';
```

### Problema: "El banner no se muestra"
**Solución**: 
1. Abrir DevTools → Network
2. Buscar la petición al endpoint de checklist
3. Verificar que la respuesta incluye `week_info`
4. Si no está, revisar logs del servidor

### Problema: "Checklists de atracción dejaron de funcionar"
**Solución**: 
1. Revisar logs del servidor
2. Buscar errores en `checklistService.js`
3. Verificar que `getDateBoundsForChecklistType()` retorna `isWeekly: false` para atracciones

---

## 📊 Checklist de Verificación

Marca cada item cuando lo hayas verificado:

- [ ] Migración ejecutada exitosamente
- [ ] Campo `week_identifier` existe en BD
- [ ] Tests de `weekUtils` pasan
- [ ] Script de verificación ejecuta sin errores
- [ ] Banner semanal se muestra en checklists de familia
- [ ] Se puede guardar progreso en checklist de familia
- [ ] Se puede continuar checklist de familia al día siguiente
- [ ] Checklists de atracción siguen siendo diarios
- [ ] Checklists de atracción NO tienen `week_identifier`
- [ ] El lunes se crea un nuevo checklist de familia
- [ ] Firmas funcionan correctamente

---

## 📞 Siguiente Paso

Una vez que hayas completado todas las verificaciones:

1. **Si todo funciona**: ✅ Listo para producción
2. **Si hay problemas**: 🐛 Reportar en el chat con:
   - Descripción del problema
   - Logs del servidor
   - Respuesta de la API (DevTools → Network)
   - Consultas SQL relevantes

---

## 🎯 Resumen de Cambios

### ✅ Lo que CAMBIÓ:
- Checklists de familia ahora son **semanales** (Lunes-Domingo)
- Se puede **guardar progreso** durante la semana
- Nuevo campo `week_identifier` en BD
- Banner informativo en el frontend

### ✅ Lo que NO CAMBIÓ:
- Checklists de atracciones siguen siendo **diarios**
- Checklists específicos y estáticos sin cambios
- Sistema de firmas sin cambios
- Sistema de fallas sin cambios
- Historial de checklists sin cambios

---

**¡Éxito en las pruebas!** 🚀
