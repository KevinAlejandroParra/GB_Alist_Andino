/**
 * Utilidades centralizadas para operaciones de firmas de órdenes de falla
 */

import axiosInstance from './axiosConfig';

const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

/**
 * Crear firma de reporte para una orden de falla
 * @param {number} failureOrderId - ID de la orden de falla
 * @param {string} signatureData - Datos de la firma en base64
 * @param {string} userName - Nombre del usuario
 * @param {string} roleName - Rol del usuario
 * @returns {Promise<Object>}
 */
export const createFailureReportSignature = async (failureOrderId, signatureData, userName, roleName) => {
  try {
    const response = await axiosInstance.post(`${API_URL}/api/failures/${failureOrderId}/report-signature`, {
      signatureData,
      userName,
      roleName
    });

    return response.data;
  } catch (error) {
    console.error('Error creando firma de reporte:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al crear firma de reporte');
  }
};

/**
 * Obtener firma de reporte de una orden de falla
 * @param {number} failureOrderId - ID de la orden de falla
 * @returns {Promise<Object>}
 */
export const getFailureReportSignature = async (failureOrderId) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/api/failures/${failureOrderId}/report-signature`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo firma de reporte:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al obtener firma de reporte');
  }
};

/**
 * Verificar si una orden de falla tiene firma de reporte
 * @param {number} failureOrderId - ID de la orden de falla
 * @returns {Promise<Object>}
 */
export const hasFailureReportSignature = async (failureOrderId) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/api/failures/${failureOrderId}/has-report-signature`);
    return response.data;
  } catch (error) {
    console.error('Error verificando firma de reporte:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al verificar firma de reporte');
  }
};

/**
 * Crear firma de administrador para una orden de falla
 * @param {number} failureOrderId - ID de la orden de falla
 * @param {string} signatureData - Datos de la firma en base64
 * @returns {Promise<Object>}
 */
export const createFailureAdminSignature = async (failureOrderId, signatureData) => {
  try {
    const response = await axiosInstance.post(`${API_URL}/api/failures/${failureOrderId}/admin-signature`, {
      signatureData
    });

    return response.data;
  } catch (error) {
    console.error('Error creando firma de administrador:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al crear firma de administrador');
  }
};

/**
 * Obtener firma de administrador de una orden de falla
 * @param {number} failureOrderId - ID de la orden de falla
 * @returns {Promise<Object>}
 */
export const getFailureAdminSignature = async (failureOrderId) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/api/failures/${failureOrderId}/admin-signature`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo firma de administrador:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al obtener firma de administrador');
  }
};

/**
 * Verificar si una orden de falla tiene firma de administrador
 * @param {number} failureOrderId - ID de la orden de falla
 * @returns {Promise<Object>}
 */
export const hasFailureAdminSignature = async (failureOrderId) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/api/failures/${failureOrderId}/has-admin-signature`);
    return response.data;
  } catch (error) {
    console.error('Error verificando firma de administrador:', error);
    throw new Error(error.response?.data?.error?.message || 'Error al verificar firma de administrador');
  }
};

/**
 * Obtener información completa de firmas de una orden de falla
 * Incluye tanto la firma de reporte como la firma de cierre de la OT (si existe)
 * @param {number} failureOrderId - ID de la orden de falla
 * @returns {Promise<Object>}
 */
export const getFailureSignaturesInfo = async (failureOrderId) => {
  try {
    // Obtener detalles de la falla con la OT
    const failureResponse = await axiosInstance.get(`${API_URL}/api/failures/${failureOrderId}`);

    if (!failureResponse.data.success) {
      throw new Error('No se pudo obtener información de la falla');
    }

    const failureOrder = failureResponse.data.data;

    // Obtener firma de reporte
    let reportSignature = null;
    let hasReportSignature = false;

    try {
      const reportSigResponse = await getFailureReportSignature(failureOrderId);
      if (reportSigResponse.success) {
        reportSignature = reportSigResponse.data; // Pasar todo el objeto con reportedBy
        hasReportSignature = reportSigResponse.data.hasReportSignature;
      }
    } catch (error) {
      console.log('No se pudo obtener firma de reporte:', error.message);
    }

    // Obtener información de firma de cierre de OT (si existe)
    let workOrderClosureSignature = null;
    let hasWorkOrderSignature = false;

    if (failureOrder.workOrder && failureOrder.workOrder.closure_signature) {
      workOrderClosureSignature = failureOrder.workOrder.closure_signature;
      hasWorkOrderSignature = true;
    }

    // Obtener firma de administrador
    let adminSignature = null;
    let hasAdminSignature = false;

    try {
      const adminSigResponse = await getFailureAdminSignature(failureOrderId);
      if (adminSigResponse.success) {
        adminSignature = adminSigResponse.data;
        hasAdminSignature = adminSigResponse.data.hasAdminSignature;
      }
    } catch (error) {
      console.log('No se pudo obtener firma de administrador:', error.message);
    }

    return {
      success: true,
      data: {
        failureOrder,
        reportSignature,
        hasReportSignature,
        workOrderClosureSignature,
        hasWorkOrderSignature,
        adminSignature,
        hasAdminSignature,
        reporter: failureOrder.reporter,
        workOrder: failureOrder.workOrder,
        createdAt: failureOrder.createdAt
      }
    };

  } catch (error) {
    console.error('Error obteniendo información de firmas:', error);
    throw new Error(error.message || 'Error al obtener información de firmas');
  }
};

