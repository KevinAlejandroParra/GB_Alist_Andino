# Requirements Document

## Introduction

Esta funcionalidad permite a los administradores de la plataforma Alist Andino completar el proceso de checklists (respuestas, firma y escaneo QR) con fecha retroactiva, cuando por algún motivo no pudieron hacerlo en el día correspondiente. El flujo requiere aprobación previa del técnico de sistemas antes de conceder el acceso, garantizando trazabilidad completa de cada operación.

La feature aprovecha el sistema de soporte existente (`supportChecklistController`, `retroactiveSignatureController`) y la infraestructura de correo con Nodemailer + Outlook SMTP (`emailConfig.js`) ya configurada en el servidor.

## Glossary

- **Administrador**: Usuario con `role_id = 1`. Puede solicitar acceso retroactivo para completar checklists de días pasados.
- **Técnico_de_Sistemas**: Usuario fijo con correo `sistemas2@recreatec.co`. Es quien aprueba o rechaza las solicitudes de acceso retroactivo.
- **Solicitud_Retroactiva**: Registro en base de datos que captura la petición del administrador (fecha, checklist, justificación, tipo de acción y estado).
- **Token_de_Acceso**: JWT de vida corta (máximo 24 horas) firmado con `JWT_KEY` que autoriza al Administrador a operar en modo retroactivo sobre un checklist específico.
- **Modo_Retroactivo**: Estado de operación en que el Administrador completa un checklist con fecha pasada, usando la infraestructura del `supportChecklistController` existente.
- **action_type**: Campo de la Solicitud_Retroactiva que distingue entre `'access_existing'` (acceder a un checklist ya creado e incompleto) y `'create_new'` (crear un checklist nuevo desde cero para esa fecha).
- **Checklist_Incompleto**: Checklist existente en BD para el `checklist_type_id` y `target_date` solicitados que no tiene todas las firmas requeridas o tiene respuestas pendientes.
- **Email_Service**: Módulo que usa Nodemailer con el transportador Outlook SMTP configurado en `emailConfig.js` (host: `smtp-mail.outlook.com`, port: 587).
- **Sistema**: El servidor Node.js + Express de la plataforma Alist Andino.
- **Plataforma**: La aplicación web compuesta por el servidor Node.js y el cliente Next.js.

---

## Requirements

### Requisito 1: Solicitud de Acceso Retroactivo

**User Story:** Como Administrador, quiero solicitar acceso retroactivo para una fecha pasada indicando si quiero retomar un checklist que dejé incompleto o crear uno nuevo, para poder completar el proceso que no pude realizar en su momento.

#### Criterios de Aceptación

1. WHEN el Administrador envía una solicitud retroactiva, THE Sistema SHALL persistir la solicitud con los campos: `admin_user_id`, `checklist_type_id`, `target_date`, `action_type` (`'access_existing'` o `'create_new'`), `target_checklist_id` (solo cuando `action_type = 'access_existing'`), `justification`, `status = 'pending'`, `created_at`, y `request_token` (UUID único).
2. IF `target_date` no es anterior a la fecha actual del servidor, THEN THE Sistema SHALL rechazar la solicitud con HTTP 400 y un mensaje descriptivo.
3. IF `target_date` es anterior a 30 días naturales respecto a la fecha actual del servidor, THEN THE Sistema SHALL rechazar la solicitud con HTTP 400 y un mensaje descriptivo.
4. IF `checklist_type_id` no existe en la tabla `checklist_types`, THEN THE Sistema SHALL rechazar la solicitud con HTTP 400 y un mensaje descriptivo.
5. IF `justification` tiene menos de 10 o más de 500 caracteres, THEN THE Sistema SHALL rechazar la solicitud con HTTP 400 y un mensaje descriptivo.
6. IF `action_type = 'access_existing'` y `target_checklist_id` no es provisto o no corresponde a un checklist existente del `checklist_type_id` indicado, THEN THE Sistema SHALL rechazar la solicitud con HTTP 400 y un mensaje descriptivo.
7. IF `action_type = 'create_new'` y ya existe un checklist para el mismo `checklist_type_id` y `target_date` con `created_by = admin_user_id`, THEN THE Sistema SHALL advertir al Administrador con HTTP 409 e incluir el `checklist_id` del existente, para que considere usar `action_type = 'access_existing'` en su lugar.
8. IF el Administrador tiene una solicitud con `status = 'pending'` para el mismo `checklist_type_id`, `target_date` y `action_type`, THEN THE Sistema SHALL rechazar la nueva solicitud con HTTP 409 y un mensaje descriptivo.
9. WHEN la solicitud es persistida exitosamente, THE Sistema SHALL retornar al Administrador un código HTTP 201 con el `request_id` y el `status`.

