# 🚀 Guía de Despliegue: Sistema de Firmas Retroactivas

## ⚠️ Pre-requisitos

Antes de desplegar, verifica que tienes:

- [x] Node.js instalado (v14 o superior)
- [x] Base de datos MySQL/MariaDB funcionando
- [x] Tabla `audits` existente en la base de datos
- [x] Tabla `checklist_signatures` existente
- [x] Usuario de Soporte creado (role_id: 2)
- [x] Al menos un usuario Jefe de Operaciones (role_id: 4)

## 📦 Archivos Nuevos

Los siguientes archivos fueron creados y deben estar en tu repositorio:

### Backend
```
server/src/controllers/retroactiveSignatureController.js
server/src/routes/retroactiveSignatureRoutes.js
```

### Frontend
```
client/src/components/admin/RetroactiveSignatureManagement.jsx
```

### Documentación
```
FIRMAS_RETROACTIVAS_DOCUMENTACION.md
FIRMAS_RETROACTIVAS_GUIA_RAPIDA.md
RESUMEN_IMPLEMENTACION_FIRMAS_RETROACTIVAS.md
DEPLOY_FIRMAS_RETROACTIVAS.md (este archivo)
```

## 🔧 Archivos Modificados

Los siguientes archivos fueron modificados:

### Backend
```
server/src/index.js
```
**Cambios:**
- Importación de `retroactiveSignatureRoutes`
- Registro de rutas `/api/retroactive-signatures`

### Frontend
```
client/src/app/AdminDashboard/page.js
```
**Cambios:**
- Importación de `RetroactiveSignatureManagement`
- Estado `userRoleId` para tracking del rol
- Lógica condicional para mostrar pestaña
- Nueva pestaña en navegación

## 🚀 Pasos de Despliegue

### Paso 1: Verificar Base de Datos

Asegúrate de que la tabla `audits` existe y tiene la estructura correcta:

```sql
-- Verificar estructura de tabla audits
DESCRIBE audits;

-- Debe tener estos campos:
-- audit_id (INT, PK)
-- user_id (INT)
-- premise_id (INT)
-- audit_date (DATETIME)
-- audit_category (VARCHAR)
-- audit_description (TEXT)
```

Si la tabla no existe o le faltan campos, ejecuta:

```sql
-- Crear tabla audits (si no existe)
CREATE TABLE IF NOT EXISTS audits (
  audit_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  premise_id INT NOT NULL,
  audit_date DATETIME NOT NULL,
  audit_category VARCHAR(255) NOT NULL,
  audit_description TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Paso 2: Backend - Instalar Dependencias

```bash
cd server
npm install
```

**Nota:** No se requieren nuevas dependencias, solo las que ya tienes.

### Paso 3: Backend - Verificar Archivos

```bash
# Verificar que los archivos existen
ls -la src/controllers/retroactiveSignatureController.js
ls -la src/routes/retroactiveSignatureRoutes.js

# Verificar que index.js fue modificado
grep "retroactiveSignatureRoutes" src/index.js
```

### Paso 4: Backend - Reiniciar Servidor

```bash
# Detener el servidor actual (Ctrl+C)

# Iniciar servidor en modo desarrollo
npm run dev

# O en modo producción
npm start
```

**Verificar que no hay errores en la consola:**
```
✓ Servidor escuchando en http://0.0.0.0:5000
✓ Base de datos conectada
```

### Paso 5: Frontend - Instalar Dependencias

```bash
cd client
npm install
```

**Nota:** No se requieren nuevas dependencias.

### Paso 6: Frontend - Verificar Archivos

```bash
# Verificar que el componente existe
ls -la src/components/admin/RetroactiveSignatureManagement.jsx

# Verificar que AdminDashboard fue modificado
grep "RetroactiveSignatureManagement" src/app/AdminDashboard/page.js
```

### Paso 7: Frontend - Reiniciar Cliente

```bash
# Detener el cliente actual (Ctrl+C)

# Iniciar cliente en modo desarrollo
npm run dev

# O construir para producción
npm run build
npm start
```

**Verificar que no hay errores en la consola:**
```
✓ Ready on http://localhost:3000
```

### Paso 8: Verificar Variables de Entorno

Asegúrate de que el archivo `.env` del cliente tiene:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

O la URL correcta de tu API en producción.

## 🧪 Pruebas Post-Despliegue

### Test 1: Verificar Endpoints Backend

```bash
# Obtener token de autenticación (reemplaza con credenciales de Soporte)
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"soporte@test.com","password":"tu_password"}'

