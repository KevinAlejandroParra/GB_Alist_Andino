const { Checklist, ChecklistSignature, User, ChecklistType, Inspectable, Premise } = require("../models");
const { Op } = require("sequelize");

/**
 * Obtener checklists completados sin firma de administrador
 */
const getUnsignedChecklists = async (req, res) => {
  try {
    const { startDate, endDate, checklistTypeId, premiseId } = req.query;

    // Construir filtros
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (checklistTypeId) {
      whereClause.checklist_type_id = parseInt(checklistTypeId);
    }

    if (premiseId) {
      whereClause.premise_id = parseInt(premiseId);
    }

    // Buscar todos los checklists
    const allChecklists = await Checklist.findAll({
      where: whereClause,
      include: [
        {
          model: ChecklistType,
          as: 'type',
          attributes: ['checklist_type_id', 'name', 'description', 'role_id']
        },
        {
          model: Premise,
          as: 'premise',
          attributes: ['premise_id', 'premise_name']
        },
        {
          model: Inspectable,
          as: 'inspectable',
          attributes: ['ins_id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'user_name', 'user_email']
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['user_id', 'user_name', 'user_email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Filtrar solo los que NO tienen firma de Administrador (role_id: 1)
    const unsignedChecklists = allChecklists.filter(checklist => {
      const hasAdminSignature = checklist.signatures.some(
        sig => sig.role_id === 1 // Administrador
      );
      return !hasAdminSignature;
    });

    // Formatear respuesta
    const formattedChecklists = unsignedChecklists.map(checklist => {
      const checklistTypeRoleId = checklist.type?.role_id;
      
      // Determinar qué firmas se requieren según el role_id del ChecklistType
      let requiredRoles = [];
      if (checklistTypeRoleId === 3) {
        // Checklist de Técnico: requiere firma de Técnico (3) y Administrador (1)
        requiredRoles = [3, 1];
      } else if (checklistTypeRoleId === 4) {
        // Checklist de Anfitrión: requiere firma de Anfitrión (4) y Administrador (1)
        requiredRoles = [4, 1];
      } else {
        // Por defecto, requiere todas las firmas
        requiredRoles = [1, 3, 4];
      }

      const signatures = {
        hasAdmin: checklist.signatures.some(sig => sig.role_id === 1),
        hasTechnician: checklist.signatures.some(sig => sig.role_id === 3),
        hasAnfitrion: checklist.signatures.some(sig => sig.role_id === 4)
      };

      // Determinar qué roles faltan según los requeridos
      const missingRoles = [];
      if (requiredRoles.includes(1) && !signatures.hasAdmin) {
        missingRoles.push('Administrador');
      }
      if (requiredRoles.includes(3) && !signatures.hasTechnician) {
        missingRoles.push('Técnico');
      }
      if (requiredRoles.includes(4) && !signatures.hasAnfitrion) {
        missingRoles.push('Anfitrión');
      }

      return {
        checklist_id: checklist.checklist_id,
        checklist_type: checklist.type?.name || 'N/A',
        checklist_type_role_id: checklistTypeRoleId,
        premise: checklist.premise?.premise_name || 'N/A',
        inspectable: checklist.inspectable?.name || 'N/A',
        created_at: checklist.createdAt,
        created_by: checklist.creator?.user_name || 'Desconocido',
        signatures: signatures,
        required_roles: requiredRoles,
        signatures_count: checklist.signatures.length,
        week_identifier: checklist.week_identifier,
        missing_roles: missingRoles
      };
    });

    res.status(200).json({
      success: true,
      count: formattedChecklists.length,
      checklists: formattedChecklists
    });

  } catch (error) {
    console.error('Error al obtener checklists sin firma:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Agregar firma retroactiva
 */
const addRetroactiveSignature = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const { user_id, role_id, signed_at, signature_image } = req.body;

    // Validaciones
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario que firmará'
      });
    }

    if (!role_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el rol del usuario'
      });
    }

    if (!signature_image) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la imagen de la firma'
      });
    }

    // Verificar que el checklist existe
    const checklist = await Checklist.findByPk(checklist_id, {
      include: [
        {
          model: ChecklistSignature,
          as: 'signatures'
        }
      ]
    });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        error: 'Checklist no encontrado'
      });
    }

    // Verificar que no tenga ya firma de este rol
    const hasRoleSignature = checklist.signatures.some(
      sig => sig.role_id === parseInt(role_id)
    );

    if (hasRoleSignature) {
      return res.status(400).json({
        success: false,
        error: `Este checklist ya tiene firma de este rol`
      });
    }

    // Verificar que el usuario existe y tiene el rol correcto
    const user = await User.findByPk(user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (user.role_id !== parseInt(role_id)) {
      return res.status(400).json({
        success: false,
        error: 'El usuario seleccionado no tiene el rol especificado'
      });
    }

    // Validar que el rol sea permitido (1: Admin, 3: Técnico, 4: Anfitrión)
    if (![1, 3, 4].includes(parseInt(role_id))) {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden agregar firmas de Administradores, Técnicos o Anfitriones'
      });
    }

    // Usar la fecha proporcionada o la fecha actual
    const signatureDate = signed_at ? new Date(signed_at) : new Date();

    // Crear la firma retroactiva
    // IMPORTANTE: Guardar la firma en digital_token (no en signature_image) para mantener consistencia con el sistema existente
    const signature = await ChecklistSignature.create({
      checklist_id: parseInt(checklist_id),
      user_id: user_id,
      role_id: parseInt(role_id),
      signed_at: signatureDate,
      signed_by_name: user.user_name,
      digital_token: signature_image, // Guardar la imagen de firma en base64 en digital_token (consistente con sistema actual)
      signature_image: null // Mantener null como en los registros existentes
    });

    res.status(201).json({
      success: true,
      message: 'Firma retroactiva agregada exitosamente',
      signature: {
        signature_id: signature.signature_id,
        signed_by: user.user_name,
        role_id: signature.role_id,
        signed_at: signature.signed_at,
        authorized_by: req.user.user_name
      }
    });

  } catch (error) {
    console.error('Error al agregar firma retroactiva:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener historial de firmas retroactivas (simplificado - sin auditoría)
 */
const getRetroactiveSignaturesHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const whereClause = {
      digital_token: {
        [Op.like]: 'RETROACTIVE-%'
      }
    };

    if (startDate && endDate) {
      whereClause.signed_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const history = await ChecklistSignature.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'user_name', 'user_email']
        },
        {
          model: Checklist,
          as: 'checklist',
          attributes: ['checklist_id', 'createdAt'],
          include: [
            {
              model: ChecklistType,
              as: 'type',
              attributes: ['name']
            }
          ]
        }
      ],
      order: [['signed_at', 'DESC']],
      limit: parseInt(limit)
    });

    const formattedHistory = history.map(record => {
      return {
        signature_id: record.signature_id,
        checklist_id: record.checklist_id,
        checklist_type: record.checklist?.type?.name || 'N/A',
        signed_by: record.signed_by_name,
        role_id: record.role_id,
        signed_at: record.signed_at,
        created_at: record.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener lista de usuarios disponibles para firmar (Admins, Técnicos, Anfitriones)
 */
const getAvailableAdmins = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role_id: [1, 3, 4], // Administrador, Técnico, Anfitrión
        user_state: 'activo'
      },
      include: [
        {
          model: require('../models').Role,
          as: 'role',
          attributes: ['role_name']
        }
      ],
      attributes: ['user_id', 'user_name', 'user_email', 'role_id'],
      order: [['user_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getUnsignedChecklists,
  addRetroactiveSignature,
  getRetroactiveSignaturesHistory,
  getAvailableAdmins
};