---

### Requisito 2: Notificación de Solicitud al Técnico de Sistemas

**User Story:** Como Técnico de Sistemas, quiero recibir un correo de notificación cada vez que un Administrador solicita acceso retroactivo, para poder revisar y decidir si lo apruebo o rechazo.

#### Criterios de Aceptación

1. WHEN una Solicitud_Retroactiva es persistida con `status = 'pending'`, THE Email_Service SHALL enviar un correo al destinatario `sistemas2@recreatec.co` usando el transportador Outlook SMTP configurado en `emailConfig.js`.
2. WHEN el Email_Service compone el cuerpo del correo, THE Email_Service SHALL incluir: nombre del administrador solicitante, fecha objetivo (`target_date` en formato YYYY-MM-DD), nombre del tipo de checklist, tipo de acción solicitada (`action_type`), el `checklist_id` destino si `action_type = 'access_existing'`, y la justificación ingresada.
3. THE Email_Service SHALL incluir en el correo dos botones de acción: uno para aprobar y otro para rechazar, cada uno con una URL que apunte al endpoint de aprobación/rechazo del servidor, incluyendo el `request_token` y la acción (`approve` o `reject`) como parámetros de la URL.
4. IF el Email_Service falla al enviar el correo de notificación, THEN THE Sistema SHALL mantener la Solicitud_Retroactiva con `status = 'pending'` y retornar al Administrador un HTTP 500 indicando que la solicitud fue guardada pero la notificación falló.
5. THE Email_Service SHALL usar como remitente el valor configurado en la variable de entorno `EMAIL_USER` con el alias `"Alist GBX"`.

---

### Requisito 3: Aprobación o Rechazo por el Técnico de Sistemas

**User Story:** Como Técnico de Sistemas, quiero aprobar o rechazar una solicitud con un solo clic desde el correo recibido, para agilizar el proceso sin necesidad de iniciar sesión.

#### Criterios de Aceptación

1. WHEN el Técnico_de_Sistemas hace clic en el enlace de aprobación del correo, THE Sistema SHALL verificar que el `request_token` del parámetro de URL corresponde a una Solicitud_Retroactiva con `status = 'pending'`.
2. WHEN la verificación del `request_token` es exitosa y la acción es aprobar, THE Sistema SHALL actualizar el `status` de la Solicitud_Retroactiva a `'approved'` y registrar `approved_at` con la fecha y hora actuales del servidor.
3. WHEN la verificación del `request_token` es exitosa y la acción es rechazar, THE Sistema SHALL actualizar el `status` de la Solicitud_Retroactiva a `'rejected'` y registrar `rejected_at` con la fecha y hora actuales del servidor.
4. IF el `request_token` no existe o corresponde a una solicitud con `status` diferente de `'pending'`, THEN THE Sistema SHALL retornar una página HTML con un mensaje de error claro indicando que el enlace es inválido o ya fue utilizado.
5. WHEN la acción de aprobación o rechazo es procesada, THE Sistema SHALL retornar al Técnico_de_Sistemas una página HTML de confirmación indicando el resultado de la operación, sin requerir autenticación.
6. THE Sistema SHALL procesar cada `request_token` de aprobación o rechazo exactamente una vez; los usos posteriores del mismo enlace SHALL ser rechazados con un mensaje indicando que la acción ya fue ejecutada.

---

### Requisito 4: Notificación al Administrador con Token de Acceso

**User Story:** Como Administrador, quiero recibir un correo con un enlace de acceso temporal una vez que mi solicitud sea aprobada, para poder completar el checklist retroactivo directamente desde ese correo.

#### Criterios de Aceptación

