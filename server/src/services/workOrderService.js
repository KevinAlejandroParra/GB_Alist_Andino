const {
  WorkOrder,
  ChecklistResponse,
  ChecklistItem,
  Inspectable,
  User,
  Failure,
  Requisition,
  connection
} = require("../models");
const { Sequelize } = require("../models");
const Op = Sequelize.Op;

/**
 * Genera un ID único para la orden de trabajo
 * Formato: OT-YYYYMMDD-XXX
 */
const generateWorkOrderId = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `OT-${dateStr}-${randomNum}`;
};

/**
 * Busca si existe una orden de trabajo abierta para un ítem específico
 */
const findExistingWorkOrder = async (inspectableId, checklistItemId, transaction) => {
  try {
    const workOrder = await WorkOrder.findOne({
      where: {
        inspectable_id: inspectableId,
        checklist_item_id: checklistItemId,
        status: { [Op.in]: ['PENDIENTE', 'EN_PROCESO'] }
      },
      include: [
        {
          model: ChecklistResponse,
          as: 'initialResponse',
          include: [
            {
              model: Failure,
              as: 'failure',
              where: { status: 'pendiente' },
              required: true
            }
          ],
          required: true
        },
        {
          model: ChecklistItem,
          as: 'checklistItem',
          attributes: ['question_text', 'item_number']
        },
      ],
      transaction, // Usar la transacción existente
    });

    return workOrder;
  } catch (error) {
    console.error('Error buscando orden de trabajo existente:', error);
    throw error;
  }
};

/**
 * Crea una nueva orden de trabajo
 */
const createWorkOrder = async ({
  initialResponseId,
  reportedById,
  inspectableId,
  checklistItemId,
  description = null,
  transaction: existingTransaction, // Aceptar una transacción existente
}) => {
  // Usar la transacción existente o crear una nueva si no se proporciona
  const transaction = existingTransaction || await connection.transaction();
  
  try {
    // Generar ID único
    let workOrderId;
    let existingWO;
    do {
      workOrderId = generateWorkOrderId();
      existingWO = await WorkOrder.findOne({
        where: { work_order_id: workOrderId },
        transaction
      });
    } while (existingWO);

    // Crear la orden de trabajo
    const workOrder = await WorkOrder.create({
      work_order_id: workOrderId,
      status: 'PENDIENTE',
      description,
      reported_by_id: reportedById,
      inspectable_id: inspectableId,
      checklist_item_id: checklistItemId,
      initial_response_id: initialResponseId,
      recurrence_count: 1
    }, { transaction });

    // Solo hacer commit si creamos la transacción aquí
    if (!existingTransaction) {
      await transaction.commit();
    }
    return workOrder;
  } catch (error) {
    // Solo hacer rollback si creamos la transacción aquí
    if (!existingTransaction) await transaction.rollback();
    console.error('Error creando orden de trabajo:', error);
    throw error;
  }
};

/**
 * Actualiza el contador de recurrencia de una orden de trabajo
 */
const updateRecurrence = async (workOrderId, transaction) => {
  const t = transaction || await connection.transaction();

  try {
    const workOrder = await WorkOrder.findByPk(workOrderId, { transaction: t });
    if (!workOrder) {
      throw new Error(`Orden de trabajo ${workOrderId} no encontrada`);
    }

    await workOrder.update({
      recurrence_count: workOrder.recurrence_count + 1,
      status: 'EN_PROCESO'
    }, { transaction: t });

    if (!transaction) {
      await t.commit();
    }
    return workOrder;
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    console.error('Error actualizando recurrencia:', error);
    throw error;
  }
};

/**
 * Cierra una orden de trabajo con detalles de resolución
 */
const closeWorkOrder = async ({
  workOrderId,
  closingResponseId,
  resolutionDetails,
  closedById,
  transaction: existingTransaction
}) => {
  const transaction = existingTransaction || await connection.transaction();
  
  try {
    const workOrder = await WorkOrder.findByPk(workOrderId, { transaction });
    if (!workOrder) {
      throw new Error(`Orden de trabajo ${workOrderId} no encontrada`);
    }

    await workOrder.update({
      status: 'RESUELTO',
      resolution_details: resolutionDetails,
      resolved_at: new Date(),
      closing_response_id: closingResponseId
    }, { transaction });

    // Después de un período de confirmación, marcar como CERRADO
    // Por ahora lo marcamos como RESUELTO y el usuario puede cerrarlo manualmente

    if (!existingTransaction) {
      await transaction.commit();
    }
    return workOrder;
  } catch (error) {
    if (!existingTransaction) {
      await transaction.rollback();
    }
    console.error('Error cerrando orden de trabajo:', error);
    throw error;
  }
};

