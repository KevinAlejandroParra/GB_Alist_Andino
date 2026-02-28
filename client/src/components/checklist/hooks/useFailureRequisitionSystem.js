'use client'

import { useState, useCallback, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosConfig';

export const useFailureRequisitionSystem = (user = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingFailures, setPendingFailures] = useState([]); // ✅ NUEVO: Estado para fallas pendientes de crear

  /**
   * Crear falla con requisición(es) automática(s)
   */
  const createFailureWithRequisition = useCallback(async (failureData) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      // 📤 DEBUG: Log de datos recibidos
      console.log('📋 [useFailureRequisitionSystem] createFailureWithRequisition llamado con:', failureData)

      // Determinar si se requiere repuesto considerando múltiples fuentes de datos
      const requiresReplacement =
        (failureData.requires_replacement === true) ||
        (failureData.requires_replacement === 1) ||
        (failureData.requestedPartInfo &&
         (failureData.requestedPartInfo.name || failureData.requestedPartInfo.part_name)) ||
        (failureData.part_info);

      // 📤 DEBUG: Log del valor calculado de requiresReplacement
      console.log('🔍 [useFailureRequisitionSystem] Calculando requiresReplacement:')
      console.log('  - failureData.requires_replacement:', failureData.requires_replacement)
      console.log('  - failureData.requestedPartInfo:', failureData.requestedPartInfo)
      console.log('  - failureData.part_info:', failureData.part_info)
      console.log('  - requiresReplacement calculado:', requiresReplacement)

      // Preparar información del repuesto
      const partInfo = failureData.requestedPartInfo && failureData.requestedPartInfo.name ? {
        name: failureData.requestedPartInfo.name,
        quantity: failureData.requestedPartInfo.quantity || 1,
        category: failureData.requestedPartInfo.category || 'Repuesto',
        urgency: failureData.requestedPartInfo.urgency || 'NORMAL',
        image_url: failureData.requestedPartInfo.image_url || null
      } : (failureData.part_info ? failureData.part_info : null);

      const response = await axiosInstance.post(
        `${API_URL}/api/failures/create-with-requisition`,
        {
          description: failureData.description,
          severity: failureData.severity,
          evidenceUrl: failureData.evidenceUrl || null,
          checklist_item_id: failureData.checklistItemId || failureData.checklist_item_id,
          requires_replacement: requiresReplacement,
          part_info: partInfo,
          assigned_technician: failureData.assigned_technician || failureData.assignedTechnicianArea || 'TECNICO'
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Falla creada con requisición automática'
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al crear falla';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Consultar repuestos disponibles para una falla
   */
  const getAvailablePartsForFailure = useCallback(async (failureId) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      const response = await axiosInstance.get(
        `${API_URL}/api/failures/${failureId}/available-parts`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al consultar repuestos';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resolver falla usando un repuesto del inventario
   */
  const resolveFailureWithPart = useCallback(async (failureId, resolutionData) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.post(
        `${API_URL}/api/failures/${failureId}/resolve-with-part`,
        {
          inventory_id: resolutionData.inventoryId,
          quantity_used: resolutionData.quantityUsed,
          resolution_details: resolutionData.resolutionDetails
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Falla resuelta exitosamente'
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al resolver falla';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener requisiciones pendientes
   */
  const getPendingRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.get(
        `${API_URL}/api/requisitions/pending`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al consultar requisiciones';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aprobar requisición y agregar al inventario
   */
  const approveRequisitionAndAddToInventory = useCallback(async (requisitionId, inventoryData) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      const response = await axiosInstance.post(
        `${API_URL}/api/requisitions/${requisitionId}/approve-and-add-to-inventory`,
        {
          location: inventoryData.location,
          category: inventoryData.category,
          status: inventoryData.status,
          notes: inventoryData.notes,
          image_url: inventoryData.image_url
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Requisición aprobada e inventario actualizado'
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al aprobar requisición';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener estadísticas de requisiciones
   */
  const getRequisitionStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.get(
        `${API_URL}/api/requisitions/statistics`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al consultar estadísticas';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener requisiciones con filtros (por usuario, estado, paginación)
   */
  const getRequisitions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const query = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`${API_URL}/api/requisitions${query ? `?${query}` : ''}`);

      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al consultar requisiciones';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear requisición general (se usa para re-solicitar desde items existentes)
   */
  const createRequisition = useCallback(async (requisitionData) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      // Normalize field names: backend expects camelCase `imageUrl`
      const payload = {
        ...requisitionData,
        imageUrl: requisitionData.imageUrl || requisitionData.image_url || null
      };
      // Remove any image_url to avoid confusion
      delete payload.image_url;

      const response = await axiosInstance.post(`${API_URL}/api/requisitions`, payload);

      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al crear requisición';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar requisición por ID
   */
  const deleteRequisition = useCallback(async (requisitionId) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.delete(`${API_URL}/api/requisitions/${requisitionId}`);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al eliminar requisición';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NUEVO: Función para agregar falla pendiente (sin crear inmediatamente)
  const addPendingFailure = useCallback((failureData) => {
    const pendingFailure = {
      id: `pending-${Date.now()}-${Math.random()}`,
      ...failureData,
      status: 'pending',
      createdAt: new Date()
    };
    setPendingFailures(prev => [...prev, pendingFailure]);
    return pendingFailure.id;
  }, []);

  // ✅ NUEVO: Función para crear fallas pendientes después de enviar respuestas
  const createPendingFailuresAfterSave = useCallback(async (checklistResponses, currentUser) => {
    if (pendingFailures.length === 0) return { success: true, created: [] };

    const createdFailures = [];
    const errors = [];

    try {
      setLoading(true);
      setError(null);

      for (const pendingFailure of pendingFailures) {
        try {
          // Encontrar la respuesta correspondiente en checklistResponses
          // Buscar por checklist_item_id primero, luego verificar otros criterios
          const matchingResponse = checklistResponses.find(response =>
            response.checklist_item_id === pendingFailure.checklist_item_id
          );

          if (!matchingResponse) {
            console.warn('No se encontró respuesta correspondiente para falla pendiente:', {
              pendingFailure,
              checklistResponses: checklistResponses.map(r => ({
                response_id: r.response_id,
                checklist_item_id: r.checklist_item_id,
                inspectable_id: r.inspectable_id
              }))
            });
            continue;
          }

          console.log('✅ Encontrada respuesta correspondiente:', {
            response_id: matchingResponse.response_id,
            checklist_item_id: matchingResponse.checklist_item_id,
            inspectable_id: matchingResponse.inspectable_id
          });

          // Crear la falla con la response_id real
          const failureData = {
            description: pendingFailure.description,
            severity: pendingFailure.severity,
            checklist_item_id: matchingResponse.checklist_item_id,
            requires_replacement: pendingFailure.requires_replacement,
            part_info: pendingFailure.part_info,
            reported_by_id: currentUser?.user_id
          };

          console.log('📤 Enviando datos de falla al backend:', failureData);

          const result = await createFailureWithRequisition(failureData);

          if (result.success) {
            createdFailures.push(result.data);
          } else {
            errors.push({ failure: pendingFailure, error: result.error });
          }
        } catch (err) {
          console.error('Error creando falla pendiente:', err);
          errors.push({ failure: pendingFailure, error: err.message });
        }
      }

      // Limpiar fallas pendientes después del procesamiento
      setPendingFailures([]);

      return {
        success: errors.length === 0,
        created: createdFailures,
        errors: errors
      };

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error procesando fallas pendientes';
      setError(errorMessage);
      return {
        success: false,
        created: createdFailures,
        errors: [{ failure: null, error: errorMessage }]
      };
    } finally {
      setLoading(false);
    }
  }, [pendingFailures, createFailureWithRequisition]);

  // ✅ NUEVO: Función para limpiar fallas pendientes
  const clearPendingFailures = useCallback(() => {
    setPendingFailures([]);
  }, []);

  /**
   * ✅ NUEVO: Usar múltiples repuestos en una orden de trabajo
   */
  const useMultipleParts = useCallback(async (workOrderId, parts, requestedBy = null) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.post(
        `${API_URL}/api/work-orders/${workOrderId}/parts/multiple`,
        {
          parts,
          requestedBy
        }
      );

      return {
        success: true,
        data: response.data,
        message: `${response.data.successCount} repuesto(s) procesado(s) exitosamente`
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Error al procesar múltiples repuestos';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Estados
    loading,
    error,
    pendingFailures,

    // Funciones principales
    createFailureWithRequisition,
    getAvailablePartsForFailure,
    resolveFailureWithPart,
    getPendingRequisitions,
    approveRequisitionAndAddToInventory,
    getRequisitionStatistics,
    //  ✅ NUEVO: Consultas y creación de requisiciones
    getRequisitions,
    createRequisition,

    // ✅ NUEVO: Funciones para manejo de fallas pendientes
    addPendingFailure,
    createPendingFailuresAfterSave,
    clearPendingFailures,

    // ✅ NUEVO: Funciones para manejo de múltiples repuestos
    useMultipleParts,
    // ✅ NUEVO: Borrar requisición
    deleteRequisition,

    // Utilidades
    clearError: () => setError(null)
  };
};

const useWorkOrderSystem = (workOrderId) => {
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

  const loadParts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${API_URL}/api/work-orders/${workOrderId}/parts`);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  const addPart = useCallback(async (partData) => {
    await axiosInstance.post(`${API_URL}/api/work-orders/${workOrderId}/parts`, partData);
  }, [workOrderId]);

  return { loadParts, addPart, loading };
};

export { useWorkOrderSystem };
export default useFailureRequisitionSystem;