/**
 * Formatear datos de firma para mostrar en UI
 * @param {Object} signatureData - Datos de la firma
 * @returns {Object}
 */
export const formatSignatureForDisplay = (signatureData) => {
  if (!signatureData) return null;

  // Si signatureData es el objeto de respuesta del backend para ADMIN
  if (signatureData.hasAdminSignature !== undefined && signatureData.adminSignature !== undefined) {
    return {
      id: 'admin_signature',
      type: 'ADMIN',
      signedBy: signatureData.signedBy?.user_name || 'Administrador',
      role: 'ADMINISTRADOR',
      signedAt: signatureData.signedAt || new Date().toISOString(),
      image: signatureData.adminSignature,
      user: signatureData.signedBy
    };
  }

  // Si signatureData es el objeto de respuesta del backend con hasReportSignature y reportSignature
  if (signatureData.hasReportSignature !== undefined && signatureData.reportSignature !== undefined) {
    // Extraer la cadena base64 de la firma
    const base64Signature = signatureData.reportSignature;

    return {
      id: 'report_signature',
      type: 'REPORT',
      signedBy: signatureData.reportedBy?.user_name || 'Usuario desconocido',
      role: signatureData.reportedBy?.role?.role_name || 'Rol no especificado',
      signedAt: new Date().toISOString(),
      image: base64Signature, // Usar directamente la cadena base64
      user: signatureData.reportedBy
    };
  }

  // Si signatureData es una cadena base64 directa
  if (typeof signatureData === 'string') {
    return {
      id: 'report_signature',
      type: 'REPORT',
      signedBy: 'Usuario desconocido',
      role: 'Rol no especificado',
      signedAt: new Date().toISOString(),
      image: signatureData, // Usar directamente la cadena base64
      user: null
    };
  }

  // Si signatureData es un objeto con estructura anterior (para compatibilidad)
  return {
    id: signatureData.signature_id || 'unknown',
    type: signatureData.signature_type || 'REPORT',
    signedBy: signatureData.signed_by_name || 'Usuario desconocido',
    role: signatureData.role_at_signature || signatureData.roleName || 'Rol no especificado',
    signedAt: signatureData.signed_at || new Date().toISOString(),
    image: signatureData.digital_token || signatureData.signatureData,
    user: signatureData.user
  };
};

/**
 * Validar si el usuario puede crear firma de reporte
 * @param {Object} user - Usuario actual
 * @returns {boolean}
 */
export const canUserCreateReportSignature = (user) => {
  if (!user) return false;

  const allowedRoles = ['ADMIN', 'TECNICO', 'OPERADOR'];
  return allowedRoles.includes(user.role_name?.toUpperCase());
};

/**
 * Validar si el usuario puede crear firma de administrador
 * @param {Object} user - Usuario actual
 * @returns {boolean}
 */
export const canUserCreateAdminSignature = (user) => {
  if (!user) return false;
  // Solo rol ID 1 es administrador
  return user.role_id === 1;
};

/**
 * Obtener estado de firmas para mostrar en UI
 * @param {Object} signaturesInfo - Información de firmas
 * @returns {Object}
 */
export const getSignatureStatus = (signaturesInfo) => {
  return {
    hasReportSignature: signaturesInfo.hasReportSignature || false,
    hasWorkOrderSignature: signaturesInfo.hasWorkOrderSignature || false,
    hasAdminSignature: signaturesInfo.hasAdminSignature || false,
    reportSignature: formatSignatureForDisplay(signaturesInfo.reportSignature),
    workOrderSignature: signaturesInfo.workOrderClosureSignature ? {
      id: 'work_order_closure',
      type: 'CLOSURE',
      signedBy: signaturesInfo.workOrder?.resolver?.user_name || 'Técnico',
      role: 'TECNICO',
      signedAt: signaturesInfo.workOrder?.updatedAt || new Date().toISOString(),
      image: signaturesInfo.workOrderClosureSignature,
      user: signaturesInfo.workOrder?.resolver
    } : null,
    adminSignature: formatSignatureForDisplay(signaturesInfo.adminSignature),
    canCreateReportSignature: canUserCreateReportSignature(signaturesInfo.reporter)
  };
};