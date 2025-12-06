'use strict';

const { ChecklistSignature } = require('../models');
const { v4: uuidv4 } = require('uuid');

class FailureSignatureService {
  /**
   * Crear una firma para una falla
   * @param {Object} data - Datos de la firma
   * @returns {Promise<Object>} - Firma creada
   */
  async createSignature(data) {
    try {
      const {
        failureOrderId,
        userId,
        userName,
        roleName,
        signatureType,
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
      if (!roleName) {
        throw new Error('roleName es requerido');
      }
      if (!signatureType) {
        throw new Error('signatureType es requerido');
      }
      if (!signatureData) {
        throw new Error('signatureData es requerido');
      }

      // Validar tipo de firma
      if (!['REPORT', 'RESOLUTION', 'CLOSE'].includes(signatureType)) {
        throw new Error('signatureType debe ser REPORT, RESOLUTION o CLOSE');
      }

      // Verificar si ya existe una firma del mismo tipo para esta falla
      const existingSignature = await this.getSignatureByType(failureOrderId, signatureType);
      if (existingSignature) {
        throw new Error(`Ya existe una firma de tipo ${signatureType} para esta falla`);
      }

      // Crear la firma
      const signature = await ChecklistSignature.create({
        failure_order_id: failureOrderId,
        user_id: userId,
        signed_by_name: userName,
        role_at_signature: roleName,
        signature_type: signatureType,
        digital_token: signatureData,
        signed_at: new Date()
      });

      console.log(`✅ Firma ${signatureType} creada para falla ${failureOrderId} por ${userName}`);

      return {
        success: true,
        data: signature,
        message: `Firma ${signatureType} creada exitosamente`
      };

    } catch (error) {
      console.error('❌ Error creando firma:', error);
      throw new Error(`Error al crear firma: ${error.message}`);
    }
  }

  /**
   * Obtener firma por tipo para una falla específica
   * @param {number} failureOrderId - ID de la falla
   * @param {string} signatureType - Tipo de firma
   * @returns {Promise<Object>} - Firma encontrada
   */
  async getSignatureByType(failureOrderId, signatureType) {
    try {
      const signature = await ChecklistSignature.findOne({
        where: {
          failure_order_id: failureOrderId,
          signature_type: signatureType
        },
        include: [
          { model: require('../models').User, as: 'user', attributes: ['user_id', 'user_name'] }
        ]
      });

      return signature;

    } catch (error) {
      console.error('❌ Error obteniendo firma por tipo:', error);
      throw new Error(`Error al obtener firma: ${error.message}`);
    }
  }

  /**
   * Obtener todas las firmas de una falla
   * @param {number} failureOrderId - ID de la falla
   * @returns {Promise<Array>} - Lista de firmas
   */
  async getFailureSignatures(failureOrderId) {
    try {
      const signatures = await ChecklistSignature.findAll({
        where: {
          failure_order_id: failureOrderId
        },
        order: [['signed_at', 'ASC']],
        include: [
          { model: require('../models').User, as: 'user', attributes: ['user_id', 'user_name'] }
        ]
      });

      return {
        success: true,
        data: signatures
      };

    } catch (error) {
      console.error('❌ Error obteniendo firmas de falla:', error);
      throw new Error(`Error al obtener firmas: ${error.message}`);
    }
  }

  /**
   * Verificar si se puede avanzar al siguiente estado
   * @param {string} currentStatus - Estado actual
   * @param {number} failureOrderId - ID de la falla
   * @returns {Promise<Object>} - Resultado de validación
   */
  async canAdvanceStatus(currentStatus, failureOrderId) {
    try {
      const requiredSignatures = {
        'REPORTADO': ['REPORT'],
        'RESUELTO': ['REPORT', 'RESOLUTION'],
        'CERRADO': ['REPORT', 'RESOLUTION', 'CLOSE']
      };

      const neededSignatures = requiredSignatures[currentStatus] || [];
      const missingSignatures = [];

      // Verificar cada firma requerida
      for (const signatureType of neededSignatures) {
        const signature = await this.getSignatureByType(failureOrderId, signatureType);
        if (!signature) {
          missingSignatures.push(signatureType);
        }
      }

      const canAdvance = missingSignatures.length === 0;

      return {
        success: true,
        canAdvance,
        missingSignatures,
        message: canAdvance 
          ? 'Se puede avanzar al siguiente estado'
          : `Faltan firmas: ${missingSignatures.join(', ')}`
      };

    } catch (error) {
      console.error('❌ Error verificando avance de estado:', error);
      throw new Error(`Error al verificar avance: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de firmas para una falla
   * @param {number} failureOrderId - ID de la falla
   * @returns {Promise<Object>} - Resumen de firmas
   */
  async getSignatureSummary(failureOrderId) {
    try {
      const signatures = await this.getFailureSignatures(failureOrderId);
      
      const summary = {
        hasReport: false,
        hasResolution: false,
        hasClose: false,
        reportSignature: null,
        resolutionSignature: null,
        closeSignature: null
      };

      signatures.data.forEach(sig => {
        switch (sig.signature_type) {
          case 'REPORT':
            summary.hasReport = true;
            summary.reportSignature = sig;
            break;
          case 'RESOLUTION':
            summary.hasResolution = true;
            summary.resolutionSignature = sig;
            break;
          case 'CLOSE':
            summary.hasClose = true;
            summary.closeSignature = sig;
            break;
        }
      });

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('❌ Error obteniendo resumen de firmas:', error);
      throw new Error(`Error al obtener resumen: ${error.message}`);
    }
  }

  /**
   * Validar si el usuario puede firmar según su rol
   * @param {string} userRole - Rol del usuario
   * @param {string} signatureType - Tipo de firma
   * @returns {Promise<Object>} - Resultado de validación
   */
  async canUserSign(userRole, signatureType) {
    try {
      const rolePermissions = {
        'REPORT': ['ADMIN', 'TECNICO', 'OPERADOR'],
        'RESOLUTION': ['ADMIN', 'TECNICO', 'OPERADOR'],
        'CLOSE': ['ADMIN']
      };

      const allowedRoles = rolePermissions[signatureType] || [];
      const canSign = allowedRoles.includes(userRole);

      return {
        success: true,
        canSign,
        allowedRoles,
        message: canSign 
          ? 'El usuario puede firmar'
          : `Solo los roles ${allowedRoles.join(', ')} pueden firmar`
      };

    } catch (error) {
      console.error('❌ Error validando permisos de firma:', error);
      throw new Error(`Error al validar permisos: ${error.message}`);
    }
  }
}

module.exports = new FailureSignatureService();