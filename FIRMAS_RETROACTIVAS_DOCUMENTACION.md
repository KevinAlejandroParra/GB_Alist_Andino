# Sistema de Firmas Retroactivas

## 📋 Descripción General

Sistema diseñado para permitir al personal de Soporte agregar firmas de administrador (Jefe de Operaciones) de forma retroactiva a checklists que fueron completados pero no firmados a tiempo.

## 🎯 Problema que Resuelve

**Situación:** Los administradores a veces olvidan firmar los checklists completados, lo que genera:
- Checklists incompletos en el sistema
- Necesidad de contactar a TI para resolver el problema
- Falta de trazabilidad de las firmas agregadas posteriormente

**Solución:** Sistema de firmas retroactivas con:
- ✅ Interfaz dedicada para gestionar checklists sin firma
- ✅ Proceso de autorización con justificación obligatoria
- ✅ Registro completo de auditoría
- ✅ Acceso restringido solo a personal de Soporte

## 🔐 Control de Acceso

### Roles Autorizados
- **Soporte (role_id: 2)** - Único rol con acceso a esta funcionalidad
- Descripción del rol: "Asistente de TI, acceso total y asigna permisos, como asistente de los admins"

### Restricciones
- Los administradores (role_id: 1) NO tienen acceso a esta sección
- Solo se pueden agregar firmas de usuarios con rol "Jefe de Operaciones" (role_id: 4)
- Cada acción queda registrada en el sistema de auditoría

## 🏗️ Arquitectura

### Backend

#### Controlador: `retroactiveSignatureController.js`
Ubicación: `server/src/controllers/retroactiveSignatureController.js`

**Endpoints:**

1. **GET /api/retroactive-signatures/unsigned-checklists**
   - Obtiene checklists completados sin firma de administrador
   - Filtros: startDate, endDate, checklistTypeId, premiseId
   - Respuesta: Lista de checklists con información detallada

2. **POST /api/retroactive-signatures/:checklist_id/sign**
   - Agrega firma retroactiva a un checklist
   - Body: `{ admin_user_id, justification, digital_token }`
   - Validaciones:
     - Justificación mínima de 10 caracteres
     - Usuario debe ser Jefe de Operaciones
     - Checklist no debe tener firma previa de administrador

3. **GET /api/retroactive-signatures/history**
   - Obtiene historial de firmas retroactivas
   - Parámetros: startDate, endDate, limit
   - Respuesta: Registros de auditoría formateados

4. **GET /api/retroactive-signatures/available-admins**
   - Lista de administradores disponibles para firmar
   - Filtro: Solo usuarios activos con role_id: 4

#### Rutas: `retroactiveSignatureRoutes.js`
Ubicación: `server/src/routes/retroactiveSignatureRoutes.js`

- Todas las rutas protegidas con `authenticateToken`
- Middleware adicional `authorizeRoles([2])` para restringir a Soporte

#### Integración en `index.js`
```javascript
const retroactiveSignatureRoutes = require("./routes/retroactiveSignatureRoutes");
app.use("/api/retroactive-signatures", retroactiveSignatureRoutes);
```

### Frontend

#### Componente: `RetroactiveSignatureManagement.jsx`
Ubicación: `client/src/components/admin/RetroactiveSignatureManagement.jsx`

**Características:**

1. **Tab "Checklists Sin Firma"**
   - Tabla con checklists pendientes
   - Filtros por fecha, tipo de checklist, sede
   - Botón "Agregar Firma" por cada checklist
   - Indicadores visuales del estado de firmas

2. **Tab "Historial"**
   - Registro completo de firmas retroactivas
   - Información de quién autorizó y justificación
   - Ordenado por fecha descendente

3. **Modal de Firma Retroactiva**
   - Selector de administrador
   - Campo de justificación (mínimo 10 caracteres)
   - Advertencia de auditoría
   - Validaciones en tiempo real

#### Integración en AdminDashboard
Ubicación: `client/src/app/AdminDashboard/page.js`

- Nueva pestaña "Firmas Retroactivas" con indicador visual
- Solo visible para usuarios con role_id: 2
- Icono distintivo con animación de alerta

## 📊 Modelo de Datos

### Tabla Utilizada: `checklist_signatures`

