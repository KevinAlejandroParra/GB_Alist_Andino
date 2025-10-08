'use client'

import React, { useState } from 'react'

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
}) {
  const [showFileInput, setShowFileInput] = useState(false)

  const responseBadgeClass = (value) => {
    switch (value) {
      case "cumple":
        return "bg-green-100 text-green-800 border-green-200"
      case "no_cumple":
        return "bg-red-100 text-red-800 border-red-200"
      case "observaciones":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const canUploadEvidence = !isLocked && (itemResponse?.response_type === "no_cumple" || itemResponse?.response_type === "observaciones")

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
              itemResponse?.response_type === "cumple"
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
              itemResponse?.response_type === "no_cumple"
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
              itemResponse?.response_type === "observaciones"
                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } transition-colors duration-200`}
          >
            Observación
          </button>
        </div>

        {itemResponse?.response_type && (itemResponse.response_type === "no_cumple" || itemResponse.response_type === "observaciones") && (
          <>
            <div>
              <textarea
                value={itemResponse?.comment || ""}
                onChange={(e) =>
                  handleResponseChange(item.checklist_item_id, "comment", e.target.value)
                }
                disabled={isLocked}
                placeholder="Agregar comentario..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {canUploadEvidence && (
              <div>
                {showFileInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileUpload(item.checklist_item_id, e.target.files[0])
                      }
                      accept="image/*"
                      className="flex-1"
                    />
                    <button
                      onClick={() => setShowFileInput(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFileInput(true)}
                      className="flex items-center px-4 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Subir Evidencia
                    </button>
                    {itemResponse?.evidence_url && (
                      <div className="flex items-center gap-2">
                        <img
                          src={getEvidenceUrl(itemResponse.evidence_url)}
                          alt="Evidencia"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <a
                          href={getEvidenceUrl(itemResponse.evidence_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Ver Evidencia
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}