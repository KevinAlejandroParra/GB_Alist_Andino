'use strict';

const { FailureOrder, WorkOrder, Inventory, User, ChecklistItem, Sequelize } = require('../models');
const { Op } = Sequelize;

class FailureOrderService {
  /**
   * Crear Orden de Falla desde checklist
   * Campos obligatorios: description, evidence_url, type_maintenance
   */
  async createFromChecklist(data) {
    try {
      const {
        description,
        severity = 'LEVE',
        evidenceUrl,
        inspectableId,
        checklistItemId,
        reportedBy,
        assignedTechnicianArea,
        type_maintenance = 'TECNICA'
      } = data;

      // Validaciones
      if (!description) throw new Error('description es requerido');
      if (!evidenceUrl) throw new Error('evidence_url es requerido');
      if (!reportedBy) throw new Error('reportedBy es requerido');

      // Normalizar severidad
      let normalizedSeverity = severity;
      if (!['LEVE', 'MODERADA', 'CRITICA'].includes(normalizedSeverity)) {
        normalizedSeverity = 'LEVE';
      }

      // Validar type_maintenance
      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA', 'SST'].includes(type_maintenance)) {
        throw new Error('type_maintenance debe ser TECNICA, OPERATIVA, LOCATIVA o SST');
      }

      // Normalizar área asignada
      let normalizedAssignedArea = assignedTechnicianArea || 'TECNICA';
      if (!['TECNICA', 'OPERATIVA'].includes(normalizedAssignedArea)) {
        normalizedAssignedArea = 'TECNICA';
      }

      // ✅ NUEVO: Manejar recurrencia
      const isRecurring = data.isRecurring || false;
      const recurrenceCount = 1; // Primera ocurrencia por defecto
      const reportSignature = null; // No tiene firma de reporte inicialmente

      // 🔍 DEBUG: Verificar que inspectableId está llegando
      console.log('🔍 ========== DEBUG: CREATE FROM CHECKLIST ==========');
      console.log('📋 inspectableId recibido:', inspectableId);
      console.log('🔢 checklistItemId recibido:', checklistItemId);
      console.log('📝 description:', description);
      console.log('🔍 ==================================================');

      // Generar ID único
      const failureOrderId = this.generateFailureOrderId();

      // Crear orden de falla
      const failureOrder = await FailureOrder.create({
        failure_order_id: failureOrderId,
        description,
        severity: normalizedSeverity,
        evidence_url: evidenceUrl,
        type_maintenance,
        reported_by_id: reportedBy,
        affected_id: inspectableId,
        checklist_item_id: checklistItemId,
        assigned_to: normalizedAssignedArea,
        // ✅ NUEVO: Campos de recurrencia
        is_recurring: isRecurring,
        recurrence_count: recurrenceCount,
        report_signature: reportSignature
      });

      console.log(`✅ OF creada con affected_id: ${inspectableId} - ID: ${failureOrderId}`);

      // Cargar con relaciones
      const createdFailureOrder = await FailureOrder.findByPk(failureOrder.id, {
        include: [
          { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
          { model: require('../models').Inspectable, as: 'affectedInspectable' }
        ]
      });

      console.log(`✅ OF creada: ${failureOrderId} - Tipo: ${type_maintenance} - Severidad: ${normalizedSeverity}`);

      return {
        success: true,
        data: createdFailureOrder,
        message: 'Orden de falla creada exitosamente'
      };
    } catch (error) {
      console.error('❌ Error creando OF desde checklist:', error);
      throw new Error(`Error al crear orden de falla: ${error.message}`);
    }
  }

