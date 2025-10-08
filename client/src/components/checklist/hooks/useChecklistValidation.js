'use client'

import { useState, useCallback } from 'react'

export const useChecklistValidation = (config) => {
  const [errors, setErrors] = useState([])

  const validateResponses = useCallback((responses) => {
    const newErrors = []

    // Validar que todas las preguntas tengan respuesta
    Object.entries(responses).forEach(([itemId, response]) => {
      // Verificar si hay alguna respuesta válida
      const hasValidResponse = 
        response.value || 
        response.response_compliance || 
        response.response_numeric || 
        response.response_text ||
        (response.response_type && ['cumple', 'no_cumple', 'observaciones'].includes(response.response_type));
      
      if (!hasValidResponse) {
        newErrors.push(`Pregunta ${itemId} sin responder`)
      }

      // Validar comentarios y evidencias para respuestas no cumple/observación
      if (response.response_type === 'no_cumple' || response.response_type === 'observaciones') {
        if (!response.comment) {
          newErrors.push(`Comentario requerido para la pregunta ${itemId}`)
        }
        if (config.validations?.requiresEvidence && !response.evidence_url) {
          newErrors.push(`Evidencia requerida para la pregunta ${itemId}`)
        }
      }

      // Validaciones específicas para premios
      if ((config.type === 'specific' || config.type === 'premios' || 
          (config.checklistName && (config.checklistName.includes('Premios')))) && 
          (config.validations?.requiresNumericValidation || response.input_type === 'numeric')) {
        const numValue = parseFloat(response.response_numeric)
        if (isNaN(numValue) && response.response_type !== 'cumple') {
          newErrors.push(`Valor numérico inválido en la pregunta ${itemId}`)
        }
      }
      
      // Validar que checklists de familia tengan inspectable_id
      if (config.type === 'family' && !response.inspectable_id) {
        newErrors.push(`Falta ID de inspectable para el ítem ${itemId}`)
      }
    })

    // Validar firma si es requerida
    if (config.validations?.requiresSignature && !config.signature) {
      newErrors.push('Se requiere firma para completar el checklist')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [config])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  return {
    errors,
    validateResponses,
    clearErrors,
    hasErrors: errors.length > 0
  }
}