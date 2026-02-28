// inventoryApi.js - API for inventory and parts management
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';

/**
 * Use multiple parts in a work order
 * @param {number} workOrderId - Work order ID
 * @param {Array} parts - Array of parts {inventoryId, quantity, notes}
 * @param {string} token - Authentication token
 * @returns {Promise} - Server response
 */
export const useMultiplePartsInWorkOrder = async (workOrderId, parts, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/work-orders/${workOrderId}/parts/multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        parts: parts.map(part => ({
          partId: part.inventoryId || part.id,
          quantityUsed: part.quantityRequested || part.quantity || 1,
          notes: part.notes || `Part used in work order ${workOrderId}`
        })),
        notes: `Automatic process of ${parts.length} part(s)`
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Error processing parts');
    }

    return result;
  } catch (error) {
    console.error('Error using multiple parts:', error);
    throw error;
  }
};

/**
 * Use a single part in a work order
 * @param {number} workOrderId - Work order ID
 * @param {Object} partData - Part data {inventoryId, quantityRequested, notes}
 * @param {string} token - Authentication token
 * @returns {Promise} - Server response
 */
export const usePartInWorkOrder = async (workOrderId, partData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/work-orders/${workOrderId}/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        partId: partData.inventoryId || partData.id,
        quantityUsed: partData.quantityRequested || partData.quantity || 1,
        notes: partData.notes || `Part used in work order ${workOrderId}`
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Error using part');
    }

    return result;
  } catch (error) {
    console.error('Error using part:', error);
    throw error;
  }
};

/**
 * Process multiple parts and register them in work_orders_parts
 * @param {number} workOrderId - Work order ID
 * @param {Array} partsData - Array of parts with metadata
 * @returns {Promise} - Process result
 */
export const processMultiplePartsForWorkOrder = async (workOrderId, partsData) => {
  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('authToken')
      : null;

    if (!token) {
      Swal.fire({
        title: 'Autenticación requerida',
        text: 'Por favor, inicia sesión para continuar',
        icon: 'warning',
        confirmButtonText: 'Ir a iniciar sesión',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });
      return {
        success: false,
        error: 'Authentication token not found',
        message: 'Autenticación requerida'
      };
    }

    // Use multiple parts endpoint
    const result = await useMultiplePartsInWorkOrder(workOrderId, partsData, token);

    return {
      success: true,
      data: result,
      message: `${partsData.length} part(s) registered successfully in work order`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Error registering parts in work order'
    };
  }
};

/**
 * Format parts for backend endpoint
 * @param {Array} parts - Array of parts from frontend
 * @returns {Array} - Formatted array for backend
 */
export const formatPartsForBackend = (parts) => {
  return parts.map(part => ({
    partId: part.id || part.inventoryId,
    quantityUsed: part.quantityRequested || part.quantity || 1,
    notes: part.notes || `Part: ${part.item_name || part.part_name}`
  }));
};

/**
 * Get the latest work order created by the current user
 * @returns {Promise} - Latest work order data
 */
export const getLatestWorkOrderByUser = async () => {
  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('authToken')
      : null;

    if (!token) {
      Swal.fire({
        title: 'Autenticación requerida',
        text: 'Por favor, inicia sesión para continuar',
        icon: 'warning',
        confirmButtonText: 'Ir a iniciar sesión',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });
      return {
        success: false,
        error: 'Authentication token not found',
        message: 'Autenticación requerida'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/work-orders/latest`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Error getting latest work order');
    }

    if (result.success) {
      return {
        success: true,
        workOrderId: result.data.id,
        workOrder: result.data,
        message: 'Latest work order retrieved successfully'
      };
    } else {
      return {
        success: false,
        error: result.error?.message || 'Could not get work order'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error getting work order'
    };
  }
};

export default {
  useMultiplePartsInWorkOrder,
  usePartInWorkOrder,
  processMultiplePartsForWorkOrder,
  formatPartsForBackend,
  getLatestWorkOrderByUser
};