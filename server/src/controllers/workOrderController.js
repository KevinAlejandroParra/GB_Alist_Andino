'use strict';

const WorkOrderService = require('../services/workOrderService');
const { WorkOrder, WorkOrderPart, Inventory } = require('../models');

class WorkOrderController {
  /**
   * Crear orden de trabajo desde OF
   * POST /api/work-orders
   */
  async createWorkOrder(req, res) {
    try {
      const {
        failure_order_id,
        description,
        priority_level = 'NORMAL',
        created_by_id
      } = req.body;

      // Validaciones básicas
      if (!failure_order_id || !description) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'failure_order_id y description son requeridos'
          }
        });
      }

      const userId = created_by_id || req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado'
          }
        });
      }

      // Llamar al servicio refactorizado
      const result = await WorkOrderService.createWorkOrder({
        failure_order_id: parseInt(failure_order_id),
        description: description.trim(),
        priority_level,
        created_by_id: userId
      });

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en createWorkOrder:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Iniciar trabajo en OT
   * PUT /api/work-orders/:id/start
   */
  async startWork(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { started_by } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      const userId = started_by || req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado'
          }
        });
      }

      const result = await WorkOrderService.startWork(workOrderId, userId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en startWork:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'START_WORK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Finalizar trabajo en OT
   * PUT /api/work-orders/:id/finish
   */
  async finishWork(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { activity_performed, evidence_url } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      if (!activity_performed || activity_performed.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVITY_REQUIRED',
            message: 'activity_performed es requerido'
          }
        });
      }

      const result = await WorkOrderService.finishWork(
        workOrderId,
        activity_performed.trim(),
        evidence_url
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en finishWork:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'FINISH_WORK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Registrar resultados de pruebas
   * PUT /api/work-orders/:id/tests
   */
  async performTests(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { test_results } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      if (!test_results || test_results.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TEST_RESULTS_REQUIRED',
            message: 'test_results es requerido'
          }
        });
      }

      const result = await WorkOrderService.performTests(
        workOrderId,
        test_results.trim()
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en performTests:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'PERFORM_TESTS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Resolver WorkOrder (cierre final)
   * PUT /api/work-orders/:id/resolve
   */
  async resolveWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { resolved_by } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      const userId = resolved_by || req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado'
          }
        });
      }

      const result = await WorkOrderService.resolveWorkOrder(workOrderId, userId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en resolveWorkOrder:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'RESOLVE_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener OTs por área
   * GET /api/work-orders/area/:area
   */
  async getByArea(req, res) {
    try {
      const { area } = req.params;

      if (!['TECNICA', 'OPERATIVA'].includes(area)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AREA',
            message: 'Área debe ser TECNICA u OPERATIVA'
          }
        });
      }

      const result = await WorkOrderService.getByArea(area);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en getByArea:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_BY_AREA_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Cancelar orden de trabajo
   * PUT /api/work-orders/:id/cancel
   */
  async cancelWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { reason } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: 'Razón de cancelación es requerida'
          }
        });
      }

      const result = await WorkOrderService.cancelWorkOrder(
        workOrderId,
        reason.trim()
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en cancelWorkOrder:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CANCEL_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener lista de órdenes de trabajo con filtros
   * GET /api/work-orders
   */
  async getWorkOrders(req, res) {
    try {
      const { status, priority_level, dateFrom, dateTo } = req.query;

      const filters = { status, priority_level, dateFrom, dateTo };
      const result = await WorkOrderService.getWorkOrders(filters);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en getWorkOrders:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_WORK_ORDERS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener detalles de una OT específica
   * GET /api/work-orders/:id
   */
  async getWorkOrderById(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      const result = await WorkOrderService.getWorkOrderById(workOrderId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en getWorkOrderById:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Agregar múltiples repuestos a una orden de trabajo
   * POST /api/work-orders/:id/parts/multiple
   */
  async addMultipleParts(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { parts = [] } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WORK_ORDER_ID',
            message: 'workOrderId debe ser un número válido'
          }
        });
      }

      if (!Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARTS_ARRAY',
            message: 'parts debe ser un array con al menos un repuesto'
          }
        });
      }

      const cleanedParts = parts.map((part, index) => {
        const inventoryId = parseInt(part.inventoryId || part.partId);
        const quantity = parseInt(part.quantity || part.quantityUsed || 1);
        
        if (isNaN(inventoryId)) {
          throw new Error(`ID inválido para repuesto ${index + 1}`);
        }
        
        return { inventoryId, quantity };
      });
      
      const result = await WorkOrderService.useMultipleParts(workOrderId, cleanedParts);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en addMultipleParts:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ADD_MULTIPLE_PARTS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener estadísticas de OT
   * GET /api/work-orders/statistics
   */
  async getStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      const dateRange = { from: dateFrom, to: dateTo };

      const result = await WorkOrderService.getStatistics(dateRange);

      res.status(200).json({
        success: true,
        data: result
      });

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
   * Obtener la última orden de trabajo creada por el usuario actual
   * GET /api/work-orders/latest
   */
  async getLatestWorkOrderByUser(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado'
          }
        });
      }

      const result = await WorkOrderService.getLatestWorkOrderByUser(userId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en getLatestWorkOrderByUser:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LATEST_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Actualizar campos específicos de una orden de trabajo
   * PUT /api/work-orders/:id/update
   */
  async updateWorkOrderFields(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      
      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      const updateData = {};
      const allowedFields = [
        'start_time',
        'end_time',
        'activity_performed',
        'evidence_url',
        'closure_signature',
        'requiere_replacement',
        'resolved_by_id',
        'status'
      ];

      // Filtrar solo campos permitidos
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FIELDS_TO_UPDATE',
            message: 'No se proporcionaron campos válidos para actualizar'
          }
        });
      }

      const result = await WorkOrderService.updateWorkOrderFields(workOrderId, updateData);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en updateWorkOrderFields:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_WORK_ORDER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Obtener repuestos de una orden de trabajo
   * GET /api/work-orders/:id/parts
   */
  async getWorkOrderParts(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      const parts = await WorkOrderPart.findAll({
        where: { work_order_id: workOrderId },
        include: [{
          model: Inventory,
          as: 'inventory',
          attributes: ['id', 'part_name', 'details', 'category', 'location', 'quantity', 'status']
        }]
      });

      res.status(200).json({
        success: true,
        data: parts
      });

    } catch (error) {
      console.error('❌ Error en getWorkOrderParts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_WORK_ORDER_PARTS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Eliminar un repuesto de una orden de trabajo
   * DELETE /api/work-orders/:id/parts/:partId
   */
  async removeWorkOrderPart(req, res) {
    try {
      const { id, partId } = req.params;
      const workOrderId = parseInt(id);
      const workOrderPartId = parseInt(partId);

      if (isNaN(workOrderId) || isNaN(workOrderPartId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'IDs inválidos'
          }
        });
      }

      const part = await WorkOrderPart.findOne({
        where: { id: workOrderPartId, work_order_id: workOrderId }
      });

      if (!part) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PART_NOT_FOUND',
            message: 'Repuesto no encontrado en esta orden de trabajo'
          }
        });
      }

      await part.destroy();

      res.status(200).json({
        success: true,
        message: 'Repuesto eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error en removeWorkOrderPart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_WORK_ORDER_PART_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Agregar un repuesto a una orden de trabajo
   * POST /api/work-orders/:id/parts
   */
  async addWorkOrderPart(req, res) {
    try {
      const { id } = req.params;
      const workOrderId = parseInt(id);
      const { inventory_id, quantity_used, quantity_requested } = req.body;

      if (isNaN(workOrderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID de orden de trabajo inválido'
          }
        });
      }

      if (!inventory_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVENTORY_ID_REQUIRED',
            message: 'inventory_id es requerido'
          }
        });
      }

      // Verificar que la orden de trabajo existe
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORK_ORDER_NOT_FOUND',
            message: 'Orden de trabajo no encontrada'
          }
        });
      }

      const newQuantity = quantity_used || quantity_requested || 1;
      const inventoryId = parseInt(inventory_id);

      // Verificar si ya existe un repuesto con el mismo inventory_id para esta orden de trabajo
      const existingPart = await WorkOrderPart.findOne({
        where: {
          work_order_id: workOrderId,
          inventory_id: inventoryId
        }
      });

      let partWithInventory;

      if (existingPart) {
        // Si ya existe, actualizar la cantidad sumándola a la existente
        existingPart.quantity_used += newQuantity;
        await existingPart.save();

        // Obtener el repuesto actualizado con información del inventario
        partWithInventory = await WorkOrderPart.findByPk(existingPart.id, {
          include: [{
            model: Inventory,
            as: 'inventory',
            attributes: ['id', 'part_name', 'details', 'category', 'location', 'quantity', 'status']
          }]
        });
      } else {
        // Si no existe, crear un nuevo registro
        const newPart = await WorkOrderPart.create({
          work_order_id: workOrderId,
          inventory_id: inventoryId,
          quantity_used: newQuantity
        });

        // Obtener el repuesto con información del inventario
        partWithInventory = await WorkOrderPart.findByPk(newPart.id, {
          include: [{
            model: Inventory,
            as: 'inventory',
            attributes: ['id', 'part_name', 'details', 'category', 'location', 'quantity', 'status']
          }]
        });
      }

      const message = existingPart
        ? 'Cantidad de repuesto actualizada exitosamente'
        : 'Repuesto agregado exitosamente';

      res.status(200).json({
        success: true,
        data: partWithInventory,
        message: message
      });

    } catch (error) {
      console.error('❌ Error en addWorkOrderPart:', error);
      
      // Manejar específicamente el error de constraint único
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_PART',
            message: 'Este repuesto ya existe en la orden de trabajo'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'ADD_WORK_ORDER_PART_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new WorkOrderController();