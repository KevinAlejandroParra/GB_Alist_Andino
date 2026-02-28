'use strict';

const RequisitionService = require('../services/RequisitionService');
const FailureRequisitionService = require('../services/FailureRequisitionService');

class RequisitionController {
  // === CREACIÓN DE REQUISICIONES ===

  /**
   * El sistema crea una nueva solicitud de repuesto de manera independiente
   * POST /api/requisitions
   */
  async createRequisition(req, res) {
    try {
      const {
        workOrderId,
        partReference,
        quantityRequested,
        notes = '',
        urgencyLevel = 'NORMAL',
        imageUrl
      } = req.body;

      const requestedBy = req.user.user_id;

      // El sistema valida los campos requeridos
      if (!workOrderId || !partReference || !quantityRequested) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'workOrderId, partReference y quantityRequested son requeridos'
          }
        });
      }

      // El sistema valida que los campos numéricos sean válidos
      if (isNaN(parseInt(workOrderId)) || isNaN(parseInt(quantityRequested))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'workOrderId y quantityRequested deben ser números válidos'
          }
        });
      }

      // El sistema llama al servicio para crear la requisición
      const result = await RequisitionService.createRequisition({
        workOrderId: parseInt(workOrderId),
        partReference: partReference.trim(),
        quantityRequested: parseInt(quantityRequested),
        notes: notes.trim(),
        urgencyLevel,
        imageUrl,
        requestedBy
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error en createRequisition:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_REQUISITION_ERROR',
          message: error.message
        }
      });
    }
  }

  // === GESTIÓN DE REQUISICIONES ===

  /**
   * El sistema aprueba una solicitud de requisición pendiente
   * PUT /api/requisitions/:id/approve
   */
  async approveRequisition(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);
      const { notes = '', estimatedDeliveryDate } = req.body;

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      const approverId = req.user.user_id;

      // El sistema llama al servicio para aprobar la requisición
      const result = await RequisitionService.approveRequisition(
        requisitionId,
        approverId,
        notes,
        estimatedDeliveryDate
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en approveRequisition:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'APPROVE_REQUISITION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema aprueba la requisición y agrega automáticamente el repuesto al inventario
   * POST /api/requisitions/:id/approve-and-add-to-inventory
   */
  async approveAndAddToInventory(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);
      const {
        location = 'Almacén Central',
        category = 'Repuesto',
        status = 'Disponible',
        notes = 'Aprobado automáticamente desde requisición',
        image_url = null
      } = req.body;

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      const approverId = req.user.user_id;

      // El sistema llama al servicio para aprobar y agregar al inventario
      const result = await RequisitionService.approveAndAddToInventory(
        requisitionId,
        approverId,
        { location, category, status, notes, image_url }
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en approveAndAddToInventory:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'APPROVE_AND_ADD_INVENTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema recibe la requisición y automáticamente agrega el repuesto al inventario
   * POST /api/requisitions/:id/receive-and-add
   */
  async receiveAndAddToInventory(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);
      const {
        location = 'Almacén Central',
        category = 'Repuesto',
        status = 'Disponible',
        notes = 'Recibido automáticamente desde requisición',
        image_url = null
      } = req.body;

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      const receivedBy = req.user.user_id;

      // El sistema llama al servicio para recibir y agregar al inventario
      const result = await RequisitionService.receiveAndAddToInventory(
        requisitionId,
        receivedBy,
        { location, category, status, notes, image_url }
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en receiveAndAddToInventory:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'RECEIVE_AND_ADD_INVENTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema marca la requisición como recibida y actualiza el inventario correspondiente
   * PUT /api/requisitions/:id/receive
   */
  async markAsReceived(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);
      const {
        receivedAt,
        quantityReceived,
        notes = '',
        qualityCheckPassed = true
      } = req.body;

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      const receivedBy = req.user.user_id;

      // El sistema llama al servicio para marcar como recibida
      const result = await RequisitionService.markAsReceived(
        requisitionId,
        receivedBy,
        receivedAt,
        quantityReceived ? parseInt(quantityReceived) : undefined,
        notes,
        qualityCheckPassed
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en markAsReceived:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'MARK_AS_RECEIVED_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema cancela una requisición pendiente con una razón específica
   * PUT /api/requisitions/:id/cancel
   */
  async cancelRequisition(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);
      const { reason } = req.body;

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      // El sistema valida que se proporcione una razón de cancelación
      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: 'Razón de cancelación es requerida'
          }
        });
      }

      const cancelledBy = req.user.user_id;

      // El sistema llama al servicio para cancelar la requisición
      const result = await RequisitionService.cancelRequisition(
        requisitionId,
        reason.trim(),
        cancelledBy
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en cancelRequisition:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CANCEL_REQUISITION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema elimina una requisición por su ID
   * DELETE /api/requisitions/:id
   */
  async deleteRequisition(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);

      if (isNaN(requisitionId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID inválido' } });
      }

      const userId = req.user.user_id;
      // llamar al servicio para borrar
      const result = await RequisitionService.deleteRequisition(requisitionId, userId, req.user.role_id);

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ Error en deleteRequisition:', error);
      res.status(400).json({ success: false, error: { code: 'DELETE_REQUISITION_ERROR', message: error.message } });
    }
  }

  /**
   * El sistema obtiene una lista filtrada de requisiciones según los criterios especificados
   * GET /api/requisitions
   */
  async getRequisitions(req, res) {
    try {
      const {
        status = 'all',
        requestedBy,
        dateFrom,
        dateTo,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      // El sistema construye los filtros de búsqueda
      const filters = {
        status: status !== 'all' ? status : undefined,
        requestedBy: requestedBy ? parseInt(requestedBy) : undefined,
        dateFrom,
        dateTo,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      // El sistema llama al servicio para obtener las requisiciones
      const result = await RequisitionService.getRequisitions(filters);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getRequisitions:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_REQUISITIONS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema obtiene los detalles específicos de una requisición por su ID
   * GET /api/requisitions/:id
   */
  async getRequisitionById(req, res) {
    try {
      const { id } = req.params;
      const requisitionId = parseInt(id);

      // El sistema valida el ID de la requisición
      if (isNaN(requisitionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de requisición inválido'
          }
        });
      }

      // El sistema obtiene todas las requisiciones y filtra por ID específico
      const result = await RequisitionService.getRequisitions({
        limit: 1,
        // Agregar filtro por ID específico si el servicio lo permite
      });

      // En una implementación completa, el sistema tendría un método getById dedicado
      // Por ahora, simula la búsqueda específica
      res.status(200).json({
        success: true,
        data: {
          id: requisitionId,
          message: 'Funcionalidad de obtener por ID pendiente de implementar en servicio'
        }
      });

    } catch (error) {
      console.error('❌ Error en getRequisitionById:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_REQUISITION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema obtiene el historial de requisiciones asociadas a una orden de trabajo específica
   * GET /api/requisitions/work-order/:workOrderId
   */
  async getRequisitionHistory(req, res) {
    try {
      const { workOrderId } = req.params;

      // El sistema valida el ID de la orden de trabajo
      if (isNaN(parseInt(workOrderId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WORK_ORDER_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      // El sistema llama al servicio para obtener el historial
      const result = await RequisitionService.getRequisitionHistory(parseInt(workOrderId));

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getRequisitionHistory:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_HISTORY_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema obtiene una lista mejorada de requisiciones pendientes de aprobación con información completa
   * GET /api/requisitions/pending
   */
  async getPendingRequisitions(req, res) {
    try {
      const { Requisition } = require('../models');
      const { Op } = require('sequelize');

      // El sistema consulta las requisiciones pendientes con toda la información relacionada
      const pendingRequisitions = await Requisition.findAll({
        where: {
          status: {
            [Op.in]: ['SOLICITADO', 'PENDIENTE']
          }
        },
        include: [
          {
            model: require('../models').WorkOrder,
            as: 'workOrder',
            attributes: ['id', 'work_order_id', 'status'],
            include: [
              {
                model: require('../models').FailureOrder,
                as: 'failureOrder',
                attributes: ['id', 'description']
              }
            ]
          },
          {
            model: require('../models').User,
            as: 'requester',
            attributes: ['user_id', 'user_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // El sistema retorna la lista de requisiciones pendientes
      res.status(200).json({
        success: true,
        data: {
          requisitions: pendingRequisitions
        }
      });

    } catch (error) {
      console.error('❌ Error en getPendingRequisitions:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_PENDING_REQUISITIONS_ERROR',
          message: error.message
        }
      });
    }
  }

  // === FUNCIONES ESPECÍFICAS DE FALLAS ===

  /**
   * El sistema crea una falla con orden de trabajo y requisición automática
   * POST /api/failures/create-with-requisition
   */
  async createFailureWithRequisition(req, res) {
    try {
      // 📥 DEBUG: Log de datos recibidos en el backend
      console.log('📋 [RequisitionController] createFailureWithRequisition - Datos recibidos:')
      console.log('  - req.body:', req.body)
      console.log('  - user:', req.user?.user_id)

      const {
        checklist_item_id,
        description,
        severity = 'LEVE',
        requires_replacement = false,
        part_info = null,
        assigned_technician
      } = req.body;

      // 📤 DEBUG: Log de valores extraídos
      console.log('🔍 [RequisitionController] Valores extraídos:')
      console.log('  - checklist_item_id:', checklist_item_id, typeof checklist_item_id)
      console.log('  - description:', description)
      console.log('  - severity:', severity)
      console.log('  - requires_replacement:', requires_replacement, typeof requires_replacement)
      console.log('  - part_info:', part_info)
      console.log('  - assigned_technician:', assigned_technician, typeof assigned_technician)

      // El sistema valida los campos requeridos
      if (!checklist_item_id || !description) {
        console.log('❌ [RequisitionController] Error: Faltan campos requeridos')
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'checklist_item_id y description son requeridos'
          }
        });
      }

      // El sistema valida que checklist_item_id sea un número válido
      if (isNaN(parseInt(checklist_item_id))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'checklist_item_id debe ser un número válido'
          }
        });
      }

      // El sistema llama al servicio para crear la falla con requisición
      const result = await FailureRequisitionService.createFailureWithRequisition({
        checklist_item_id: parseInt(checklist_item_id),
        description: description.trim(),
        severity,
        evidenceUrl: req.body.evidenceUrl || null,
        requires_replacement,
        part_info,
        reported_by_id: req.user.user_id,
        assigned_technician: assigned_technician || 'TECNICO'
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('❌ Error en createFailureWithRequisition:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_FAILURE_WITH_REQUISITION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema resuelve una falla usando un repuesto del inventario disponible
   * POST /api/failures/:id/resolve-with-part
   */
  async resolveFailureWithPart(req, res) {
    try {
      const { id } = req.params;
      const {
        inventory_id,
        quantity_used,
        resolution_details
      } = req.body;

      // El sistema valida el ID de la orden de falla
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FAILURE_ORDER_ID',
            message: 'ID de orden de falla es requerido'
          }
        });
      }

      // El sistema valida los campos requeridos
      if (!inventory_id || !quantity_used || !resolution_details) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'inventory_id, quantity_used y resolution_details son requeridos'
          }
        });
      }

      // El sistema valida que los campos numéricos sean válidos
      if (isNaN(parseInt(inventory_id)) || isNaN(parseInt(quantity_used))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NUMERIC_FIELDS',
            message: 'inventory_id y quantity_used deben ser números válidos'
          }
        });
      }

      // El sistema llama al servicio para resolver la falla
      const result = await FailureRequisitionService.resolveFailureWithPart(parseInt(id), {
        inventory_id: parseInt(inventory_id),
        quantity_used: parseInt(quantity_used),
        resolution_details,
        completed_by_id: req.user.user_id
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en resolveFailureWithPart:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'RESOLVE_FAILURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * El sistema busca repuestos disponibles específicamente para resolver una falla registrada
   * GET /api/failures/:id/available-parts
   */
  async getAvailablePartsForFailure(req, res) {
    try {
      const { id } = req.params;

      // El sistema valida el ID de la orden de falla
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FAILURE_ORDER_ID',
            message: 'ID de orden de falla es requerido'
          }
        });
      }

      // El sistema valida que el ID sea un número válido
      if (isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FAILURE_ORDER_ID',
            message: 'ID de orden de falla debe ser un número válido'
          }
        });
      }

      // El sistema llama al servicio para obtener repuestos disponibles
      const result = await FailureRequisitionService.getAvailablePartsForFailure(parseInt(id));

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getAvailablePartsForFailure:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_AVAILABLE_PARTS_ERROR',
          message: error.message
        }
      });
    }
  }

  // === ESTADÍSTICAS ===

  /**
   * El sistema obtiene estadísticas generales de requisiciones en un período determinado
   * GET /api/requisitions/statistics
   */
  async getStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      // El sistema llama al servicio para obtener estadísticas
      const result = await RequisitionService.getStatistics(dateFrom, dateTo);

      res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en getStatistics:', error);
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
   * El sistema obtiene estadísticas específicas de requisiciones por estado
   * GET /api/requisitions/statistics
   */
  async getRequisitionStatistics(req, res) {
    try {
      const { Requisition } = require('../models');
      const { Op } = require('sequelize');

      // El sistema cuenta las requisiciones por estado
      const [
        total,
        solicitadas,
        recibidas,
        canceladas
      ] = await Promise.all([
        Requisition.count(),
        Requisition.count({ where: { status: 'SOLICITADO' } }),
        Requisition.count({ where: { status: 'RECIBIDO' } }),
        Requisition.count({ where: { status: 'CANCELADO' } })
      ]);

      // El sistema retorna las estadísticas calculadas
      res.status(200).json({
        success: true,
        data: {
          total,
          solicitadas,
          recibidas,
          canceladas,
          pendientes: solicitadas
        }
      });

    } catch (error) {
      console.error('❌ Error en getRequisitionStatistics:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_REQUISITION_STATISTICS_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new RequisitionController();