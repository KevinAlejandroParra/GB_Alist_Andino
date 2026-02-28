'use strict';

const FailureOrderService = require('../services/FailureOrderService');
const FailureSignatureService = require('../services/FailureSignatureService');
const upload = require('../config/multerConfig');

class FailureController {
  /**
   * Crear nueva Orden de Falla desde checklist
   * POST /api/failures
   */
  async createFailureOrder(req, res) {
    try {
      console.log('🔍 [CREATE FAILURE] Recibiendo petición:', req.body);

      const {
        checklistResponseId,
        requiresReplacement = false,
        description,
        severity = 'LEVE',
        evidenceUrl,
        initialResponseId,
        priorityLevel = 'NORMAL',
        inspectableId,
        checklistItemId,
        checklist_item_id,
        assignedTechnicianArea,
        categoria = 'TECNICA',
        // ✅ NUEVO: Campo de recurrencia
        is_recurring = false
      } = req.body;

      console.log('🔍 [CREATE FAILURE] Parámetros extraídos:', {
        checklist_item_id,
        checklistItemId,
        description,
        severity,
        requiresReplacement
      });

      // ✅ MEJORA: Normalizar y validar severity
      let normalizedSeverity = severity;
      if (!normalizedSeverity) {
        normalizedSeverity = 'LEVE';
      }

      if (typeof normalizedSeverity === 'string') {
        if (normalizedSeverity.toLowerCase() === 'crítica' || normalizedSeverity.toLowerCase() === 'critica') {
          normalizedSeverity = 'CRITICA';
        } else if (normalizedSeverity.toLowerCase() === 'leve' || normalizedSeverity.toLowerCase() === 'leves') {
          normalizedSeverity = 'LEVE';
        } else {
          // Si no está en el formato esperado, usar LEVE como valor por defecto
          normalizedSeverity = 'LEVE';
        }
      }

      console.log('🔍 [CREATE FAILURE] Severidad normalizada:', normalizedSeverity);

      // ✅ MEJORA: Validar description
      if (!description || description.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESCRIPTION_REQUIRED',
            message: 'La descripción es requerida'
          }
        });
      }

      const reportedBy = req.user.user_id;
      if (!reportedBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado'
          }
        });
      }

      // ✅ MEJORA: Validar categoria
      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA'].includes(categoria)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORIA',
            message: 'La categoría debe ser TECNICA, OPERATIVA o LOCATIVA'
          }
        });
      }

      // ✅ MEJORA: Usar checklist_item_id del frontend si está disponible, sino usar checklistItemId
      const finalChecklistItemId = checklist_item_id || checklistItemId;
      console.log('🔍 [CREATE FAILURE] Final checklist_item_id:', finalChecklistItemId);

      // ✅ MEJORA: Normalizar assignedTechnicianArea
      let normalizedAssignedArea = assignedTechnicianArea || 'TECNICA';
      if (!['TECNICA', 'OPERATIVA'].includes(normalizedAssignedArea)) {
        normalizedAssignedArea = 'TECNICA';
      }
      console.log('🔍 [CREATE FAILURE] Área asignada normalizada:', normalizedAssignedArea);

      console.log('🔍 [CREATE FAILURE] Llamando al servicio con datos:', {
        description,
        severity: normalizedSeverity,
        requiresReplacement,
        checklistItemId: finalChecklistItemId,
        inspectableId,  // ✅ NUEVO: Mostrar inspectableId en log
        assignedTechnicianArea: normalizedAssignedArea,
        reportedBy
      });

      // Llamar al servicio
      const result = await FailureOrderService.createFromChecklist({
        checklistResponseId,
        requiresReplacement,
        description,
        severity: normalizedSeverity,
        evidenceUrl,
        initialResponseId,
        priorityLevel,
        inspectableId,
        checklistItemId: finalChecklistItemId,
        reportedBy,
        assignedTechnicianArea: normalizedAssignedArea,
        categoria
      });

      console.log('✅ [CREATE FAILURE] Servicio completado:', result);

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ [CREATE FAILURE] Error en createFailureOrder:', error);
      console.error('❌ [CREATE FAILURE] Stack trace:', error.stack);

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILURE_ORDER_ERROR',
          message: error.message,
          details: error.stack
        }
      });
    }
  }

  /**
   * Crear nueva Orden de Falla independiente
   * POST /api/failures/independent
   */
  async createStandaloneFailure(req, res) {
    try {
      const {
        requiresReplacement = false,
        description,
        severity = 'LEVE',
        priorityLevel = 'NORMAL',
        inspectableId,
        assignedTechnicianArea,
        categoria = 'TECNICA'
      } = req.body;

      // Manejar archivo de evidencia si se subió
      let evidenceUrl = null;
      if (req.file) {
        evidenceUrl = `/media/${req.file.filename}`;
      }

      const reportedBy = req.user.user_id;

      // Validaciones
      if (!description || description.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESCRIPTION_REQUIRED',
            message: 'La descripción es requerida'
          }
        });
      }

      // El inspectableId ahora es opcional para fallas independientes
      // if (!inspectableId) {
      //   return res.status(400).json({
      //     success: false,
      //     error: {
      //       code: 'INSPECTABLE_ID_REQUIRED',
      //       message: 'El ID del inspectable es requerido para fallas independientes'
      //     }
      //   });
      // }

      if (!['LEVE', 'MODERADA', 'CRITICA'].includes(severity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEVERITY',
            message: 'La severidad debe ser LEVE, MODERADA o CRITICA'
          }
        });
      }

      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA'].includes(categoria)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORIA',
            message: 'La categoría debe ser TECNICA, OPERATIVA o LOCATIVA'
          }
        });
      }

      // Llamar al servicio
      const result = await FailureOrderService.createStandalone({
        requiresReplacement,
        description,
        severity,
        evidenceUrl,
        priorityLevel,
        inspectableId,
        reportedBy,
        assignedTechnicianArea,
        type_maintenance: categoria
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error en createStandaloneFailure:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_STANDALONE_FAILURE_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Crear nueva Orden de Falla independiente con repuesto
   * POST /api/failures/independent-with-part
   */
  async createStandaloneFailureWithPart(req, res) {
    try {
      const {
        requiresReplacement = true,
        description,
        severity = 'LEVE',
        assignedTechnicianArea = 'TECNICA',
        categoria = 'TECNICA',
        partName,
        partQuantity,
        partCategory,
        partUrgency,
        partDescription
      } = req.body;

      // Manejar archivo de evidencia si se subió
      let evidenceUrl = null;
      if (req.file) {
        evidenceUrl = `/media/${req.file.filename}`;
      }

      const reportedBy = req.user.user_id;

      // Validaciones
      if (!description || description.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESCRIPTION_REQUIRED',
            message: 'La descripción es requerida'
          }
        });
      }

      if (!partName || partName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PART_NAME_REQUIRED',
            message: 'El nombre del repuesto es requerido'
          }
        });
      }

      if (!partQuantity || partQuantity < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PART_QUANTITY',
            message: 'La cantidad del repuesto debe ser mayor a 0'
          }
        });
      }

      if (!['LEVE', 'MODERADA', 'CRITICA'].includes(severity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEVERITY',
            message: 'La severidad debe ser LEVE, MODERADA o CRITICA'
          }
        });
      }

      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA'].includes(categoria)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORIA',
            message: 'La categoría debe ser TECNICA, OPERATIVA o LOCATIVA'
          }
        });
      }

      if (!['TECNICA', 'OPERATIVA'].includes(assignedTechnicianArea)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TECHNICIAN_AREA',
            message: 'El área asignada debe ser TECNICA u OPERATIVA'
          }
        });
      }

      // Llamar al servicio con información del repuesto
      const result = await FailureOrderService.createStandaloneWithPart({
        requiresReplacement,
        description,
        severity,
        evidenceUrl,
        assignedTechnicianArea,
        type_maintenance: categoria,
        reportedBy,
        partInfo: {
          name: partName,
          quantity: partQuantity,
          category: partCategory || 'Repuesto',
          urgency: partUrgency || 'NORMAL',
          description: partDescription || ''
        }
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error en createStandaloneFailureWithPart:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_STANDALONE_FAILURE_WITH_PART_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Crear firma de reporte para orden de falla
   * POST /api/failures/:id/report-signature
   */
  async createReportSignature(req, res) {
    try {
      const { failureId } = req.params;

      console.log('✅ [CREATE REPORT SIGNATURE] Iniciando creación de firma de reporte');
      console.log('📍 failureId:', failureId);

      const failureOrderId = parseInt(failureId);

      const {
        signatureData,
        userName,
        roleName
      } = req.body;

      console.log('📍 Datos recibidos:', {
        failureOrderId,
        hasSignatureData: !!signatureData,
        userName,
        roleName
      });

      if (isNaN(failureOrderId)) {
        console.error('❌ [CREATE REPORT SIGNATURE] ERROR: ID INVÁLIDO:', failureId);

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      // Validaciones básicas
      if (!signatureData || !userName || !roleName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'signatureData, userName y roleName son requeridos'
          }
        });
      }

      const userId = req.user.user_id;

      // Verificar que el usuario puede firmar
      const permissionCheck = await FailureSignatureService.canUserSign(roleName, 'REPORT');
      if (!permissionCheck.canSign) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: permissionCheck.message
          }
        });
      }

      // Crear la firma de reporte
      const result = await FailureSignatureService.createReportSignature({
        failureOrderId,
        userId,
        userName,
        roleName,
        signatureData
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error creando firma de reporte:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_REPORT_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener firma de reporte de una orden de falla
   * GET /api/failures/:id/report-signature
   */
  async getReportSignature(req, res) {
    try {
      const { failureId } = req.params;
      const failureOrderId = parseInt(failureId);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      const result = await FailureSignatureService.getReportSignature(failureOrderId);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error obteniendo firma de reporte:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_REPORT_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Verificar si una orden de falla tiene firma de reporte
   * GET /api/failures/:id/has-report-signature
   */
  async hasReportSignature(req, res) {
    try {
      const { failureId } = req.params;
      const failureOrderId = parseInt(failureId);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      const result = await FailureSignatureService.hasReportSignature(failureOrderId);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error verificando firma de reporte:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_REPORT_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Crear firma de administrador para orden de falla
   * POST /api/failures/:id/admin-signature
   * Solo para ROL 1 (Administrador)
   */
  async createAdminSignature(req, res) {
    try {
      const { failureId } = req.params;
      const failureOrderId = parseInt(failureId);

      const { signatureData } = req.body;

      // SOLO ROL 1 (Admin) o 2 (Soporte)
      if (![1, 2].includes(req.user.role_id)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Solo Administradores o Soporte pueden realizar esta acción'
          }
        });
      }

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      if (!signatureData) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'signatureData es requerido'
          }
        });
      }

      const adminId = req.user.user_id;

      const result = await FailureSignatureService.createAdminSignature({
        failureOrderId,
        adminId,
        signatureData
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error creando firma de administrador:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_ADMIN_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener firma de administrador
   * GET /api/failures/:id/admin-signature
   */
  async getAdminSignature(req, res) {
    try {
      const { failureId } = req.params;
      const failureOrderId = parseInt(failureId);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      const result = await FailureSignatureService.getAdminSignature(failureOrderId);
      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error obteniendo firma de administrador:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ADMIN_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Verificar si tiene firma de administrador
   * GET /api/failures/:id/has-admin-signature
   */
  async hasAdminSignature(req, res) {
    try {
      const { failureId } = req.params;
      const failureOrderId = parseInt(failureId);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      const result = await FailureSignatureService.hasAdminSignature(failureOrderId);
      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error verificando firma de administrador:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_ADMIN_SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener lista de órdenes de falla con filtros
   * GET /api/failures
   */
  async getFailureOrders(req, res) {
    try {
      const {
        status = 'all',
        requiresReplacement,
        assignedTechnicianArea, // ✅ CAMBIADO: de assignedTechnicianId a assignedTechnicianArea
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      // Construir filtros
      const filters = {
        requiresReplacement: requiresReplacement ? requiresReplacement === 'true' : undefined,
        assignedTechnicianArea, // ✅ CAMBIADO: Ya no es un integer, es string del ENUM
        dateFrom,
        dateTo,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      // Llamar al servicio
      const result = await FailureOrderService.getByStatus(status, filters);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getFailureOrders:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_FAILURE_ORDERS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener detalles de una OF específica
   * GET /api/failures/:id
   */
  async getFailureOrderById(req, res) {
    try {
      const { FailureOrder } = require('../models');

      const { id } = req.params;
      const failureOrderId = parseInt(id);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      // ✅ MEJORA: Consultar con todas las relaciones necesarias incluyendo ChecklistItem
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          {
            model: require('../models').User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: require('../models').ChecklistItem,
            as: 'checklistItem',
            attributes: ['checklist_item_id', 'question_text', 'item_number', 'guidance_text']
          },
          {
            model: require('../models').Inspectable,
            as: 'affectedInspectable',
            attributes: ['ins_id', 'name', 'description', 'type_code']
          },
          {
            model: require('../models').WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: require('../models').WorkOrderPart,
                as: 'parts',
                include: [
                  {
                    model: require('../models').Inventory,
                    as: 'inventory'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FAILURE_ORDER_NOT_FOUND',
            message: 'Orden de falla no encontrada'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: failureOrder
      });

    } catch (error) {
      console.error('❌ Error en getFailureOrderById:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_FAILURE_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener estadísticas de fallas
   * GET /api/failures/statistics
   */
  async getFailureOrderStatistics(req, res) {
    try {
      const { dateFrom, dateTo, locationId } = req.query;

      // Llamar al servicio
      const result = await FailureOrderService.getStatistics(dateFrom, dateTo, locationId);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getFailureOrderStatistics:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STATISTICS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener fallas recientes con sus OT
   * GET /api/failures/recent-failures
   */
  async getRecentFailures(req, res) {
    try {
      const {
        limit = 10,
        status = 'all'
      } = req.query;

      // Llamar al servicio con filtros para fallas recientes
      const result = await FailureOrderService.getByStatus(status, {
        limit: parseInt(limit),
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getRecentFailures:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_RECENT_FAILURES_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Actualizar orden de falla
   * PUT /api/failures/:id
   */
  async updateFailureOrder(req, res) {
    try {
      const { id } = req.params;
      const failureOrderId = parseInt(id);
      const updateData = req.body;

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      // Llamar al servicio
      const result = await FailureOrderService.updateFailureOrder(failureOrderId, updateData);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en updateFailureOrder:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_FAILURE_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener órdenes de falla por múltiples checklist_item_ids
   * GET /api/failures/by-items?item_ids=1,2,3&inspectable_id=123
   * ✅ NUEVO: Ahora filtra también por inspectable_id para evitar mostrar fallas de otros dispositivos de la misma familia
   */
  async getFailuresByItems(req, res) {
    try {
      const { item_ids, status = 'active', inspectable_id } = req.query;

      console.log('🔍 [GET FAILURES BY ITEMS] Parámetros:', { item_ids, status, inspectable_id });

      if (!item_ids) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ITEM_IDS_REQUIRED',
            message: 'item_ids es requerido'
          }
        });
      }

      const { FailureOrder, User, Inspectable, WorkOrder, ChecklistItem } = require('../models');
      const { Op } = require('sequelize');

      const itemIdsArray = item_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

      if (itemIdsArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ITEM_IDS',
            message: 'No se proporcionaron IDs válidos'
          }
        });
      }

      console.log('🔍 [GET FAILURES BY ITEMS] Array de IDs procesados:', itemIdsArray);

      // ✅ CORRECCIÓN: No filtrar por status en FailureOrder (no existe ese campo)
      // El status está en WorkOrder, no en FailureOrder
      let statusFilter = {};
      if (status !== 'all') {
        // Si se especifica un status, lo usamos solo para filtrar después
        console.log('🔍 [GET FAILURES BY ITEMS] Status parámetro será usado para filtrar OT:', status);
      }

      console.log('🔍 [GET FAILURES BY ITEMS] Filtro de estado:', statusFilter);

      // ✅ MEJORA: Construir condiciones de búsqueda con filtrado por affected_id
      let whereConditions = {};

      // Si se proporciona inspectable_id, filtrar por affected_id
      if (inspectable_id) {
        const inspectableIdInt = parseInt(inspectable_id);
        if (!isNaN(inspectableIdInt)) {
          console.log('🔍 [GET FAILURES BY ITEMS] Filtrando por inspectable_id (affected_id):', inspectableIdInt);

          // Filtrar por checklist_item_id Y affected_id
          whereConditions = {
            [Op.or]: [
              {
                // Fallas de items de familia: deben coincidir item_id Y affected_id
                checklist_item_id: {
                  [Op.in]: itemIdsArray
                },
                affected_id: inspectableIdInt
              },
              {
                // Fallas independientes: solo deben coincidir affected_id
                checklist_item_id: null,
                affected_id: inspectableIdInt
              }
            ],
            ...statusFilter
          };
        }
      } else {
        // Si NO se proporciona inspectable_id, usar lógica anterior
        whereConditions = {
          [Op.or]: [
            {
              checklist_item_id: {
                [Op.in]: itemIdsArray
              }
            },
            {
              checklist_item_id: null
            }
          ],
          ...statusFilter
        };
      }

      console.log('🔍 [GET FAILURES BY ITEMS] Condiciones WHERE:', JSON.stringify(whereConditions, null, 2));

      // ✅ MEJORA: Filtrar tanto por checklist_item_id específico como por NULL (fallas independientes)
      const failureOrders = await FailureOrder.findAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: ChecklistItem,
            as: 'checklistItem',
            attributes: ['checklist_item_id', 'item_number', 'question_text']
          },
          {
            model: Inspectable,
            as: 'affectedInspectable',
            attributes: ['ins_id', 'name', 'description', 'type_code']
          },
          {
            model: WorkOrder,
            as: 'workOrder',
            attributes: ['work_order_id', 'status', 'start_time', 'activity_performed']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      console.log('🔍 [GET FAILURES BY ITEMS] Total fallas encontradas:', failureOrders.length);

      // ✅ IMPLEMENTACIÓN: Ocultar fallas atendidas (con OT en status RESUELTA)
      const activeFailures = failureOrders.filter(fo => {

        // ✅ OCULTAR fallas que tengan OT con status RESUELTA (ya están atendidas)
        // Usamos toUpperCase y trim para evitar problemas de formato
        if (fo.workOrder && ['RESUELTA', 'CERRADA', 'FINALIZADA'].includes(String(fo.workOrder.status).toUpperCase().trim())) {
          return false;
        }

        // Filtrar por status parámetro si se especifica
        if (status === 'active' && fo.workOrder && ['EN_PROCESO', 'EN_PRUEBAS'].includes(String(fo.workOrder.status).toUpperCase().trim())) {
          // Solo mostrar fallas con OT activa
          return true;
        }

        // Si no tiene OT, mostrarla (fallas sin OT = pendientes)
        if (!fo.workOrder) {
          return true;
        }

        // Si tiene OT pero no está resuelta ni en los estados "active" específicos (casos raros), mostrarla por defecto
        return true;
      });

      console.log('🔍 [GET FAILURES BY ITEMS] Fallas activas filtradas:', activeFailures.length);

      res.status(200).json({
        success: true,
        data: activeFailures,
        count: activeFailures.length,
        filtersApplied: {
          item_ids: itemIdsArray,
          status: status,
          total_found: failureOrders.length,
          active_count: activeFailures.length
        }
      });

    } catch (error) {
      console.error('❌ [GET FAILURES BY ITEMS] Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FAILURES_BY_ITEMS_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  /**
   * Obtener fallas activas por tipo de checklist
   * GET /api/checklists/failures/by-type/:checklistTypeId
   */
  async getFailuresByChecklistType(req, res) {
    try {
      const { checklistTypeId } = req.params;

      if (!checklistTypeId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CHECKLIST_TYPE_ID_REQUIRED',
            message: 'checklistTypeId es requerido'
          }
        });
      }

      console.log('🔍 [GET FAILURES BY CHECKLIST TYPE] checklistTypeId:', checklistTypeId);

      // Primero, obtener todos los checklist_item_ids de este tipo
      const { ChecklistItem } = require('../models');
      const checklistItems = await ChecklistItem.findAll({
        where: {
          checklist_type_id: parseInt(checklistTypeId)
        },
        attributes: ['checklist_item_id']
      });

      if (checklistItems.length === 0) {
        console.log('🔍 [GET FAILURES BY CHECKLIST TYPE] No se encontraron items para el tipo:', checklistTypeId);
        return res.status(200).json({
          success: true,
          data: [],
          count: 0
        });
      }


      const itemIds = checklistItems.map(item => item.checklist_item_id);
      console.log('🔍 [GET FAILURES BY CHECKLIST TYPE] Items encontrados:', itemIds);

      // Usar el método existente getFailuresByItems
      req.query.item_ids = itemIds.join(',');
      req.query.status = 'active';

      // Llamar al método getFailuresByItems internamente
      await this.getFailuresByItems(req, res);

    } catch (error) {
      console.error('❌ [GET FAILURES BY CHECKLIST TYPE] Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FAILURES_BY_CHECKLIST_TYPE_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  /**
   * Obtener fallas resueltas por tipo de checklist
   * GET /api/checklists/failures/resolved/by-type/:checklistTypeId
   */
  async getResolvedFailuresByChecklistType(req, res) {
    try {
      const { checklistTypeId } = req.params;

      if (!checklistTypeId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CHECKLIST_TYPE_ID_REQUIRED',
            message: 'checklistTypeId es requerido'
          }
        });
      }


      console.log('🔍 [GET RESOLVED FAILURES BY CHECKLIST TYPE] checklistTypeId:', checklistTypeId);

      // Primero, obtener todos los checklist_item_ids de este tipo
      const { ChecklistItem } = require('../models');
      const checklistItems = await ChecklistItem.findAll({
        where: {
          checklist_type_id: parseInt(checklistTypeId)
        },
        attributes: ['checklist_item_id']
      });

      if (checklistItems.length === 0) {
        console.log('🔍 [GET RESOLVED FAILURES BY CHECKLIST TYPE] No se encontraron items para el tipo:', checklistTypeId);
        return res.status(200).json({
          success: true,
          data: [],
          count: 0
        });
      }

      const itemIds = checklistItems.map(item => item.checklist_item_id);
      console.log('🔍 [GET RESOLVED FAILURES BY CHECKLIST TYPE] Items encontrados:', itemIds);

      // Obtener fallas resueltas (con OT en status RESUELTA)
      const { FailureOrder, User, Inspectable, WorkOrder } = require('../models');
      const { Op } = require('sequelize');

      const resolvedFailures = await FailureOrder.findAll({
        where: {
          [Op.or]: [
            {
              checklist_item_id: {
                [Op.in]: itemIds
              }
            },
            {
              checklist_item_id: null
            }
          ]
        },
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: require('../models').ChecklistItem,
            as: 'checklistItem',
            attributes: ['checklist_item_id', 'item_number', 'question_text']
          },
          {
            model: require('../models').Inspectable,
            as: 'affectedInspectable',
            attributes: ['ins_id', 'name', 'description', 'type_code']
          },
          {
            model: WorkOrder,
            as: 'workOrder',
            attributes: ['work_order_id', 'status', 'start_time', 'activity_performed']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Filtrar solo fallas resueltas
      const resolved = resolvedFailures.filter(fo =>
        fo.workOrder && fo.workOrder.status === 'RESUELTA'
      );

      console.log('🔍 [GET RESOLVED FAILURES BY CHECKLIST TYPE] Total fallas resueltas:', resolved.length);

      res.status(200).json({
        success: true,
        data: resolved,
        count: resolved.length
      });

    } catch (error) {
      console.error('❌ [GET RESOLVED FAILURES BY CHECKLIST TYPE] Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RESOLVED_FAILURES_BY_CHECKLIST_TYPE_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }
}

module.exports = new FailureController();
