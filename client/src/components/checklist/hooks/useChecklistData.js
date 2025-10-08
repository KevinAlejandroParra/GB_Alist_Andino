import { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../../../utils/axiosConfig'
import { useAuth } from '../../AuthContext'

/**
 * Hook para manejar la carga y estado de datos de checklists
 * @param {string} checklistTypeId - ID del tipo de checklist
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estado del checklist y funciones
 */
export function useChecklistData(checklistTypeId, options = {}) {
  const { user, isLoading: authLoading } = useAuth()

  const {
    entityType = null,
    selectedEntity = null,
    fetchChecklistEndpoint = "latest",
    generateDynamicTemplate = false,
    createInstance = false, // Nueva opción para controlar la creación de instancias
    requiresEntitySelection = false
  } = options

  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historicalChecklists, setHistoricalChecklists] = useState([])
  const [expandedHistoricalChecklists, setExpandedHistoricalChecklists] = useState({})
  const [premiosHistoryData, setPremiosHistoryData] = useState(null)
  const [checklistTypeDetails, setChecklistTypeDetails] = useState(null); // Nuevo estado para detalles del tipo de checklist

  // Función de utilidad para obtener la fecha de hoy normalizada a medianoche UTC
  const getTodayNormalizedUTC = useCallback(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }, []);

  /**
   * Carga el historial del checklist
   */
  const fetchChecklistHistory = useCallback(async () => {
    if (!user || !checklistTypeId) return
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const response = await axiosInstance.get(`${API_URL}/api/checklists/type/${checklistTypeId}/history`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })

      const data = response.data
      if (data.isPremiosChecklist && data.tableData) {
        setPremiosHistoryData(data.tableData)
        setHistoricalChecklists([])
      } else {
        setHistoricalChecklists(data)
        setPremiosHistoryData(null)
      }
    } catch (err) {
      console.error("Error fetching checklist history:", err)
    }
  }, [checklistTypeId, user])

  /**
   * Carga los datos principales del checklist
   */
  const fetchChecklistData = useCallback(async () => {
    // Si aún no tenemos los detalles del tipo de checklist, o no hay usuario o tipo de checklist, no hacemos la llamada.
    // La carga se maneja por la dependencia de checklistTypeDetails en el useEffect principal.
    if (!user || authLoading || !checklistTypeId || !checklistTypeDetails) {
      setLoading(false); // Asegurarse de que el loading se desactive si no se hace la llamada
      return;
    }

    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      // Usar la fecha normalizada para enviar al backend
      const dateString = getTodayNormalizedUTC().toISOString();

      let endpoint
      if (generateDynamicTemplate) {
        endpoint = `${API_URL}/api/checklists/family/${checklistTypeId}/generate`
      } else {
        // Si estamos en modo de creación, usamos el endpoint de creación
        if (createInstance) {
          endpoint = `${API_URL}/api/checklists/type/${checklistTypeId}/create`
        } else {
          // Si no estamos en modo de creación, solo verificamos si existe una instancia
          endpoint = `${API_URL}/api/checklists/type/${checklistTypeId}/latest`
        }
      }

      const params = {
        date: dateString,
      }

      // Si el tipo de checklist es 'attraction', añadir el inspectableId de los detalles del tipo
      if (checklistTypeDetails && checklistTypeDetails.type_category === 'attraction') {
        params.inspectableId = checklistTypeDetails.associated_id;
      }

      const response = await axiosInstance.get(endpoint, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        params
      })

      if (response.data) {
        // Si hay datos y es un checklist de atracción, agrupamos los items
        if (response.data.type && response.data.type.type_category === 'attraction') {
          response.data.items = groupItems(response.data.items);
        }
        setChecklist(response.data)
        return response.data
      } else {
        setChecklist(null)
        if (!createInstance) {
          setError("No checklist found for today")
        }
        return null
      }
      return response.data
    } catch (err) {
      console.error("API Error fetching checklist by type ID:", err)
      setError(err.message || "Failed to fetch checklist.")
      return null
    } finally {
      setLoading(false)
    }
  }, [checklistTypeId, user, authLoading, selectedEntity, fetchChecklistEndpoint, generateDynamicTemplate, createInstance, requiresEntitySelection, entityType, getTodayNormalizedUTC, checklistTypeDetails])

  /**
   * Refresca los datos del checklist
   */
  const refreshChecklistData = useCallback(() => {
    fetchChecklistData()
  }, [fetchChecklistData])

  /**
   * Toggle para expandir/colapsar checklists históricos
   */
  const toggleHistoricalChecklist = useCallback((checklistId) => {
    setExpandedHistoricalChecklists((prev) => ({
      ...prev,
      [checklistId]: !prev[checklistId],
    }))
  }, [])

  function groupItems(items) {
    const parentItems = items.filter(item => item.parent_item_id === null);
    return parentItems.map(parent => ({
      ...parent,
      subItems: items
        .filter(sub => sub.parent_item_id === parent.checklist_item_id)
        .sort((a, b) => a.item_number.localeCompare(b.item_number, 'en', { numeric: true }))
    }));
  }

  // Efectos
  useEffect(() => {
    // Obtener detalles del tipo de checklist al montar el componente
    const fetchChecklistTypeDetails = async () => {
      if (!user || authLoading || !checklistTypeId) return;
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
    };

    fetchChecklistTypeDetails();
  }, [checklistTypeId, user, authLoading]);

  useEffect(() => {
    // Solo llamar a fetchChecklistData si no estamos en modo de creación de instancia
    // o si estamos en modo de creación y ya hay una entidad seleccionada (aunque para attraction, selectedEntity ahora es derivado)
    if (!createInstance || (createInstance && checklistTypeDetails)) { // Modificado para depender de checklistTypeDetails
      console.log("useEffect en useChecklistData llamando a fetchChecklistData. createInstance:", createInstance, "checklistTypeDetails:", checklistTypeDetails);
      fetchChecklistData();
    } else {
      console.log("useEffect en useChecklistData omitiendo fetchChecklistData. createInstance:", createInstance, "checklistTypeDetails:", checklistTypeDetails);
    }
    fetchChecklistHistory();
  }, [fetchChecklistData, fetchChecklistHistory, createInstance, checklistTypeDetails]) // Dependencia de checklistTypeDetails

  return {
    checklist,
    loading,
    error,
    historicalChecklists,
    expandedHistoricalChecklists,
    premiosHistoryData,
    refreshChecklistData,
    toggleHistoricalChecklist,
    fetchChecklistData
  }
}
