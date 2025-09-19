"use client"
import React from "react"
import { formatLocalDate, formatLocalDateTime } from "../../utils/dateUtils"

export default function HistorySection({
  historicalChecklists,
  expandedHistoricalChecklists,
  toggleHistoricalChecklist,
}) {
  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Historial de Checklists</h2>
        {historicalChecklists.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay historial de checklists disponibles.</p>
        ) : (
          <div className="space-y-4">
            {historicalChecklists.map((historyChecklist) => (
              <div key={historyChecklist.checklist_id} className="border border-gray-200 rounded-lg">
                <div
                  className="p-4 cursor-pointer flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                  onClick={() => toggleHistoricalChecklist(historyChecklist.checklist_id)}
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">
                      Checklist del {formatLocalDate(historyChecklist.date)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Creado por: {historyChecklist.creator?.user_name || "Desconocido"} el{" "}
                      {formatLocalDateTime(historyChecklist.createdAt)}
                    </p>
                  </div>
                  <div className="text-xl text-gray-500">
                    {expandedHistoricalChecklists[historyChecklist.checklist_id] ? "▲" : "▼"}
                  </div>
                </div>

                {expandedHistoricalChecklists[historyChecklist.checklist_id] && (
                  <div className="p-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-2">Firmas:</h4>
                    {historyChecklist.signatures && historyChecklist.signatures.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
                        {historyChecklist.signatures.map((signature, index) => (
                          <li key={index}>
                            {signature.role_at_signature} : {signature.user?.user_name || "Desconocido"} el{" "}
                            {formatLocalDateTime(signature.signed_at)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600 mb-4">No hay firmas para este checklist.</p>
                    )}

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}