# Guardar el token que recibes
TOKEN="tu_token_aqui"

# Probar endpoint de checklists sin firma
curl -X GET http://localhost:5000/api/retroactive-signatures/unsigned-checklists \
  -H "Authorization: Bearer $TOKEN"

# Probar endpoint de administradores disponibles
curl -X GET http://localhost:5000/api/retroactive-signatures/available-admins \
  -H "Authorization: Bearer $TOKEN"

# Probar endpoint de historial
curl -X GET http://localhost:5000/api/retroactive-signatures/history \
  -H "Authorization: Bearer $TOKEN"
```

**Respuestas esperadas:**
- Status 200 OK
- JSON con datos correctos
- No errores 500

### Test 2: Verificar Frontend

1. **Abrir navegador:** `http://localhost:3000`

2. **Iniciar sesión con usuario de Soporte:**
   - Email: `soporte@test.com`
   - Password: tu contraseña

3. **Ir a AdminDashboard:**
   - Debería aparecer la pestaña "Firmas Retroactivas"
   - Con indicador amarillo parpadeante

4. **Hacer clic en la pestaña:**
   - Debería cargar sin errores
   - Mostrar tabs "Checklists Sin Firma" y "Historial"

5. **Verificar funcionalidad:**
   - Filtros funcionan
   - Botón "Agregar Firma" abre modal
   - Modal tiene validaciones
   - Historial se carga correctamente

### Test 3: Verificar Seguridad

1. **Iniciar sesión con usuario NO-Soporte:**
   - Admin (role_id: 1)
   - Técnico (role_id: 7)
   - Jefe de Operaciones (role_id: 4)

2. **Ir a AdminDashboard:**
   - NO debería aparecer la pestaña "Firmas Retroactivas"

3. **Intentar acceso directo a API:**
```bash
# Con token de usuario NO-Soporte
curl -X GET http://localhost:5000/api/retroactive-signatures/unsigned-checklists \
  -H "Authorization: Bearer $TOKEN_NO_SOPORTE"
```

**Respuesta esperada:**
- Status 403 Forbidden
- Mensaje: "Acceso denegado"

### Test 4: Prueba Completa End-to-End

1. **Crear checklist de prueba sin firma de admin:**
```sql
-- Insertar checklist de prueba
INSERT INTO checklists (checklist_type_id, premise_id, created_by, createdAt, updatedAt)
VALUES (1, 1, 1, NOW(), NOW());

-- Obtener el ID del checklist creado
SELECT LAST_INSERT_ID();

-- Agregar solo firma de técnico (role_id: 7)
INSERT INTO checklist_signatures (user_id, checklist_id, role_id, signed_at, signed_by_name, createdAt, updatedAt)
VALUES (1, LAST_INSERT_ID(), 7, NOW(), 'Técnico Test', NOW(), NOW());
```

2. **Verificar que aparece en la lista:**
   - Ir a "Firmas Retroactivas" → "Checklists Sin Firma"
   - Debería aparecer el checklist recién creado

3. **Agregar firma retroactiva:**
   - Hacer clic en "Agregar Firma"
   - Seleccionar un administrador
   - Escribir justificación: "Prueba de sistema"
   - Confirmar

4. **Verificar resultado:**
   - Checklist desaparece de la lista
   - Aparece en el historial
   - Registro en tabla `audits`

5. **Verificar en base de datos:**
```sql
-- Verificar firma agregada
SELECT * FROM checklist_signatures 
WHERE checklist_id = [ID_DEL_CHECKLIST] 
AND role_id = 4;

-- Verificar registro de auditoría
SELECT * FROM audits 
WHERE audit_category = 'RETROACTIVE_SIGNATURE' 
ORDER BY audit_date DESC 
LIMIT 1;
```

## 🐛 Solución de Problemas

### Problema 1: Error 500 al cargar checklists

**Síntoma:**
```
Error al cargar checklists sin firma
```

**Solución:**
1. Verificar logs del servidor
2. Verificar que la tabla `audits` existe
3. Verificar que el modelo `Audit` está correctamente importado
4. Verificar conexión a base de datos

### Problema 2: No aparece la pestaña