1. WHEN una Solicitud_Retroactiva es actualizada a `status = 'approved'`, THE Email_Service SHALL generar un Token_de_Acceso JWT firmado con `JWT_KEY` que contenga: `request_id`, `admin_user_id`, `checklist_type_id`, `target_date`, `action_type`, `target_checklist_id` (si aplica), y `type = 'retroactive-access'`.
2. WHEN el Token_de_Acceso es generado, THE Email_Service SHALL configurarlo con una expiración de 24 horas desde el momento de la aprobación.
3. WHEN el Token_de_Acceso es generado, THE Email_Service SHALL enviar un correo al `user_email` del Administrador solicitante con el enlace de acceso que incluya el Token_de_Acceso como parámetro de URL.
4. WHEN el correo de aprobación es compuesto, THE Email_Service SHALL incluir: la fecha objetivo autorizada, el nombre del tipo de checklist, el tipo de acción aprobada, y la hora de expiración del enlace.
5. IF el Email_Service falla al enviar el correo al Administrador, THEN THE Sistema SHALL registrar el evento de fallo de forma persistente y la Solicitud_Retroactiva SHALL permanecer con `status = 'approved'` para permitir un reenvío manual.
6. WHEN una Solicitud_Retroactiva es actualizada a `status = 'rejected'`, THE Email_Service SHALL enviar un correo al `user_email` del Administrador indicando el rechazo, la fecha objetivo solicitada y el nombre del tipo de checklist.
7. IF el Token_de_Acceso ha expirado al momento en que el Administrador lo presenta, THEN THE Sistema SHALL retornar HTTP 401 con un mensaje indicando que el enlace de acceso ha expirado y que debe generar una nueva solicitud.

---

### Requisito 5: Validación del Token de Acceso Retroactivo

**User Story:** Como Administrador, quiero que la plataforma valide mi token de acceso antes de mostrarme la interfaz retroactiva, para asegurarme de que el acceso es legítimo y corresponde a lo que solicité.

#### Criterios de Aceptación

1. WHEN el Administrador accede a la URL de acceso retroactivo con el Token_de_Acceso, THE Sistema SHALL verificar la firma del JWT usando `JWT_KEY`.
2. THE Sistema SHALL verificar que el campo `type` del JWT sea igual a `'retroactive-access'`.
3. THE Sistema SHALL verificar que el JWT no haya expirado en el momento de la solicitud.
4. THE Sistema SHALL verificar que el `admin_user_id` del JWT corresponda a un usuario activo con `role_id = 1` en la tabla `users`.
5. THE Sistema SHALL verificar que la Solicitud_Retroactiva referenciada por `request_id` tenga `status = 'approved'` y `used_at` igual a `NULL`.
6. IF alguna de las validaciones anteriores falla, THEN THE Sistema SHALL retornar un código HTTP 401 con un mensaje descriptivo del motivo del fallo.
7. WHEN todas las validaciones son exitosas, THE Sistema SHALL retornar al cliente el contexto de acceso: `checklist_type_id`, `target_date`, `action_type`, `target_checklist_id` (si aplica), `admin_user_id`, y los datos del tipo de checklist.

---

### Requisito 6: Ejecución del Flujo Retroactivo

**User Story:** Como Administrador con token de acceso aprobado, quiero poder completar el checklist con fecha retroactiva incluyendo respuestas, firma y escaneo QR, como si fuera el día correspondiente.

#### Criterios de Aceptación

1. WHEN el Token_de_Acceso tiene `action_type = 'create_new'`, THE Sistema SHALL delegar la creación a `supportChecklistController.createChecklistAsUser`, usando el `admin_user_id` como `impersonate_user_id` y `target_date` como `checklist_date`.
2. WHEN el Token_de_Acceso tiene `action_type = 'access_existing'`, THE Sistema SHALL delegar el acceso a `supportChecklistController.accessChecklistAsUser`, usando el `target_checklist_id` y el `admin_user_id` como `impersonate_user_id`.
3. WHEN el Administrador envía respuestas al checklist, THE Sistema SHALL delegar la operación a `supportChecklistController.submitResponsesAsUser` usando el `admin_user_id` como `impersonate_user_id`.
4. WHEN el Administrador firma el checklist, THE Sistema SHALL delegar la operación a `supportChecklistController.signChecklistAsUser` usando el `admin_user_id` como `impersonate_user_id` y `target_date` como `signed_at`.
5. WHEN el Administrador escanea un código QR, THE Sistema SHALL delegar la operación a `supportChecklistController.scanQrCodeAsUser` usando el `admin_user_id` como `impersonate_user_id` y `target_date` como `scanned_at`.
6. THE Sistema SHALL registrar en el campo `support_notes` del checklist que la operación fue ejecutada como acceso retroactivo autorizado, incluyendo el `request_id`, el `action_type` y la fecha de aprobación.
7. WHEN el Administrador completa la primera operación del flujo retroactivo (acceso o creación), THE Sistema SHALL actualizar el campo `used_at` de la Solicitud_Retroactiva con la fecha y hora actuales del servidor.

---

### Requisito 7: Unicidad del Uso del Token de Acceso

**User Story:** Como operador del sistema, quiero que cada token de acceso retroactivo sea de un solo uso, para evitar que se completen múltiples checklists retroactivos con una sola aprobación.

