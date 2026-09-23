# Design Document: Acceso Retroactivo para Administradores

## Overview

Esta feature permite a los administradores (`role_id = 1`) solicitar acceso retroactivo a checklists de fechas pasadas. El flujo pasa por un sistema de aprobación vía correo dirigido al técnico de sistemas (`sistemas2@recreatec.co`), quien aprueba con un clic sin necesidad de autenticarse. Al aprobar, el admin recibe un JWT de vida corta que le abre el modo retroactivo usando la infraestructura ya existente de `supportChecklistController`.

Se reutilizan deliberadamente:
- `supportChecklistController` — toda la lógica de creación, respuestas, firma y QR con fecha personalizable
- `emailConfig.js` — Nodemailer + Outlook SMTP ya configurado
- `JWT_KEY` + `jsonwebtoken` — mismo patrón de tokens del auth
- `crypto.randomUUID()` — nativo Node.js, sin dependencias nuevas

---

## Architecture

### Flujo completo

```
Admin (browser)
  │
  │  POST /api/retroactive-access/requests
  ▼
retroactiveAccessController.createRequest()
  │  persiste en retroactive_access_requests
  │  envía email a sistemas2@recreatec.co
  ▼
Email al técnico
  │  Botón "Aprobar" → GET /api/retroactive-access/review?token=<UUID>&action=approve
  │  Botón "Rechazar" → GET /api/retroactive-access/review?token=<UUID>&action=reject
  ▼
retroactiveAccessController.reviewRequest()  [sin auth, devuelve HTML]
  │  si approve: genera JWT, envía email al admin
  │  si reject: envía email al admin
  ▼
Email al admin
  │  Enlace → client: /AdminDashboard/retroactive-access?token=<JWT>
  ▼
AdminRetroactiveAccessPage (Next.js)
  │  valida JWT con POST /api/retroactive-access/validate-token
  │  muestra la UI del checklist según action_type
  │    access_existing → redirige al checklist existente
  │    create_new      → crea nuevo y redirige
  │  reutiliza las rutas /api/support/* ya existentes
  ▼
supportChecklistController (ya existente)
```

---

## Database Schema

### Nueva tabla: `retroactive_access_requests`

**Migración:** `20260810000000-create-retroactive-access-requests.js`

```sql
CREATE TABLE retroactive_access_requests (
  request_id         INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id      INT NOT NULL,           -- FK → users.user_id
  checklist_type_id  INT NOT NULL,           -- FK → checklist_types.checklist_type_id
  target_date        DATE NOT NULL,          -- fecha retroactiva solicitada
  action_type        ENUM('access_existing','create_new') NOT NULL,
  target_checklist_id INT NULL,              -- FK → checklists.checklist_id (solo si access_existing)
  justification      TEXT NOT NULL,
  status             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  request_token      VARCHAR(36) NOT NULL UNIQUE, -- UUID v4 para enlaces de correo
  approved_at        DATETIME NULL,
  rejected_at        DATETIME NULL,
  used_at            DATETIME NULL,          -- marcado cuando el admin ejecuta la primera acción
  checklist_id       INT NULL,               -- FK → checklists.checklist_id (checklist resultante)
  reviewer_ip        VARCHAR(45) NULL,       -- IP del técnico al revisar
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_rar_admin     FOREIGN KEY (admin_user_id)       REFERENCES users(user_id),
  CONSTRAINT fk_rar_type      FOREIGN KEY (checklist_type_id)   REFERENCES checklist_types(checklist_type_id),
  CONSTRAINT fk_rar_target    FOREIGN KEY (target_checklist_id) REFERENCES checklists(checklist_id),
  CONSTRAINT fk_rar_checklist FOREIGN KEY (checklist_id)        REFERENCES checklists(checklist_id)
);
```

### Modelo Sequelize: `RetroactiveAccessRequest`

**Archivo:** `server/src/models/retroactiveAccessRequest.js`

Asociaciones:
- `belongsTo(User, { foreignKey: 'admin_user_id', as: 'admin' })`
- `belongsTo(ChecklistType, { foreignKey: 'checklist_type_id', as: 'checklistType' })`
- `belongsTo(Checklist, { foreignKey: 'target_checklist_id', as: 'targetChecklist' })`
- `belongsTo(Checklist, { foreignKey: 'checklist_id', as: 'resultChecklist' })`

