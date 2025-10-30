const {
  WorkOrder,
  ChecklistResponse,
  ChecklistItem,
  Checklist,
  Inspectable,
  User,
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
 * @param {number} inspectableId - ID del inspectable
 * @param {number} checklistItemId - ID del ítem del checklist
 * @param {number} currentChecklistId - ID del checklist actual (para distinguir actualizaciones)
 * @param {transaction} transaction - Transacción de base de datos
 * @returns {Promise<object|null>} - WorkOrder existente o null
 */
const findExistingWorkOrder = async (inspectableId, checklistItemId, currentChecklistId = null, transaction) => {
  try {
    let whereClause = {
      inspectable_id: inspectableId,
      checklist_item_id: checklistItemId,
      status: { [Op.in]: ['PENDIENTE', 'EN_PROCESO'] }
    };

    let include = [
      {
        model: ChecklistResponse,
        as: 'initialResponse',
        required: true,
        include: [
          {
            model: Checklist,
            as: 'checklist',
            attributes: ['checklist_id', 'createdAt']
          }
        ]
      },
      {
        model: ChecklistItem,
        as: 'checklistItem',
        attributes: ['question_text', 'item_number']
      },
      {
        model: User,
        as: 'reporter',
        attributes: ['user_name']
      }
    ];

    // Si tenemos currentChecklistId, buscar primero OTs del mismo checklist (actualización)
    if (currentChecklistId) {
      const sameChecklistWorkOrder = await WorkOrder.findOne({
        where: {
          ...whereClause,
          '$initialResponse.checklist.checklist_id$': currentChecklistId
        },
        include,
        order: [['createdAt', 'DESC']],
        transaction,
      });

      if (sameChecklistWorkOrder) {
        console.log('✅ DEBUG - OT del mismo checklist encontrada (actualización, NO incrementar recurrencia):', sameChecklistWorkOrder.id);
        return {
          workOrder: sameChecklistWorkOrder,
          isSameChecklist: true,
          shouldIncrementRecurrence: false
        };
      }
    }

    // Si no encontramos OT del mismo checklist, buscar OTs de checklists anteriores
    const previousWorkOrder = await WorkOrder.findOne({
      where: whereClause,
      include,
      order: [['createdAt', 'DESC']],
      transaction,
    });

    if (previousWorkOrder) {
      console.log('✅ DEBUG - OT de checklist anterior encontrada (incrementar recurrencia):', previousWorkOrder.id);
      return {
        workOrder: previousWorkOrder,
        isSameChecklist: false,
        shouldIncrementRecurrence: true
      };
    }

    console.log('❌ DEBUG - No se encontró OT existente');
    return null;

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
  severity = 'leve',
  responsibleArea = 'Técnico',
  transaction: existingTransaction,
}) => {
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

    // Crear la orden de trabajo con todos los campos
    const workOrder = await WorkOrder.create({
      work_order_id: workOrderId,
      status: 'PENDIENTE',
      description,
      severity,
      responsible_area: responsibleArea,
      reported_by_id: reportedById,
      inspectable_id: inspectableId,
      checklist_item_id: checklistItemId,
      initial_response_id: initialResponseId,
      recurrence_count: 1,
      first_reported_date: new Date(),
      reported_at: new Date(),
      last_updated_date: new Date()
    }, { transaction });

    if (!existingTransaction) {
      await transaction.commit();
    }
    return workOrder;
  } catch (error) {
    if (!existingTransaction) await transaction.rollback();
    console.error('Error creando orden de trabajo:', error);
    throw error;
  }
};

/**
 * Actualiza el contador de recurrencia de una orden de trabajo
 * @param {number} workOrderId - ID de la orden de trabajo
 * @param {number} currentChecklistId - ID del checklist actual (para evitar duplicados)
 * @param {transaction} transaction - Transacción de base de datos
 * @returns {Promise<object>} - WorkOrder actualizada
 * @throws {Error} - Si la falla ya fue mantenida para este checklist
 */