**Síntoma:**
La pestaña "Firmas Retroactivas" no aparece en AdminDashboard

**Solución:**
1. Verificar que el usuario tiene role_id: 2
2. Abrir consola del navegador (F12)
3. Buscar errores de JavaScript
4. Verificar que el componente fue importado correctamente
5. Limpiar caché del navegador (Ctrl+Shift+R)

### Problema 3: Error al agregar firma

**Síntoma:**
```
Error al agregar firma retroactiva
```

**Solución:**
1. Verificar que el administrador seleccionado tiene role_id: 4
2. Verificar que la justificación tiene al menos 10 caracteres
3. Verificar que el checklist no tiene firma previa de admin
4. Revisar logs del servidor para más detalles

### Problema 4: Historial vacío

**Síntoma:**
El tab "Historial" no muestra registros

**Solución:**
1. Verificar que existen registros en la tabla `audits` con `audit_category = 'RETROACTIVE_SIGNATURE'`
2. Verificar formato del JSON en `audit_description`
3. Revisar consola del navegador para errores de parsing

## 📊 Monitoreo Post-Despliegue

### Métricas a Monitorear

1. **Uso de la funcionalidad:**
```sql
-- Contar firmas retroactivas por día
SELECT 
  DATE(audit_date) as fecha,
  COUNT(*) as total_firmas
FROM audits
WHERE audit_category = 'RETROACTIVE_SIGNATURE'
GROUP BY DATE(audit_date)
ORDER BY fecha DESC;
```

2. **Usuarios más activos:**
```sql
-- Ver quién está usando más la funcionalidad
SELECT 
  JSON_EXTRACT(audit_description, '$.authorized_by') as usuario_soporte,
  COUNT(*) as total_autorizaciones
FROM audits
WHERE audit_category = 'RETROACTIVE_SIGNATURE'
GROUP BY usuario_soporte
ORDER BY total_autorizaciones DESC;
```

3. **Justificaciones comunes:**
```sql
-- Ver las justificaciones más frecuentes
SELECT 
  JSON_EXTRACT(audit_description, '$.justification') as justificacion,
  COUNT(*) as frecuencia
FROM audits
WHERE audit_category = 'RETROACTIVE_SIGNATURE'
GROUP BY justificacion
ORDER BY frecuencia DESC
LIMIT 10;
```

### Logs a Revisar

**Backend:**
```bash
# Ver logs del servidor
tail -f server/logs/app.log

# Buscar errores relacionados
grep "retroactive" server/logs/app.log
grep "RETROACTIVE_SIGNATURE" server/logs/app.log
```

**Frontend:**
```bash
# Ver logs del cliente
tail -f client/.next/server.log

# Buscar errores en consola del navegador
# Abrir DevTools (F12) → Console
```

## ✅ Checklist Final

Antes de considerar el despliegue completo:

- [ ] Backend iniciado sin errores
- [ ] Frontend iniciado sin errores
- [ ] Endpoints responden correctamente
- [ ] Pestaña visible para Soporte
- [ ] Pestaña NO visible para otros roles
- [ ] Checklists sin firma se listan correctamente
- [ ] Modal de firma funciona
- [ ] Validaciones funcionan
- [ ] Firma se agrega correctamente
- [ ] Registro de auditoría se crea
- [ ] Historial se muestra correctamente
- [ ] Pruebas de seguridad pasadas
- [ ] Documentación revisada
- [ ] Equipo de Soporte capacitado

## 🎉 Despliegue Exitoso

Si todos los checks están marcados, ¡felicidades! El sistema de firmas retroactivas está funcionando correctamente.

### Próximos Pasos:

1. **Comunicar al equipo:**
   - Enviar email al equipo de Soporte
   - Compartir la guía rápida
   - Programar sesión de capacitación

2. **Monitorear uso:**
   - Revisar métricas semanalmente
   - Identificar patrones
   - Ajustar procesos si es necesario

3. **Recopilar feedback:**
   - Preguntar al equipo de Soporte
   - Identificar mejoras
   - Planear actualizaciones futuras

---

**¿Problemas durante el despliegue?**  
Revisa la documentación completa en `FIRMAS_RETROACTIVAS_DOCUMENTACION.md` o contacta al equipo de desarrollo.

**Fecha de despliegue:** _____________  
**Desplegado por:** _____________  
**Versión:** 1.0.0