Se registra en `models/index.js` como los demás modelos.

---

## API Endpoints

### Nuevo router: `/api/retroactive-access`

**Archivo:** `server/src/routes/retroactiveAccessRoutes.js`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/requests` | `verifyToken + checkRole([1])` | Crear solicitud |
| `GET` | `/requests` | `verifyToken + checkRole([1,2])` | Listar solicitudes (historial) |
| `GET` | `/requests/:request_id` | `verifyToken + checkRole([1,2])` | Ver solicitud individual |
| `GET` | `/review` | **Sin auth** | Aprobar/rechazar desde email (`?token=UUID&action=approve\|reject`) |
| `POST` | `/validate-token` | `verifyToken + checkRole([1])` | Validar JWT retroactivo y retornar contexto |
| `GET` | `/existing-checklists` | `verifyToken + checkRole([1])` | Checklists existentes para fecha+tipo (para UI del formulario) |
| `POST` | `/requests/:request_id/resend` | `verifyToken + checkRole([1,2])` | Reenviar email de aprobación al admin (cuando falla) |

**Archivo:** `server/src/controllers/retroactiveAccessController.js`

---

## Controller: `retroactiveAccessController`

### `createRequest(req, res)`

```
Recibe: { checklist_type_id, target_date, action_type, target_checklist_id?, justification }

1. Validar campos obligatorios → HTTP 400
2. Validar target_date < hoy y >= hoy - 30 días → HTTP 400
3. Buscar ChecklistType → HTTP 400 si no existe
4. Validar justification (10-500 chars) → HTTP 400
5. Si action_type = 'access_existing':
   - Buscar checklist con target_checklist_id y checklist_type_id → HTTP 400 si no existe
6. Si action_type = 'create_new':
   - Buscar checklists del admin para ese tipo y fecha
   - Si existe alguno → HTTP 409 con lista de checklist_ids (para que reconsidere)
7. Verificar no hay solicitud pending para mismo admin+tipo+fecha+action_type → HTTP 409
8. Crear RetroactiveAccessRequest con:
   - request_token: crypto.randomUUID()
   - status: 'pending'
9. Enviar email al técnico (retroactiveAccessEmailService.sendRequestNotification)
10. Si email falla → HTTP 500 (solicitud guardada, notificación falló)
11. HTTP 201 con { request_id, status: 'pending' }
```

### `reviewRequest(req, res)`

```
Recibe: query params { token, action }  — SIN autenticación JWT

1. Buscar solicitud por request_token → HTML de error si no existe
2. Si status !== 'pending' → HTML de error "enlace ya utilizado"
3. Si action = 'approve':
   a. UPDATE status='approved', approved_at=NOW(), reviewer_ip=req.ip
   b. Generar JWT retroactivo (24h):
      { type:'retroactive-access', request_id, admin_user_id, checklist_type_id,
        target_date, action_type, target_checklist_id }
   c. Enviar email al admin con el JWT
   d. Retornar HTML de confirmación "Solicitud aprobada"
4. Si action = 'reject':
   a. UPDATE status='rejected', rejected_at=NOW(), reviewer_ip=req.ip
   b. Enviar email al admin notificando rechazo
   c. Retornar HTML de confirmación "Solicitud rechazada"
5. Si action inválido → HTML de error
```

### `validateToken(req, res)`

```
Recibe: { retroactive_token }  — requiere auth JWT normal del admin

1. Verificar firma del retroactive_token con JWT_KEY → HTTP 401
2. Verificar type = 'retroactive-access' → HTTP 401
3. Verificar no expirado → HTTP 401
4. Verificar admin_user_id activo con role_id=1 → HTTP 401
5. Buscar solicitud por request_id:
   - status = 'approved' → ok
   - used_at = NULL → ok (token no usado aún)
   → HTTP 401 con mensaje específico si falla
6. HTTP 200 con contexto:
   { checklist_type_id, target_date, action_type, target_checklist_id,
     admin_user_id, request_id, checklistType: { nombre, categoría } }
```

### `getExistingChecklists(req, res)`

```
Recibe: query { checklist_type_id, target_date }

1. Buscar checklists donde:
   - checklist_type_id = param
   - DATE(createdAt) = target_date
   - created_by = req.user.user_id (admin)
