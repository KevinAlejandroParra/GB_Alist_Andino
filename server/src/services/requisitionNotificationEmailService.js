'use strict';

const path = require('path');
const fs = require('fs');
const { createTransporter } = require('../config/emailConfig');
const { resolveLocalEvidencePath } = require('../config/multerConfig');

const escapeHtml = (value) => String(value ?? 'No especificado')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const row = (label, value) => `<tr><th style="text-align:left;padding:10px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;width:210px">${escapeHtml(label)}</th><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td></tr>`;

async function sendRequisitionNotification(requisition) {
  const requester = requisition.requester || {};
  const workOrder = requisition.workOrder || {};
  const failure = workOrder.failureOrder || {};
  const premise = requester.premise?.premise_name || requester.entity?.premise?.premise_name;
  const entity = requester.entity?.entity_name;
  const attachmentPath = resolveLocalEvidencePath(requisition.image_url);
  const attachments = attachmentPath && fs.existsSync(attachmentPath) ? [{
    filename: path.basename(attachmentPath),
    path: attachmentPath
  }] : [];
  const attachmentName = attachments[0]?.filename;
  const description = requisition.notes || failure.description || 'Sin descripción adicional';
  const createdAt = requisition.createdAt
    ? new Date(requisition.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
    : 'No especificada';

  const details = [
    row('Número de requisición', `#${requisition.id}`),
    row('Estado', requisition.status),
    row('Repuesto solicitado', requisition.part_reference),
    row('Cantidad', requisition.quantity_requested),
    row('Descripción / notas', description),
    row('Solicitante', requester.user_name),
    row('Correo del solicitante', requester.user_email),
    row('Sede', premise),
    row('Entidad', entity),
    row('Orden de trabajo', workOrder.work_order_id || `#${requisition.work_order_id}`),
    row('Falla asociada', failure.description),
    row('Fecha de solicitud', createdAt),
    row('Solicitante (ID)', requisition.requested_by_id),
    row('Aprobador (ID)', requisition.approved_by_id),
    row('Checklist asociado (ID)', requisition.checklist_id),
    row('Sesión de mantenimiento (ID)', requisition.maintenance_session_id),
    row('Orden de trabajo (ID)', requisition.work_order_id),
    row('Archivo adjunto', attachmentName || (requisition.image_url ? `Disponible en el sistema: ${requisition.image_url}` : 'No adjuntado'))
  ].join('');

  const transporter = createTransporter();
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'davila@recreatec.co',
    cc: 'mantenimiento@recreatec.co, sistemas2@recreatec.co',
    subject: `Nueva requisición #${requisition.id}: ${requisition.part_reference}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:760px;margin:0 auto"><h2 style="color:#1d4ed8">Nueva solicitud de requisición</h2><p>Se registró una nueva requisición de repuesto. A continuación se encuentran todos los datos disponibles:</p><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">${details}</table><p style="margin-top:20px;color:#475569">${attachmentName ? 'El archivo solicitado está adjunto a este correo.' : 'La solicitud no incluye archivo adjunto.'}</p></div></body></html>`,
    text: `Nueva requisición #${requisition.id}\nEstado: ${requisition.status}\nRepuesto: ${requisition.part_reference}\nCantidad: ${requisition.quantity_requested}\nSolicitante: ${requester.user_name || 'No especificado'} (${requester.user_email || 'sin correo'})\nSede: ${premise || 'No especificada'}\nEntidad: ${entity || 'No especificada'}\nOT: ${workOrder.work_order_id || requisition.work_order_id}\nDescripción: ${description}\nFecha: ${createdAt}\nArchivo: ${attachmentName || requisition.image_url || 'No adjuntado'}`,
    attachments
  });
}

module.exports = { sendRequisitionNotification };