  /**
   * Crear Orden de Falla independiente
   * Campos obligatorios: description, evidence_url, type_maintenance
   */
  async createStandalone(data) {
    try {
      const {
        description,
        severity = 'LEVE',
        evidenceUrl,
        inspectableId,
        reportedBy,
        assignedTechnicianArea,
        type_maintenance = 'TECNICA'
      } = data;

      // Validaciones
      if (!description) throw new Error('description es requerido');
      if (!evidenceUrl) throw new Error('evidence_url es requerido');
      if (!reportedBy) throw new Error('reportedBy es requerido');

      // Validar severidad
      if (!['LEVE', 'MODERADA', 'CRITICA'].includes(severity)) {
        throw new Error('severity debe ser LEVE, MODERADA o CRITICA');
      }

      // Validar type_maintenance
      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA', 'SST'].includes(type_maintenance)) {
        throw new Error('type_maintenance debe ser TECNICA, OPERATIVA, LOCATIVA o SST');
      }

      // ✅ NUEVO: Manejar recurrencia para fallas independientes
      const isRecurring = data.isRecurring || false;
      const recurrenceCount = 1;
      const reportSignature = null;

      // Generar ID único
      const failureOrderId = this.generateFailureOrderId();

      // Crear orden de falla independiente
      const failureOrder = await FailureOrder.create({
        failure_order_id: failureOrderId,
        description,
        severity,
        evidence_url: evidenceUrl,
        type_maintenance,
        reported_by_id: reportedBy,
        affected_id: inspectableId,
        checklist_item_id: null,
        assigned_to: assignedTechnicianArea || 'TECNICA',
        // ✅ NUEVO: Campos de recurrencia
        is_recurring: isRecurring,
        recurrence_count: recurrenceCount,
        report_signature: reportSignature
      });

      // Cargar con relaciones
      const createdFailureOrder = await FailureOrder.findByPk(failureOrder.id, {
        include: [
          { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
          { model: require('../models').Inspectable, as: 'affectedInspectable' }
        ]
      });

      console.log(`✅ OF independiente creada: ${failureOrderId} - Tipo: ${type_maintenance} - Severidad: ${severity}`);

      return {
        success: true,
        data: createdFailureOrder,
        message: 'Orden de falla independiente creada exitosamente'
      };
    } catch (error) {
      console.error('❌ Error creando OF independiente:', error);
      throw new Error(`Error al crear orden de falla: ${error.message}`);
    }
  }