const updateRecurrence = async (workOrderId, currentChecklistId = null, transaction) => {
  const t = transaction || await connection.transaction();

  try {
    const workOrder = await WorkOrder.findByPk(workOrderId, {
      include: [
        {
          model: ChecklistResponse,
          as: 'initialResponse',
          include: [
            {
              model: Checklist,
              as: 'checklist',
              attributes: ['checklist_id']
            }
          ]
        }
      ],
      transaction: t
    });
    
    if (!workOrder) {
      throw new Error(`Orden de trabajo ${workOrderId} no encontrada`);
    }

    // ✅ VERIFICACIÓN ANTI-DUPLICADO: Si ya se mantuvo para este checklist
    if (currentChecklistId && workOrder.initialResponse?.checklist?.checklist_id === currentChecklistId) {
      throw new Error(`Esta falla ya fue mantenida para el checklist actual (recurrencia: ${workOrder.recurrence_count})`);
    }

    const newRecurrenceCount = workOrder.recurrence_count + 1;
    
    await workOrder.update({
      recurrence_count: newRecurrenceCount,
      status: 'EN_PROCESO',
      last_updated_date: new Date()
    }, { transaction: t });

    console.log(`✅ DEBUG - Recurrencia actualizada: ${workOrder.recurrence_count} → ${newRecurrenceCount}`);

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
  solutionText,
  resolutionDetails,
  closedById,
  evidenceSolutionUrl = null,
  responsibleArea = null,
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
      solution_text: solutionText,
      resolution_details: resolutionDetails,
      evidence_solution_url: evidenceSolutionUrl,
      responsible_area: responsibleArea || workOrder.responsible_area,
      resolved_at: new Date(),
      closed_at: new Date(),
      closing_response_id: closingResponseId,
      closed_by: closedById,
      last_updated_date: new Date()
    }, { transaction });

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

    // Construir include base
    const baseInclude = [
      {
        model: User,
        as: 'reporter',
        attributes: ['user_id', 'user_name']
      },
      {
        model: User,
        as: 'closer',
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
        required: true
      },
      {
        model: ChecklistResponse,
        as: 'closingResponse',
        required: false
      },
      {
        model: ChecklistItem,
        as: 'checklistItem',
        attributes: ['question_text', 'item_number']
      }
    ];

    let include = [...baseInclude];

    // Agregar filtro por checklist_type_id si está presente
    if (filters.checklistTypeId) {
      const checklistResponseIndex = include.findIndex(inc => inc.as === 'initialResponse');
      if (checklistResponseIndex !== -1) {
        include[checklistResponseIndex] = {
          ...include[checklistResponseIndex],
          include: [
            {
              model: Checklist,
              as: 'checklist',
              attributes: ['checklist_type_id'],
              required: true,
              where: { checklist_type_id: filters.checklistTypeId }
            }
          ]
        };
      }
    }

    // Agregar filtro por checklist_id si está presente
    if (filters.checklistId) {
      const checklistResponseIndex = include.findIndex(inc => inc.as === 'initialResponse');
      if (checklistResponseIndex !== -1) {
        include[checklistResponseIndex].where = {
          checklist_id: filters.checklistId
        };
      }
    }

    const workOrders = await WorkOrder.findAll({
      where: whereClause,
      include,
      order: [['createdAt', 'DESC']]
    });

    return workOrders;
  } catch (error) {
    console.error('Error obteniendo órdenes de trabajo pendientes:', error);
    throw error;
  }
};

/**
 * Obtiene órdenes de trabajo resueltas con detalles completos
 */