/**
 * Obtiene órdenes de trabajo pendientes por usuario o todas
 */
const getPendingWorkOrders = async (userId = null, filters = {}) => {
  try {
    const whereClause = {
      status: { [Op.in]: ['PENDIENTE', 'EN_PROCESO'] }
    };

    if (userId) {
      whereClause.reported_by_id = userId;
    }

    const workOrders = await WorkOrder.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'user_name']
        },
        {
          model: Inspectable,
          as: 'inspectable',
          attributes: ['ins_id', 'name']
        },
        {
          model: ChecklistResponse,
          as: 'initialResponse',
          include: [
            {
              model: Failure,
              as: 'failure',
              include: [
                {
                  model: ChecklistResponse,
                  as: 'response',
                  include: [
                    {
                      model: User,
                      as: 'respondedBy',
                      attributes: ['user_name']
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: Requisition,
          as: 'requisitions',
          required: false
        },
        {
          model: ChecklistItem,
          as: 'checklistItem',
          attributes: ['question_text', 'item_number']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return workOrders;
  } catch (error) {
    console.error('Error obteniendo órdenes de trabajo pendientes:', error);
    throw error;
  }
};

/**
 * Maneja la lógica de creación o actualización de OT basado en una respuesta de checklist
 */
const handleWorkOrderForResponse = async (responseData, transaction) => {
  try {
    const {
      checklist_id,
      checklist_item_id,
      inspectable_id,
      responded_by,
      response_compliance,
      comment
    } = responseData;

    // Solo crear/actualizar OT si es una falla
    if (response_compliance !== 'no cumple' && response_compliance !== 'observación') {
      return null;
    }

    // Buscar si ya existe una OT para este ítem
    const existingWorkOrder = await findExistingWorkOrder(inspectable_id, checklist_item_id, transaction);

    if (existingWorkOrder) {
      // Incrementar recurrencia
      await updateRecurrence(existingWorkOrder.id, transaction);
      return existingWorkOrder;
    } else {
      // Crear nueva OT
      // Primero necesitamos encontrar la ChecklistResponse que acabamos de crear
      const checklistResponse = await ChecklistResponse.findOne({
        where: {
          checklist_id,
          checklist_item_id,
          inspectable_id,
          responded_by
        },
        order: [['createdAt', 'DESC']],
        transaction
      });

      if (!checklistResponse) {
        throw new Error('No se pudo encontrar la respuesta del checklist recién creada');
      }

      const newWorkOrder = await createWorkOrder({
        initialResponseId: checklistResponse.response_id,
        reportedById: responded_by,
        inspectableId: inspectable_id,
        checklistItemId: checklist_item_id,
        description: comment,
        transaction: transaction // Pasar la transacción existente
      });

      // Actualizar el work_order_number en la tabla failures
      await Failure.update(
        {
          work_order_number: newWorkOrder.work_order_id,
          first_reported_date: new Date(),
          last_updated_date: new Date()
        },
        {
          where: { response_id: checklistResponse.response_id },
          transaction
        }
      );

      return newWorkOrder;
    }
  } catch (error) {
    console.error('Error manejando orden de trabajo para respuesta:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de órdenes de trabajo
 */
const getWorkOrderStats = async () => {
  try {
    const stats = await WorkOrder.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('AVG', Sequelize.col('recurrence_count')), 'avg_recurrence'],
        [Sequelize.fn('MAX', Sequelize.col('recurrence_count')), 'max_recurrence']
      ],
      group: ['status']
    });

    const totalWorkOrders = await WorkOrder.count();
    const pendingCount = await WorkOrder.count({ where: { status: 'PENDIENTE' } });
    const inProgressCount = await WorkOrder.count({ where: { status: 'EN_PROCESO' } });
    const resolvedCount = await WorkOrder.count({ where: { status: 'RESUELTO' } });

    return {
      total: totalWorkOrders,
      by_status: {
        pendiente: pendingCount,
        en_proceso: inProgressCount,
        resuelto: resolvedCount,
        cerrado: await WorkOrder.count({ where: { status: 'CERRADO' } })
      },
      stats: stats
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de OT:', error);
    throw error;
  }
};

module.exports = {
  createWorkOrder,
  findExistingWorkOrder,
  updateRecurrence,
  closeWorkOrder,
  getPendingWorkOrders,
  handleWorkOrderForResponse,
  getWorkOrderStats,
  generateWorkOrderId
};