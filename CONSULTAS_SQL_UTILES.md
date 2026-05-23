# 🔍 Consultas SQL Útiles - Checklists Semanales

## 📊 Verificación y Monitoreo

### 1. Verificar que el campo week_identifier existe
```sql
DESCRIBE checklists;
-- Buscar: week_identifier | varchar(10) | YES
```

### 2. Ver todos los checklists semanales
```sql
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.name AS tipo_checklist,
  ct.type_category,
  c.createdAt,
  c.updatedAt
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE c.week_identifier IS NOT NULL
ORDER BY c.week_identifier DESC, c.createdAt DESC;
```

### 3. Contar checklists por semana
```sql
SELECT 
  week_identifier,
  COUNT(*) AS total_checklists,
  MIN(createdAt) AS primer_checklist,
  MAX(createdAt) AS ultimo_checklist
FROM checklists
WHERE week_identifier IS NOT NULL
GROUP BY week_identifier
ORDER BY week_identifier DESC;
```

### 4. Ver checklists de la semana actual
```sql
-- Reemplazar '2026-W18' con la semana actual
SELECT 
  c.checklist_id,
  ct.name AS tipo,
  c.createdAt,
  (SELECT COUNT(*) FROM checklist_responses WHERE checklist_id = c.checklist_id) AS respuestas
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE c.week_identifier = '2026-W18'
ORDER BY c.createdAt DESC;
```

### 5. Verificar que atracciones NO tienen week_identifier
```sql
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.name AS tipo,
  ct.type_category,
  c.createdAt
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE ct.type_category = 'attraction'
ORDER BY c.createdAt DESC
LIMIT 20;

-- Resultado esperado: week_identifier debe ser NULL para TODOS
```

### 6. Buscar checklists con week_identifier incorrecto
```sql
-- Buscar checklists que NO son de familia pero tienen week_identifier
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.name AS tipo,
  ct.type_category,
  c.createdAt
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE c.week_identifier IS NOT NULL
  AND ct.type_category != 'family';

-- Resultado esperado: 0 filas (no debe haber ninguno)
```

---

## 🔧 Mantenimiento

### 7. Ver tipos de checklist de familia
```sql
SELECT 
  checklist_type_id,
  name,
  description,
  frequency,
  type_category,
  associated_id
FROM checklist_types
WHERE type_category = 'family';
```

### 8. Actualizar frecuencia de checklists de familia (si es necesario)
```sql
-- Solo ejecutar si frequency no es 'weekly'
UPDATE checklist_types
SET frequency = 'weekly'
WHERE type_category = 'family';
```

### 9. Ver dispositivos activos por familia
```sql
SELECT 
  f.family_id,
  f.family_name,
  COUNT(d.ins_id) AS dispositivos_activos
FROM families f
LEFT JOIN devices d ON f.family_id = d.family_id AND d.public_flag = 'Sí'
GROUP BY f.family_id, f.family_name
ORDER BY dispositivos_activos DESC;
```

### 10. Ver respuestas de un checklist semanal específico
```sql
-- Reemplazar 123 con el checklist_id
SELECT 
  cr.response_id,
  ci.item_number,
  ci.question_text,
  cr.response_compliance,
  cr.response_text,
  cr.response_numeric,
  i.name AS dispositivo,
  cr.createdAt
FROM checklist_responses cr
JOIN checklist_items ci ON cr.checklist_item_id = ci.checklist_item_id
LEFT JOIN inspectables i ON cr.inspectable_id = i.ins_id
WHERE cr.checklist_id = 123
ORDER BY ci.item_number;
```

---

## 📈 Reportes

### 11. Checklists completados por semana
```sql
SELECT 
  c.week_identifier,
  COUNT(DISTINCT c.checklist_id) AS total_checklists,
  COUNT(DISTINCT cs.checklist_id) AS checklists_firmados,
  ROUND(COUNT(DISTINCT cs.checklist_id) * 100.0 / COUNT(DISTINCT c.checklist_id), 2) AS porcentaje_completado
FROM checklists c
LEFT JOIN checklist_signatures cs ON c.checklist_id = cs.checklist_id
WHERE c.week_identifier IS NOT NULL
GROUP BY c.week_identifier
ORDER BY c.week_identifier DESC;
```

### 12. Progreso de checklist semanal actual
```sql
-- Reemplazar '2026-W18' con la semana actual
SELECT 
  c.checklist_id,
  ct.name AS tipo,
  (SELECT COUNT(*) FROM checklist_items WHERE checklist_type_id = c.checklist_type_id) AS total_items,
  (SELECT COUNT(*) FROM checklist_responses WHERE checklist_id = c.checklist_id) AS items_respondidos,
  ROUND(
    (SELECT COUNT(*) FROM checklist_responses WHERE checklist_id = c.checklist_id) * 100.0 /
    (SELECT COUNT(*) FROM checklist_items WHERE checklist_type_id = c.checklist_type_id),
    2
  ) AS porcentaje_completado,
  (SELECT COUNT(*) FROM checklist_signatures WHERE checklist_id = c.checklist_id) AS firmas
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE c.week_identifier = '2026-W18';
```

### 13. Checklists sin completar de semanas anteriores
```sql
-- Checklists que no tienen ambas firmas requeridas
SELECT 
  c.checklist_id,
  c.week_identifier,
  ct.name AS tipo,
  c.createdAt,
  (SELECT COUNT(*) FROM checklist_signatures WHERE checklist_id = c.checklist_id) AS firmas,
  DATEDIFF(NOW(), c.createdAt) AS dias_desde_creacion
FROM checklists c
JOIN checklist_types ct ON c.checklist_type_id = ct.checklist_type_id
WHERE c.week_identifier IS NOT NULL
  AND c.week_identifier < DATE_FORMAT(NOW(), '%Y-W%v')
  AND (SELECT COUNT(*) FROM checklist_signatures WHERE checklist_id = c.checklist_id) < 2
ORDER BY c.week_identifier DESC;
```

