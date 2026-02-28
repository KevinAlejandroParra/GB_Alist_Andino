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

      console.log('🔍 ========== DEBUG: LOAD WORK ORDERS ==========');
      console.log('📋 Checklist completo:', checklist);
      console.log('🏷️ Checklist.inspectable_id:', checklist?.inspectable_id);
      console.log('📝 Items del checklist:', items);
      console.log('🔍 ===============================================');

      // Extraer todos los checklist_item_ids de los items (incluyendo subitems)
      const getAllItemIds = (itemsArray) => {
        const ids = [];
        itemsArray.forEach(item => {
          if (item.checklist_item_id) {
            ids.push(item.checklist_item_id);
          }
          if (item.subItems && item.subItems.length > 0) {
            ids.push(...getAllItemIds(item.subItems));
          }
        });
        return ids;
      };

      const allItemIds = getAllItemIds(items);

      if (allItemIds.length === 0) {
        setWorkOrders([]);
        return;
      }

      console.log(`🔍 Buscando fallas para ${allItemIds.length} items: [${allItemIds.join(', ')}]`);
      console.log(`🔍 Inspectable ID del checklist: ${checklist.inspectable_id}`);

      // ✅ NUEVO: Incluir inspectable_id en los parámetros para filtrar por dispositivo específico
      // Esto evita que se muestren fallas de otros dispositivos de la misma familia
      const params = {
        item_ids: allItemIds.join(','),
        status: 'active'
      };

      // ✅ NUEVO: Extraer inspectable_id del checklist o del primer item si tiene formato "device-X"
      let inspectableId = checklist.inspectable_id;

      // Si no está en checklist, intentar extraerlo del primer item con formato "device-X"
      if (!inspectableId && allItemIds.length > 0) {
        const firstItemId = String(allItemIds[0]);
        if (firstItemId.startsWith('device-')) {
          // Extraer el número después de "device-"
          const deviceIdMatch = firstItemId.match(/^device-(\d+)$/);
          if (deviceIdMatch) {
            inspectableId = parseInt(deviceIdMatch[1]);
            console.log(`🔍 Inspectable ID extraído del item "${firstItemId}": ${inspectableId}`);
          }
        }
      }

      // Solo agregar inspectable_id si existe
      if (inspectableId) {
        params.inspectable_id = inspectableId;
        console.log(`✅ Usando inspectable_id: ${inspectableId}`);
      } else {
        console.warn('⚠️ No se pudo determinar el inspectable_id');
      }

      console.log('🔍 Parámetros de búsqueda:', params);

      // Buscar fallas activas (PENDIENTE, EN_REPARACION, ESPERANDO_REPUESTO) para estos checklist_item_ids
      const response = await axiosInstance.get(`${API_URL}/api/failures/by-items`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });

      let failureOrders = Array.isArray(response.data) ? response.data : (response.data?.data && Array.isArray(response.data.data)) ? response.data.data : [];

      console.log('--- ÓRDENES DE FALLA (OFs) ACTIVAS ---');
      console.log(`Total de fallas activas encontradas: ${failureOrders.length}`);
      failureOrders.forEach(fo => {
        console.log(`OF ID: ${fo.id} (${fo.failure_order_id}) -> Item ID: ${fo.checklist_item_id} - affected_id: ${fo.affected_id} - Status: ${fo.status}`);
      });

      setWorkOrders(failureOrders);
    } catch (err) {
      console.error('Error cargando órdenes de falla:', err);
      setError(err.message || 'Error al cargar órdenes de falla');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [checklist, items, user?.token]);

  const getWorkOrderForItem = useCallback((item) => {
    if (!item) return [];

    // ✅ NUEVO: Obtener el inspectable_id del item para filtrar por affected_id
    let itemInspectableId = null;

    // Intentar obtener de inspectable_id_for_response
    if (item.inspectable_id_for_response) {
      itemInspectableId = item.inspectable_id_for_response;
    }
    // O extraer del checklist_item_id si tiene formato "device-X"
    else if (item.checklist_item_id && String(item.checklist_item_id).startsWith('device-')) {
      const match = String(item.checklist_item_id).match(/^device-(\d+)$/);
      if (match) {
        itemInspectableId = parseInt(match[1]);
      }
    }

    if (item.subItems && item.subItems.length > 0) {
      const workOrdersForChildren = item.subItems.flatMap(subItem => {
        // Obtener inspectable_id del subitem
        let subItemInspectableId = subItem.inspectable_id_for_response || itemInspectableId;

        const foundWorkOrders = workOrders.filter(wo => {
          // Filtrar por checklist_item_id Y affected_id
          const itemIdMatch = wo.checklist_item_id === subItem.checklist_item_id;
          const affectedIdMatch = !subItemInspectableId || wo.affected_id === subItemInspectableId;

          return itemIdMatch && affectedIdMatch;
        });

        if (foundWorkOrders.length > 0) {
          console.log(`✅ Fallas encontradas para ítem ${subItem.item_number} (ID: ${subItem.checklist_item_id}, affected_id: ${subItemInspectableId}):`, foundWorkOrders.length);
        }
        return foundWorkOrders;
      });
      return workOrdersForChildren;
    }

    const itemWorkOrders = workOrders.filter(wo => {
      // Filtrar por checklist_item_id Y affected_id
      const itemIdMatch = wo.checklist_item_id === item.checklist_item_id;
      const affectedIdMatch = !itemInspectableId || wo.affected_id === itemInspectableId;

      const match = itemIdMatch && affectedIdMatch;

      if (match) {
        console.log(`✅ Falla encontrada para ítem ${item.item_number} (ID: ${item.checklist_item_id}, affected_id: ${itemInspectableId})`);
      }
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
        `${API_URL}/api/failures/${workOrderId}`,
        {
          notes: reason || 'Falla mantenida como recurrente',
          status: 'PENDIENTE'
        },
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
        `${API_URL}/api/failures`,
        {
          checklistResponseId: failureData.checklist_item_id,
          initialResponseId: failureData.checklist_item_id,
          description: failureData.description,
          priorityLevel: failureData.severity === 'crítica' ? 'HIGH' : 'NORMAL',
          reported_by_id: failureData.reported_by_id,
          requiresReplacement: false
        },
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
        `${API_URL}/api/failures/${workOrderId}/close`,
        {
          resolutionDetails: resolutionData.solution_text || 'Resuelto sin detalles adicionales',
          closedBy: resolutionData.closedBy
        },
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
      await axiosInstance.put(
        `${API_URL}/api/failures/${workOrderId}/close`,
        {
          resolutionDetails: resolutionData.resolutionDetails || 'Orden cerrada',
          closedBy: resolutionData.closedBy || user?.user_id
        },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
      return { success: true };
    } catch (err) {
      console.error('Error cerrando orden de trabajo:', err);
      throw err;
    }
  }, [user?.token]);

  useEffect(() => {
    if (items && items.length > 0) {
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