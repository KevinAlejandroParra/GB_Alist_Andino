import { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../../../utils/axiosConfig'
import { useAuth } from '../../AuthContext'
import { 
  CHECKLIST_TYPES, 
  getChecklistTypeConfig, 
  getFormattedEndpoint,
  getDataConfig 
} from '../config/checklistTypes.config'

/**
 * Hook simplificado para manejar la carga y estado de datos de checklists
 * Utiliza la configuración centralizada para cada tipo
 */
export function useSimplifiedChecklistData(checklistTypeId, checklistType) {
  const { user, isLoading: authLoading } = useAuth()

  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checklistTypeDetails, setChecklistTypeDetails] = useState(null)

  // Obtener configuración específica del tipo de checklist
  const typeConfig = getChecklistTypeConfig(checklistType)
  const dataConfig = getDataConfig(checklistType)

  // Función de utilidad para obtener la fecha de hoy normalizada a medianoche UTC
  const getTodayNormalizedUTC = useCallback(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }, []);

  /**
   * Obtener los detalles del tipo de checklist
   */
  const fetchChecklistTypeDetails = useCallback(async () => {
    if (!user || authLoading || !checklistTypeId) return
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/checklists/type/${checklistTypeId}/details`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setChecklistTypeDetails(response.data);
    } catch (err) {
      console.error("Error fetching checklist type details:", err);
      setError(err.message || "Failed to fetch checklist type details.");
    }
  }, [checklistTypeId, user, authLoading]);

  /**
   * Cargar los datos principales del checklist
   */
  const fetchChecklistData = useCallback(async () => {
    // Prevenir ejecuciones múltiples si ya hay una carga en curso
    if (loading) return;

    if (!user || authLoading || !checklistTypeId || !typeConfig || !checklistTypeDetails) {
      setLoading(false);
      return;
    }

    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const dateString = getTodayNormalizedUTC().toISOString();

      // Determinar el endpoint correcto basado en la configuración
      let endpoint;
      let params = { date: dateString };

      if (checklistType === 'family' && dataConfig.generateDynamicTemplate) {
        // Para checklists de familia, usar el endpoint de generación
        endpoint = getFormattedEndpoint(checklistType, 'generate', { checklistTypeId });
      } else if (checklistType === 'attraction' && dataConfig.createInstance) {
        // Para checklists de atracción, primero crear instancia si no existe
        // El endpoint create crea la instancia pero no devuelve datos completos
        endpoint = getFormattedEndpoint(checklistType, 'create', { checklistTypeId });
      } else {
        // Para otros casos, usar el endpoint latest
        endpoint = getFormattedEndpoint(checklistType, 'latest', { checklistTypeId });
      }

      // Agregar parámetros específicos del tipo
      if (checklistType === 'attraction' && checklistTypeDetails.associated_id) {
        params.inspectableId = checklistTypeDetails.associated_id;
      }

      console.log(`📋 Fetching checklist data:`, {
        checklistType,
        endpoint,
        params,
        createInstance: dataConfig.createInstance,
        generateDynamicTemplate: dataConfig.generateDynamicTemplate
      });

      // Para checklists de atracción con createInstance, necesitamos hacer dos llamadas:
      // 1. Crear la instancia (endpoint create)
      // 2. Obtener los datos completos (endpoint latest)
      let response;
      if (checklistType === 'attraction' && dataConfig.createInstance) {
        // Primera llamada: crear instancia
        await axiosInstance.get(endpoint, {
          headers: { Authorization: `Bearer ${user.token}` },
          params
        });

        // Segunda llamada: obtener datos completos
        const latestEndpoint = getFormattedEndpoint(checklistType, 'latest', { checklistTypeId });
        response = await axiosInstance.get(latestEndpoint, {
          headers: { Authorization: `Bearer ${user.token}` },
          params: { date: dateString } // Solo la fecha para la segunda llamada
        });
      } else {
        // Para otros casos, una sola llamada
        response = await axiosInstance.get(endpoint, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          params
        });
      }

      if (response.data) {
        // Si hay datos y es un checklist de atracción, agrupar items
        if (response.data.type && response.data.type.type_category === 'attraction') {
          if (response.data.items && Array.isArray(response.data.items)) {
            response.data.items = groupItems(response.data.items);
          } else {
            console.warn('No items array found or items is not an array for attraction checklist');
            response.data.items = [];
          }
        }
        setChecklist(response.data)
        return response.data
      } else {
        setChecklist(null)
        if (!dataConfig.createInstance && !dataConfig.generateDynamicTemplate) {
          setError("No checklist found for today")
        }
        return null
      }
    } catch (err) {
      console.error("API Error fetching checklist by type ID:", err)
      setError(err.message || "Failed to fetch checklist.")
      return null
    } finally {
      setLoading(false)
    }
  }, [
    checklistTypeId, 
    user, 
    authLoading, 
    checklistType, 
    typeConfig, 
    dataConfig, 
    getTodayNormalizedUTC,
    checklistTypeDetails
  ])

  /**
   * Función para agrupar items padre e hijo (solo para checklists de atracción)
   */
  const groupItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    const parentItems = items.filter(item => item && item.parent_item_id === null);
    return parentItems.map(parent => ({
      ...parent,
      subItems: items
        .filter(sub => sub && sub.parent_item_id === parent.checklist_item_id)
        .sort((a, b) => (a?.item_number || '').localeCompare(b?.item_number || '', 'en', { numeric: true }))
    }));
  }

  /**
   * Refrescar datos del checklist
   */
  const refreshChecklistData = useCallback(() => {
    fetchChecklistData()
  }, [fetchChecklistData])

  // Efectos
  useEffect(() => {
    fetchChecklistTypeDetails();
  }, [fetchChecklistTypeDetails]);

  useEffect(() => {
    if (checklistTypeDetails) {
      fetchChecklistData();
    }
  }, [fetchChecklistData, checklistTypeDetails]);

  return {
    checklist,
    loading,
    error,
    checklistTypeDetails,
    refreshChecklistData,
    config: typeConfig,
    dataConfig
  }
}

/**
 * Hook auxiliar para obtener la configuración del tipo de checklist
 */
export function useChecklistTypeConfig(checklistTypeId, checklistType) {
  const { user, isLoading: authLoading } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user || authLoading || !checklistTypeId) return
      
      try {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        const response = await axiosInstance.get(`${API_URL}/api/checklists/type/${checklistTypeId}/details`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        
        const typeConfig = getChecklistTypeConfig(checklistType);
        setConfig({
          ...typeConfig,
          actualData: response.data
        });
      } catch (err) {
        console.error("Error fetching checklist config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [checklistTypeId, checklistType, user, authLoading]);

  return { config, loading }
}