2. Ordenar: incompletos primero (signatures.length < required), luego por createdAt DESC
3. Retornar lista con: checklist_id, createdAt, response_count, signatures, is_complete
```

### `getRequests(req, res)`

```
Filtros opcionales: status, date_from, date_to
Si role_id = 1: solo solicitudes del propio admin
Si role_id = 2: todas las solicitudes
Incluye: admin (user_name, email), checklistType (name)
Orden: created_at DESC
```

---

## Email Service

**Archivo:** `server/src/services/retroactiveAccessEmailService.js`

Usa el `createTransporter()` de `emailConfig.js`.

### `sendRequestNotification(request, admin, checklistType)`

Envía a `sistemas2@recreatec.co`. HTML estructurado con:
- Datos de la solicitud (admin, fecha, tipo, action_type, justificación)
- Si `access_existing`: muestra el ID y datos del checklist a retomar
- Dos botones CTA:
  - 🟢 **Aprobar** → `${SERVER_URL}/api/retroactive-access/review?token=${request_token}&action=approve`
  - 🔴 **Rechazar** → `${SERVER_URL}/api/retroactive-access/review?token=${request_token}&action=reject`

### `sendApprovalToAdmin(admin, request, checklistType, accessToken)`

Envía al `admin.user_email`. HTML con:
- ✅ Solicitud aprobada
- Fecha autorizada, tipo de checklist, acción aprobada
- Enlace de acceso: `${CLIENT_URL}/AdminDashboard?tab=retroactive-access&token=${accessToken}`
- Hora de expiración (24h desde ahora)
- Advertencia de un solo uso

### `sendRejectionToAdmin(admin, request, checklistType)`

Envía al `admin.user_email`. HTML con:
- ❌ Solicitud rechazada
- Fecha solicitada y tipo de checklist
- Invitación a crear una nueva solicitud con más detalle en la justificación

---

## HTML Response Pages (review endpoint)

El endpoint `/review` no redirige al cliente Next.js — devuelve HTML directamente desde Express para funcionar sin sesión. Tres páginas:

1. **Aprobado** — Fondo verde, checkmark, "La solicitud fue aprobada. El administrador recibirá el enlace de acceso."
2. **Rechazado** — Fondo rojo, X, "La solicitud fue rechazada. El administrador recibirá la notificación."
3. **Error/Inválido** — Fondo gris, "Este enlace ya fue utilizado o no es válido."

---

## Client — Nuevos archivos

### Página de solicitud: `client/src/app/AdminDashboard/retroactive-access/page.jsx`

Esta ruta sirve dos propósitos según si viene con `?token=<JWT>` en la URL:

**Sin token** → Formulario de solicitud:
```
Paso 1: Selector tipo de checklist + fecha (max hoy-1, min hoy-30)
Paso 2 (tras seleccionar): Consulta /existing-checklists y muestra lista
        → Opción A: "Retomar existente" (seleccionar de lista)
        → Opción B: "Crear nuevo"
Paso 3: Justificación (textarea 10-500 chars, contador)
Paso 4: Submit → confirmación "Solicitud enviada, pendiente de aprobación"
Historial: tabla de solicitudes propias con estado y fecha
```

**Con token** → Página de acceso retroactivo:
```
1. POST /validate-token con el JWT
2. Si válido: muestra banner retroactivo con fecha autorizada
3. Si action_type = 'access_existing':
   → POST /api/support/checklists/:target_checklist_id/access
   → Navegar al checklist (igual que SupportChecklistManagement.navigateToChecklist)
4. Si action_type = 'create_new':
   → POST /api/support/checklists/type/:checklist_type_id/create
   → Navegar al checklist recién creado
