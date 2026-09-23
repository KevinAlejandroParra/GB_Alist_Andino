const jwt = require('jsonwebtoken');
const {
  RetroactiveAccessRequest, User, ChecklistType, Checklist,
  ChecklistSignature, ChecklistResponse, Op
} = require('../models');
const emailService = require('../services/retroactiveAccessEmailService');

// ─── helpers ──────────────────────────────────────────────────────────────────

const CLIENT_URL = (process.env.CLIENT_URL || 'https://192.168.57.96').replace(/\/$/, '');

/** HTML simple para respuestas del endpoint /review (sin autenticación). */
const reviewHtml = (title, color, icon, message, detail = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin:0; font-family:Arial,Helvetica,sans-serif; background:#f4f6f8;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:12px; box-shadow:0 2px 16px rgba(0,0,0,.1);
            padding:48px 40px; max-width:480px; width:90%; text-align:center; }
    .icon { font-size:56px; margin-bottom:16px; }
    h1 { color:${color}; font-size:22px; margin:0 0 12px; }
    p { color:#6b7280; font-size:15px; line-height:1.6; margin:0 0 8px; }
    .detail { font-size:13px; color:#9ca3af; margin-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${detail ? `<p class="detail">${detail}</p>` : ''}
  </div>
</body>
</html>`;

// ─── 1. Crear solicitud ───────────────────────────────────────────────────────

const createRequest = async (req, res) => {
  try {
    const { checklist_type_id, target_date, action_type, target_checklist_id, justification } = req.body;
    const admin_user_id = req.user.user_id;

    // Campos obligatorios
    if (!checklist_type_id || !target_date || !action_type || !justification) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios: checklist_type_id, target_date, action_type, justification' });
    }

    // Validar action_type
    if (!['access_existing', 'create_new'].includes(action_type)) {
      return res.status(400).json({ success: false, error: 'action_type debe ser "access_existing" o "create_new"' });
    }

    // Validar target_date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${target_date}T00:00:00`);
    const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return res.status(400).json({ success: false, error: 'La fecha objetivo debe ser anterior a hoy' });
    }
    if (diffDays > 30) {
      return res.status(400).json({ success: false, error: 'La fecha objetivo no puede ser anterior a 30 días' });
    }

    // Validar justificación
    if (justification.trim().length < 10 || justification.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'La justificación debe tener entre 10 y 500 caracteres' });
    }

    // Validar checklist_type_id
    const checklistType = await ChecklistType.findByPk(checklist_type_id);
    if (!checklistType) {
      return res.status(400).json({ success: false, error: 'El tipo de checklist no existe' });
    }

    // Validación específica por action_type
    if (action_type === 'access_existing') {
      if (!target_checklist_id) {
        return res.status(400).json({ success: false, error: 'Se requiere target_checklist_id para acceder a un checklist existente' });
      }
      const targetChecklist = await Checklist.findOne({
        where: { checklist_id: target_checklist_id, checklist_type_id }
      });
      if (!targetChecklist) {
        return res.status(400).json({ success: false, error: 'El checklist indicado no existe o no corresponde al tipo seleccionado' });
      }
    }

    if (action_type === 'create_new') {
      // Advertir si ya existe un checklist del admin para ese tipo y fecha
      const existing = await Checklist.findAll({
        where: {
          checklist_type_id,
          created_by: admin_user_id,
          createdAt: {
            [Op.gte]: new Date(`${target_date}T00:00:00`),
            [Op.lte]: new Date(`${target_date}T23:59:59`),
          }
        }
      });
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un checklist tuyo para esa fecha y tipo. Considera usar "acceder a existente".',
          existing_checklist_ids: existing.map(c => c.checklist_id),
        });
      }
    }

    // Verificar duplicado pendiente
    const duplicate = await RetroactiveAccessRequest.findOne({
      where: {
        admin_user_id,
        checklist_type_id,
        target_date,
        action_type,
        status: 'pending',
      }
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: 'Ya tienes una solicitud pendiente para esta misma fecha, tipo y acción',
        existing_request_id: duplicate.request_id,
      });
    }

    // Crear solicitud
    const request = await RetroactiveAccessRequest.create({
      admin_user_id,
      checklist_type_id,
      target_date,
      action_type,
      target_checklist_id: action_type === 'access_existing' ? target_checklist_id : null,
      justification: justification.trim(),
      status: 'pending',
      request_token: crypto.randomUUID(),
    });

    // Cargar admin para el correo
    const admin = await User.findByPk(admin_user_id, {
      attributes: ['user_id', 'user_name', 'user_email']
    });

    // Enviar correo al técnico
    try {
      await emailService.sendRequestNotification(request, admin, checklistType);
    } catch (emailErr) {
      console.error('[RetroactiveAccess] Error enviando correo al técnico:', emailErr.message);
      return res.status(500).json({
        success: false,
        error: 'La solicitud fue guardada pero no se pudo enviar la notificación al técnico. Inténtalo de nuevo o contacta a soporte.',
        request_id: request.request_id,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada correctamente. Recibirás un correo cuando sea aprobada.',
      request_id: request.request_id,
      status: 'pending',
    });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en createRequest:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 2. Revisar solicitud (sin auth — desde correo) ───────────────────────────

const reviewRequest = async (req, res) => {
  const { token, action } = req.query;

  if (!token || !['approve', 'reject'].includes(action)) {
    return res.status(400).send(reviewHtml(
      'Enlace inválido', '#dc2626', '⚠️',
      'El enlace no contiene los parámetros correctos.',
      'Verifica que copiaste el enlace completo desde el correo.'
    ));
  }

  try {
    const request = await RetroactiveAccessRequest.findOne({
      where: { request_token: token },
      include: [
        { model: User, as: 'admin', attributes: ['user_id', 'user_name', 'user_email'] },
        { model: ChecklistType, as: 'checklistType', attributes: ['checklist_type_id', 'name'] },
      ]
    });

    if (!request) {
      return res.status(404).send(reviewHtml(
        'Enlace inválido', '#dc2626', '🔗',
        'Este enlace no corresponde a ninguna solicitud registrada.',
        'Es posible que el enlace esté incompleto o haya sido manipulado.'
      ));
    }

    if (request.status !== 'pending') {
      const statusLabel = request.status === 'approved' ? 'aprobada' : 'rechazada';
      return res.status(410).send(reviewHtml(
        'Enlace ya utilizado', '#6b7280', '🔒',
        `Esta solicitud ya fue <strong>${statusLabel}</strong> anteriormente.`,
        `Solicitud #${request.request_id} — ${request.admin.user_name}`
      ));
    }

    const reviewerIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    if (action === 'approve') {
      // Actualizar a aprobado
      await request.update({
        status: 'approved',
        approved_at: new Date(),
        reviewer_ip: reviewerIp,
      });

      // Generar JWT retroactivo (24h)
      const accessToken = jwt.sign(
        {
          type: 'retroactive-access',
          request_id: request.request_id,
          admin_user_id: request.admin_user_id,
          checklist_type_id: request.checklist_type_id,
          target_date: request.target_date,
          action_type: request.action_type,
          target_checklist_id: request.target_checklist_id,
        },
        process.env.JWT_KEY,
        { expiresIn: '24h' }
      );

      // Enviar correo al admin
      try {
        await emailService.sendApprovalToAdmin(request.admin, request, request.checklistType, accessToken);
      } catch (emailErr) {
        console.error('[RetroactiveAccess] Error enviando correo de aprobación al admin:', emailErr.message);
        // No revertir la aprobación — queda en BD para reenvío manual
      }

      return res.status(200).send(reviewHtml(
        'Solicitud aprobada', '#16a34a', '✅',
        `La solicitud de <strong>${request.admin.user_name}</strong> fue aprobada correctamente.`,
        `El administrador recibirá un correo con el enlace de acceso para completar el checklist.`
      ));
    }

    if (action === 'reject') {
      await request.update({
        status: 'rejected',
        rejected_at: new Date(),
        reviewer_ip: reviewerIp,
      });

      try {
        await emailService.sendRejectionToAdmin(request.admin, request, request.checklistType);
      } catch (emailErr) {
        console.error('[RetroactiveAccess] Error enviando correo de rechazo al admin:', emailErr.message);
      }

      return res.status(200).send(reviewHtml(
        'Solicitud rechazada', '#dc2626', '❌',
        `La solicitud de <strong>${request.admin.user_name}</strong> fue rechazada.`,
        `El administrador recibirá una notificación por correo.`
      ));
    }
  } catch (error) {
    console.error('[RetroactiveAccess] Error en reviewRequest:', error);
    return res.status(500).send(reviewHtml(
      'Error del servidor', '#6b7280', '⚙️',
      'Ocurrió un error al procesar la solicitud.',
      'Por favor inténtalo de nuevo o contacta al administrador del sistema.'
    ));
  }
};

// ─── 3. Validar token JWT retroactivo ────────────────────────────────────────

const validateToken = async (req, res) => {
  try {
    const { retroactive_token } = req.body;

    if (!retroactive_token) {
      return res.status(400).json({ success: false, error: 'Se requiere retroactive_token' });
    }

    // Verificar JWT
    let decoded;
    try {
      decoded = jwt.verify(retroactive_token, process.env.JWT_KEY);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'El enlace de acceso ha expirado. Genera una nueva solicitud.'
        : 'El token de acceso no es válido.';
      return res.status(401).json({ success: false, error: msg });
    }

    if (decoded.type !== 'retroactive-access') {
      return res.status(401).json({ success: false, error: 'Tipo de token inválido' });
    }

    // Verificar admin activo con role_id = 1
    const admin = await User.findOne({
      where: { user_id: decoded.admin_user_id, role_id: 1, user_state: 'activo' }
    });
    if (!admin) {
      return res.status(401).json({ success: false, error: 'El usuario asociado a este token no tiene permisos de administrador o está inactivo' });
    }

    // Verificar solicitud aprobada y no usada
    const request = await RetroactiveAccessRequest.findOne({
      where: { request_id: decoded.request_id, status: 'approved' },
      include: [{ model: ChecklistType, as: 'checklistType' }]
    });

    if (!request) {
      return res.status(401).json({ success: false, error: 'La solicitud asociada no existe o no fue aprobada' });
    }
    if (request.used_at) {
      return res.status(409).json({ success: false, error: 'Este token de acceso ya fue utilizado. Genera una nueva solicitud si necesitas acceso adicional.' });
    }

    return res.status(200).json({
      success: true,
      context: {
        request_id: request.request_id,
        admin_user_id: decoded.admin_user_id,
        checklist_type_id: decoded.checklist_type_id,
        target_date: decoded.target_date,
        action_type: decoded.action_type,
        target_checklist_id: decoded.target_checklist_id || null,
        checklistType: {
          checklist_type_id: request.checklistType.checklist_type_id,
          name: request.checklistType.name,
          type_category: request.checklistType.type_category,
          frequency: request.checklistType.frequency,
        },
      },
    });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en validateToken:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 4. Checklists existentes para la UI del formulario ─────────────────────

const getExistingChecklists = async (req, res) => {
  try {
    const { checklist_type_id, target_date } = req.query;
    const admin_user_id = req.user.user_id;

    if (!checklist_type_id || !target_date) {
      return res.status(400).json({ success: false, error: 'Se requieren checklist_type_id y target_date' });
    }

    const checklists = await Checklist.findAll({
      where: {
        checklist_type_id,
        created_by: admin_user_id,
        createdAt: {
          [Op.gte]: new Date(`${target_date}T00:00:00`),
          [Op.lte]: new Date(`${target_date}T23:59:59`),
        }
      },
      include: [
        { model: ChecklistSignature, as: 'signatures', required: false, attributes: ['signature_id', 'role_id'] },
        { model: ChecklistResponse, as: 'responses', required: false, attributes: ['response_id'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = checklists.map(c => {
      const plain = c.get({ plain: true });
      const signatureCount = plain.signatures?.length || 0;
      const responseCount = plain.responses?.length || 0;
      const isComplete = signatureCount >= 2;
      return {
        checklist_id: plain.checklist_id,
        created_at: plain.createdAt,
        response_count: responseCount,
        signature_count: signatureCount,
        is_complete: isComplete,
        week_identifier: plain.week_identifier,
      };
    });

    // Incompletos primero
    formatted.sort((a, b) => Number(a.is_complete) - Number(b.is_complete));

    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en getExistingChecklists:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 5. Historial de solicitudes ─────────────────────────────────────────────

const getRequests = async (req, res) => {
  try {
    const { status, date_from, date_to } = req.query;
    const isAdmin = req.user.role_id === 1;

    const where = {};

    // role_id=1 solo ve las suyas; role_id=2 (soporte) ve todas
    if (isAdmin) {
      where.admin_user_id = req.user.user_id;
    }

    if (status) where.status = status;

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt[Op.gte] = new Date(`${date_from}T00:00:00`);
      if (date_to)   where.createdAt[Op.lte] = new Date(`${date_to}T23:59:59`);
    }

    const requests = await RetroactiveAccessRequest.findAll({
      where,
      include: [
        { model: User, as: 'admin', attributes: ['user_id', 'user_name', 'user_email'] },
        { model: ChecklistType, as: 'checklistType', attributes: ['checklist_type_id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en getRequests:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 6. Marcar token como usado (llamado desde el cliente tras acceso/creación) ─

const markTokenUsed = async (req, res) => {
  try {
    const { request_id, checklist_id } = req.body;

    const request = await RetroactiveAccessRequest.findOne({
      where: { request_id, admin_user_id: req.user.user_id, status: 'approved' }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    }
    if (request.used_at) {
      return res.status(409).json({ success: false, error: 'Este token ya fue marcado como usado' });
    }

    await request.update({ used_at: new Date(), checklist_id: checklist_id || null });

    return res.status(200).json({ success: true, message: 'Token marcado como usado' });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en markTokenUsed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── 7. Reenviar correo de aprobación al admin ───────────────────────────────

const resendApprovalEmail = async (req, res) => {
  try {
    const { request_id } = req.params;

    const request = await RetroactiveAccessRequest.findOne({
      where: { request_id, status: 'approved' },
      include: [
        { model: User, as: 'admin', attributes: ['user_id', 'user_name', 'user_email'] },
        { model: ChecklistType, as: 'checklistType', attributes: ['checklist_type_id', 'name'] },
      ]
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Solicitud aprobada no encontrada' });
    }
    if (request.used_at) {
      return res.status(409).json({ success: false, error: 'Esta solicitud ya fue utilizada' });
    }

    // Generar nuevo JWT
    const accessToken = jwt.sign(
      {
        type: 'retroactive-access',
        request_id: request.request_id,
        admin_user_id: request.admin_user_id,
        checklist_type_id: request.checklist_type_id,
        target_date: request.target_date,
        action_type: request.action_type,
        target_checklist_id: request.target_checklist_id,
      },
      process.env.JWT_KEY,
      { expiresIn: '24h' }
    );

    await emailService.sendApprovalToAdmin(request.admin, request, request.checklistType, accessToken);

    return res.status(200).json({ success: true, message: 'Correo de aprobación reenviado correctamente' });
  } catch (error) {
    console.error('[RetroactiveAccess] Error en resendApprovalEmail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createRequest,
  reviewRequest,
  validateToken,
  getExistingChecklists,
  getRequests,
  markTokenUsed,
  resendApprovalEmail,
};
