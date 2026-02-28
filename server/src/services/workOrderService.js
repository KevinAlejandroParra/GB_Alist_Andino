'use strict';

const { WorkOrder, FailureOrder, User, Inventory, WorkOrderPart, Sequelize } = require('../models');
const { Op } = Sequelize;

class WorkOrderService {
  /**
   * Crear WorkOrder manualmente para una FailureOrder
   * @param {Object} data
   * @param {number} data.failure_order_id - ID de la FailureOrder
   * @param {string} data.description - Descripción del trabajo
   * @param {string} data.priority_level - BAJA | NORMAL | ALTA | URGENTE
   * @param {number} data.created_by_id - Usuario que crea la OT
   * @returns {Promise<WorkOrder>}
   */
  async createWorkOrder(data) {
    try {
      const { failure_order_id, description, priority_level = 'NORMAL', created_by_id } = data;

      // Validaciones
      if (!failure_order_id) throw new Error('failure_order_id es requerido');
      if (!description) throw new Error('description es requerido');
      if (!created_by_id) throw new Error('created_by_id es requerido');

      // Validar que la FailureOrder existe
      const failureOrder = await FailureOrder.findByPk(failure_order_id);
      if (!failureOrder) {
        throw new Error(`FailureOrder con ID ${failure_order_id} no encontrada`);
      }

      // Validar que NO existe ya una WorkOrder para esta FailureOrder (relación 1:1)
      const existingWorkOrder = await WorkOrder.findOne({
        where: { failure_order_id }
      });
      if (existingWorkOrder) {
        throw new Error(`Ya existe una WorkOrder para la FailureOrder ${failure_order_id}`);
      }

      // Validar priority_level
      const validPriorities = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'];
      if (!validPriorities.includes(priority_level)) {
        throw new Error('priority_level debe ser: BAJA, NORMAL, ALTA o URGENTE');
      }

      // Generar work_order_id único
      const work_order_id = this.generateWorkOrderId();

      // Crear WorkOrder
      const workOrder = await WorkOrder.create({
        work_order_id,
        failure_order_id,
        status: 'EN_PROCESO'
      });

      // Cargar con relaciones
      const createdWorkOrder = await WorkOrder.findByPk(workOrder.id, {
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] }
            ]
          }
        ]
      });

      console.log(`✅ OT creada: ${work_order_id} - Para OF: ${failureOrder.failure_order_id}`);

      return createdWorkOrder;
    } catch (error) {
      console.error('❌ Error creando WorkOrder:', error);
      throw new Error(`Error al crear orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Iniciar trabajo en WorkOrder
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {number} startedBy - Usuario que inicia
   * @returns {Promise<WorkOrder>}
   */
  async startWork(workOrderId, startedBy) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Registrar start_time
      await workOrder.update({
        start_time: new Date()
      });

      console.log(`✅ OT ${workOrder.work_order_id} iniciada`);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error iniciando trabajo:', error);
      throw new Error(`Error al iniciar trabajo: ${error.message}`);
    }
  }

  /**
   * Finalizar trabajo en WorkOrder
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {string} activityPerformed - Descripción del trabajo realizado
   * @param {string} evidenceUrl - URL de evidencia (fotos/documentos)
   * @returns {Promise<WorkOrder>}
   */
  async finishWork(workOrderId, activityPerformed, evidenceUrl) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Validar que esté EN_PROCESO
      if (workOrder.status !== 'EN_PROCESO') {
        throw new Error(`Solo se puede finalizar una WorkOrder EN_PROCESO. Estado actual: ${workOrder.status}`);
      }

      // Validar campos requeridos
      if (!activityPerformed) {
        throw new Error('activity_performed es requerido para finalizar el trabajo');
      }

      // Registrar end_time y actividad
      await workOrder.update({
        end_time: new Date(),
        activity_performed: activityPerformed,
        evidence_url: evidenceUrl
      });

      console.log(`✅ OT ${workOrder.work_order_id} finalizada`);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error finalizando trabajo:', error);
      throw new Error(`Error al finalizar trabajo: ${error.message}`);
    }
  }

  /**
   * Registrar resultados de pruebas
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {string} testResults - Resultados de pruebas (JSON o texto)
   * @returns {Promise<WorkOrder>}
   */
  async performTests(workOrderId, testResults) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Validar que el trabajo ya fue finalizado
      if (!workOrder.end_time) {
        throw new Error('Debe finalizar el trabajo antes de registrar pruebas');
      }

      // Registrar pruebas
      await workOrder.update({
        test_results: testResults
      });

      console.log(`✅ Pruebas registradas para OT ${workOrder.work_order_id}`);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error registrando pruebas:', error);
      throw new Error(`Error al registrar pruebas: ${error.message}`);
    }
  }

  /**
   * Resolver WorkOrder (cierre final)
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {number} resolvedBy - Usuario que resuelve
   * @returns {Promise<WorkOrder>}
   */
  async resolveWorkOrder(workOrderId, resolvedBy) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Validar que esté EN_PROCESO
      if (workOrder.status !== 'EN_PROCESO') {
        throw new Error(`Solo se puede resolver una WorkOrder EN_PROCESO. Estado actual: ${workOrder.status}`);
      }

      // Validaciones obligatorias antes de resolver:
      const validationErrors = [];

      // 1. Validar que tiene solución/documentación del trabajo
      if (!workOrder.activity_performed || workOrder.activity_performed.trim() === '') {
        validationErrors.push('La evidencia de la solución (actividad realizada) es obligatoria');
      }

      // 2. Validar que tiene evidencia visual/documental
      if (!workOrder.evidence_url || workOrder.evidence_url.trim() === '') {
        validationErrors.push('La evidencia de la solución es obligatoria');
      }

      // 3. Validar que tiene firma digital
      if (!workOrder.closure_signature || workOrder.closure_signature.trim() === '') {
        validationErrors.push('La firma digital es obligatoria');
      }

      // 4. Validar que tiene hora de inicio
      if (!workOrder.start_time) {
        validationErrors.push('La hora de inicio es obligatoria');
      }

      // 5. Validar que tiene hora de fin
      if (!workOrder.end_time) {
        validationErrors.push('La hora de finalización es obligatoria');
      }

      // Si hay errores de validación, devolver todos los mensajes
      if (validationErrors.length > 0) {
        throw new Error(`Campos obligatorios faltantes: ${validationErrors.join(', ')}`);
      }

      // Resolver WorkOrder
      await workOrder.update({
        status: 'RESUELTA',
        resolved_by_id: resolvedBy
      });

      console.log(`✅ OT ${workOrder.work_order_id} resuelta y completada`);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error resolviendo WorkOrder:', error);
      throw new Error(`Error al resolver orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Cancelar WorkOrder
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {string} reason - Razón de cancelación
   * @returns {Promise<WorkOrder>}
   */
  async cancelWorkOrder(workOrderId, reason) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // No se puede cancelar si ya está COMPLETADO
      if (workOrder.status === 'COMPLETADO') {
        throw new Error('No se puede cancelar una WorkOrder ya COMPLETADA');
      }

      // Cancelar
      await workOrder.update({
        status: 'CANCELADO',
        cancellation_reason: reason
      });

      console.log(`✅ OT ${workOrder.work_order_id} cancelada`);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error cancelando WorkOrder:', error);
      throw new Error(`Error al cancelar orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Obtener WorkOrder por ID
   * @param {number} workOrderId - ID de la WorkOrder
   * @returns {Promise<WorkOrder>}
   */
  async getWorkOrderById(workOrderId) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId, {
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
              { model: require('../models').Inspectable, as: 'affectedInspectable' }
            ]
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['user_id', 'user_name']
          },
          {
            model: WorkOrderPart,
            as: 'parts',
            include: [
              { model: Inventory, as: 'inventory' }
            ]
          }
        ]
      });

      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      return workOrder;
    } catch (error) {
      console.error('❌ Error obteniendo WorkOrder:', error);
      throw new Error(`Error al obtener orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Listar WorkOrders con filtros
   * @param {Object} filters - Filtros
   * @returns {Promise<Array>}
   */
  async getWorkOrders(filters = {}) {
    try {
      const whereClause = {};

      // Filtros
      if (filters.status) whereClause.status = filters.status;
      if (filters.priority_level) whereClause.priority_level = filters.priority_level;
      if (filters.failure_order_id) whereClause.failure_order_id = filters.failure_order_id;

      // Filtro por rango de fechas
      if (filters.dateFrom || filters.dateTo) {
        whereClause.createdAt = {};
        if (filters.dateFrom) whereClause.createdAt[Op.gte] = new Date(filters.dateFrom);
        if (filters.dateTo) whereClause.createdAt[Op.lte] = new Date(filters.dateTo);
      }

      const workOrders = await WorkOrder.findAll({
        where: whereClause,
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] }
            ]
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['user_id', 'user_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return workOrders;
    } catch (error) {
      console.error('❌ Error listando WorkOrders:', error);
      throw new Error(`Error al listar órdenes de trabajo: ${error.message}`);
    }
  }

  /**
   * Obtener WorkOrders por área asignada
   * @param {string} area - TECNICA o OPERATIVA
   * @returns {Promise<Array>}
   */
  async getByArea(area) {
    try {
      // Validar área
      if (!['TECNICA', 'OPERATIVA'].includes(area)) {
        throw new Error('area debe ser TECNICA u OPERATIVA');
      }

      const workOrders = await WorkOrder.findAll({
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            where: { assigned_to: area },
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] }
            ]
          },
          {
            model: User,
            as: 'resolver',
            attributes: ['user_id', 'user_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return workOrders;
    } catch (error) {
      console.error('❌ Error obteniendo WorkOrders por área:', error);
      throw new Error(`Error al obtener órdenes por área: ${error.message}`);
    }
  }

  /**
   * Actualizar WorkOrder
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<WorkOrder>}
   */
  async updateWorkOrder(workOrderId, updateData) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Campos permitidos para actualizar
      const allowedFields = ['description', 'priority_level'];

      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      await workOrder.update(filteredData);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error actualizando WorkOrder:', error);
      throw new Error(`Error al actualizar orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Agregar repuesto utilizado
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {Object} partData - {inventory_id, quantity_used}
   * @returns {Promise<WorkOrderPart>}
   */
  async addUsedPart(workOrderId, partData) {
    try {
      const { inventory_id, quantity_used = 1 } = partData;

      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      // Solo se pueden agregar repuestos si está EN_PROCESO
      if (workOrder.status !== 'EN_PROCESO') {
        throw new Error('Solo se pueden agregar repuestos a WorkOrders EN_PROCESO');
      }

      // Verificar que el inventory item existe
      const inventoryItem = await Inventory.findByPk(inventory_id);
      if (!inventoryItem) {
        throw new Error(`Inventory item con ID ${inventory_id} no encontrado`);
      }

      // Verificar si ya existe un registro con este repuesto
      const existingPart = await WorkOrderPart.findOne({
        where: {
          work_order_id: workOrder.id,
          inventory_id
        }
      });

      if (existingPart) {
        // Si ya existe, actualizar la cantidad sumándola a la existente
        const newQuantity = existingPart.quantity_used + quantity_used;

        // Verificar disponibilidad total
        if (inventoryItem.quantity < newQuantity) {
          throw new Error(`Stock insuficiente. Disponible: ${inventoryItem.quantity}, Total solicitado: ${newQuantity}`);
        }

        // Actualizar cantidad existente
        existingPart.quantity_used = newQuantity;
        await existingPart.save();

        // Actualizar stock (restar solo la cantidad adicional)
        await inventoryItem.update({
          quantity: inventoryItem.quantity - quantity_used
        });

        console.log(`✅ Cantidad actualizada para repuesto en OT ${workOrder.work_order_id}`);
        return existingPart;
      } else {
        // Si no existe, crear nuevo registro
        // Verificar disponibilidad
        if (inventoryItem.quantity < quantity_used) {
          throw new Error(`Stock insuficiente. Disponible: ${inventoryItem.quantity}, Solicitado: ${quantity_used}`);
        }

        // Crear registro en work_order_parts
        const workOrderPart = await WorkOrderPart.create({
          work_order_id: workOrder.id,
          inventory_id,
          quantity_used
        });

        // Actualizar stock
        await inventoryItem.update({
          quantity: inventoryItem.quantity - quantity_used
        });

        console.log(`✅ Repuesto agregado a OT ${workOrder.work_order_id}`);
        return workOrderPart;
      }
    } catch (error) {
      console.error('❌ Error agregando repuesto:', error);

      // Manejar específicamente el error de constraint único
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Este repuesto ya existe en la orden de trabajo');
      }

      throw new Error(`Error al agregar repuesto: ${error.message}`);
    }
  }

  /**
   * Remover repuesto utilizado
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {number} inventoryId - ID del inventory
   * @returns {Promise<void>}
   */
  async removeUsedPart(workOrderId, inventoryId) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      const workOrderPart = await WorkOrderPart.findOne({
        where: {
          work_order_id: workOrder.id,
          inventory_id: inventoryId
        }
      });

      if (!workOrderPart) {
        throw new Error('Repuesto no encontrado en esta WorkOrder');
      }

      // Devolver al stock
      const inventoryItem = await Inventory.findByPk(inventoryId);
      if (inventoryItem) {
        await inventoryItem.update({
          quantity: inventoryItem.quantity + workOrderPart.quantity_used
        });
      }

      // Eliminar registro
      await workOrderPart.destroy();

      console.log(`✅ Repuesto removido de OT ${workOrder.work_order_id}`);
    } catch (error) {
      console.error('❌ Error removiendo repuesto:', error);
      throw new Error(`Error al remover repuesto: ${error.message}`);
    }
  }

  /**
   * Actualizar cantidad de repuesto utilizado
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {number} inventoryId - ID del inventory
   * @param {number} newQuantity - Nueva cantidad
   * @returns {Promise<WorkOrderPart>}
   */
  async updateUsedPartQuantity(workOrderId, inventoryId, newQuantity) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      const workOrderPart = await WorkOrderPart.findOne({
        where: {
          work_order_id: workOrder.id,
          inventory_id: inventoryId
        }
      });

      if (!workOrderPart) {
        throw new Error('Repuesto no encontrado en esta WorkOrder');
      }

      const oldQuantity = workOrderPart.quantity_used;
      const difference = newQuantity - oldQuantity;

      // Actualizar stock
      const inventoryItem = await Inventory.findByPk(inventoryId);
      if (inventoryItem) {
        const newStock = inventoryItem.quantity - difference;
        if (newStock < 0) {
          throw new Error('Stock insuficiente para esta actualización');
        }
        await inventoryItem.update({ quantity: newStock });
      }

      // Actualizar cantidad
      await workOrderPart.update({ quantity_used: newQuantity });

      console.log(`✅ Cantidad actualizada en OT ${workOrder.work_order_id}`);

      return workOrderPart;
    } catch (error) {
      console.error('❌ Error actualizando cantidad:', error);
      throw new Error(`Error al actualizar cantidad: ${error.message}`);
    }
  }

  /**
   * Usar múltiples repuestos
   * @param {number} workOrderId - ID de la WorkOrder
   * @param {Array} parts - Array de {inventoryId, quantity}
   * @returns {Promise<Object>}
   */
  async useMultipleParts(workOrderId, parts) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }

      if (workOrder.status !== 'EN_PROCESO') {
        throw new Error('Solo se pueden agregar repuestos a WorkOrders EN_PROCESO');
      }

      const results = [];

      for (const partData of parts) {
        const { inventoryId, quantity = 1 } = partData;

        try {
          await this.addUsedPart(workOrderId, {
            inventory_id: inventoryId,
            quantity_used: quantity
          });

          results.push({
            inventoryId,
            success: true,
            quantity,
            message: 'Repuesto agregado exitosamente'
          });
        } catch (error) {
          results.push({
            inventoryId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        workOrderId,
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('❌ Error usando múltiples repuestos:', error);
      throw new Error(`Error al usar múltiples repuestos: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de WorkOrders
   * @param {Object} dateRange - {from, to}
   * @returns {Promise<Object>}
   */
  async getStatistics(dateRange = {}) {
    try {
      const whereClause = {};

      if (dateRange.from || dateRange.to) {
        whereClause.createdAt = {};
        if (dateRange.from) whereClause.createdAt[Op.gte] = new Date(dateRange.from);
        if (dateRange.to) whereClause.createdAt[Op.lte] = new Date(dateRange.to);
      }

      const total = await WorkOrder.count({ where: whereClause });
      const pending = await WorkOrder.count({ where: { ...whereClause, status: 'PENDIENTE' } });
      const inProgress = await WorkOrder.count({ where: { ...whereClause, status: 'EN_PROCESO' } });
      const completed = await WorkOrder.count({ where: { ...whereClause, status: 'RESUELTA' } });
      const cancelled = await WorkOrder.count({ where: { ...whereClause, status: 'CANCELADO' } });

      return {
        total,
        pending,
        inProgress,
        completed,
        cancelled,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Obtener última WorkOrder creada por usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<WorkOrder>}
   */
  async getLatestWorkOrderByUser(userId) {
    try {
      const latestFailureOrder = await FailureOrder.findOne({
        where: { reported_by_id: userId },
        order: [['createdAt', 'DESC']]
      });

      if (!latestFailureOrder) {
        throw new Error('No se encontró ninguna falla reportada por este usuario');
      }

      const latestWorkOrder = await WorkOrder.findOne({
        where: { failure_order_id: latestFailureOrder.id },
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            include: [
              { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] }
            ]
          },
          {
            model: WorkOrderPart,
            as: 'parts',
            include: [
              { model: Inventory, as: 'inventory' }
            ]
          }
        ]
      });

      if (!latestWorkOrder) {
        throw new Error('No se encontró orden de trabajo asociada');
      }

      return latestWorkOrder;
    } catch (error) {
      console.error('❌ Error obteniendo última WorkOrder:', error);
      throw new Error(`Error al obtener última orden de trabajo: ${error.message}`);
    }
  }

  /**
   * Generar ID único para WorkOrder
   * @returns {string}
   */
  async updateWorkOrderFields(workOrderId, updateData) {
    try {
      const workOrder = await WorkOrder.findByPk(workOrderId);
      if (!workOrder) {
        throw new Error(`WorkOrder con ID ${workOrderId} no encontrada`);
      }


      // ✅ VALIDACIÓN: Si se intenta cambiar a RESUELTA, validar campos obligatorios
      if (updateData.status === 'RESUELTA') {
        const validationErrors = [];

        // 1. Validar que tiene actividad realizada (descripción de la solución)
        if (!workOrder.activity_performed || workOrder.activity_performed.trim() === '') {
          validationErrors.push('La descripción de la actividad realizada es obligatoria');
        }

        // 2. Validar que tiene evidencia visual/documental
        if (!workOrder.evidence_url || workOrder.evidence_url.trim() === '') {
          validationErrors.push('La evidencia de la solución (imagen/foto) es obligatoria');
        }

        // 3. Validar que tiene firma digital
        if (!workOrder.closure_signature || workOrder.closure_signature.trim() === '') {
          validationErrors.push('La firma digital es obligatoria');
        }

        // 4. Validar que tiene hora de inicio
        if (!workOrder.start_time) {
          validationErrors.push('La hora de inicio es obligatoria');
        }

        // 5. Validar que tiene hora de fin
        if (!workOrder.end_time) {
          validationErrors.push('La hora de finalización es obligatoria');
        }

        // Si hay errores de validación, lanzar error con todos los mensajes
        if (validationErrors.length > 0) {
          throw new Error(`Campos obligatorios faltantes: ${validationErrors.join(', ')}`);
        }

        console.log(`✅ Validaciones pasadas para cambiar OT ${workOrder.work_order_id} a RESUELTA`);
      }

      await workOrder.update(updateData);

      return await this.getWorkOrderById(workOrderId);
    } catch (error) {
      console.error('❌ Error actualizando campos WorkOrder:', error);
      throw new Error(`Error al actualizar campos: ${error.message}`);
    }
  }

  generateWorkOrderId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `OT-${year}-${timestamp}`;
  }
}

module.exports = new WorkOrderService();