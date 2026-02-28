'use strict';

const { Requisition, WorkOrder, User, FailureOrder, Inventory } = require('../models');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const InventoryService = require('./InventoryService');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/uploads/requisitions');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `evidence_${req.body.requisitionId || 'temp'}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: function (req, file, cb) {
    // Verificar que es una imagen
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

class RequisitionService {
  /**
   * Crear nueva solicitud de repuesto
   * @param {Object} data - Datos de la solicitud
   * @returns {Promise<Object>} - Solicitud creada
   */
  async createRequisition(data) {
    try {
      const {
        workOrderId,
        partReference,
        quantityRequested,
        notes = '',
        urgencyLevel = 'NORMAL',
        imageUrl,
        requestedBy
      } = data;

      // Validaciones
      if (!workOrderId) {
        throw new Error('workOrderId es requerido');
      }
      if (!partReference || partReference.trim() === '') {
        throw new Error('partReference es requerido');
      }
      if (!quantityRequested || quantityRequested <= 0) {
        throw new Error('quantityRequested debe ser mayor a 0');
      }
      if (!requestedBy) {
        throw new Error('requestedBy es requerido');
      }

      // Verificar que la orden de trabajo existe
      const workOrder = await WorkOrder.findByPk(workOrderId, {
        include: [
          {
            model: FailureOrder,
            as: 'failureOrder',
            attributes: ['id', 'failure_order_id', 'description']
          }
        ]
      });

      if (!workOrder) {
        throw new Error(`Orden de trabajo ${workOrderId} no encontrada`);
      }

      // Verificar que el usuario solicitante existe
      const requester = await User.findByPk(requestedBy);
      if (!requester) {
        throw new Error(`Usuario solicitante ${requestedBy} no encontrado`);
      }

      // Crear la solicitud (status se establece automáticamente)
      let requisitionNotes = notes.trim();
      let requisitionStatus = 'SOLICITADO';

      // Si hay urgencia, actualizar estado y notas
      if (urgencyLevel === 'URGENTE' || urgencyLevel === 'EMERGENCY') {
        requisitionStatus = 'PENDIENTE'; // Ir directamente a pendiente para urgente
        requisitionNotes = requisitionNotes + ` [URGENCIA: ${urgencyLevel}]`;
      }

      const requisition = await Requisition.create({
        status: requisitionStatus,
        part_reference: partReference.trim(),
        quantity_requested: quantityRequested,
        notes: requisitionNotes,
        image_url: imageUrl || null,
        work_order_id: workOrderId,
        requested_by_id: requestedBy
      });

      // Cargar la solicitud con relaciones
      const createdRequisition = await Requisition.findByPk(requisition.id, {
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: FailureOrder,
                as: 'failureOrder',
                attributes: ['id', 'failure_order_id', 'description']
              }
            ]
          },
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      console.log(`✅ Requisición creada: ID ${requisition.id} - OT: ${workOrder.work_order_id} - Cantidad: ${quantityRequested}`);

      return {
        success: true,
        data: createdRequisition,
        message: 'Solicitud creada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando requisición:', error);
      throw new Error(`Error al crear solicitud: ${error.message}`);
    }
  }

  /**
   * Aprobar solicitud
   * @param {number} requisitionId - ID de la requisición
   * @param {number} approverId - ID del aprobador
   * @param {string} notes - Notas adicionales
   * @param {string} estimatedDeliveryDate - Fecha estimada de entrega
   * @returns {Promise<Object>} - Solicitud aprobada
   */
  async approveRequisition(requisitionId, approverId, notes = '', estimatedDeliveryDate = null) {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['SOLICITADO', 'PENDIENTE'].includes(requisition.status)) {
        throw new Error(`No se puede aprobar requisición en estado ${requisition.status}`);
      }

      // Verificar que el aprobador existe
      const approver = await User.findByPk(approverId);
      if (!approver) {
        throw new Error(`Usuario aprobador ${approverId} no encontrado`);
      }

      // Actualizar requisición
      await requisition.update({
        status: 'PENDIENTE',
        approved_by_id: approverId,
        notes: notes ? `${requisition.notes} [APROBADO: ${notes}]` : requisition.notes
      });

      console.log(`✅ Requisición aprobada: ${requisition.id} - Aprobador: ${approver.user_name}`);

      return {
        success: true,
        data: await Requisition.findByPk(requisitionId, {
          include: [
            { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
            { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
          ]
        }),
        message: 'Solicitud aprobada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error aprobando requisición:', error);
      throw new Error(`Error al aprobar solicitud: ${error.message}`);
    }
  }

  /**
   * Marcar como recibida
   * @param {number} requisitionId - ID de la requisición
   * @param {number} receivedBy - ID del usuario que recibe
   * @param {string} notes - Notas de recepción
   * @returns {Promise<Object>} - Solicitud marcada como recibida
   */
  async markAsReceived(requisitionId, receivedBy, notes = '') {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['PENDIENTE', 'SOLICITADO'].includes(requisition.status)) {
        throw new Error(`No se puede recibir requisición en estado ${requisition.status}`);
      }

      // Verificar que el usuario existe
      const user = await User.findByPk(receivedBy);
      if (!user) {
        throw new Error(`Usuario ${receivedBy} no encontrado`);
      }

      // Actualizar requisición
      await requisition.update({
        status: 'RECIBIDO',
        received_at: new Date(),
        notes: notes ? `${requisition.notes} [RECIBIDO: ${notes}]` : requisition.notes
      });

      console.log(`✅ Requisición recibida: ${requisition.id}`);

      return {
        success: true,
        data: await Requisition.findByPk(requisitionId, {
          include: [
            { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
            { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
          ]
        }),
        message: 'Solicitud marcada como recibida exitosamente'
      };

    } catch (error) {
      console.error('❌ Error marcando como recibida:', error);
      throw new Error(`Error al marcar como recibida: ${error.message}`);
    }
  }

  /**
   * Obtener solicitudes con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Object>} - Lista de solicitudes
   */
  async getRequisitions(filters = {}) {
    try {
      const {
        status,
        requestedBy,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = filters;

      // Construir condiciones WHERE
      const whereConditions = {};

      if (status && status !== 'all') {
        whereConditions.status = status;
      }

      if (requestedBy) {
        whereConditions.requested_by_id = requestedBy;
      }

      if (dateFrom || dateTo) {
        whereConditions.createdAt = {};
        if (dateFrom) {
          whereConditions.createdAt[require('sequelize').Op.gte] = new Date(dateFrom);
        }
        if (dateTo) {
          whereConditions.createdAt[require('sequelize').Op.lte] = new Date(dateTo);
        }
      }

      // Consultar requisiciones con paginación
      const { rows: requisitions, count: total } = await Requisition.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: FailureOrder,
                as: 'failureOrder',
                attributes: ['id', 'failure_order_id', 'description']
              }
            ]
          },
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
          { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
        ],
        order: [[sortBy, sortOrder]],
        limit: limit,
        offset: (page - 1) * limit
      });

      return {
        success: true,
        data: {
          requisitions: requisitions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            limit: limit
          }
        }
      };

    } catch (error) {
      console.error('❌ Error consultando requisiciones:', error);
      throw new Error(`Error al consultar solicitudes: ${error.message}`);
    }
  }

  /**
   * Generar ID único para requisición (ya no usado)
   * @returns {string} - ID único
   */
  generateRequisitionId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `REQ-${year}-${timestamp}`;
  }

  /**
   * Aprobar requisición y agregar al inventario
   * @param {number} requisitionId - ID de la requisición
   * @param {number} approverId - ID del aprobador
   * @param {Object} inventoryData - Datos del inventario
   * @returns {Promise<Object>} - Requisición procesada
   */
  async approveAndAddToInventory(requisitionId, approverId, inventoryData = {}) {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: FailureOrder,
                as: 'failureOrder',
                attributes: ['id', 'failure_order_id', 'description']
              }
            ]
          },
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['SOLICITADO', 'PENDIENTE'].includes(requisition.status)) {
        throw new Error(`No se puede aprobar requisición en estado ${requisition.status}`);
      }

      // Verificar que el aprobador existe
      const approver = await User.findByPk(approverId);
      if (!approver) {
        throw new Error(`Usuario aprobador ${approverId} no encontrado`);
      }

      // Datos por defecto para el inventario
      const {
        location = 'Almacén Central',
        category = 'Repuesto',
        status = 'Disponible',
        notes = 'Aprobado automáticamente desde requisición',
        image_url = null
      } = inventoryData;

      // Crear o actualizar el item en el inventario
      const inventoryItem = await InventoryService.createOrUpdateInventoryItem({
        part_name: requisition.part_reference,
        quantity: requisition.quantity_requested,
        details: `Repuesto para OT: ${requisition.workOrder.work_order_id} - ${requisition.workOrder.failureOrder?.description || 'Sin descripción'}`,
        location,
        category,
        status,
        image_url
      });

      // Actualizar la requisición
      await requisition.update({
        status: 'PENDIENTE',
        approved_by_id: approverId,
        approval_date: new Date(),
        notes: `${requisition.notes} [APROBADO: Repuesto agregado al inventario]`
      });

      console.log(`✅ Requisición aprobada e inventario actualizado: ${requisition.id}`);

      return {
        success: true,
        data: {
          requisition: await Requisition.findByPk(requisitionId, {
            include: [
              {
                model: WorkOrder,
                as: 'workOrder',
                include: [
                  {
                    model: FailureOrder,
                    as: 'failureOrder',
                    attributes: ['id', 'failure_order_id', 'description']
                  }
                ]
              },
              { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
              { model: User, as: 'approver', attributes: ['user_id', 'user_name'] },
              { model: Inventory, as: 'inventory', attributes: ['id', 'part_name', 'quantity', 'location'] }
            ]
          }),
          inventory: inventoryItem
        },
        message: 'Requisición aprobada y repuesto agregado al inventario exitosamente'
      };

    } catch (error) {
      console.error('❌ Error aprobando y agregando al inventario:', error);
      throw new Error(`Error al procesar requisición: ${error.message}`);
    }
  }

  /**
   * Recibir requisición y agregar al inventario
   * @param {number} requisitionId - ID de la requisición
   * @param {number} receivedBy - ID del usuario que recibe
   * @param {Object} inventoryData - Datos del inventario
   * @returns {Promise<Object>} - Requisición procesada
   */
  async receiveAndAddToInventory(requisitionId, receivedBy, inventoryData = {}) {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            include: [
              {
                model: FailureOrder,
                as: 'failureOrder',
                attributes: ['id', 'failure_order_id', 'description']
              }
            ]
          },
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['SOLICITADO', 'PENDIENTE'].includes(requisition.status)) {
        throw new Error(`No se puede recibir requisición en estado ${requisition.status}`);
      }

      // Verificar que el receptor existe
      const receiver = await User.findByPk(receivedBy);
      if (!receiver) {
        throw new Error(`Usuario receptor ${receivedBy} no encontrado`);
      }

      // Datos por defecto para el inventario
      const {
        location = 'Almacén Central',
        category = 'Repuesto',
        status = 'Disponible',
        notes = 'Recibido desde requisición',
        image_url = null
      } = inventoryData;

      // Crear o actualizar el item en el inventario
      const inventoryItem = await InventoryService.createOrUpdateInventoryItem({
        part_name: requisition.part_reference,
        quantity: requisition.quantity_requested, // Asumimos que se recibe todo lo solicitado
        details: `Repuesto para OT: ${requisition.workOrder.work_order_id} - ${requisition.workOrder.failureOrder?.description || 'Sin descripción'}`,
        location,
        category,
        status,
        image_url
      });

      // Actualizar la requisición
      await requisition.update({
        status: 'RECIBIDO',
        received_at: new Date(),
        // received_by_id: receivedBy, // Si existiera este campo
        notes: notes ? `${requisition.notes} [RECIBIDO: Agregado al inventario]` : requisition.notes
      });

      console.log(`✅ Requisición recibida e inventario actualizado: ${requisition.id}`);

      return {
        success: true,
        data: {
          requisition: await Requisition.findByPk(requisitionId, {
            include: [
              {
                model: WorkOrder,
                as: 'workOrder',
                include: [
                  {
                    model: FailureOrder,
                    as: 'failureOrder',
                    attributes: ['id', 'failure_order_id', 'description']
                  }
                ]
              },
              { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
              { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
            ]
          }),
          inventory: inventoryItem
        },
        message: 'Requisición recibida y repuesto agregado al inventario exitosamente'
      };

    } catch (error) {
      console.error('❌ Error recibiendo y agregando al inventario:', error);
      throw new Error(`Error al procesar recepción: ${error.message}`);
    }
  }

  /**
   * Marcar como recibida y descargar del inventario
   * @param {number} requisitionId - ID de la requisición
   * @param {number} receivedBy - ID del usuario que recibe
   * @param {number} quantityUsed - Cantidad realmente utilizada
   * @param {string} notes - Notas de recepción
   * @returns {Promise<Object>} - Solicitud procesada
   */
  async markAsReceivedAndDeduct(requisitionId, receivedBy, quantityUsed, notes = '') {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          {
            model: Inventory,
            as: 'inventory',
            attributes: ['id', 'part_name', 'quantity']
          },
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['PENDIENTE', 'SOLICITADO'].includes(requisition.status)) {
        throw new Error(`No se puede recibir requisición en estado ${requisition.status}`);
      }

      // Verificar que el usuario existe
      const user = await User.findByPk(receivedBy);
      if (!user) {
        throw new Error(`Usuario ${receivedBy} no encontrado`);
      }

      // Verificar que hay inventario asociado
      if (!requisition.inventory) {
        throw new Error('Requisición no tiene inventario asociado');
      }

      // Verificar que hay suficiente cantidad
      if (quantityUsed > requisition.inventory.quantity) {
        throw new Error(`Cantidad insuficiente en inventario. Disponible: ${requisition.inventory.quantity}, Solicitado: ${quantityUsed}`);
      }

      // Descontar del inventario
      await InventoryService.deductFromInventory(requisition.inventory.id, quantityUsed);

      // Actualizar requisición
      await requisition.update({
        status: 'RECIBIDO',
        received_at: new Date(),
        quantity_received: quantityUsed,
        notes: notes ? `${requisition.notes} [RECIBIDO: ${notes}]` : requisition.notes
      });

      console.log(`✅ Requisición marcada como recibida y inventario descontado: ${requisition.id}`);

      return {
        success: true,
        data: await Requisition.findByPk(requisitionId, {
          include: [
            {
              model: Inventory,
              as: 'inventory',
              attributes: ['id', 'part_name', 'quantity']
            },
            { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
            { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
          ]
        }),
        message: 'Requisición marcada como recibida e inventario descontado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error marcando como recibida y descontando:', error);
      throw new Error(`Error al procesar recepción: ${error.message}`);
    }
  }

  /**
   * Cancelar una requisición pendiente
   * @param {number} requisitionId - ID de la requisición
   * @param {string} reason - Razón de cancelación
   * @param {number} cancelledBy - ID del usuario que cancela
   * @returns {Promise<Object>} - Requisición cancelada
   */
  async cancelRequisition(requisitionId, reason, cancelledBy) {
    try {
      const requisition = await Requisition.findByPk(requisitionId, {
        include: [
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] }
        ]
      });

      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Verificar estado actual
      if (!['SOLICITADO', 'PENDIENTE'].includes(requisition.status)) {
        throw new Error(`No se puede cancelar requisición en estado ${requisition.status}`);
      }

      // Verificar que el usuario existe
      const user = await User.findByPk(cancelledBy);
      if (!user) {
        throw new Error(`Usuario ${cancelledBy} no encontrado`);
      }

      // Actualizar requisición
      await requisition.update({
        status: 'CANCELADO',
        notes: `${requisition.notes} [CANCELADO: ${reason}]`
      });

      console.log(`✅ Requisición cancelada: ${requisition.id}`);

      return {
        success: true,
        data: await Requisition.findByPk(requisitionId, {
          include: [
            { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
            { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
          ]
        }),
        message: 'Requisición cancelada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error cancelando requisición:', error);
      throw new Error(`Error al cancelar solicitud: ${error.message}`);
    }
  }

  /**
   * Eliminar requisición
   * Solo el solicitante (requested_by_id) o un admin/soporte puede eliminar la requisición
   */
  async deleteRequisition(requisitionId, requesterUserId, userRoleId) {
    try {
      const requisition = await Requisition.findByPk(requisitionId);
      if (!requisition) {
        throw new Error(`Requisición ${requisitionId} no encontrada`);
      }

      // Permitir borrado si el usuario es quien solicitó o si tiene rol admin/soporte (1 o 2)
      if (Number(requisition.requested_by_id) !== Number(requesterUserId) && ![1, 2].includes(Number(userRoleId))) {
        throw new Error('No autorizado para eliminar esta requisición');
      }

      // Evitar eliminar requisiciones que ya fueron recibidas o aprobadas
      if (['PENDIENTE', 'RECIBIDO'].includes(requisition.status)) {
        throw new Error(`No se puede eliminar una requisición en estado ${requisition.status}`);
      }

      await requisition.destroy();

      return { success: true, message: 'Requisición eliminada exitosamente' };
    } catch (error) {
      console.error('❌ Error eliminando requisición:', error);
      throw new Error(error.message || 'Error al eliminar requisición');
    }
  }

  /**
   * Obtener historial de requisiciones para una orden de trabajo
   * @param {number} workOrderId - ID de la orden de trabajo
   * @returns {Promise<Object>} - Historial de requisiciones
   */
  async getRequisitionHistory(workOrderId) {
    try {
      const requisitions = await Requisition.findAll({
        where: { work_order_id: workOrderId },
        include: [
          { model: User, as: 'requester', attributes: ['user_id', 'user_name'] },
          { model: User, as: 'approver', attributes: ['user_id', 'user_name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: requisitions
      };

    } catch (error) {
      console.error('❌ Error obteniendo historial de requisiciones:', error);
      throw new Error(`Error al consultar historial: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de requisiciones
   * @param {string} dateFrom - Fecha desde
   * @param {string} dateTo - Fecha hasta
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStatistics(dateFrom, dateTo) {
    try {
      const whereConditions = {};

      if (dateFrom || dateTo) {
        whereConditions.createdAt = {};
        if (dateFrom) {
          whereConditions.createdAt[require('sequelize').Op.gte] = new Date(dateFrom);
        }
        if (dateTo) {
          whereConditions.createdAt[require('sequelize').Op.lte] = new Date(dateTo);
        }
      }

      const [
        total,
        solicitadas,
        pendientes,
        recibidas,
        canceladas
      ] = await Promise.all([
        Requisition.count({ where: whereConditions }),
        Requisition.count({ where: { ...whereConditions, status: 'SOLICITADO' } }),
        Requisition.count({ where: { ...whereConditions, status: 'PENDIENTE' } }),
        Requisition.count({ where: { ...whereConditions, status: 'RECIBIDO' } }),
        Requisition.count({ where: { ...whereConditions, status: 'CANCELADO' } })
      ]);

      return {
        success: true,
        data: {
          total,
          solicitadas,
          pendientes,
          recibidas,
          canceladas
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al consultar estadísticas: ${error.message}`);
    }
  }
}

module.exports = new RequisitionService();