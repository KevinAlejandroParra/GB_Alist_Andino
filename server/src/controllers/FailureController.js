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
   * Obtener lista de órdenes de falla con filtros y filtrado automático por rol
   * GET /api/failures
   */
  async getFailureOrders(req, res) {
    try {
      console.log('🔍 [GET FAILURE ORDERS] Iniciando petición');
      console.log('🔍 [GET FAILURE ORDERS] User role:', req.user?.role_id);
      console.log('🔍 [GET FAILURE ORDERS] Query params:', req.query);

      const {
        status = 'all',
        severity,
        type_maintenance,
        hasWorkOrder, // 'true', 'false', o undefined
        hasParts, // 'true', 'false', o undefined
        page = 1,
        limit = 100,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const { FailureOrder, User, Inspectable, WorkOrder, WorkOrderPart, Inventory, ChecklistItem } = require('../models');
      const { Op } = require('sequelize');

      // Filtrado automático por rol
      let assignedToFilter = {};
      const userRole = req.user.role_id;

      if (userRole === 4) {
        // Anfitrión: solo OPERATIVA
        assignedToFilter = { assigned_to: 'OPERATIVA' };
      } else if (userRole === 3) {
        // Técnico: TECNICA + type_maintenance LOCATIVA
        assignedToFilter = {
          [Op.or]: [
            { assigned_to: 'TECNICA' },
            { type_maintenance: 'LOCATIVA' }
          ]
        };
      }
      // Admin (1) y Soporte (2): sin filtro, ven todo

      console.log('🔍 [GET FAILURE ORDERS] Filtro por rol:', assignedToFilter);

      // Construir filtros adicionales
      let whereConditions = { ...assignedToFilter };

      if (severity && severity !== 'all') {
        whereConditions.severity = severity;
      }

      if (type_maintenance && type_maintenance !== 'all') {
        whereConditions.type_maintenance = type_maintenance;
      }

      console.log('🔍 [GET FAILURE ORDERS] Where conditions:', whereConditions);

      // Consultar todas las fallas con relaciones
      const failures = await FailureOrder.findAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name', 'role_id']
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
            model: User,
            as: 'adminSigner',
            attributes: ['user_id', 'user_name']
          },
          {
            model: WorkOrder,
            as: 'workOrder',
            attributes: ['id', 'work_order_id', 'status', 'start_time', 'end_time', 'activity_performed', 'evidence_url', 'requiere_replacement', 'resolved_by_id'],
            include: [
              {
                model: User,
                as: 'resolver',
                attributes: ['user_id', 'user_name']
              },
              {
                model: WorkOrderPart,
                as: 'parts',
                include: [
                  {
                    model: Inventory,
                    as: 'inventory',
                    attributes: ['id', 'part_name', 'category', 'quantity', 'location', 'status']
                  }
                ]
              }
            ]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      console.log('✅ [GET FAILURE ORDERS] Fallas encontradas:', failures.length);

      // Filtros post-consulta
      let filteredFailures = failures;

      // Filtro por estado (pendiente/resuelta)
      if (status !== 'all') {
        if (status === 'pending') {
          filteredFailures = filteredFailures.filter(f => !f.workOrder || !['RESUELTA', 'CANCELADO'].includes(f.workOrder.status));
        } else if (status === 'resolved') {
          filteredFailures = filteredFailures.filter(f => f.workOrder && ['RESUELTA', 'CANCELADO'].includes(f.workOrder.status));
        }
      }

      // Filtro por tiene/no tiene OT
      if (hasWorkOrder === 'true') {
        filteredFailures = filteredFailures.filter(f => f.workOrder);
      } else if (hasWorkOrder === 'false') {
        filteredFailures = filteredFailures.filter(f => !f.workOrder);
      }

      // Filtro por tiene/no tiene repuestos
      if (hasParts === 'true') {
        filteredFailures = filteredFailures.filter(f => f.workOrder && f.workOrder.parts && f.workOrder.parts.length > 0);
      } else if (hasParts === 'false') {
        filteredFailures = filteredFailures.filter(f => !f.workOrder || !f.workOrder.parts || f.workOrder.parts.length === 0);
      }

      console.log('✅ [GET FAILURE ORDERS] Fallas filtradas:', filteredFailures.length);

      res.status(200).json({
        success: true,
        data: {
          failures: filteredFailures,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredFailures.length
          },
          filters: {
            role: userRole,
            status,
            severity,
            type_maintenance,
            hasWorkOrder,
            hasParts
          }
        }
      });

    } catch (error) {
      console.error('❌ [GET FAILURE ORDERS] Error:', error);
      console.error('❌ [GET FAILURE ORDERS] Stack:', error.stack);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_FAILURE_ORDERS_ERROR',
          message: error.message,
          details: error.stack
        }
      });
    }
  }

  /**
   * Obtener detalles completos de una OF con toda la información
   * GET /api/failures/:id/complete
   */
  async getFailureComplete(req, res) {
    try {
      const { FailureOrder, User, Inspectable, WorkOrder, WorkOrderPart, Inventory, ChecklistItem } = require('../models');

      const { id } = req.params;
      const failureOrderId = parseInt(id);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'ID de orden de falla inválido' }
        });
      }

      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name', 'role_id']
          },
          {
            model: User,
            as: 'adminSigner',
            attributes: ['user_id', 'user_name']
          },
          {
            model: ChecklistItem,
            as: 'checklistItem',
            attributes: ['checklist_item_id', 'question_text', 'item_number', 'guidance_text']
          },
          {
            model: Inspectable,
            as: 'affectedInspectable',
            attributes: ['ins_id', 'name', 'description', 'type_code']
          },
          {
            model: WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: User,
                as: 'resolver',
                attributes: ['user_id', 'user_name', 'role_id']
              },
              {
                model: WorkOrderPart,
                as: 'parts',
                include: [
                  {
                    model: Inventory,
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
          error: { code: 'FAILURE_ORDER_NOT_FOUND', message: 'Orden de falla no encontrada' }
        });
      }

      res.status(200).json({
        success: true,
        data: failureOrder
      });

    } catch (error) {
      console.error('❌ Error en getFailureComplete:', error);
      res.status(400).json({
        success: false,
        error: { code: 'GET_FAILURE_COMPLETE_ERROR', message: error.message }
      });
    }
  }

  /**
   * Eliminar una WorkOrder (solo si está vacía/sin actividad)
   * DELETE /api/work-orders/:id
   */
  async deleteWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);

      console.log('🗑️ [DELETE WORK ORDER] Iniciando eliminación');
      console.log('🗑️ Work Order ID:', workOrderId);

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'ID de orden de trabajo inválido' }
        });
      }

      const { WorkOrder, WorkOrderPart } = require('../models');

      // Buscar la WorkOrder
      const workOrder = await WorkOrder.findByPk(workOrderId);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Orden de trabajo no encontrada' }
        });
      }

      // Validar que la OT esté vacía (sin actividad realizada)
      if (workOrder.activity_performed && workOrder.activity_performed.trim() !== '') {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'WORK_ORDER_HAS_ACTIVITY', 
            message: 'No se puede eliminar una orden de trabajo que ya tiene actividad registrada' 
          }
        });
      }

      // Validar que no esté resuelta
      if (workOrder.status === 'RESUELTA') {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'WORK_ORDER_RESOLVED', 
            message: 'No se puede eliminar una orden de trabajo resuelta' 
          }
        });
      }

      // Eliminar repuestos asociados (si los hay)
      await WorkOrderPart.destroy({
        where: { work_order_id: workOrderId }
      });

      console.log('✅ Repuestos eliminados');

      // Eliminar la WorkOrder
      await workOrder.destroy();

      console.log('✅ WorkOrder eliminada:', workOrder.work_order_id);

      res.status(200).json({
        success: true,
        message: 'Orden de trabajo eliminada exitosamente',
        data: {
          work_order_id: workOrder.work_order_id,
          failure_order_id: workOrder.failure_order_id
        }
      });

    } catch (error) {
      console.error('❌ [DELETE WORK ORDER] Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Crear WorkOrder para una FailureOrder existente
   * POST /api/work-orders/create-for-failure
   */
  async createWorkOrderForFailure(req, res) {
    try {
      const { failure_order_id, created_by_id } = req.body;

      console.log('🔧 [CREATE WO FOR FAILURE] Iniciando creación de OT');
      console.log('🔧 Failure Order ID:', failure_order_id);

      if (!failure_order_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'FAILURE_ID_REQUIRED', message: 'failure_order_id es requerido' }
        });
      }

      const { FailureOrder, WorkOrder } = require('../models');

      // Verificar que la falla existe
      const failureOrder = await FailureOrder.findByPk(failure_order_id);

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'FAILURE_NOT_FOUND', message: 'Falla no encontrada' }
        });
      }

      // Verificar que NO tiene ya una WorkOrder
      const existingWorkOrder = await WorkOrder.findOne({
        where: { failure_order_id }
      });

      if (existingWorkOrder) {
        return res.status(400).json({
          success: false,
          error: { code: 'WORK_ORDER_EXISTS', message: 'Esta falla ya tiene una orden de trabajo' }
        });
      }

      // Generar ID único para la WorkOrder
      const { v4: uuidv4 } = require('uuid');
      const work_order_id = `OT-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`;

      // Crear la WorkOrder
      const workOrder = await WorkOrder.create({
        work_order_id,
        failure_order_id,
        status: 'EN_PROCESO',
        start_time: new Date(),
        linked_failure_ids: JSON.stringify([failure_order_id])
      });

      console.log('✅ [CREATE WO FOR FAILURE] WorkOrder creada:', work_order_id);

      // Recargar con relaciones
      const createdWorkOrder = await WorkOrder.findByPk(workOrder.id, {
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder'
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Orden de trabajo creada exitosamente',
        data: createdWorkOrder
      });

    } catch (error) {
      console.error('❌ [CREATE WO FOR FAILURE] Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Desenlazar una falla de su WorkOrder enlazada
   * DELETE /api/failures/:id/unlink-work-order
   * Elimina la WorkOrder espejo y actualiza las referencias
   */
  async unlinkFromWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const failureOrderId = parseInt(id);

      console.log('🔓 [UNLINK WORK ORDER] Iniciando desenlace');
      console.log('🔓 Failure ID:', failureOrderId);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FAILURE_ID', message: 'ID de falla inválido' }
        });
      }

      const { FailureOrder, WorkOrder, WorkOrderPart } = require('../models');

      // Verificar que la falla existe y TIENE una OT
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [{ model: WorkOrder, as: 'workOrder' }]
      });

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'FAILURE_NOT_FOUND', message: 'Falla no encontrada' }
        });
      }

      if (!failureOrder.workOrder) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_WORK_ORDER', message: 'Esta falla no tiene una orden de trabajo asociada' }
        });
      }

      const workOrder = failureOrder.workOrder;

      // Verificar si es una WorkOrder enlazada (tiene el sufijo -L)
      const isLinkedWorkOrder = workOrder.work_order_id.includes('-L');

      if (!isLinkedWorkOrder) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'CANNOT_UNLINK_ORIGINAL', 
            message: 'No se puede desenlazar la orden de trabajo original. Solo se pueden desenlazar órdenes enlazadas.' 
          }
        });
      }

      // Obtener los IDs de fallas enlazadas
      let linkedFailureIds = [];
      if (workOrder.linked_failure_ids) {
        try {
          linkedFailureIds = JSON.parse(workOrder.linked_failure_ids);
        } catch (e) {
          linkedFailureIds = [];
        }
      }

      console.log('🔓 IDs enlazados antes de desenlazar:', linkedFailureIds);

      // Eliminar esta falla de la lista
      const updatedLinkedIds = linkedFailureIds.filter(id => id !== failureOrderId);

      console.log('🔓 IDs enlazados después de desenlazar:', updatedLinkedIds);

      // Actualizar las otras WorkOrders enlazadas
      if (updatedLinkedIds.length > 0) {
        const otherWorkOrders = await WorkOrder.findAll({
          where: {
            failure_order_id: updatedLinkedIds
          }
        });

        for (const wo of otherWorkOrders) {
          await wo.update({
            linked_failure_ids: JSON.stringify(updatedLinkedIds)
          });
        }

        console.log(`✅ ${otherWorkOrders.length} WorkOrders actualizadas con nueva lista de enlaces`);
      }

      // Eliminar los repuestos asociados a esta WorkOrder
      await WorkOrderPart.destroy({
        where: { work_order_id: workOrder.id }
      });

      console.log('✅ Repuestos de la WorkOrder eliminados');

      // Eliminar la WorkOrder espejo
      await workOrder.destroy();

      console.log('✅ WorkOrder espejo eliminada:', workOrder.work_order_id);

      res.status(200).json({
        success: true,
        message: 'Falla desenlazada exitosamente',
        data: {
          failureOrderId: failureOrderId,
          deletedWorkOrderId: workOrder.work_order_id,
          remainingLinkedFailures: updatedLinkedIds.length,
          note: 'La falla ya no está sincronizada con otras órdenes de trabajo'
        }
      });

    } catch (error) {
      console.error('❌ Error en unlinkFromWorkOrder:', error);
      console.error('❌ Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: { 
          code: 'UNLINK_WORK_ORDER_ERROR', 
          message: error.message,
          details: error.stack
        }
      });
    }
  }

  /**
   * Enlazar una falla a una WorkOrder existente (para resolver duplicados)
   * POST /api/failures/:id/link-work-order
   * Body: { work_order_id: "OT-2026-444594" } (string, no número)
   * 
   * ✅ ACTUALIZADO: Crea una WorkOrder "espejo" que sincroniza con la original
   * Ambas WorkOrders comparten el mismo work_order_id base y se actualizan juntas
   */
  async linkToWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const { work_order_id } = req.body;

      console.log('🔗 [LINK TO WORK ORDER] Iniciando enlace');
      console.log('🔗 Failure ID:', id);
      console.log('🔗 Work Order ID recibido:', work_order_id);

      const failureOrderId = parseInt(id);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FAILURE_ID', message: 'ID de falla inválido' }
        });
      }

      if (!work_order_id || typeof work_order_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_WORK_ORDER_ID', message: 'work_order_id debe ser un string (ej: OT-2026-444594)' }
        });
      }

      const { FailureOrder, WorkOrder, WorkOrderPart, Inventory } = require('../models');

      // Verificar que la falla existe y NO tiene OT
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [{ model: WorkOrder, as: 'workOrder' }]
      });

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'FAILURE_NOT_FOUND', message: 'Falla no encontrada' }
        });
      }

      if (failureOrder.workOrder) {
        return res.status(400).json({
          success: false,
          error: { code: 'FAILURE_ALREADY_HAS_WO', message: 'Esta falla ya tiene una orden de trabajo asociada' }
        });
      }

      // Buscar la OT original por work_order_id (string)
      const originalWorkOrder = await WorkOrder.findOne({
        where: { work_order_id: work_order_id },
        include: [
          {
            model: WorkOrderPart,
            as: 'parts',
            include: [
              {
                model: Inventory,
                as: 'inventory'
              }
            ]
          }
        ]
      });

      console.log('🔗 Work Order original encontrada:', originalWorkOrder ? 'SÍ' : 'NO');

      if (!originalWorkOrder) {
        return res.status(404).json({
          success: false,
          error: { 
            code: 'WORK_ORDER_NOT_FOUND', 
            message: `No se encontró una orden de trabajo con ID: ${work_order_id}` 
          }
        });
      }

      // ✅ PREPARAR: Calcular los IDs enlazados ANTES de crear la WorkOrder
      const originalLinkedIds = originalWorkOrder.linked_failure_ids 
        ? JSON.parse(originalWorkOrder.linked_failure_ids) 
        : [originalWorkOrder.failure_order_id];
      
      // Agregar la nueva falla a la lista
      originalLinkedIds.push(failureOrder.id);
      
      console.log('🔗 IDs de fallas que se enlazarán:', originalLinkedIds);

      // ✅ SOLUCIÓN: Crear una WorkOrder "espejo" que comparte el mismo work_order_id base
      // pero con un sufijo para mantener la unicidad en la BD
      const linkedWorkOrderId = `${work_order_id}-L${failureOrder.id}`;

      // ✅ CREAR con linked_failure_ids desde el inicio (no NULL)
      const linkedWorkOrder = await WorkOrder.create({
        work_order_id: linkedWorkOrderId,
        failure_order_id: failureOrder.id,
        status: originalWorkOrder.status,
        requiere_replacement: originalWorkOrder.requiere_replacement,
        activity_performed: originalWorkOrder.activity_performed,
        evidence_url: originalWorkOrder.evidence_url,
        start_time: originalWorkOrder.start_time,
        end_time: originalWorkOrder.end_time,
        resolved_by_id: originalWorkOrder.resolved_by_id,
        closure_signature: originalWorkOrder.closure_signature,
        linked_failure_ids: JSON.stringify(originalLinkedIds) // ✅ Inicializar aquí
      });

      console.log('✅ WorkOrder espejo creada:', linkedWorkOrderId);
      console.log('✅ linked_failure_ids inicializado:', originalLinkedIds);

      // Copiar los repuestos si existen
      if (originalWorkOrder.parts && originalWorkOrder.parts.length > 0) {
        console.log('🔗 Copiando', originalWorkOrder.parts.length, 'repuestos');
        
        for (const part of originalWorkOrder.parts) {
          await WorkOrderPart.create({
            work_order_id: linkedWorkOrder.id,
            inventory_id: part.inventory_id,
            quantity_used: part.quantity_used
          });
        }
      }

      // ✅ Actualizar la WorkOrder original para registrar el enlace
      await originalWorkOrder.update({
        linked_failure_ids: JSON.stringify(originalLinkedIds)
      });

      console.log('✅ Fallas enlazadas en ambas WorkOrders:', originalLinkedIds);

      // Recargar la falla con la OT asociada
      await failureOrder.reload({
        include: [
          { 
            model: WorkOrder, 
            as: 'workOrder',
            include: [
              {
                model: WorkOrderPart,
                as: 'parts',
                include: [
                  {
                    model: Inventory,
                    as: 'inventory'
                  }
                ]
              }
            ]
          }
        ]
      });

      res.status(200).json({
        success: true,
        message: 'Falla enlazada exitosamente. La información de la OT se ha copiado y se mantendrá sincronizada.',
        data: {
          failureOrder: failureOrder,
          linkedWorkOrder: linkedWorkOrder,
          originalWorkOrder: {
            id: originalWorkOrder.id,
            work_order_id: originalWorkOrder.work_order_id
          },
          linkedFailureIds: originalLinkedIds,
          note: 'IMPORTANTE: Para mantener sincronización, actualiza todas las OTs enlazadas cuando modifiques una'
        }
      });

    } catch (error) {
      console.error('❌ Error en linkToWorkOrder:', error);
      console.error('❌ Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: { 
          code: 'LINK_WORK_ORDER_ERROR', 
          message: error.message,
          details: error.stack
        }
      });
    }
  }

  /**
   * Obtener fallas enlazadas a una WorkOrder
   * GET /api/failures/:id/linked-failures
   */
  async getLinkedFailures(req, res) {
    try {
      const { id } = req.params;
      const failureOrderId = parseInt(id);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'ID de falla inválido' }
        });
      }

      const { FailureOrder, WorkOrder } = require('../models');

      // Obtener la falla con su WorkOrder
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [{ model: WorkOrder, as: 'workOrder' }]
      });

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'FAILURE_NOT_FOUND', message: 'Falla no encontrada' }
        });
      }

      if (!failureOrder.workOrder) {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'Esta falla no tiene orden de trabajo asociada'
        });
      }

      // Usar el servicio de sincronización para obtener fallas enlazadas
      const WorkOrderSyncService = require('../services/WorkOrderSyncService');
      const result = await WorkOrderSyncService.getLinkedFailures(failureOrder.workOrder.id);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error obteniendo fallas enlazadas:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LINKED_FAILURES_ERROR',
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
   * Incrementar contador de recurrencia de una falla
   * PUT /api/failures/:id/increment-recurrence
   */
  async incrementRecurrence(req, res) {
    try {
      const { id } = req.params;
      const failureOrderId = parseInt(id);

      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'ID de orden de falla inválido' }
        });
      }

      const { FailureOrder } = require('../models');
      const failureOrder = await FailureOrder.findByPk(failureOrderId);

      if (!failureOrder) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Orden de falla no encontrada' }
        });
      }

      await failureOrder.update({
        recurrence_count: failureOrder.recurrence_count + 1,
        is_recurring: true
      });

      console.log(`✅ Recurrencia incrementada para OF ${failureOrder.failure_order_id}: ${failureOrder.recurrence_count + 1}`);

      return res.status(200).json({
        success: true,
        data: {
          id: failureOrder.id,
          failure_order_id: failureOrder.failure_order_id,
          recurrence_count: failureOrder.recurrence_count + 1,
          is_recurring: true
        },
        message: 'Recurrencia registrada exitosamente'
      });
    } catch (error) {
      console.error('❌ Error en incrementRecurrence:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INCREMENT_RECURRENCE_ERROR', message: error.message }
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

      let whereConditions = {};

      // Si se proporciona inspectable_id, filtrar por affected_id
      if (inspectable_id) {
        const inspectableIdArray = String(inspectable_id).split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (inspectableIdArray.length > 0) {
          console.log('🔍 [GET FAILURES BY ITEMS] Filtrando por inspectable_id (affected_id):', inspectableIdArray);

          // Filtrar por checklist_item_id Y affected_id
          whereConditions = {
            [Op.or]: [
              {
                // Fallas de items de familia: deben coincidir item_id Y affected_id
                checklist_item_id: {
                  [Op.in]: itemIdsArray
                },
                affected_id: {
                  [Op.in]: inspectableIdArray
                }
              },
              {
                // Fallas independientes: solo deben coincidir affected_id
                checklist_item_id: null,
                affected_id: {
                  [Op.in]: inspectableIdArray
                }
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

      // Filtrar tanto por checklist_item_id específico como por NULL (fallas independientes)
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
   * Exportar fallas a Excel (informe gerencial)
   * GET /api/failures/export/excel
   * TODO: Actualizar para usar los campos correctos del modelo Inventory
   */
  async exportFailuresToExcel(req, res) {
    try {
      // Temporalmente deshabilitado - necesita actualización del modelo Inventory
      return res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Exportación a Excel temporalmente deshabilitada. Contacte al administrador.'
        }
      });
    } catch (error) {
      console.error('❌ Error exportando fallas a Excel:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_EXCEL_ERROR',
          message: error.message
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

  /**
   * Eliminar una Orden de Falla permanentemente
   * DELETE /api/failures/:id
   * ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
   * Elimina la falla, su WorkOrder asociada, repuestos y la imagen de evidencia del servidor
   */
  async deleteFailureOrder(req, res) {
    try {
      const { id } = req.params;
      const failureOrderId = parseInt(id);

      console.log('🗑️ [DELETE FAILURE ORDER] Iniciando eliminación');
      console.log('🗑️ Failure Order ID:', failureOrderId);
      console.log('🗑️ Usuario que solicita:', req.user?.user_id, '- Rol:', req.user?.role_id);

      // Validar ID
      if (isNaN(failureOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de falla inválido'
          }
        });
      }

      // Validar permisos: Admin (1), Soporte (2), Técnico (3) o Anfitrión (4) pueden eliminar fallas
      if (![1, 2, 3, 4].includes(req.user.role_id)) {
        console.log('❌ [DELETE FAILURE ORDER] Acceso denegado - Rol insuficiente');
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'No tienes permisos para eliminar órdenes de falla'
          }
        });
      }

      // Llamar al servicio para eliminar
      const result = await FailureOrderService.deleteFailureOrder(failureOrderId);

      console.log('✅ [DELETE FAILURE ORDER] Eliminación exitosa:', result.deletedInfo);

      res.status(200).json({
        success: true,
        message: 'Orden de falla eliminada permanentemente',
        data: result.deletedInfo,
        warning: 'Esta acción no se puede deshacer'
      });

    } catch (error) {
      console.error('❌ [DELETE FAILURE ORDER] Error:', error);
      console.error('❌ [DELETE FAILURE ORDER] Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILURE_ORDER_ERROR',
          message: error.message,
          details: error.stack
        }
      });
    }
  }
}

module.exports = new FailureController();
