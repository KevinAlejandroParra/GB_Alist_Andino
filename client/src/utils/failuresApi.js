// 📡 API de Failures - Sistema OF/OT
// Maneja órdenes de falla (OF) y integración con órdenes de trabajo (OT)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class FailuresApi {
  // Headers por defecto con autenticación
  getHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // 🔄 Obtener todas las órdenes de falla
  async getAllFailures(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.severity) queryParams.append('severity', filters.severity);
      if (filters.checklistId) queryParams.append('checklistId', filters.checklistId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const response = await fetch(`${API_BASE_URL}/failures?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener fallas: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getAllFailures:', error);
      throw error;
    }
  }

  // 📋 Crear nueva orden de falla
  async createFailure(failureData) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(failureData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear orden de falla');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en createFailure:', error);
      throw error;
    }
  }

  // 🔍 Obtener orden de falla por ID
  async getFailureById(failureId) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener falla: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getFailureById:', error);
      throw error;
    }
  }

  // 🔄 Actualizar orden de falla
  async updateFailure(failureId, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar falla');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updateFailure:', error);
      throw error;
    }
  }

  // ❌ Eliminar orden de falla
  async deleteFailure(failureId) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al eliminar falla: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error en deleteFailure:', error);
      throw error;
    }
  }

  // 📊 Obtener estadísticas de fallas
  async getFailureStatistics(dateRange = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (dateRange.from) queryParams.append('from', dateRange.from);
      if (dateRange.to) queryParams.append('to', dateRange.to);

      const response = await fetch(`${API_BASE_URL}/failures/statistics?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener estadísticas: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getFailureStatistics:', error);
      throw error;
    }
  }

  // 🔄 Verificar si una falla genera OT automáticamente
  async checkIfRequiresWorkOrder(failureData) {
    try {
      // Esta lógica se implementa en el backend, pero la duplicamos para feedback inmediato
      return failureData.requiresPart === true || failureData.severity === 'crítica';
    } catch (error) {
      console.error('Error en checkIfRequiresWorkOrder:', error);
      return false;
    }
  }

  // 🔄 Actualizar estado de falla
  async updateFailureStatus(failureId, newStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar estado');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updateFailureStatus:', error);
      throw error;
    }
  }

  // 📝 Obtener historial de una falla
  async getFailureHistory(failureId) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}/history`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener historial: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getFailureHistory:', error);
      throw error;
    }
  }

  // 🔗 Obtener OT relacionada (si existe)
  async getRelatedWorkOrder(failureId) {
    try {
      const response = await fetch(`${API_BASE_URL}/failures/${failureId}/work-order`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null; // No hay OT relacionada
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getRelatedWorkOrder:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
const failuresApi = new FailuresApi();
export default failuresApi;

// Estados del sistema OF/OT
export const FAILURE_STATES = {
  REPORTADO: 'REPORTADO',
  EN_PROCESO: 'EN_PROCESO', 
  REQUIERE_REPUESTO: 'REQUIERE_REPUESTO',
  REPUESTO_EN_PROCESO: 'REPUESTO_EN_PROCESO',
  REPUESTO_ENTREGADO: 'REPUESTO_ENTREGADO',
  RESUELTO: 'RESUELTO',
  CERRADO: 'CERRADO',
};

// Severidades
export const SEVERITY_LEVELS = {
  LEVE: 'leve',
  MEDIA: 'media', 
  CRITICA: 'crítica',
};

// Utilidades para el frontend
export const getFailureTypeLabel = (failure) => {
  if (failure.workOrder) {
    return { label: 'OT', class: 'bg-blue-100 text-blue-800' };
  }
  return { label: 'OF', class: 'bg-green-100 text-green-800' };
};

export const getStatusChipClass = (status) => {
  const statusClasses = {
    REPORTADO: 'bg-gray-100 text-gray-800',
    EN_PROCESO: 'bg-blue-100 text-blue-800',
    REQUIERE_REPUESTO: 'bg-yellow-100 text-yellow-800',
    REPUESTO_EN_PROCESO: 'bg-orange-100 text-orange-800', 
    REPUESTO_ENTREGADO: 'bg-purple-100 text-purple-800',
    RESUELTO: 'bg-green-100 text-green-800',
    CERRADO: 'bg-gray-500 text-gray-800',
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};