const { ChecklistType, Checklist, User, Premise, Inspectable, ChecklistResponse, ChecklistSignature, Role } = require("../models");
const checklistService = require("../services/checklistService");
const { Op } = require("sequelize");

/**
 * Controlador para funcionalidad de Soporte de Checklists
 * Permite a usuarios con rol de Soporte acceder a cualquier checklist
 * y diligenciar respuestas como si fueran otro usuario
 */

/**
 * Obtener todos los tipos de checklist disponibles con filtros
 */
const getAvailableChecklistTypes = async (req, res) => {
  try {
    const { type_category, role_id, premise_id } = req.query;

    // Verificar que el usuario sea Soporte (role_id: 2)
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    const whereClause = {};
    
    if (type_category) {
      whereClause.type_category = type_category;
    }
    
    if (role_id) {
      whereClause.role_id = role_id;
    }

    const checklistTypes = await ChecklistType.findAll({
      where: whereClause,
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'role_name', 'role_description']
        },
        {
          model: Inspectable,
          as: 'specificInspectables',
          required: false,
          where: premise_id ? { premise_id } : {},
          include: [
            {
              model: Premise,
              as: 'premise',
              attributes: ['premise_id', 'premise_name']
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: checklistTypes
    });
  } catch (error) {
    console.error('Error obteniendo tipos de checklist:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener checklists existentes con filtros avanzados
 */
const getChecklistsWithFilters = async (req, res) => {
  try {
    const { 
      checklist_type_id, 
      premise_id, 
      inspectable_id,
      date_from,
      date_to,
      has_signatures,
      created_by
    } = req.query;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    const whereClause = {};
    
    if (checklist_type_id) {
      whereClause.checklist_type_id = checklist_type_id;
    }
    
    if (inspectable_id) {
      whereClause.inspectable_id = inspectable_id;
    }
    
    if (created_by) {
      whereClause.created_by = created_by;
    }

    // Filtro por rango de fechas
    if (date_from || date_to) {
      whereClause.createdAt = {};
      if (date_from) {
        whereClause.createdAt[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDate;
      }
    }

    const checklists = await Checklist.findAll({
      where: whereClause,
      include: [
        {
          model: ChecklistType,
          as: 'type',
          attributes: ['checklist_type_id', 'name', 'description', 'type_category', 'frequency']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'user_name', 'user_email'],
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['role_id', 'role_name']
            }
          ]
        },
        {
          model: Inspectable,
          as: 'inspectable',
          required: false,
          attributes: ['ins_id', 'name', 'premise_id'],
          include: [
            {
              model: Premise,
              as: 'premise',
              attributes: ['premise_id', 'premise_name']
            }
          ]
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['user_id', 'user_name']
            },
            {
              model: Role,
              as: 'role',
              attributes: ['role_id', 'role_name']
            }
          ]
        },
        {
          model: ChecklistResponse,
          as: 'responses',
          required: false,
          attributes: ['response_id']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100 // Limitar resultados para performance
    });

    // Filtrar por firmas si se especifica
    let filteredChecklists = checklists;
    if (has_signatures !== undefined) {
      const hasSignaturesFilter = has_signatures === 'true';
      filteredChecklists = checklists.filter(checklist => {
        const hasSignatures = checklist.signatures && checklist.signatures.length > 0;
        return hasSignaturesFilter ? hasSignatures : !hasSignatures;
      });
    }

    // Agregar información adicional
    const checklistsWithInfo = filteredChecklists.map(checklist => {
      const plainChecklist = checklist.get({ plain: true });
      return {
        ...plainChecklist,
        response_count: plainChecklist.responses ? plainChecklist.responses.length : 0,
        signature_count: plainChecklist.signatures ? plainChecklist.signatures.length : 0,
        is_complete: plainChecklist.signatures && plainChecklist.signatures.length >= 2,
        location: plainChecklist.inspectable?.premise?.premise_name || 'Sin sede específica'
      };
    });

    res.status(200).json({
      success: true,
      count: checklistsWithInfo.length,
      data: checklistsWithInfo
    });
  } catch (error) {
    console.error('Error obteniendo checklists:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener usuarios disponibles para impersonar
 */
const getAvailableUsers = async (req, res) => {
  try {
    const { role_id, premise_id } = req.query;

    console.log('🔍 [getAvailableUsers] Parámetros recibidos:', {
      role_id,
      premise_id,
      user_id: req.user.user_id,
      user_role: req.user.role_id
    });

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    const whereClause = {
      user_state: 'activo'
    };

    if (role_id) {
      whereClause.role_id = role_id;
    }

    if (premise_id) {
      whereClause.premise_id = premise_id;
    }

    console.log('🔍 [getAvailableUsers] WHERE clause:', whereClause);

    const users = await User.findAll({
      where: whereClause,
      attributes: ['user_id', 'user_name', 'user_email', 'role_id', 'premise_id'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'role_name']
        },
        {
          model: Premise,
          as: 'premise',
          attributes: ['premise_id', 'premise_name']
        }
      ],
      order: [['user_name', 'ASC']]
    });

    console.log('🔍 [getAvailableUsers] Usuarios encontrados:', users.length);
    if (users.length > 0) {
      console.log('🔍 [getAvailableUsers] Primeros 3 usuarios:', 
        users.slice(0, 3).map(u => ({
          id: u.user_id,
          name: u.user_name,
          role_id: u.role_id,
          role_name: u.role?.role_name
        }))
      );
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Acceder a un checklist como otro usuario (impersonación)
 * Retorna el checklist completo con toda la información necesaria
 */
const accessChecklistAsUser = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const { impersonate_user_id } = req.body;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    // Verificar que el usuario a impersonar existe
    const impersonateUser = await User.findByPk(impersonate_user_id, {
      include: [
        {
          model: Role,
          as: 'role'
        }
      ]
    });

    if (!impersonateUser) {
      return res.status(404).json({ error: "Usuario a impersonar no encontrado" });
    }

    // Obtener el checklist completo
    const checklist = await checklistService.getChecklistById(checklist_id);

    if (!checklist) {
      return res.status(404).json({ error: "Checklist no encontrado" });
    }

    // Agregar información de contexto de soporte
    const checklistWithContext = {
      ...checklist,
      support_context: {
        is_support_mode: true,
        support_user_id: req.user.user_id,
        support_user_name: req.user.user_name,
        impersonated_user_id: impersonateUser.user_id,
        impersonated_user_name: impersonateUser.user_name,
        impersonated_user_role: impersonateUser.role.role_name,
        impersonated_user_role_id: impersonateUser.role_id,
        accessed_at: new Date()
      }
    };

    res.status(200).json({
      success: true,
      data: checklistWithContext
    });
  } catch (error) {
    console.error('Error accediendo a checklist:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crear o acceder a un checklist como otro usuario
 * Similar a createChecklist pero con impersonación y fecha personalizable
 */
const createChecklistAsUser = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;
    const { inspectableId, impersonate_user_id, checklist_date, week_identifier } = req.body;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    // Verificar que el usuario a impersonar existe
    const impersonateUser = await User.findByPk(impersonate_user_id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!impersonateUser) {
      return res.status(404).json({ error: "Usuario a impersonar no encontrado" });
    }

    console.log(`🔍 [Soporte] Creando checklist tipo ${checklistTypeId} como usuario ${impersonateUser.user_name}`);

    // Obtener el tipo de checklist para información adicional
    const checklistType = await ChecklistType.findByPk(checklistTypeId);
    
    // Crear checklist con fecha personalizada
    const authorizationData = req.body.authorization_data || {};
    
    const checklistData = {
      checklist_type_id: Number.parseInt(checklistTypeId),
      premise_id: impersonateUser.premise_id,
      inspectable_id: inspectableId ? Number.parseInt(inspectableId) : null,
      created_by: impersonate_user_id,
      createdAt: checklist_date ? new Date(checklist_date) : new Date(),
      updatedAt: checklist_date ? new Date(checklist_date) : new Date(),
      week_identifier: week_identifier || null,
      created_by_support: true, // Marcar como creado por soporte
      support_user_id: req.user.user_id, // ID del usuario de soporte
      support_notes: `Checklist creado por ${req.user.user_name} (Soporte) impersonando a ${impersonateUser.user_name}. Autorizado por: ${authorizationData.fullName || 'N/A'} (${authorizationData.document || 'N/A'}) el ${new Date(authorizationData.timestamp || new Date()).toLocaleString('es-CO')}`,
      version_label: checklistType?.version_label || null
    };

    console.log('🔍 [createChecklistAsUser] Datos del checklist:', checklistData);

    const newChecklist = await Checklist.create(checklistData);

    // Obtener el checklist completo con todas sus relaciones
    const fullChecklist = await checklistService.getChecklistById(newChecklist.checklist_id);

    // Agregar contexto de soporte
    const checklistWithContext = {
      ...fullChecklist,
      support_context: {
        is_support_mode: true,
        support_user_id: req.user.user_id,
        support_user_name: req.user.user_name,
        impersonated_user_id: impersonateUser.user_id,
        impersonated_user_name: impersonateUser.user_name,
        impersonated_user_role: impersonateUser.role.role_name,
        impersonated_user_role_id: impersonateUser.role_id,
        created_at: new Date(),
        is_retroactive: !!checklist_date
      },
      notification: 'Checklist creado exitosamente en modo soporte'
    };

    res.status(201).json({
      success: true,
      data: checklistWithContext
    });
  } catch (error) {
    console.error('❌ Error en createChecklistAsUser:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Enviar respuestas como usuario impersonado
 */
const submitResponsesAsUser = async (req, res) => {
  try {
    const { id: checklist_id } = req.params;
    const { responses, impersonate_user_id } = req.body;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    // Verificar que el usuario a impersonar existe
    const impersonateUser = await User.findByPk(impersonate_user_id);
    if (!impersonateUser) {
      return res.status(404).json({ error: "Usuario a impersonar no encontrado" });
    }

    console.log(`📝 [Soporte] Enviando respuestas como usuario ${impersonateUser.user_name}`);

    // Enviar respuestas usando el ID del usuario impersonado
    await checklistService.submitResponses({
      checklist_id: Number.parseInt(checklist_id),
      responses,
      responded_by: impersonate_user_id, // Usar el ID del usuario impersonado
      role_id: impersonateUser.role_id,
    });

    res.status(200).json({ 
      success: true,
      message: "Respuestas registradas exitosamente",
      impersonated_as: impersonateUser.user_name
    });
  } catch (error) {
    console.error('Error en submitResponsesAsUser:', error);
    
    if (error.message.includes('requiere un comentario') ||
        error.message.includes('requiere evidencia')) {
      res.status(400).json({
        error: error.message,
        type: 'validation_error',
        code: 'REQUIRED_FIELDS'
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

/**
 * Firmar checklist como usuario impersonado con fecha personalizable
 * Simplificado: Solo crea la firma del usuario impersonado
 * El personal de soporte puede firmar usando el flujo normal
 */
const signChecklistAsUser = async (req, res) => {
  try {
    const { id: checklist_id } = req.params;
    const { digital_token, impersonate_user_id, signed_at } = req.body;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    // Verificar que el usuario a impersonar existe
    const impersonateUser = await User.findByPk(impersonate_user_id);
    if (!impersonateUser) {
      return res.status(404).json({ error: "Usuario a impersonar no encontrado" });
    }

    console.log(`✍️ [Soporte] Firmando checklist como usuario ${impersonateUser.user_name}`);

    // Usar la fecha proporcionada o la fecha actual
    const signatureDate = signed_at ? new Date(signed_at) : new Date();

    const { ChecklistSignature } = require('../models');
    
    // Verificar que no tenga ya firma de este rol
    const existingSignature = await ChecklistSignature.findOne({
      where: {
        checklist_id: Number.parseInt(checklist_id),
        role_id: impersonateUser.role_id
      }
    });

    if (existingSignature) {
      return res.status(400).json({
        error: `Este checklist ya tiene firma del rol ${impersonateUser.role_id}`
      });
    }

    // Crear la firma del usuario impersonado
    await ChecklistSignature.create({
      checklist_id: Number.parseInt(checklist_id),
      user_id: impersonate_user_id,
      role_id: impersonateUser.role_id,
      signed_at: signatureDate,
      signed_by_name: impersonateUser.user_name,
      digital_token: digital_token
    });

    res.status(200).json({ 
      success: true,
      message: "Checklist firmado exitosamente. El personal de soporte y admin pueden firmar usando Firmas Retroactivas.",
      impersonated_as: impersonateUser.user_name,
      signed_at: signatureDate
    });
  } catch (error) {
    console.error('Error en signChecklistAsUser:', error);
    
    if (error.incompleteItems) {
      res.status(400).json({
        error: error.message,
        incompleteItems: error.incompleteItems,
        incompleteCount: error.incompleteCount,
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

/**
 * Escanear QR como usuario impersonado con fecha/hora personalizable
 */
const scanQrCodeAsUser = async (req, res) => {
  try {
    const { checklist_id, qr_code, impersonate_user_id, scanned_at } = req.body;

    // Verificar que el usuario sea Soporte
    if (req.user.role_id !== 2) {
      return res.status(403).json({ 
        error: "Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad" 
      });
    }

    // Verificar que el usuario a impersonar existe
    const impersonateUser = await User.findByPk(impersonate_user_id);
    if (!impersonateUser) {
      return res.status(404).json({ error: "Usuario a impersonar no encontrado" });
    }

    if (!checklist_id || !qr_code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos requeridos: checklist_id y qr_code' 
      });
    }

    const { ChecklistQrCode, ChecklistQrScan, Checklist, ChecklistType, ChecklistQrItemAssociation, ChecklistItem } = require('../models');

    const qrCode = await ChecklistQrCode.findOne({
      where: { qr_code },
      include: [{
        model: ChecklistQrItemAssociation,
        as: 'itemAssociations',
        include: [{
          model: ChecklistItem,
          as: 'checklistItem',
          attributes: ['checklist_item_id', 'item_number', 'question_text']
        }]
      }]
    });

    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'Código QR no encontrado' });
    }

    const checklist = await Checklist.findByPk(checklist_id, { 
      include: [{ model: ChecklistType, as: 'type' }] 
    });
    
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist no encontrado' });
    }

    if (qrCode.checklist_type_id !== checklist.type.checklist_type_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este código QR no pertenece al tipo de checklist actual' 
      });
    }

    // Verificar si ya fue escaneado
    const existingScan = await ChecklistQrScan.findOne({
      where: {
        checklist_id: checklist_id,
        qr_id: qrCode.qr_id
      }
    });

    if (existingScan) {
      console.log(`🚫 RE-ESCANEO DETECTADO - QR ${qr_code} ya registrado para checklist ${checklist_id}`);
      return res.status(400).json({
        success: false,
        message: 'Este código QR ya fue escaneado anteriormente para este checklist',
        data: {
          error_type: 'duplicate_scan',
          scan_id: existingScan.scan_id,
          scanned_at: existingScan.scanned_at
        }
      });
    }

    // Desbloquear items asociados
    const unlockedItems = [];
    if (qrCode.itemAssociations && qrCode.itemAssociations.length > 0) {
      const unlockDate = scanned_at ? new Date(scanned_at) : new Date();
      for (const association of qrCode.itemAssociations) {
        if (!association.is_unlocked) {
          await association.update({ 
            is_unlocked: true, 
            unlocked_at: unlockDate 
          });
          unlockedItems.push({
            checklist_item_id: association.checklistItem.checklist_item_id,
            item_number: association.checklistItem.item_number,
            item_text: association.checklistItem.question_text
          });
        }
      }
    }

    // Usar la fecha proporcionada o la fecha actual
    const scanDate = scanned_at ? new Date(scanned_at) : new Date();

    // Crear el escaneo con fecha personalizada
    const scan = await ChecklistQrScan.create({
      checklist_id,
      qr_id: qrCode.qr_id,
      scanned_by: impersonate_user_id, // Usuario impersonado
      scanned_at: scanDate, // Fecha personalizada
      checklist_status: req.body.checklist_status || 'in_progress'
    });

    await qrCode.increment('usage_count');
    await qrCode.update({ last_used_at: scanDate });

    console.log(`✅ [Soporte] ESCANEO REGISTRADO - QR ${qr_code} para checklist ${checklist_id} como ${impersonateUser.user_name}, scan_id: ${scan.scan_id}`);

    res.status(201).json({
      success: true,
      message: 'Escaneo registrado exitosamente',
      data: {
        scan_id: scan.scan_id,
        unlocked_items: unlockedItems,
        scanned_at: scanDate,
        impersonated_as: impersonateUser.user_name
      }
    });

  } catch (error) {
    console.error('Error en scanQrCodeAsUser:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * Obtener un checklist específico por ID para modo soporte
 * Usado por BaseChecklistPage cuando viene con ?checklist_id= en la URL
 */
const getChecklistByIdForSupport = async (req, res) => {
  try {
    const { checklist_id } = req.params;

    if (req.user.role_id !== 2) {
      return res.status(403).json({ error: 'Solo usuarios con rol de Soporte pueden acceder a esta funcionalidad' });
    }

    const checklist = await checklistService.getChecklistById(checklist_id);

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist no encontrado' });
    }

    res.status(200).json({ success: true, data: checklist });
  } catch (error) {
    console.error('Error obteniendo checklist por ID:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAvailableChecklistTypes,
  getChecklistsWithFilters,
  getAvailableUsers,
  getChecklistByIdForSupport,
  accessChecklistAsUser,
  createChecklistAsUser,
  submitResponsesAsUser,
  signChecklistAsUser,
  scanQrCodeAsUser
};
