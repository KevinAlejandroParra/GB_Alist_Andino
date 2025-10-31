import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../../utils/axiosConfig';

export function useWorkOrderDetection(checklist, items, user) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWorkOrders = useCallback(async () => {
    if (!checklist || !items || !user?.token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const checklistTypeId = checklist?.type?.type_id || checklist?.type?.id || checklist?.checklist_type_id || checklist?.type_id;
      
      const params = checklistTypeId ? { checklist_type_id: checklistTypeId } : {};
      
      const response = await axiosInstance.get(`${API_URL}/api/work-orders/pending`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });

      let pendingWorkOrders = Array.isArray(response.data) ? response.data : (response.data?.data && Array.isArray(response.data.data)) ? response.data.data : [];

      const activeWorkOrders = pendingWorkOrders.filter(wo => 
        wo.status === 'PENDIENTE' || wo.status === 'EN_PROCESO'
      );
      
      // --- NUEVO LOG 2: ÓRDENES DE TRABAJO ---
      console.log('--- ÓRDENES DE TRABAJO (OTs) ACTIVAS EN ESTE CHECKLIST ---');
      activeWorkOrders.forEach(wo => {
        console.log(`OT ID: ${wo.id} -> Asignada a Checklist Item ID: ${wo.checklist_item_id}`);
      });
      // --- FIN NUEVO LOG 2 ---

      setWorkOrders(activeWorkOrders);
    } catch (err) {
      console.error('Error cargando órdenes de trabajo:', err);
      setError(err.message || 'Error al cargar órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, [checklist, items, user?.token]);

  const getWorkOrderForItem = useCallback((item) => {
    if (!item) return [];
  
    if (item.subItems && item.subItems.length > 0) {
      const workOrdersForChildren = item.subItems.flatMap(subItem => {
        const foundWorkOrders = workOrders.filter(wo => wo.checklist_item_id === subItem.checklist_item_id);
        // --- NUEVO LOG 3: ASOCIACIÓN ---
        if (foundWorkOrders.length > 0) {
            console.log(`--- ASOCIACIÓN ENCONTRADA ---`);
            foundWorkOrders.forEach(fwo => {
                console.log(`Esta falla (OT ID: ${fwo.id}) pertenece al ítem HIJO: ${subItem.item_number} (ID: ${subItem.checklist_item_id})`);
            });
        }
        // --- FIN NUEVO LOG 3 ---
        return foundWorkOrders;
      });
      return workOrdersForChildren;
    }
  
    const itemWorkOrders = workOrders.filter(wo => {
      const match = wo.checklist_item_id === item.checklist_item_id;
      // --- NUEVO LOG 3: ASOCIACIÓN ---
      if (match) {
        console.log(`--- ASOCIACIÓN ENCONTRADA ---`);
        console.log(`Esta falla (OT ID: ${wo.id}) pertenece al ítem HIJO: ${item.item_number} (ID: ${item.checklist_item_id})`);
      }
      // --- FIN NUEVO LOG 3 ---
      return match;
    });
  
    return itemWorkOrders;
  }, [workOrders]);

  const hasPendingWorkOrder = useCallback((item) => {
    return getWorkOrderForItem(item).length > 0;
  }, [getWorkOrderForItem]);

  const maintainWorkOrder = useCallback(async (workOrderId, reason = null) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.put(
        `${API_URL}/api/work-orders/${workOrderId}/maintain`,
        { recurrence_reason: reason },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await loadWorkOrders();
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error manteniendo orden de trabajo:', err);
      throw err;
    }
  }, [user?.token, loadWorkOrders]);

  const createNewFailure = useCallback(async (failureData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.post(
        `${API_URL}/api/work-orders/new-failure`,
        failureData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await loadWorkOrders();
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error creando nueva falla:', err);
      throw err;
    }
  }, [user?.token, loadWorkOrders]);

  const resolveWorkOrder = useCallback(async (workOrderId, resolutionData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.put(
        `${API_URL}/api/work-orders/${workOrderId}/resolve`,
        resolutionData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error resolviendo orden de trabajo:', err);
      throw err;
    }
  }, [user?.token]);

  const handleRecurringFailureOption = useCallback(async (option, workOrder) => {
    if (option === 'maintain') {
      return { success: true, action: 'maintain' };
    }
    if (option === 'new_failure') {
      return { success: true, action: 'new_failure' };
    }
    return { success: true, action: option };
  }, []);

  const closeWorkOrder = useCallback(async (workOrderId, resolutionData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      await axiosInstance.put(`${API_URL}/api/work-orders/${workOrderId}/close`, resolutionData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
      return { success: true };
    } catch (err) {
      console.error('Error cerrando orden de trabajo:', err);
      throw err;
    }
  }, [user?.token]);

  useEffect(() => {
    if (items && items.length > 0) {
        // --- NUEVO LOG 1: ESTRUCTURA DE ÍTEMS ---
        console.log('--- ESTRUCTURA DE ÍTEMS (PADRES E HIJOS) ---');
        items.forEach(item => {
          if (item.subItems && item.subItems.length > 0) {
            console.log(`PADRE: ${item.item_number} (ID: ${item.checklist_item_id})`);
            item.subItems.forEach(subItem => {
              console.log(`  HIJO: ${subItem.item_number} (ID: ${subItem.checklist_item_id})`);
            });
          } else {
            console.log(`ÍTEM (sin hijos): ${item.item_number} (ID: ${item.checklist_item_id})`);
          }
        });
        // --- FIN NUEVO LOG 1 ---
    }
    loadWorkOrders();
  }, [loadWorkOrders, items]);

  return {
    workOrders,
    loading,
    error,
    getWorkOrderForItem,
    hasPendingWorkOrder,
    handleRecurringFailureOption,
    closeWorkOrder,
    maintainWorkOrder,
    createNewFailure,
    resolveWorkOrder,
    refreshWorkOrders: loadWorkOrders
  };
}