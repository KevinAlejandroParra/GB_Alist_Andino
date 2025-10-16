const workOrderService = require("../services/workOrderService");

/**
 * Obtener órdenes de trabajo pendientes
 */
const getPendingWorkOrders = async (req, res) => {
  try {
    const userId = req.query.user_id ? Number.parseInt(req.query.user_id) : null;
    const workOrders = await workOrderService.getPendingWorkOrders(userId);

    res.status(200).json({
      success: true,
      data: workOrders
    });
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
    // Por ahora usamos el servicio de pendientes, pero filtramos por ID
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
 * Cerrar una orden de trabajo
 */
const closeWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { closing_response_id, resolution_details } = req.body;
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
      resolutionDetails: resolution_details,
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
 * Crear una orden de trabajo manualmente (para casos especiales)
 */
const createWorkOrder = async (req, res) => {
  try {
    const { initial_response_id, inspectable_id, description } = req.body;
    const reportedById = req.user.user_id;

    if (!initial_response_id || !inspectable_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren initial_response_id e inspectable_id'
      });
    }

    const workOrder = await workOrderService.createWorkOrder({
      initialResponseId: initial_response_id,
      reportedById,
      inspectableId: inspectable_id,
      description
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

module.exports = {
  getPendingWorkOrders,
  getWorkOrderById,
  closeWorkOrder,
  getWorkOrderStats,
  createWorkOrder
};