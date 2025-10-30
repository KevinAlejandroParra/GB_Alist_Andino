const workOrderService = require("../services/workOrderService");
const checklistService = require("../services/checklistService");
const { Sequelize } = require("../models");
const Op = Sequelize.Op;

/**
 * Obtener órdenes de trabajo pendientes
 */
const getPendingWorkOrders = async (req, res) => {
  try {
    const userId = req.query.user_id ? Number.parseInt(req.query.user_id) : null;
    const checklistTypeId = req.query.checklist_type_id ? Number.parseInt(req.query.checklist_type_id) : null;
    const checklistId = req.query.checklist_id ? Number.parseInt(req.query.checklist_id) : null;
    
    console.log('🔍 Debug: getPendingWorkOrders recibe:', { userId, checklistTypeId, checklistId, query: req.query });

    const filters = { checklistTypeId, checklistId };
    const workOrders = await workOrderService.getPendingWorkOrders(userId, filters);

    res.status(200).json(workOrders);
  } catch (error) {
    console.error('Error obteniendo órdenes de trabajo pendientes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener una orden de trabajo específica por ID
 */
const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const workOrders = await workOrderService.getPendingWorkOrders();
    const workOrder = workOrders.find(wo => wo.id === Number.parseInt(id));

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        error: 'Orden de trabajo no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: workOrder
    });
  } catch (error) {
    console.error('Error obteniendo orden de trabajo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cerrar una orden de trabajo (actualizado para nuevos campos)
 */
const closeWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      closing_response_id,
      solution_text,
      resolution_details,
      evidence_solution_url,
      responsible_area
    } = req.body;
    const closedById = req.user.user_id;

    if (!closing_response_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la respuesta de cierre'
      });
    }

    const workOrder = await workOrderService.closeWorkOrder({
      workOrderId: id,
      closingResponseId: closing_response_id,
      solutionText: solution_text,
      resolutionDetails: resolution_details,
      evidenceSolutionUrl: evidence_solution_url,
      responsibleArea: responsible_area,
      closedById
    });

    res.status(200).json({
      success: true,
      message: 'Orden de trabajo cerrada exitosamente',
      data: workOrder
    });
  } catch (error) {
    console.error('Error cerrando orden de trabajo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Opción 1: Mantener falla recurrente (incrementar contador)
 */
const maintainRecurringFailure = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist_id } = req.body; // ✅ Recibir currentChecklistId del frontend
    
    console.log('🔍 DEBUG - maintainRecurringFailure recibe:', { workOrderId: id, checklist_id });
    
    const workOrder = await workOrderService.maintainRecurringFailure(id, checklist_id);

    res.status(200).json({
      success: true,
      message: 'Contador de recurrencia actualizado',
      data: workOrder
    });
  } catch (error) {
    console.error('Error manteniendo falla recurrente:', error);
    
    // ✅ MANEJAR ERROR ESPECÍFICO DE DUPLICADO
    if (error.message.includes('ya fue mantenida para el checklist actual')) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ALREADY_MAINTAINED'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * Opción 2: Crear nueva falla para el mismo ítem
 */
const createNewFailureForSameItem = async (req, res) => {
  try {
    const responseData = req.body;
    const transaction = await require("../models").connection.transaction();
    
    const newWorkOrder = await workOrderService.createNewFailureForSameItem(
      responseData,
      transaction
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Nueva orden de trabajo creada para el mismo ítem',
      data: newWorkOrder
    });
  } catch (error) {
    console.error('Error creando nueva falla:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Opción 3: Resolver falla recurrente
 */
const resolveRecurringFailure = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      solution_text,
      resolution_details,
      evidence_solution_url,
      responsible_area,
      closing_response_id
    } = req.body;
    const closedById = req.user.user_id;

    if (!closing_response_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la respuesta de cierre'
      });
    }

    const workOrder = await workOrderService.resolveRecurringFailure({
      workOrderId: id,
      solutionText: solution_text,
      resolutionDetails: resolution_details,
      evidenceSolutionUrl: evidence_solution_url,
      responsibleArea: responsible_area,
      closedById,
      closingResponseId: closing_response_id
    });

    res.status(200).json({
      success: true,
      message: 'Falla recurrente resuelta exitosamente',
      data: workOrder
    });
  } catch (error) {
    console.error('Error resolviendo falla recurrente:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de órdenes de trabajo
 */
const getWorkOrderStats = async (req, res) => {
  try {
    const stats = await workOrderService.getWorkOrderStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Crear una orden de trabajo manualmente (actualizado)
 */
const createWorkOrder = async (req, res) => {
  try {
    const {
      initial_response_id,
      inspectable_id,
      checklist_item_id,
      description,
      severity = 'leve',
      responsible_area = 'Técnico'
    } = req.body;
    const reportedById = req.user.user_id;

    if (!initial_response_id || !inspectable_id || !checklist_item_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren initial_response_id, inspectable_id y checklist_item_id'
      });
    }

    const workOrder = await workOrderService.createWorkOrder({
      initialResponseId: initial_response_id,
      reportedById,
      inspectableId: inspectable_id,
      checklistItemId: checklist_item_id,
      description,
      severity,
      responsibleArea: responsible_area
    });

    res.status(201).json({
      success: true,
      message: 'Orden de trabajo creada exitosamente',
      data: workOrder
    });
  } catch (error) {
    console.error('Error creando orden de trabajo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * NUEVAS FUNCIONES PARA REEMPLAZAR ENDPOINTS DUPLICADOS DE checklist.routes.js
 */

/**
 * Obtener OT pendientes por checklist específico
 */
const getPendingWorkOrdersByChecklist = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const filters = { checklistId: Number.parseInt(checklist_id) };
    const workOrders = await workOrderService.getPendingWorkOrders(null, filters);

    res.status(200).json(workOrders);
  } catch (error) {
    console.error('Error obteniendo OT pendientes por checklist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener OT cerradas por checklist específico
 */
const getClosedWorkOrdersByChecklist = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const filters = { checklistId: Number.parseInt(checklist_id) };
    
    // ✅ CORREGIDO: Usar getResolvedWorkOrders con filtros
    const workOrders = await workOrderService.getResolvedWorkOrders(filters);

    res.status(200).json(workOrders);
  } catch (error) {
    console.error('Error obteniendo OT cerradas por checklist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Actualizar OT específica
 */
const updateWorkOrder = async (req, res) => {
  try {
    const { id: work_order_id } = req.params
    const {
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    } = req.body

    const updateData = {
      work_order_id: Number.parseInt(work_order_id),
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    }

    const updatedWorkOrder = await workOrderService.updateWorkOrder(updateData)
    res.status(200).json({
      success: true,
      message: "Falla actualizada exitosamente",
      workOrder: updatedWorkOrder,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
};

/**
 * Obtener OT por checklist type
 */
const getWorkOrdersByChecklistType = async (req, res) => {
  try {
    const { checklist_type_id } = req.params;
    const filters = { checklistTypeId: Number.parseInt(checklist_type_id) };
    const workOrders = await workOrderService.getPendingWorkOrders(null, filters);

    res.status(200).json({
      success: true,
      data: workOrders
    });
  } catch (error) {
    console.error('Error obteniendo OT por checklist type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener órdenes de trabajo resueltas por checklist type
 */
const getResolvedWorkOrdersByChecklistType = async (req, res) => {
  try {
    const { checklist_type_id } = req.params;
    const filters = { checklistTypeId: Number.parseInt(checklist_type_id) };
    const workOrders = await workOrderService.getResolvedWorkOrders(filters);

    res.status(200).json({
      success: true,
      data: workOrders
    });
  } catch (error) {
    console.error('Error obteniendo OT resueltas por checklist type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getPendingWorkOrders,
  getWorkOrderById,
  closeWorkOrder,
  getWorkOrderStats,
  createWorkOrder,
  maintainRecurringFailure,
  createNewFailureForSameItem,
  resolveRecurringFailure,
  // Nuevas funciones para reemplazar endpoints duplicados
  getPendingWorkOrdersByChecklist,
  getClosedWorkOrdersByChecklist,
  updateWorkOrder,
  getWorkOrdersByChecklistType,
  getResolvedWorkOrdersByChecklistType
};