import { useState, useCallback, useEffect, useMemo } from 'react'
import Swal from 'sweetalert2'
import axiosInstance from '../../../utils/axiosConfig'

/**
 * Hook para manejar el estado y lógica de respuestas de checklists
 * @param {Object} checklist - Datos del checklist actual
 * @returns {Object} - Estado y funciones para manejar respuestas
 */
export function useResponseManagement(checklist) {
  const [itemResponses, setItemResponses] = useState(() => {
    if (typeof window !== 'undefined' && checklist?.checklist_id) {
      try {
        const saved = localStorage.getItem(`checklist_responses_${checklist.checklist_id}`)
        const parsedResponses = saved ? JSON.parse(saved) : null
        
        if (parsedResponses) {
          console.log('📥 Cargando respuestas guardadas:', parsedResponses);
          return parsedResponses;
        }
      } catch (e) {
        console.warn('Error cargando respuestas guardadas:', e)
      }
    }
    
    console.log('🆕 Inicializando respuestas vacías');
    return {};
  })
  const [modifiedResponses, setModifiedResponses] = useState(new Set())
  const [hasExistingResponses, setHasExistingResponses] = useState(false)
  const [initializedFor, setInitializedFor] = useState(null);

  const allItemsMap = useMemo(() => {
    const map = new Map();
    const collectItems = (items) => {
        if (!items) return;
        items.forEach((item) => {
            if (!item) return;
            const id = item.unique_frontend_id || item.checklist_item_id;
            map.set(id, item);
            if (item.subItems) {
                collectItems(item.subItems);
            }
        });
    };
    if (checklist && checklist.items) {
        collectItems(checklist.items);
    }
    return map;
  }, [checklist]);

  // Debug effect para monitorear cambios en itemResponses
  useEffect(() => {
    console.log('🔍 Estado actual de respuestas:', itemResponses);
  }, [itemResponses]);

  // Guardar respuestas en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined' && checklist?.checklist_id) {
      try {
        const dataToSave = JSON.stringify(itemResponses);
        localStorage.setItem(
          `checklist_responses_${checklist.checklist_id}`,
          dataToSave
        );
        console.log('💾 Guardado en localStorage:', JSON.parse(dataToSave));
      } catch (e) {
        console.warn('Error saving responses to localStorage:', e);
      }
    }
  }, [itemResponses, checklist?.checklist_id]);

  /**
   * Inicializa las respuestas desde los datos del checklist, pero evita sobreescribir
   * el estado si ya ha sido inicializado para el mismo checklist.
   */
  const initializeResponses = useCallback((checklistData) => {
    if (!checklistData || !checklistData.items || checklistData.checklist_id === initializedFor) {
      return;
    }

    const initialResponses = {}
    let hasResponses = false

    const processItems = (items) => {
      if (!items) return
      items.forEach((item) => {
        const id = item.unique_frontend_id || item.checklist_item_id
        if (item.input_type !== "section") {
          const existingResponse = item.responses?.[0]

          if (existingResponse) {
            if (existingResponse.response_compliance || existingResponse.response_numeric || existingResponse.response_text || existingResponse.comment) {
              hasResponses = true
            }
          }

          let value = null
          let response_type = null

          if (existingResponse) {
            if (item.input_type === 'radio' || item.input_type === 'boolean') {
              value = existingResponse.response_compliance
              if (value === 'cumple') {
                response_type = 'cumple'
              } else if (value === 'no cumple') {
                response_type = 'no_cumple'
              } else if (value === 'observación') {
                response_type = 'observaciones'
              }
            } else if (item.input_type === 'numeric') {
              value = existingResponse.response_numeric
            } else if (item.input_type === 'text' || item.input_type === 'textarea') {
              value = existingResponse.response_text
            }
          }

          initialResponses[id] = {
            response_id: existingResponse?.response_id || null,
            value: value,
            response_compliance: item.input_type === 'radio' ? value : undefined,
            comment: existingResponse?.comment ?? "",
            evidence_url: existingResponse?.evidence_url ?? "",
            checklist_item_id: item.checklist_item_id,
            inspectable_id: item.inspectable_id_for_response,
            response_type: response_type,
          }
        }

        if (item.subItems && item.subItems.length > 0) {
          processItems(item.subItems)
        }
      })
    }

    if (checklistData && checklistData.items) {
      processItems(checklistData.items)
    }

    setHasExistingResponses(hasResponses)
    setItemResponses(initialResponses)
    setInitializedFor(checklistData.checklist_id);
  }, [initializedFor])

  /**
   * Maneja cambios en respuestas individuales
   */
  const handleResponseChange = useCallback((itemId, field, value) => {
    const item = allItemsMap.get(itemId);
    if (!item) {
        console.error(`Could not find item in allItemsMap for ID: ${itemId}`);
        return;
    }

    setItemResponses(prevResponses => {
      const currentResponse = prevResponses[itemId] || {};
      
      const newResponse = {
        ...currentResponse,
        [field]: value,
        checklist_item_id: item.checklist_item_id, // <-- THE FIX
        inspectable_id: item.inspectable_id_for_response || currentResponse.inspectable_id,
      };

      if (field === 'response_compliance') {
        newResponse.value = value;
        switch (value) {
          case "cumple":
            newResponse.response_type = "cumple";
            newResponse.comment = "";
            newResponse.evidence_url = "";
            break;
          case "no cumple":
            newResponse.response_type = "no_cumple";
            break;
          case "observación":
            newResponse.response_type = "observaciones";
            break;
          default:
            newResponse.response_type = null;
        }
      }

      return {
        ...prevResponses,
        [itemId]: newResponse,
      };
    });

    setModifiedResponses((prev) => new Set(prev).add(itemId));
  }, [allItemsMap]);

  /**
   * Maneja cambios de tipo de respuesta
   */
  const normalizeResponseType = (type) => {
    switch (type) {
      case "no cumple":
      case "no_cumple":
        return "no_cumple";
      case "observacion":
      case "observaciones":
        return "observaciones";
      default:
        return "cumple";
    }
  };

  const handleResponseTypeChange = useCallback((itemId, rawResponseType) => {
    const item = allItemsMap.get(itemId);
    if (!item) {
        console.error(`Could not find item in allItemsMap for ID: ${itemId}`);
        return;
    }

    const responseType = normalizeResponseType(rawResponseType);
    setItemResponses((prevResponses) => {
      const currentResponse = prevResponses[itemId] || {};
      let response_compliance = null;

      switch (responseType) {
        case "cumple":
          response_compliance = "cumple";
          break;
        case "no_cumple":
          response_compliance = "no cumple";
          break;
        case "observaciones":
          response_compliance = "observación";
          break;
        default:
          response_compliance = "cumple";
      }

      const newResponse = {
        ...currentResponse,
        response_type: responseType,
        response_compliance: response_compliance,
        value: response_compliance,
        comment: responseType === "cumple" ? "" : currentResponse.comment || "",
        evidence_url: responseType === "cumple" ? "" : currentResponse.evidence_url || "",
        checklist_item_id: item.checklist_item_id,
        inspectable_id: item.inspectable_id_for_response || currentResponse.inspectable_id
      };

      return {
        ...prevResponses,
        [itemId]: newResponse
      };
    });
    setModifiedResponses((prev) => new Set(prev).add(itemId));
  }, [allItemsMap]);

  /**
   * Marca todos los ítems hermanos con la misma respuesta de manera optimizada
   */
   const handleMarkAllSiblings = useCallback((parentItemId, inspectableId, responseType) => {
    if (!checklist || !checklist.items) return;

    const findSiblings = (items, parentId) => {
      for (const item of items) {
        if (item.checklist_item_id === parentId) {
          return item.subItems;
        }
        if (item.subItems) {
          const found = findSiblings(item.subItems, parentId);
          if (found) return found;
        }
      }
      return null;
    };

    const siblings = findSiblings(checklist.items, parentItemId);

    if (!siblings) {
      console.error("Could not find siblings for parent item:", parentItemId);
      return;
    }

    setItemResponses(prevResponses => {
      const batchUpdates = {};
      siblings.forEach(sibling => {
        const siblingId = sibling.unique_frontend_id || sibling.checklist_item_id;
        const currentResponse = prevResponses[siblingId] || {};
        
        let response_compliance;
        switch (responseType) {
          case "cumple":
            response_compliance = "cumple";
            break;
          case "no_cumple":
            response_compliance = "no cumple";
            break;
          case "observaciones":
            response_compliance = "observación";
            break;
          default:
            response_compliance = "cumple";
        }

        batchUpdates[siblingId] = {
          ...currentResponse,
          response_type: responseType,
          response_compliance,
          value: response_compliance,
          comment: responseType === "cumple" ? "" : currentResponse.comment || "",
          evidence_url: responseType === "cumple" ? "" : currentResponse.evidence_url || "",
          checklist_item_id: sibling.checklist_item_id,
          inspectable_id: inspectableId || sibling.inspectable_id_for_response || currentResponse.inspectable_id
        };
      });

      return {
        ...prevResponses,
        ...batchUpdates
      };
    });

    setModifiedResponses(prev => {
      const newSet = new Set(prev);
      siblings.forEach(sibling => {
        const siblingId = sibling.unique_frontend_id || sibling.checklist_item_id;
        newSet.add(siblingId);
      });
      return newSet;
    });
  }, [checklist]);
  /**
   * Resetea las modificaciones
   */
  const resetModifications = useCallback(() => {
    setModifiedResponses(new Set())
  }, [])

  const saveResponses = useCallback(async (config, user, checklistTypeId, signature, validation, onSuccess) => {
    const isValid = validation.validateResponses(itemResponses);
    if (!isValid) {
        if (onSuccess) onSuccess(false, validation.errors);
        return;
    }

    if (!user || !checklist) return;

    const responsesToSend = [];
    let validationFailed = false;

    for (const itemId of Object.keys(itemResponses)) {
      const item = allItemsMap.get(itemId);
      const response = itemResponses[itemId];

      if (!item || !response) {
        console.warn(`No se encontró el item o la respuesta para el ID: ${itemId}`);
        continue;
      }
      
      // Validar "no cumple" - requiere comentario y evidencia
      if (response.response_type === "no_cumple") {
        if (!response.comment || response.comment.trim() === "") {
          validationFailed = true;
          Swal.fire({
            title: "Comentario obligatorio",
            text: `El ítem "${item.question_text}" marcado como "No Cumple" requiere un comentario explicativo.`,
            icon: "warning",
            confirmButtonColor: "#7c3aed",
          });
          break;
        }
        if (!response.evidence_url || response.evidence_url.trim() === "") {
          validationFailed = true;
          Swal.fire({
            title: "Evidencia obligatoria",
            text: `El ítem "${item.question_text}" marcado como "No Cumple" requiere evidencia fotográfica.`,
            icon: "warning",
            confirmButtonColor: "#7c3aed",
          });
          break;
        }
      }

      // Validar "observación" - requiere comentario y evidencia
      if (response.response_type === "observaciones") {
        if (!response.comment || response.comment.trim() === "") {
          validationFailed = true;
          Swal.fire({
            title: "Comentario obligatorio",
            text: `El ítem "${item.question_text}" marcado como "Observación" requiere un comentario explicativo.`,
            icon: "warning",
            confirmButtonColor: "#7c3aed",
          });
          break;
        }
        if (!response.evidence_url || response.evidence_url.trim() === "") {
          validationFailed = true;
          Swal.fire({
            title: "Evidencia obligatoria",
            text: `El ítem "${item.question_text}" marcado como "Observación" requiere evidencia fotográfica.`,
            icon: "warning",
            confirmButtonColor: "#7c3aed",
          });
          break;
        }
      }

      if (checklist.type?.type_category === 'family' && !response.inspectable_id) {
        validationFailed = true;
        Swal.fire({
          title: "Error de validación",
          text: `El ítem "${item.question_text}" requiere un ID de inspectable válido para checklists de familia.`,
          icon: "warning",
          confirmButtonColor: "#7c3aed",
        });
        break;
      }

      responsesToSend.push({
        checklist_id: checklist.type?.type_category === 'specific' ? null : checklist.checklist_id,
        checklist_item_id: response.checklist_item_id,
        response_id: response.response_id,
        value: response.value,
        comment: response.comment || null,
        evidence_url: response.evidence_url || null,
        inspectable_id: response.inspectable_id,
        response_type: response.response_type,
      });
    }

    if (validationFailed) {
        return;
    }

    if (responsesToSend.length === 0) {
        resetModifications();
        return;
    }

    Swal.fire({
      title: "Guardando respuestas...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

  try {
    const endpoint = config.saveEndpoint || `/api/checklists/${checklist.checklist_id}/responses`;
    await axiosInstance.post(endpoint, {
      responses: responsesToSend
    }, {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    await Swal.fire({
      title: '¡Éxito!',
      text: 'Checklist guardado correctamente',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });

    resetModifications();
    if (onSuccess) onSuccess(true);

  } catch (error) {
    console.error('Error al guardar:', error);
    Swal.fire({
      title: 'Error',
      text: error.response?.data?.message || 'No se pudo guardar el checklist',
      icon: 'error'
    });
    if (onSuccess) onSuccess(false);
  }
  }, [itemResponses, checklist, resetModifications, allItemsMap]);

  return {
    itemResponses,
    modifiedResponses,
    hasExistingResponses,
    initializeResponses,
    handleResponseChange,
    handleResponseTypeChange,
    handleMarkAllSiblings,
    resetModifications,
    saveResponses
  }
}