```javascript
{
  signature_id: INTEGER (PK),
  user_id: INTEGER (FK -> users),
  checklist_id: INTEGER (FK -> checklists),
  role_id: INTEGER (FK -> roles),
  signed_at: DATE,
  signed_by_name: STRING,
  signature_image: TEXT (null para firmas retroactivas),
  digital_token: TEXT (formato: "RETROACTIVE-{timestamp}")
}
```

### Tabla de Auditoría: `audits`

Cada firma retroactiva genera un registro:

```javascript
{
  action: "RETROACTIVE_SIGNATURE",
  table_name: "checklist_signatures",
  record_id: signature_id,
  changes: JSON.stringify({
    checklist_id,
    admin_user_id,
    admin_user_name,
    justification,
    authorized_by,
    authorized_at
  })
}
```

## 🔄 Flujo de Trabajo

### 1. Identificación de Checklists Sin Firma
```
Usuario Soporte → AdminDashboard → Tab "Firmas Retroactivas"
                                  ↓
                    GET /unsigned-checklists (con filtros)
                                  ↓
                    Sistema busca checklists sin firma de role_id: 4
                                  ↓
                    Muestra tabla con resultados
```

### 2. Agregar Firma Retroactiva
```
Usuario hace clic en "Agregar Firma"
                ↓
    Modal con selector de admin + justificación
                ↓
    Validaciones frontend (admin seleccionado, justificación >= 10 chars)
                ↓
    POST /:checklist_id/sign
                ↓
    Validaciones backend:
    - Checklist existe
    - No tiene firma previa de admin
    - Usuario seleccionado es Jefe de Operaciones
    - Justificación válida
                ↓
    Crear ChecklistSignature
                ↓
    Registrar en Audit
                ↓
    Respuesta exitosa → Recargar datos
```

### 3. Consulta de Historial
```
Usuario cambia a tab "Historial"
                ↓
    GET /history?limit=100
                ↓
    Sistema consulta tabla audits con action="RETROACTIVE_SIGNATURE"
                ↓
    Parsea JSON de changes
                ↓
    Muestra tabla formateada con:
    - Checklist ID
    - Admin que firmó
    - Justificación
    - Quién autorizó
    - Fecha
```

## 🎨 Interfaz de Usuario

### Diseño Visual

**Colores:**
- Header: Gradiente amarillo-naranja (alerta/advertencia)
- Botón agregar firma: Verde (acción positiva)
- Indicadores de estado:
  - Rojo: Sin firmas
  - Amarillo: Solo firma de técnico
  - Verde: Completado (no aparece en lista)

**Iconos:**
- 🔐 `fa-signature` - Firmas retroactivas
- ⚠️ `fa-exclamation-triangle` - Checklists sin firma
- 📜 `fa-history` - Historial
- 🛡️ `fa-shield-alt` - Acceso restringido
- ✅ `fa-check-circle` - Estado completado

### Responsive Design
- Tabla con scroll horizontal en móviles
- Grid de filtros adaptativo (1 columna en móvil, 4 en desktop)
- Botones con texto completo en desktop, iconos en móvil

## 🔒 Seguridad

### Validaciones Backend
1. **Autenticación:** Token JWT válido requerido
2. **Autorización:** Solo role_id: 2 puede acceder
3. **Validación de datos:**
   - Justificación mínima de 10 caracteres
   - Usuario admin debe existir y tener role_id: 4
   - Checklist no debe tener firma previa de admin
4. **Auditoría:** Todas las acciones registradas con:
   - Usuario que autorizó
   - IP de origen
   - Timestamp
   - Justificación completa

### Validaciones Frontend
1. Verificación de rol antes de mostrar pestaña
2. Validación de formulario antes de enviar
3. Confirmación visual de acciones
4. Mensajes de error descriptivos

## 📝 Registro de Auditoría

### Información Capturada
```json
{
  "checklist_id": 123,
  "admin_user_id": 45,
  "admin_user_name": "Juan Pérez",
  "justification": "El administrador estaba en reunión y no pudo firmar a tiempo",
  "authorized_by": "María Soporte",
  "authorized_at": "2026-05-05T10:30:00Z"
}
```

### Trazabilidad
- Cada firma retroactiva es rastreable
- No se puede modificar o eliminar el registro de auditoría
- Historial completo disponible para revisión

## 🚀 Despliegue