  /**
   * Crear Orden de Falla vinculada a requisición de repuesto
   * La requisición debe crearse primero y pasar su ID
   */
  async createStandaloneWithPart(data) {
    try {
      const {
        description,
        severity = 'LEVE',
        evidenceUrl,
        assignedTechnicianArea = 'TECNICA',
        type_maintenance = 'TECNICA',
        reportedBy,
        requisitionId
      } = data;

      // Validaciones
      if (!description) throw new Error('description es requerido');
      if (!evidenceUrl) throw new Error('evidence_url es requerido');
      if (!reportedBy) throw new Error('reportedBy es requerido');
      if (!requisitionId) throw new Error('requisitionId es requerido para enlazar con la requisición');

      // Validar severidad
      if (!['LEVE', 'MODERADA', 'CRITICA'].includes(severity)) {
        throw new Error('severity debe ser LEVE, MODERADA o CRITICA');
      }

      // Validar type_maintenance
      if (!['TECNICA', 'OPERATIVA', 'LOCATIVA', 'SST'].includes(type_maintenance)) {
        throw new Error('type_maintenance debe ser TECNICA, OPERATIVA, LOCATIVA o SST');
      }

      // Validar área técnica
      if (!['TECNICA', 'OPERATIVA'].includes(assignedTechnicianArea)) {
        throw new Error('assignedTechnicianArea debe ser TECNICA u OPERATIVA');
      }

      // ✅ NUEVO: Manejar recurrencia para fallas con repuesto
      const isRecurring = data.isRecurring || false;
      const recurrenceCount = 1;
      const reportSignature = null;

      // Generar ID único
      const failureOrderId = this.generateFailureOrderId();

      // Crear orden de falla vinculada a requisición
      const failureOrder = await FailureOrder.create({
        failure_order_id: failureOrderId,
        description,
        severity,
        evidence_url: evidenceUrl,
        type_maintenance,
        reported_by_id: reportedBy,
        affected_id: null,
        checklist_item_id: null,
        assigned_to: assignedTechnicianArea,
        requisition_id: requisitionId,
        // ✅ NUEVO: Campos de recurrencia
        is_recurring: isRecurring,
        recurrence_count: recurrenceCount,
        report_signature: reportSignature
      });

      // Cargar con relaciones
      const createdFailureOrder = await FailureOrder.findByPk(failureOrder.id, {
        include: [
          { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
          { model: require('../models').Inspectable, as: 'affectedInspectable' }
        ]
      });

      console.log(`✅ OF con requisición creada: ${failureOrderId} - Tipo: ${type_maintenance} - Requisición: ${requisitionId}`);

      return {
        success: true,
        data: createdFailureOrder,
        requisition_id: requisitionId,
        message: 'Orden de falla con requisición creada exitosamente'
      };
    } catch (error) {
      console.error('❌ Error creando OF con requisición:', error);
      throw new Error(`Error al crear orden de falla: ${error.message}`);
    }
  }

  /**
   * Actualizar información de una Orden de Falla
   * Solo permite actualizar campos específicos de failure_orders
   */
  async updateFailureOrder(failureOrderId, updateData) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
          { model: require('../models').Inspectable, as: 'affectedInspectable' },
          { model: WorkOrder, as: 'workOrder' }
        ]
      });

      if (!failureOrder) {
        throw new Error(`Orden de falla ${failureOrderId} no encontrada`);
      }

      // Campos permitidos para actualizar (solo campos existentes en nueva estructura)
      const allowedFields = [
        'description',
        'severity',
        'type_maintenance',
        'assigned_to',
        'evidence_url',
        'affected_id',
        // ✅ NUEVO: Campos de recurrencia
        'is_recurring',
        'recurrence_count',
        'report_signature'
      ];

      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // Actualizar
      await failureOrder.update(filteredData);

      // Recargar actualizada
      const updatedFailureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
          { model: require('../models').Inspectable, as: 'affectedInspectable' },
          { model: WorkOrder, as: 'workOrder' }
        ]
      });

      console.log(`✅ OF ${failureOrder.failure_order_id} actualizada exitosamente`);

      return {
        success: true,
        data: updatedFailureOrder,
        message: 'Orden de falla actualizada exitosamente'
      };
    } catch (error) {
      console.error('❌ Error actualizando OF:', error);
      throw new Error(`Error al actualizar orden de falla: ${error.message}`);
    }
  }

  /**
   * Obtener órdenes de falla por estado con filtros
   */
  async getByStatus(status, filters = {}) {
    try {
      const {
        id,
        requiresReplacement,
        assignedTechnicianArea,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = filters;

      // Construir condiciones WHERE
      const whereConditions = {};

      // Filtro por ID específico
      if (id) {
        whereConditions.id = id;
      }

      // Filtro por requiere reemplazo
      if (requiresReplacement !== undefined) {
        whereConditions.requires_replacement = requiresReplacement;
      }

      // Filtro por área asignada
      if (assignedTechnicianArea) {
        whereConditions.assigned_technician_area = assignedTechnicianArea;
      }

      // Filtros de fecha
      if (dateFrom || dateTo) {
        whereConditions.created_at = {};
        if (dateFrom) whereConditions.created_at[Op.gte] = new Date(dateFrom);
        if (dateTo) whereConditions.created_at[Op.lte] = new Date(dateTo);
      }

      // Paginación
      const offset = (page - 1) * limit;

      // Consulta
      const { count, rows: failures } = await FailureOrder.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: require('../models').Inspectable,
            as: 'affectedInspectable'
          },
          {
            model: WorkOrder,
            as: 'workOrder'
          }
        ],
        limit,
        offset,
        order: [[sortBy, sortOrder]]
      });

      return {
        success: true,
        data: {
          failures,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit
          }
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo fallas por estado:', error);
      throw new Error(`Error al obtener órdenes de falla: ${error.message}`);
    }
  }

  /**
   * Validar transición de estado
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'REPORTADO': ['EN_PROCESO'],
      'EN_PROCESO': ['RESUELTO', 'EN_PRUEBAS'],
      'EN_PRUEBAS': ['RESUELTO', 'EN_PROCESO'],
      'RESUELTO': ['CERRADO', 'EN_PROCESO'],
      'CERRADO': []
    };

    if (!validTransitions[currentStatus]) {
      throw new Error(`Estado actual '${currentStatus}' no válido`);
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Transición de '${currentStatus}' a '${newStatus}' no permitida`);
    }

    return true;
  }

  /**
   * Actualizar estado de la orden de falla
   */
  async updateStatus(failureOrderId, newStatus) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId);

      if (!failureOrder) {
        throw new Error(`Orden de falla ${failureOrderId} no encontrada`);
      }

      // Validar transición
      this.validateStatusTransition(failureOrder.status, newStatus);

      // Actualizar estado
      await failureOrder.update({ status: newStatus });

      // Recargar con relaciones
      const updatedFailureOrder = await FailureOrder.findByPk(failureOrderId, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_id', 'user_name']
          },
          {
            model: require('../models').Inspectable,
            as: 'affectedInspectable'
          },
          {
            model: WorkOrder,
            as: 'workOrder'
          }
        ]
      });

      console.log(`✅ OF ${failureOrderId} actualizada a estado: ${newStatus}`);

      return {
        success: true,
        data: updatedFailureOrder,
        message: `Estado actualizado a ${newStatus}`
      };

    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw new Error(`Error al actualizar estado: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de Órdenes de Falla
   * Agrupa por severity y type_maintenance
   */
  async getStatistics(dateFrom, dateTo, locationId) {
    try {
      // Condiciones base
      const baseConditions = {};

      if (dateFrom || dateTo) {
        baseConditions.createdAt = {};
        if (dateFrom) baseConditions.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) baseConditions.createdAt[Op.lte] = new Date(dateTo);
      }

      // Estadísticas
      const [
        totalFailures,
        severityStats,
        typeMaintenanceStats,
        assignedToStats
      ] = await Promise.all([
        FailureOrder.count({ where: baseConditions }),

        // Por severidad
        FailureOrder.findAll({
          attributes: ['severity', [FailureOrder.sequelize.fn('COUNT', FailureOrder.sequelize.col('id')), 'count']],
          where: baseConditions,
          group: ['severity']
        }),

        // Por tipo de mantenimiento
        FailureOrder.findAll({
          attributes: ['type_maintenance', [FailureOrder.sequelize.fn('COUNT', FailureOrder.sequelize.col('id')), 'count']],
          where: baseConditions,
          group: ['type_maintenance']
        }),

        // Por área asignada
        FailureOrder.findAll({
          attributes: ['assigned_to', [FailureOrder.sequelize.fn('COUNT', FailureOrder.sequelize.col('id')), 'count']],
          where: { ...baseConditions, assigned_to: { [Op.not]: null } },
          group: ['assigned_to']
        })
      ]);

      // Procesar resultados
      const severitySummary = {};
      severityStats.forEach(item => {
        severitySummary[item.severity] = parseInt(item.get('count'));
      });

      const typeMaintenanceSummary = {};
      typeMaintenanceStats.forEach(item => {
        typeMaintenanceSummary[item.type_maintenance] = parseInt(item.get('count'));
      });

      const assignedToSummary = assignedToStats.map(item => ({
        area: item.assigned_to,
        totalAssigned: parseInt(item.get('count'))
      }));

      return {
        success: true,
        data: {
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            total: totalFailures,
            leve: severitySummary.LEVE || 0,
            moderada: severitySummary.MODERADA || 0,
            critica: severitySummary.CRITICA || 0
          },
          byTypeMaintenance: {
            tecnica: typeMaintenanceSummary.TECNICA || 0,
            operativa: typeMaintenanceSummary.OPERATIVA || 0,
            locativa: typeMaintenanceSummary.LOCATIVA || 0,
            sst: typeMaintenanceSummary.SST || 0
          },
          byAssignedTo: assignedToSummary
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Generar ID único para Orden de Falla
   */
  generateFailureOrderId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `OF-${year}-${timestamp}`;
  }

  /**
   * Generar ID único para Orden de Trabajo
   */
  generateWorkOrderId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `OT-${year}-${timestamp}`;
  }
}

module.exports = new FailureOrderService();