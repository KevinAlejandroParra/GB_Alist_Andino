import { useState, useCallback } from 'react'
import Swal from 'sweetalert2'
import axiosInstance from '../../../utils/axiosConfig'

/**
 * Hook para manejar el estado y lógica de respuestas de checklists
 * @param {Object} checklist - Datos del checklist actual
 * @returns {Object} - Estado y funciones para manejar respuestas
 */
export function useResponseManagement(checklist) {
  const [itemResponses, setItemResponses] = useState({})
  const [modifiedResponses, setModifiedResponses] = useState(new Set())
  const [hasExistingResponses, setHasExistingResponses] = useState(false)

  /**
   * Inicializa respuestas desde datos del checklist
   */
  const initializeResponses = useCallback((checklistData) => {
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
  }, [])

  /**
   * Maneja cambios en respuestas individuales
   */
  const handleResponseChange = (itemId, field, value) => {
    setItemResponses((prevResponses) => {
      const currentResponse = prevResponses[itemId] || {}
      const newResponse = { ...currentResponse, [field]: value }

      // When a radio button changes, update the related fields
      if (field === 'response_compliance') {
        newResponse.value = value // Keep a generic 'value' field in sync
        switch (value) {
          case "cumple":
            newResponse.response_type = "cumple"
            break
          case "no cumple":
            newResponse.response_type = "no_cumple"
            break
          case "observación":
            newResponse.response_type = "observaciones"
            break
          default:
            newResponse.response_type = null
        }
      }

      return {
        ...prevResponses,
        [itemId]: newResponse,
      }
    })
    setModifiedResponses((prev) => new Set(prev).add(itemId))
  }

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
    console.log('handleResponseTypeChange called with:', itemId, rawResponseType);
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
        checklist_item_id: currentResponse.checklist_item_id,
        inspectable_id: currentResponse.inspectable_id
      };

      return {
        ...prevResponses,
        [itemId]: newResponse
      };
    });
    setModifiedResponses((prev) => new Set(prev).add(itemId));
  }, []);

  /**
   * Marca todos los ítems hermanos con la misma respuesta
   */
  const handleMarkAllSiblings = useCallback((parentItemId, inspectableId, responseType) => {
    const findSiblings = (items, parentId) => {
      for (const item of items) {
        if (item.checklist_item_id === parentId && item.subItems) {
          return item.subItems
        }
        if (item.subItems) {
          const found = findSiblings(item.subItems, parentId)
          if (found) return found
        }
      }
      return null
    }

    const siblings = findSiblings(checklist.items, parentItemId)
    if (!siblings) return

    console.log('Marking siblings for parent', parentItemId, 'responseType', responseType, 'siblings', siblings.map(s => s.checklist_item_id || s.unique_frontend_id))

    siblings.forEach(sibling => {
      const siblingId = sibling.unique_frontend_id || sibling.checklist_item_id
      handleResponseTypeChange(siblingId, responseType)
    })
  }, [checklist?.items, handleResponseTypeChange])

  /**
   * Resetea las modificaciones
   */
  const resetModifications = useCallback(() => {
    setModifiedResponses(new Set())
  }, [])

  const saveResponses = useCallback(async (config, user, checklistTypeId, signature, validation, onSuccess) => {
    const isValid = validation.validateResponses(itemResponses);
    if (!isValid) {
        if (onSuccess) onSuccess(false, validation.errors); // Indicate failure
        return;
    }

    const hasTechnicalSignature = checklist?.signatures?.some(sig => sig.role?.role_name === 'Tecnico de mantenimiento');
    const hasOperationsSignature = checklist?.signatures?.some(sig => sig.role?.role_name === 'Jefe de Operaciones');

    if (hasTechnicalSignature && hasOperationsSignature) {
        await Swal.fire({
            title: "Checklist Bloqueado",
            text: "Este checklist ya ha sido firmado. No se pueden realizar modificaciones.",
            icon: "warning",
            confirmButtonColor: "#7c3aed",
        });
        return;
    }

    if (!user || !checklist) return;

    const allItems = new Map();
    const collectItems = (items) => {
      if (!items) return;
      items.forEach((item) => {
        const id = item.unique_frontend_id || item.checklist_item_id;
        allItems.set(id, item);
        if (item.subItems) {
          collectItems(item.subItems);
        }
      });
    };
    collectItems(checklist.items);

    const responsesToSend = [];
    let validationFailed = false;

    for (const itemId of Object.keys(itemResponses)) {
      const item = allItems.get(itemId);
      const response = itemResponses[itemId];

      if (!item || !response) {
        console.warn(`No se encontró el item o la respuesta para el ID: ${itemId}`);
        continue;
      }
      
      if (response.response_type === "no_cumple" && (!response.comment || response.comment.trim() === "")) {
        validationFailed = true;
        Swal.fire({
          title: "Comentario requerido",
          text: `El ítem "${item.question_text}" marcado como "No Cumple" requiere un comentario.`,
          icon: "warning",
          confirmButtonColor: "#7c3aed",
        });
        break;
      }

      // Validación específica para checklists de familia
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
    // Usar el endpoint configurado si existe, si no, usar el anterior por compatibilidad
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
    if (onSuccess) onSuccess(true); // Indicar éxito

  } catch (error) {
    console.error('Error al guardar:', error);
    console.log('Error response data:', error.response?.data);
    Swal.fire({
      title: 'Error',
      text: error.response?.data?.message || 'No se pudo guardar el checklist',
      icon: 'error'
    });
    if (onSuccess) onSuccess(false); // Indicar fallo
  }
  }, [itemResponses, checklist, resetModifications]);

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