const getResolvedWorkOrders = async (filters = {}) => {
  try {
    const whereClause = {
      status: { [Op.in]: ['RESUELTO', 'CERRADO'] }
    };

    // Construir include con todas las relaciones necesarias
    const baseInclude = [
      {
        model: User,
        as: 'reporter',
        attributes: ['user_id', 'user_name']
      },
      {
        model: User,
        as: 'closer',
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
        required: true,
        include: [
          {
            model: Checklist,
            as: 'checklist',
            attributes: ['checklist_type_id'],
            required: true
          }
        ]
      },
      {
        model: ChecklistResponse,
        as: 'closingResponse',
        required: false
      },
      {
        model: ChecklistItem,
        as: 'checklistItem',
        attributes: ['question_text', 'item_number']
      }
    ];

    let include = [...baseInclude];

    // Agregar filtro por checklist_type_id si está presente
    if (filters.checklistTypeId) {
      const checklistResponseIndex = include.findIndex(inc => inc.as === 'initialResponse');
      if (checklistResponseIndex !== -1) {
        include[checklistResponseIndex] = {
          ...include[checklistResponseIndex],
          include: [
            {
              model: Checklist,
              as: 'checklist',
              attributes: ['checklist_type_id'],
              required: true,
              where: { checklist_type_id: filters.checklistTypeId }
            }
          ]
        };
      }
    }

    // ✅ AGREGAR FILTRO POR CHECKLIST_ID SI ESTÁ PRESENTE
    if (filters.checklistId) {
      const checklistResponseIndex = include.findIndex(inc => inc.as === 'initialResponse');
      if (checklistResponseIndex !== -1) {
        include[checklistResponseIndex].where = {
          checklist_id: filters.checklistId
        };
      }
    }

    const workOrders = await WorkOrder.findAll({
      where: whereClause,
      include,
      order: [['resolved_at', 'DESC']] // Ordenar por fecha de resolución más reciente
    });

    return workOrders;
  } catch (error) {
    console.error('Error obteniendo órdenes de trabajo resueltas:', error);
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
      comment,
      responsibleArea = 'Técnico'
    } = responseData;

    console.log('🔍 DEBUG - handleWorkOrderForResponse recibir datos:', {
      checklist_id,
      checklist_item_id,
      inspectable_id,
      response_compliance,
      comment,
      responsibleArea
    });

    // Solo crear/actualizar OT si es una falla
    if (response_compliance !== 'no cumple' && response_compliance !== 'observación') {
      console.log('🚨 DEBUG - No es una falla, no se crea OT');
      return null;
    }

    // ✅ ASIGNACIÓN AUTOMÁTICA DE SEVERITY BASADO EN TIPO DE RESPUESTA
    let autoSeverity;
    if (response_compliance === 'observación') {
      autoSeverity = 'leve';  // Observación = leve
    } else if (response_compliance === 'no cumple') {
      autoSeverity = 'crítica';  // No cumple = crítica
    } else {
      autoSeverity = 'leve';  // Default fallback
    }

    console.log('🔍 DEBUG - Severity asignado automáticamente:', {
      response_compliance,
      autoSeverity
    });

    // ✅ NUEVA LÓGICA: Buscar OT existente diferenciando entre actualización y nueva recurrencia
    console.log('🔍 DEBUG - Buscando OT existente:', { inspectable_id, checklist_item_id, currentChecklistId: checklist_id });
    const existingWorkOrderInfo = await findExistingWorkOrder(inspectable_id, checklist_item_id, checklist_id, transaction);

    if (existingWorkOrderInfo) {
      const { workOrder: existingWorkOrder, isSameChecklist, shouldIncrementRecurrence } = existingWorkOrderInfo;
      
      console.log('✅ DEBUG - OT existente encontrada:', {
        id: existingWorkOrder.id,
        checklist_item_id: existingWorkOrder.checklist_item_id,
        status: existingWorkOrder.status,
        isSameChecklist,
        shouldIncrementRecurrence
      });
      
      // ✅ LÓGICA CORREGIDA: Solo incrementar recurrencia si es de checklist diferente
      if (shouldIncrementRecurrence) {
        console.log('🔄 DEBUG - Incrementando recurrencia (checklist diferente)');
        await updateRecurrence(existingWorkOrder.id, checklist_id, transaction);
      } else {
        console.log('📝 DEBUG - Actualizando respuesta del mismo checklist (NO incrementar recurrencia)');
        // Opcional: actualizar description si el comentario cambió
        if (comment && comment !== existingWorkOrder.description) {
          await existingWorkOrder.update({
            description: comment,
            last_updated_date: new Date()
          }, { transaction });
        }
      }
      
      return existingWorkOrder;
    } else {
      console.log('❌ DEBUG - No se encontró OT existente, creando nueva...');
      
      // Crear nueva OT
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
        severity: autoSeverity,  // ✅ Usar severity automático
        responsibleArea,
        transaction: transaction
      });

      return newWorkOrder;
    }
  } catch (error) {
    console.error('Error manejando orden de trabajo para respuesta:', error);
    throw error;
  }
};

/**
 * Maneja falla recurrente - Opción 1: Mantener falla existente
 * @param {number} workOrderId - ID de la orden de trabajo
 * @param {number} currentChecklistId - ID del checklist actual
 * @param {transaction} transaction - Transacción de base de datos
 * @returns {Promise<object>} - WorkOrder actualizada
 * @throws {Error} - Si la falla ya fue mantenida para este checklist
 */