5. El support_context en sessionStorage se llena igual que en modo soporte
```

### Componente de formulario: `client/src/components/admin/RetroactiveAccessRequest.jsx`

Componente extraído para mantener la página liviana. Maneja los 3 pasos del formulario.

### Integración en AdminDashboard

**Archivo:** `client/src/app/AdminDashboard/page.js`

Dos cambios:
1. Agregar tab `retroactive-access` visible **solo para `role_id = 1`** (admins):
   ```js
   if (userRoleId === 1) {
     return [...baseTabs, 'retroactive-access'];
   }
   ```
2. Agregar `case 'retroactive-access'` en `renderContent()` con import del nuevo componente.

---

## Token JWT Retroactivo

**Payload:**
```json
{
  "type": "retroactive-access",
  "request_id": 42,
  "admin_user_id": 7,
  "checklist_type_id": 3,
  "target_date": "2026-08-05",
  "action_type": "create_new",
  "target_checklist_id": null,
  "iat": 1723123456,
  "exp": 1723209856
}
```

**Firmado con:** `process.env.JWT_KEY` (mismo que el auth normal)  
**Expiración:** `'24h'`  
**Diferenciador:** campo `type = 'retroactive-access'` — el middleware `verifyToken` normal no lo acepta como auth de sesión porque solo decodifica el token del header `Authorization`, este va como parámetro de body.

---

## Registro en `server/src/index.js`

```js
const retroactiveAccessRoutes = require("./routes/retroactiveAccessRoutes");
// ...
app.use("/api/retroactive-access", retroactiveAccessRoutes);
```

## Registro en `server/src/models/index.js`

```js
const RetroactiveAccessRequestModel = require("./retroactiveAccessRequest.js");
// ...
const RetroactiveAccessRequest = RetroactiveAccessRequestModel(connection, DataTypes);
// Agregar a models {} y exports
```

---

## Variables de Entorno necesarias

Nuevas (agregar a `.env`):
```
SERVER_URL=https://192.168.57.96:8080  # URL base del servidor para links en emails
CLIENT_URL=https://192.168.57.96       # URL base del cliente para links en emails
```

Ya existentes (se reutilizan):
```
EMAIL_USER      # remitente Outlook
APP_PASSWORD    # contraseña de app Outlook
JWT_KEY         # clave de firma JWT
```

---

## Archivos a crear / modificar

### Nuevos (servidor)
| Archivo | Descripción |
|---------|-------------|
| `server/src/migrations/20260810000000-create-retroactive-access-requests.js` | Migración de la nueva tabla |
| `server/src/models/retroactiveAccessRequest.js` | Modelo Sequelize |
| `server/src/controllers/retroactiveAccessController.js` | Toda la lógica de negocio |
| `server/src/routes/retroactiveAccessRoutes.js` | Definición de rutas |
| `server/src/services/retroactiveAccessEmailService.js` | Templates y envío de emails |

### Modificados (servidor)
| Archivo | Cambio |
|---------|--------|
| `server/src/models/index.js` | Registrar `RetroactiveAccessRequest` |
| `server/src/index.js` | Montar `/api/retroactive-access` |

### Nuevos (cliente)
| Archivo | Descripción |
|---------|-------------|
| `client/src/app/AdminDashboard/retroactive-access/page.jsx` | Página dual (formulario + acceso con token) |
| `client/src/components/admin/RetroactiveAccessRequest.jsx` | Componente del formulario en 3 pasos |

### Modificados (cliente)
| Archivo | Cambio |
|---------|--------|
| `client/src/app/AdminDashboard/page.js` | Agregar tab + case para `role_id = 1` |

---

## Flujo de Trazabilidad Completa

```
retroactive_access_requests
  ├── request_id       → identificador único
  ├── admin_user_id    → quién solicitó
  ├── checklist_type_id
  ├── target_date      → fecha retroactiva pedida
  ├── action_type      → qué quería hacer
  ├── target_checklist_id → checklist específico (si access_existing)
  ├── justification    → por qué lo pidió
  ├── status           → pending / approved / rejected
  ├── request_token    → UUID usado en links del email
  ├── created_at       → cuándo lo pidió
  ├── approved_at      → cuándo fue aprobado
  ├── rejected_at      → cuándo fue rechazado
  ├── reviewer_ip      → desde dónde aprobó/rechazó el técnico
  ├── used_at          → cuándo el admin lo usó (primera acción)
  └── checklist_id     → checklist que resultó de la operación

checklists (ya existente)
  ├── created_by_support = true  → marcado en operación retroactiva
  └── support_notes              → "Acceso retroactivo autorizado. request_id=42, action=create_new, approved=2026-08-05T14:30:00"

checklist_signatures (ya existente)
  └── digital_token = "RETROACTIVE-42-<firma_base64>"
```