### Requisitos
1. Base de datos con tabla `audits` existente
2. Modelo `Audit` configurado en Sequelize
3. Middleware de autenticación y autorización funcionando
4. Frontend con acceso a variables de entorno (NEXT_PUBLIC_API_URL)

### Pasos de Instalación

1. **Backend:**
   ```bash
   # Los archivos ya están creados:
   # - server/src/controllers/retroactiveSignatureController.js
   # - server/src/routes/retroactiveSignatureRoutes.js
   # - Rutas agregadas en server/src/index.js
   
   # Reiniciar servidor
   npm run dev
   ```

2. **Frontend:**
   ```bash
   # El componente ya está creado:
   # - client/src/components/admin/RetroactiveSignatureManagement.jsx
   # - Integrado en client/src/app/AdminDashboard/page.js
   
   # Reiniciar cliente
   npm run dev
   ```

3. **Verificación:**
   - Iniciar sesión con usuario de Soporte (role_id: 2)
   - Navegar a AdminDashboard
   - Verificar que aparece la pestaña "Firmas Retroactivas"
   - Probar funcionalidad completa

## 🧪 Casos de Prueba

### Test 1: Acceso Restringido
- **Usuario:** Admin (role_id: 1)
- **Esperado:** No ver pestaña "Firmas Retroactivas"
- **Usuario:** Soporte (role_id: 2)
- **Esperado:** Ver pestaña con indicador visual

### Test 2: Listar Checklists Sin Firma
- **Acción:** Acceder a tab "Checklists Sin Firma"
- **Esperado:** Ver solo checklists sin firma de role_id: 4
- **Verificar:** Filtros funcionan correctamente

### Test 3: Agregar Firma Retroactiva
- **Acción:** Hacer clic en "Agregar Firma"
- **Pasos:**
  1. Seleccionar administrador
  2. Escribir justificación < 10 caracteres → Error
  3. Escribir justificación >= 10 caracteres → Éxito
- **Verificar:** 
  - Firma creada en BD
  - Registro en auditoría
  - Checklist desaparece de lista

### Test 4: Historial
- **Acción:** Cambiar a tab "Historial"
- **Esperado:** Ver todas las firmas retroactivas agregadas
- **Verificar:** Información completa y correcta

### Test 5: Validaciones
- **Caso 1:** Intentar firmar checklist ya firmado → Error
- **Caso 2:** Seleccionar usuario no-admin → Error
- **Caso 3:** Justificación vacía → Error
- **Caso 4:** Checklist inexistente → Error 404

## 📞 Soporte

### Problemas Comunes

**1. No aparece la pestaña "Firmas Retroactivas"**
- Verificar que el usuario tiene role_id: 2
- Revisar console.log del navegador
- Verificar token JWT válido

**2. Error al cargar checklists**
- Verificar conexión a API
- Revisar logs del servidor
- Verificar permisos de base de datos

**3. No se puede agregar firma**
- Verificar que el administrador seleccionado tiene role_id: 4
- Verificar que la justificación tiene al menos 10 caracteres
- Revisar que el checklist no tenga firma previa

## 🔄 Mantenimiento

### Limpieza de Datos
- El historial de auditoría crece con el tiempo
- Considerar política de retención de datos
- Implementar archivado de registros antiguos si es necesario

### Monitoreo
- Revisar periódicamente el uso de la funcionalidad
- Analizar justificaciones comunes para identificar problemas recurrentes
- Capacitar a administradores para evitar olvidos de firma

## 📈 Mejoras Futuras

1. **Notificaciones:**
   - Email al administrador cuando se agrega su firma retroactiva
   - Alerta al técnico que completó el checklist

2. **Reportes:**
   - Dashboard con estadísticas de firmas retroactivas
   - Gráficos de tendencias por sede/tipo de checklist

3. **Automatización:**
   - Recordatorios automáticos a administradores
   - Límite de tiempo para firmar antes de requerir proceso retroactivo

4. **Aprobación Multi-nivel:**
   - Requerir aprobación de supervisor para firmas retroactivas
   - Workflow de aprobación para casos especiales

## 📄 Licencia y Créditos

Desarrollado para el sistema Alist GBX - Plataforma de Control y Mantenimiento de Game Box

---

**Última actualización:** Mayo 5, 2026
**Versión:** 1.0.0
**Autor:** Sistema de Soporte TI