### 14. Usuarios más activos en checklists semanales
```sql
SELECT 
  u.user_id,
  u.user_name,
  COUNT(DISTINCT c.checklist_id) AS checklists_creados,
  COUNT(DISTINCT cr.response_id) AS respuestas_totales,
  COUNT(DISTINCT cs.signature_id) AS firmas_totales
FROM users u
LEFT JOIN checklists c ON u.user_id = c.created_by AND c.week_identifier IS NOT NULL
LEFT JOIN checklist_responses cr ON u.user_id = cr.responded_by
LEFT JOIN checklist_signatures cs ON u.user_id = cs.user_id
GROUP BY u.user_id, u.user_name
HAVING checklists_creados > 0
ORDER BY checklists_creados DESC, respuestas_totales DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### 15. Buscar checklists duplicados en la misma semana
```sql
-- No debería haber duplicados para el mismo tipo y semana
SELECT 
  week_identifier,
  checklist_type_id,
  COUNT(*) AS duplicados
FROM checklists
WHERE week_identifier IS NOT NULL
  AND inspectable_id IS NULL
GROUP BY week_identifier, checklist_type_id
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 filas
```

### 16. Ver checklists con fechas inconsistentes
```sql
-- Verificar que createdAt está dentro del rango de la semana
SELECT 
  checklist_id,
  week_identifier,
  createdAt,
  DAYOFWEEK(createdAt) AS dia_semana,
  CASE 
    WHEN DAYOFWEEK(createdAt) = 1 THEN 'Domingo'
    WHEN DAYOFWEEK(createdAt) = 2 THEN 'Lunes'
    WHEN DAYOFWEEK(createdAt) = 3 THEN 'Martes'
    WHEN DAYOFWEEK(createdAt) = 4 THEN 'Miércoles'
    WHEN DAYOFWEEK(createdAt) = 5 THEN 'Jueves'
    WHEN DAYOFWEEK(createdAt) = 6 THEN 'Viernes'
    WHEN DAYOFWEEK(createdAt) = 7 THEN 'Sábado'
  END AS nombre_dia
FROM checklists
WHERE week_identifier IS NOT NULL
ORDER BY createdAt DESC
LIMIT 20;
```

### 17. Limpiar checklists de prueba (CUIDADO)
```sql
-- ⚠️ SOLO USAR EN DESARROLLO
-- Eliminar checklists semanales de prueba
DELETE FROM checklists
WHERE week_identifier IS NOT NULL
  AND checklist_id IN (
    -- Reemplazar con IDs específicos de prueba
    SELECT checklist_id FROM checklists WHERE week_identifier = '2026-W99'
  );
```

---

## 🔄 Migración y Rollback

### 18. Verificar estado de migraciones
```sql
SELECT * FROM SequelizeMeta
ORDER BY name DESC
LIMIT 10;

-- Buscar: 20260429000000-add-week-identifier-to-checklists.js
```

### 19. Backup antes de cambios importantes
```sql
-- Crear tabla de respaldo
CREATE TABLE checklists_backup AS
SELECT * FROM checklists;

-- Verificar backup
SELECT COUNT(*) FROM checklists_backup;
```

### 20. Restaurar desde backup (si es necesario)
```sql
-- ⚠️ SOLO EN EMERGENCIA
-- Restaurar datos
TRUNCATE TABLE checklists;
INSERT INTO checklists SELECT * FROM checklists_backup;

-- Verificar restauración
SELECT COUNT(*) FROM checklists;
```

---

## 📊 Estadísticas Útiles

### 21. Resumen general del sistema
```sql
SELECT 
  'Total Checklists' AS metrica,
  COUNT(*) AS valor
FROM checklists
UNION ALL
SELECT 
  'Checklists Semanales',
  COUNT(*)
FROM checklists
WHERE week_identifier IS NOT NULL
UNION ALL
SELECT 
  'Checklists Diarios',
  COUNT(*)
FROM checklists
WHERE week_identifier IS NULL
UNION ALL
SELECT 
  'Semanas Únicas',
  COUNT(DISTINCT week_identifier)
FROM checklists
WHERE week_identifier IS NOT NULL;
```

### 22. Actividad por día de la semana
```sql
SELECT 
  CASE DAYOFWEEK(createdAt)
    WHEN 1 THEN 'Domingo'
    WHEN 2 THEN 'Lunes'
    WHEN 3 THEN 'Martes'
    WHEN 4 THEN 'Miércoles'
    WHEN 5 THEN 'Jueves'
    WHEN 6 THEN 'Viernes'
    WHEN 7 THEN 'Sábado'
  END AS dia_semana,
  COUNT(*) AS checklists_creados
FROM checklists
WHERE week_identifier IS NOT NULL
GROUP BY DAYOFWEEK(createdAt)
ORDER BY DAYOFWEEK(createdAt);
```

---

## 💡 Tips

- **Siempre hacer backup** antes de ejecutar UPDATE o DELETE
- **Usar LIMIT** en consultas de prueba
- **Verificar en desarrollo** antes de ejecutar en producción
- **Documentar** cualquier consulta manual ejecutada en producción

---

**Última actualización**: 29 de Abril, 2026