#### Criterios de Aceptación

1. WHEN el Administrador completa exitosamente la creación del checklist retroactivo (primera operación del flujo), THE Sistema SHALL marcar la Solicitud_Retroactiva con `used_at = NOW()`.
2. IF el Administrador intenta usar el mismo Token_de_Acceso para crear un nuevo checklist retroactivo después de que `used_at` ya tiene valor, THEN THE Sistema SHALL rechazar la solicitud con código HTTP 409 y el mensaje "Este token de acceso ya fue utilizado".
3. IF el Token_de_Acceso ha expirado (más de 24 horas desde la aprobación), THEN THE Sistema SHALL rechazar la solicitud con código HTTP 401 y el mensaje "El enlace de acceso ha expirado".
4. THE Sistema SHALL permitir que el Administrador continúe las operaciones del flujo (respuestas, firma, QR) sobre el checklist ya creado con el mismo token, verificando que el `checklist_id` corresponda al creado en la misma sesión retroactiva.

---

### Requisito 8: Trazabilidad y Auditoría

**User Story:** Como operador del sistema, quiero que todas las operaciones del flujo retroactivo queden registradas con información de quién hizo qué y cuándo, para poder auditar cualquier uso de este mecanismo.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar en la tabla `retroactive_access_requests` los campos de trazabilidad: `request_id`, `admin_user_id`, `checklist_type_id`, `target_date`, `action_type`, `target_checklist_id` (nullable), `justification`, `status`, `request_token`, `created_at`, `approved_at`, `rejected_at`, `used_at`, `checklist_id` (del checklist accedido o creado), y `reviewer_ip`.
2. WHEN un checklist es creado o accedido en modo retroactivo, THE Sistema SHALL asignar `created_by_support = true` y registrar en `support_notes` el `request_id` y el `action_type` de la Solicitud_Retroactiva.
3. WHEN se agrega una firma en modo retroactivo, THE Sistema SHALL registrar en el campo `digital_token` de `checklist_signatures` el prefijo `"RETROACTIVE-"` seguido del `request_id`.
4. WHEN un usuario con `role_id = 1` o `role_id = 2` consulta el historial de solicitudes retroactivas, THE Sistema SHALL retornar todos los campos de la tabla `retroactive_access_requests` ordenados por `created_at` descendente.
5. WHEN el Técnico_de_Sistemas aprueba o rechaza una solicitud, THE Sistema SHALL registrar la dirección IP de la petición HTTP en el campo `reviewer_ip` de la Solicitud_Retroactiva.

---

### Requisito 9: Interfaz de Solicitud en el Cliente

**User Story:** Como Administrador, quiero acceder a un formulario en la plataforma donde pueda ver si hay checklists incompletos de la fecha que necesito y decidir si retomo uno existente o creo uno nuevo, sin tener que salir de la aplicación.

#### Criterios de Aceptación

1. THE Plataforma SHALL proveer una ruta de cliente accesible únicamente para usuarios autenticados con `role_id = 1` donde el Administrador pueda crear una Solicitud_Retroactiva.
2. WHEN el Administrador selecciona una fecha y un tipo de checklist en el formulario, THE Plataforma SHALL consultar la API y mostrar la lista de checklists existentes para esa combinación, ordenados por incompletos primero, indicando para cada uno su `checklist_id`, fecha de creación, cantidad de respuestas registradas y firmas faltantes.
3. WHEN la lista consultada tiene resultados, THE Plataforma SHALL presentar dos opciones claras: "Retomar checklist existente" (seleccionando uno de la lista) o "Crear uno nuevo".
4. WHEN la lista consultada no tiene resultados, THE Plataforma SHALL mostrar únicamente la opción "Crear uno nuevo" y deshabilitar la opción de acceso a existente.
5. WHEN el Administrador accede al formulario de solicitud, THE Plataforma SHALL mostrar un selector de fecha que solo permita seleccionar fechas anteriores al día actual y no anteriores a 30 días.
6. WHEN el Administrador envía el formulario, THE Plataforma SHALL mostrar un mensaje de confirmación indicando que la solicitud fue enviada y está pendiente de aprobación.
7. IF el servidor retorna un error de solicitud duplicada (HTTP 409), THEN THE Plataforma SHALL mostrar al Administrador un mensaje indicando que ya existe una solicitud pendiente para ese checklist y fecha.
8. THE Plataforma SHALL proveer una vista de historial de solicitudes retroactivas del Administrador, mostrando el `action_type`, el estado (`pending`, `approved`, `rejected`) y la fecha de cada solicitud.
