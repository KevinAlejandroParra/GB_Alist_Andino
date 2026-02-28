const { FailureOrder } = require('../models');
const { v4: uuidv4 } = require('uuid');

class FailureSignatureService {
  /**
   * Crear una firma para reportar una orden de falla
   * @param {Object} data - Datos de la firma
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async createReportSignature(data) {
    try {
      const {
        failureOrderId,
        userId,
        userName,
        roleName,
        signatureData
      } = data;

      // Validaciones
      if (!failureOrderId) {
        throw new Error('failureOrderId es requerido');
      }
      if (!userId) {
        throw new Error('userId es requerido');
      }
      if (!userName) {
        throw new Error('userName es requerido');
      }
      if (!signatureData) {
        throw new Error('signatureData es requerido');
      }

      // Verificar si la orden de falla existe
      const failureOrder = await FailureOrder.findByPk(failureOrderId);
      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      // Verificar si ya tiene firma de reporte
      if (failureOrder.report_signature) {
        throw new Error('Esta orden de falla ya tiene una firma de reporte');
      }

      // Crear la firma en el campo report_signature
      await failureOrder.update({
        report_signature: signatureData
      });

      console.log(`✅ Firma de reporte creada para falla ${failureOrderId} por ${userName}`);

      return {
        success: true,
        data: {
          failureOrderId,
          userId,
          userName,
          roleName,
          signatureData,
          createdAt: new Date()
        },
        message: 'Firma de reporte creada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando firma de reporte:', error);
      throw new Error(`Error al crear firma de reporte: ${error.message}`);
    }
  }

  /**
   * Crear una firma de administrador para orden de falla
   * @param {Object} data - Datos de la firma
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async createAdminSignature(data) {
    try {
      const {
        failureOrderId,
        adminId,
        signatureData
      } = data;

      // Validaciones
      if (!failureOrderId) throw new Error('failureOrderId es requerido');
      if (!adminId) throw new Error('adminId es requerido');
      if (!signatureData) throw new Error('signatureData es requerido');

      // Verificar si la orden de falla existe
      const failureOrder = await FailureOrder.findByPk(failureOrderId);
      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      // Verificar si ya tiene firma de admin
      if (failureOrder.admin_signature) {
        throw new Error('Esta orden de falla ya tiene una firma de administrador');
      }

      // Crear la firma en los campos de admin
      await failureOrder.update({
        admin_signature: signatureData,
        admin_signature_by_id: adminId,
        admin_signature_at: new Date()
      });

      console.log(`✅ Firma de administrador creada para falla ${failureOrderId} por admin ${adminId}`);

      return {
        success: true,
        data: {
          failureOrderId,
          adminId,
          signatureData,
          signedAt: new Date()
        },
        message: 'Firma de administrador guardada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando firma de administrador:', error);
      throw new Error(`Error al crear firma de administrador: ${error.message}`);
    }
  }

  /**
   * Obtener firma de reporte de una orden de falla
   * @param {number} failureOrderId - ID de la orden de falla
   * @returns {Promise<Object>} - Datos de la firma
   */
  async getReportSignature(failureOrderId) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        attributes: ['id', 'failure_order_id', 'report_signature', 'reported_by_id'],
        include: [
          {
            model: require('../models').User,
            as: 'reporter',
            attributes: ['user_id', 'user_name', 'role_id']
          }
        ]
      });

      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      // Obtener el rol directamente por separado
      let roleName = 'Rol no especificado';
      if (failureOrder.reporter && failureOrder.reporter.role_id) {
        const { Role } = require('../models');
        const role = await Role.findByPk(failureOrder.reporter.role_id, {
          attributes: ['role_name']
        });
        if (role) {
          roleName = role.role_name;
        }
      }

      // Combinar la información del usuario con el rol
      const reportedByWithRole = {
        ...failureOrder.reporter,
        role_name: roleName
      };

      return {
        success: true,
        data: {
          hasReportSignature: !!failureOrder.report_signature,
          reportSignature: failureOrder.report_signature,
          reportedBy: reportedByWithRole,
          failureOrderId: failureOrder.id
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo firma de reporte:', error);
      throw new Error(`Error al obtener firma: ${error.message}`);
    }
  }

  /**
   * Obtener firma de administrador de una orden de falla
   * @param {number} failureOrderId - ID de la orden de falla
   * @returns {Promise<Object>} - Datos de la firma
   */
  async getAdminSignature(failureOrderId) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        attributes: ['id', 'failure_order_id', 'admin_signature', 'admin_signature_by_id', 'admin_signature_at'],
        include: [
          {
            model: require('../models').User,
            as: 'adminSigner',
            attributes: ['user_id', 'user_name']
          }
        ]
      });

      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      return {
        success: true,
        data: {
          hasAdminSignature: !!failureOrder.admin_signature,
          adminSignature: failureOrder.admin_signature,
          signedBy: failureOrder.adminSigner,
          signedAt: failureOrder.admin_signature_at,
          failureOrderId: failureOrder.id
        }
      };

    } catch (error) {
      console.error('❌ Error obteniendo firma de administrador:', error);
      throw new Error(`Error al obtener firma de administrador: ${error.message}`);
    }
  }

  /**
   * Verificar si una orden de falla tiene firma de reporte
   * @param {number} failureOrderId - ID de la orden de falla
   * @returns {Promise<Object>} - Resultado de la verificación
   */
  async hasReportSignature(failureOrderId) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        attributes: ['report_signature']
      });

      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      const hasSignature = !!failureOrder.report_signature;

      return {
        success: true,
        data: {
          hasReportSignature: hasSignature,
          failureOrderId
        },
        message: hasSignature
          ? 'La orden de falla tiene firma de reporte'
          : 'La orden de falla no tiene firma de reporte'
      };

    } catch (error) {
      console.error('❌ Error verificando firma de reporte:', error);
      throw new Error(`Error al verificar firma: ${error.message}`);
    }
  }

  /**
   * Verificar si una orden de falla tiene firma de administrador
   * @param {number} failureOrderId - ID de la orden de falla
   * @returns {Promise<Object>} - Resultado de la verificación
   */
  async hasAdminSignature(failureOrderId) {
    try {
      const failureOrder = await FailureOrder.findByPk(failureOrderId, {
        attributes: ['admin_signature']
      });

      if (!failureOrder) {
        throw new Error('Orden de falla no encontrada');
      }

      const hasSignature = !!failureOrder.admin_signature;

      return {
        success: true,
        data: {
          hasAdminSignature: hasSignature,
          failureOrderId
        },
        message: hasSignature
          ? 'La orden de falla tiene firma de administrador'
          : 'La orden de falla no tiene firma de administrador'
      };

    } catch (error) {
      console.error('❌ Error verificando firma de administrador:', error);
      throw new Error(`Error al verificar firma de administrador: ${error.message}`);
    }
  }

  /**
   * Validar si el usuario puede firmar según su rol
   * @param {string} userRole - Rol del usuario
   * @param {string} signatureType - Tipo de firma (solo REPORT para fallas)
   * @returns {Promise<Object>} - Resultado de validación
   */
  async canUserSign(userRole, signatureType) {
    try {
      // Para órdenes de falla, solo se permite firma de tipo REPORT y ADMIN
      if (signatureType !== 'REPORT' && signatureType !== 'ADMIN') {
        return {
          success: false,
          canSign: false,
          message: 'Tipo de firma no válido para órdenes de falla'
        };
      }

      if (signatureType === 'ADMIN') {
        // Validación básica, aunque el controlador debe verificar role_id === 1
        return {
          success: true,
          canSign: true,
          message: 'Firma de administrador permitida'
        };
      }

      // ✅ CAMBIO: Todos los usuarios autenticados pueden firmar órdenes de falla
      // No hay restricción de roles para firmas de OF y OT
      return {
        success: true,
        canSign: true,
        message: 'El usuario puede firmar órdenes de falla'
      };

    } catch (error) {
      console.error('❌ Error validando permisos de firma:', error);
      throw new Error(`Error al validar permisos: ${error.message}`);
    }
  }
}

module.exports = new FailureSignatureService();