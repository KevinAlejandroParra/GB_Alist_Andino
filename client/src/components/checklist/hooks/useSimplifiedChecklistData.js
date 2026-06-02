import { useState, useEffect, useCallback, useRef } from 'react'
import axiosInstance from '../../../utils/axiosConfig'
import { useAuth } from '../../AuthContext'
import { 
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
  const [loading, setLoading] = useState(!!checklistTypeId)
  const [error, setError] = useState(null)
  const [checklistTypeDetails, setChecklistTypeDetails] = useState(null)

  // Ref para evitar fetches simultáneos y guardar las dependencias actuales
  const fetchInProgress = useRef(false)
  // Refs para acceder a los valores más recientes dentro de callbacks sin recrearlos
  const userRef = useRef(user)
  const checklistTypeDetailsRef = useRef(checklistTypeDetails)
  const checklistTypeRef = useRef(checklistType)
  const checklistTypeIdRef = useRef(checklistTypeId)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { checklistTypeDetailsRef.current = checklistTypeDetails }, [checklistTypeDetails])
  useEffect(() => { checklistTypeRef.current = checklistType }, [checklistType])
  useEffect(() => { checklistTypeIdRef.current = checklistTypeId }, [checklistTypeId])

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
   * Función para agrupar items padre e hijo (solo para checklists de atracción)
   */
  const groupItems = useCallback((items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return [];
    const parentItems = items.filter(item => item && item.parent_item_id === null);
    return parentItems.map(parent => ({
      ...parent,
      subItems: items
        .filter(sub => sub && sub.parent_item_id === parent.checklist_item_id)
        .sort((a, b) => (a?.item_number || '').localeCompare(b?.item_number || '', 'en', { numeric: true }))
    }));
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
      setLoading(false);
    }
  }, [checklistTypeId, user, authLoading]);

  /**
   * Cargar los datos principales del checklist.
   * Usa refs para leer los valores actuales sin necesitar recrearse.
   */
  const fetchChecklistData = useCallback(async () => {
    if (fetchInProgress.current) return;

    const currentUser = userRef.current;
    const currentTypeDetails = checklistTypeDetailsRef.current;
    const currentChecklistType = checklistTypeRef.current;
    const currentChecklistTypeId = checklistTypeIdRef.current;
    const currentTypeConfig = getChecklistTypeConfig(currentChecklistType);
    const currentDataConfig = getDataConfig(currentChecklistType);

    if (!currentUser || !currentChecklistTypeId || !currentTypeConfig || !currentTypeDetails) {
      if (!currentChecklistTypeId || !currentTypeConfig) setLoading(false);
      return;
    }

    fetchInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const dateString = getTodayNormalizedUTC().toISOString();
      let endpoint;
      let params = { date: dateString };

      if (currentChecklistType === 'family' && currentDataConfig.generateDynamicTemplate) {
        endpoint = getFormattedEndpoint(currentChecklistType, 'generate', { checklistTypeId: currentChecklistTypeId });
      } else if (currentChecklistType === 'attraction' && currentDataConfig.createInstance) {
        endpoint = getFormattedEndpoint(currentChecklistType, 'create', { checklistTypeId: currentChecklistTypeId });
      } else {
        endpoint = getFormattedEndpoint(currentChecklistType, 'latest', { checklistTypeId: currentChecklistTypeId });
      }

      if (currentChecklistType === 'attraction' && currentTypeDetails.associated_id) {
        params.inspectableId = currentTypeDetails.associated_id;
      }

      console.log(`📋 [useSimplifiedChecklistData] Fetching:`, { currentChecklistType, currentChecklistTypeId, endpoint });

      let response;
      if (currentChecklistType === 'attraction' && currentDataConfig.createInstance) {
        await axiosInstance.get(endpoint, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
          params
        });
        const latestEndpoint = getFormattedEndpoint(currentChecklistType, 'latest', { checklistTypeId: currentChecklistTypeId });
        response = await axiosInstance.get(latestEndpoint, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
          params: { date: dateString }
        });
      } else {
        response = await axiosInstance.get(endpoint, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
          params
        });
      }

      if (response.data) {
        if (response.data.type?.type_category === 'attraction') {
          if (response.data.items && Array.isArray(response.data.items)) {
            response.data.items = groupItems(response.data.items);
          } else {
            response.data.items = [];
          }
        }
        setChecklist(response.data);
        return response.data;
      } else {
        setChecklist(null);
        if (!currentDataConfig.createInstance && !currentDataConfig.generateDynamicTemplate) {
          setError("No checklist found for today");
        }
        return null;
      }
    } catch (err) {
      console.error("API Error fetching checklist by type ID:", err);
      setError(err.message || "Failed to fetch checklist.");
      return null;
    } finally {
      fetchInProgress.current = false;
      setLoading(false);
    }
  // Sin dependencias reactivas — usa refs para leer valores actuales
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTodayNormalizedUTC, groupItems]);

  /**
   * Refrescar datos del checklist
   */
  const refreshChecklistData = useCallback(() => {
    fetchInProgress.current = false; // Permitir re-fetch manual
    fetchChecklistData();
  }, [fetchChecklistData]);

  // Cargar detalles del tipo al montar
  useEffect(() => {
    fetchChecklistTypeDetails();
  }, [fetchChecklistTypeDetails]);

  // Cargar checklist una vez que lleguen los detalles del tipo
  useEffect(() => {
    if (checklistTypeDetails) {
      fetchChecklistData();
    }
  // Solo disparar cuando checklistTypeDetails cambia (primera carga)
  // fetchChecklistData es estable gracias a los refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTypeDetails]);

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