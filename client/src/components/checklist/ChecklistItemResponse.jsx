'use client'

import React, { useState } from 'react'
import WorkOrderStatusIndicator from './WorkOrderStatusIndicator'

export default function ChecklistItemResponse({
  item,
  itemResponse,
  handleResponseChange,
  handleResponseTypeChange,
  handleFileUpload,
  getEvidenceUrl,
  user,
  isLocked = false,
  handleMarkAllSiblings = null,
  checklistType = null,
  // Props para WorkOrder
  workOrder,
  onWorkOrderClick,
}) {
  const [showFileInput, setShowFileInput] = useState(false)

  const responseBadgeClass = (value) => {
    // Normalizar el valor de entrada para asegurar coincidencia
    const v = String(value || '').toLowerCase().trim();
    
    if (v === 'cumple') return "bg-green-100 text-green-800 border-green-200";
    
    if (v.includes('no_cumple') || v.includes('no cumple')) 
      return "bg-red-100 text-red-800 border-red-200";
      
    if (v.includes('observ')) 
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
      
    return "bg-gray-100 text-gray-800 border-gray-200";
  }

  // Helper para normalizar el tipo de respuesta actual
  const getNormalizedResponseType = () => {
    // Intentar obtener el tipo de respuesta, o el valor si el tipo no está definido
    const v = String(itemResponse?.response_type || itemResponse?.value || '').toLowerCase().trim();
    if (v === 'cumple') return 'cumple';
    if (v.includes('no') && v.includes('cumple')) return 'no_cumple';
    if (v.includes('observ')) return 'observaciones';
    return v;
  };
  
  const currentNormalizedType = getNormalizedResponseType();
  const canUploadEvidence = !isLocked && (currentNormalizedType === "no_cumple" || currentNormalizedType === "observaciones")

  return (
    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <p className="text-gray-800 font-medium">{item.question_text}</p>
          {item.guidance_text && (
            <p className="text-sm text-gray-600 mt-1">{item.guidance_text}</p>
          )}
        </div>
        
        {!isLocked && handleMarkAllSiblings && item.parent_item_id && (
          <button
            onClick={() => handleMarkAllSiblings(item.parent_item_id, null, itemResponse?.response_type || "cumple")}
            className="flex items-center px-3 py-1 text-sm text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Marcar Hermanos
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleResponseTypeChange(item.checklist_item_id, "cumple")}
            disabled={isLocked}
            className={`px-4 py-2 rounded-lg border ${
              currentNormalizedType === "cumple"
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } transition-colors duration-200`}
          >
            Cumple
          </button>
          <button
            onClick={() => handleResponseTypeChange(item.checklist_item_id, "no_cumple")}
            disabled={isLocked}
            className={`px-4 py-2 rounded-lg border ${
              currentNormalizedType === "no_cumple"
                ? "bg-red-100 text-red-800 border-red-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } transition-colors duration-200`}
          >
            No Cumple
          </button>
          <button
            onClick={() => handleResponseTypeChange(item.checklist_item_id, "observaciones")}
            disabled={isLocked}
            className={`px-4 py-2 rounded-lg border ${
              currentNormalizedType === "observaciones"
                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } transition-colors duration-200`}
          >
            Observación
          </button>
        </div>

        {/* Mostrar WorkOrderStatusIndicator si hay una OT pendiente */}
        {workOrder && (
          <WorkOrderStatusIndicator
            workOrder={workOrder}
            onClick={onWorkOrderClick}
            size="md"
            showDetails={true}
          />
        )}

        {itemResponse?.response_type && (currentNormalizedType === "no_cumple" || currentNormalizedType === "observaciones") && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700">
                  Los comentarios y evidencia se capturarán en el modal de fallas al seleccionar "observación" o "no cumple".
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
