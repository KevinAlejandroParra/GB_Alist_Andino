const { createTransporter } = require('../config/emailConfig');

const SERVER_URL = (process.env.SERVER_URL || 'https://192.168.57.96:8080').replace(/\/$/, '');
const CLIENT_URL = (process.env.CLIENT_URL || 'https://192.168.57.96').replace(/\/$/, '');
const FROM_ALIAS = `"Alist GBX" <${process.env.EMAIL_USER}>`;
const TECH_EMAIL = 'sistemas2@recreatec.co';

// ─── helpers de formato ───────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const formatDateTime = (date) =>
  new Date(date).toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const actionLabel = (action_type) =>
  action_type === 'access_existing' ? '📂 Retomar checklist existente' : '➕ Crear nuevo checklist';

// ─── base HTML wrapper ────────────────────────────────────────────────────────

const htmlWrapper = (title, accentColor, bodyContent) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${accentColor};padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                ⏪ Alist Andino — Acceso Retroactivo
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f8;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este correo fue generado automáticamente por el sistema Alist GBX.<br/>
                Por favor no responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:14px;width:180px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;

const ctaButton = (href, bgColor, label) => `
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:${bgColor};
     color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;
     font-weight:700;margin:0 8px;">${label}</a>`;

// ─── 1. Notificación al técnico ───────────────────────────────────────────────

/**
 * Envía el correo al técnico de sistemas con botones aprobar/rechazar.
 */
const sendRequestNotification = async (request, admin, checklistType) => {
  const approveUrl = `${SERVER_URL}/api/retroactive-access/review?token=${request.request_token}&action=approve`;
  const rejectUrl  = `${SERVER_URL}/api/retroactive-access/review?token=${request.request_token}&action=reject`;

  const existingChecklistInfo = request.action_type === 'access_existing' && request.target_checklist_id
    ? infoRow('Checklist a retomar', `#${request.target_checklist_id}`)
    : '';

  const body = `
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:18px;">Nueva solicitud de acceso retroactivo</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Un administrador requiere tu aprobación para completar un checklist con fecha pasada.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%"
           style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow('Administrador', admin.user_name)}
        ${infoRow('Correo', admin.user_email)}
        ${infoRow('Fecha objetivo', formatDate(request.target_date))}
        ${infoRow('Tipo de checklist', checklistType.name)}
        ${infoRow('Acción solicitada', actionLabel(request.action_type))}
        ${existingChecklistInfo}
        ${infoRow('Solicitado el', formatDateTime(request.createdAt))}
      </tbody>
    </table>

    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;
                padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400e;">📝 Justificación del administrador:</p>
      <p style="margin:0;font-size:14px;color:#78350f;">${request.justification}</p>
    </div>

    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
                padding:12px 16px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#b91c1c;">
        ⚠️ Solo debes aprobar si estás seguro de que el administrador tenía una razón válida
        para no haber completado el checklist en la fecha indicada.
      </p>
    </div>

    <div style="text-align:center;">
      ${ctaButton(approveUrl, '#16a34a', '✅ Aprobar solicitud')}
      ${ctaButton(rejectUrl, '#dc2626', '❌ Rechazar solicitud')}
    </div>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Cada enlace es de un solo uso. Si ya fue utilizado, verás un mensaje informativo.
    </p>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM_ALIAS,
    to: TECH_EMAIL,
    subject: `[Alist] Solicitud de acceso retroactivo — ${admin.user_name} | ${formatDate(request.target_date)}`,
    html: htmlWrapper('Solicitud de Acceso Retroactivo', '#7c3aed', body),
  });
};

// ─── 2. Aprobación al administrador ──────────────────────────────────────────

/**
 * Envía el JWT de acceso al administrador tras aprobación.
 */
const sendApprovalToAdmin = async (admin, request, checklistType, accessToken) => {
  const accessUrl = `${CLIENT_URL}/AdminDashboard?tab=retroactive-access&token=${accessToken}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const existingChecklistInfo = request.action_type === 'access_existing' && request.target_checklist_id
    ? infoRow('Checklist a retomar', `#${request.target_checklist_id}`)
    : '';

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;background:#dcfce7;
                  border-radius:50%;line-height:64px;font-size:32px;">✅</div>
      <h2 style="margin:12px 0 4px;color:#166534;font-size:20px;">¡Solicitud aprobada!</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">
        Tu solicitud de acceso retroactivo fue autorizada por el técnico de sistemas.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%"
           style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow('Fecha autorizada', formatDate(request.target_date))}
        ${infoRow('Tipo de checklist', checklistType.name)}
        ${infoRow('Acción aprobada', actionLabel(request.action_type))}
        ${existingChecklistInfo}
        ${infoRow('Enlace válido hasta', formatDateTime(expiresAt))}
      </tbody>
    </table>

    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;
                padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#854d0e;">
        ⚠️ <strong>El enlace es de un solo uso y expira en 24 horas.</strong>
        No lo compartas con nadie. Al hacer clic, se iniciará el proceso retroactivo directamente.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:16px;">
      ${ctaButton(accessUrl, '#7c3aed', '⏪ Acceder al checklist retroactivo')}
    </div>

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      Si el enlace expiró, puedes crear una nueva solicitud desde el panel de administración.
    </p>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM_ALIAS,
    to: admin.user_email,
    subject: `[Alist] ✅ Acceso retroactivo aprobado — ${checklistType.name} | ${formatDate(request.target_date)}`,
    html: htmlWrapper('Acceso Retroactivo Aprobado', '#16a34a', body),
  });
};

// ─── 3. Rechazo al administrador ─────────────────────────────────────────────

/**
 * Notifica al administrador que su solicitud fue rechazada.
 */
const sendRejectionToAdmin = async (admin, request, checklistType) => {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;background:#fee2e2;
                  border-radius:50%;line-height:64px;font-size:32px;">❌</div>
      <h2 style="margin:12px 0 4px;color:#991b1b;font-size:20px;">Solicitud rechazada</h2>
      <p style="margin:0;color:#6b7280;font-size:14px;">
        Tu solicitud de acceso retroactivo no fue aprobada por el técnico de sistemas.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%"
           style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow('Fecha solicitada', formatDate(request.target_date))}
        ${infoRow('Tipo de checklist', checklistType.name)}
        ${infoRow('Acción solicitada', actionLabel(request.action_type))}
        ${infoRow('Rechazado el', formatDateTime(new Date()))}
      </tbody>
    </table>

    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
                padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#7f1d1d;">
        Si crees que fue un error o tienes una justificación más detallada, puedes
        enviar una nueva solicitud desde el panel de administración.
      </p>
    </div>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM_ALIAS,
    to: admin.user_email,
    subject: `[Alist] ❌ Acceso retroactivo rechazado — ${checklistType.name} | ${formatDate(request.target_date)}`,
    html: htmlWrapper('Acceso Retroactivo Rechazado', '#dc2626', body),
  });
};

module.exports = {
  sendRequestNotification,
  sendApprovalToAdmin,
  sendRejectionToAdmin,
};