const maintainRecurringFailure = async (workOrderId, currentChecklistId = null, transaction) => {
  console.log('🔄 DEBUG - Mantener falla recurrente:', { workOrderId, currentChecklistId });
  return await updateRecurrence(workOrderId, currentChecklistId, transaction);
};

/**
 * Maneja falla recurrente - Opción 2: Crear nueva OT
 */
const createNewFailureForSameItem = async (responseData, transaction) => {
  // Esta función crea una nueva OT para el mismo ítem
  // Se usa cuando el problema es diferente pero en el mismo ítem
  console.log('🔍 DEBUG - createNewFailureForSameItem recibiendo:', responseData);
  
  try {
    // 1. Obtener el checklist_id desde la WorkOrder existente o hacer consulta
    let checklistId = responseData.checklist_id;
    
    if (!checklistId) {
      // Si no viene en los datos, consultar usando el checklist_item_id
      const checklistItem = await ChecklistItem.findByPk(responseData.checklist_item_id, {
        attributes: ['checklist_id'],
        transaction
      });
      
      if (!checklistItem) {
        throw new Error(`ChecklistItem con ID ${responseData.checklist_item_id} no encontrado`);
      }
      
      checklistId = checklistItem.checklist_id;
      console.log('🔍 DEBUG - Checklist ID obtenido desde ChecklistItem:', checklistId);
    }
    
    // 2. Crear una nueva ChecklistResponse para el nuevo reporte
    const newChecklistResponse = await ChecklistResponse.create({
      checklist_id: checklistId,
      checklist_item_id: responseData.checklist_item_id,
      inspectable_id: responseData.inspectable_id,
      responded_by: responseData.reported_by_id,
      response_compliance: 'no cumple',
      comment: responseData.description,
      evidence_url: responseData.evidence_url || null
    }, { transaction });
    
    console.log('🔍 DEBUG - Nueva ChecklistResponse creada:', newChecklistResponse.response_id);
    
    // 3. Crear la nueva WorkOrder usando la nueva ChecklistResponse
    const newWorkOrder = await createWorkOrder({
      initialResponseId: newChecklistResponse.response_id,
      reportedById: responseData.reported_by_id,
      inspectableId: responseData.inspectable_id,
      checklistItemId: responseData.checklist_item_id,
      description: responseData.description,
      severity: responseData.severity || 'leve',
      responsibleArea: responseData.responsibleArea || 'Técnico',
      transaction
    });
    
    console.log('✅ DEBUG - Nueva WorkOrder creada para falla recurrente:', newWorkOrder.id);
    
    return newWorkOrder;
  } catch (error) {
    console.error('Error en createNewFailureForSameItem:', error);
    throw error;
  }
};

/**
 * Maneja falla recurrente - Opción 3: Resolver OT existente
 */
const resolveRecurringFailure = async ({
  workOrderId,
  solutionText,
  resolutionDetails,
  evidenceSolutionUrl,
  responsibleArea,
  closedById,
  closingResponseId,
  transaction
}) => {
  return await closeWorkOrder({
    workOrderId,
    solutionText,
    resolutionDetails,
    evidenceSolutionUrl,
    responsibleArea,
    closedById,
    closingResponseId,
    transaction
  });
};

/**
 * Actualiza una orden de trabajo específica
 */
const updateWorkOrder = async (updateData) => {
  try {
    const { work_order_id, ...fields } = updateData;
    
    if (!work_order_id) {
      throw new Error('Se requiere work_order_id para actualizar');
    }

    const workOrder = await WorkOrder.findByPk(work_order_id);
    if (!workOrder) {
      throw new Error(`Orden de trabajo con ID ${work_order_id} no encontrada`);
    }

    await workOrder.update({
      ...fields,
      last_updated_date: new Date()
    });

    return workOrder;
  } catch (error) {
    console.error('Error actualizando orden de trabajo:', error);
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
  updateWorkOrder,
  getPendingWorkOrders,
  getResolvedWorkOrders,
  handleWorkOrderForResponse,
  getWorkOrderStats,
  generateWorkOrderId,
  maintainRecurringFailure,
  createNewFailureForSameItem,
  resolveRecurringFailure,
};