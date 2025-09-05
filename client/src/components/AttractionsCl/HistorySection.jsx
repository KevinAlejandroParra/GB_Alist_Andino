"use client"
import { formatLocalDate } from "../../utils/dateUtils"

export default function HistorySection({
  historicalChecklists,
  expandedHistoricalChecklists,
  toggleHistoricalChecklist,
}) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Historial de Checklists</h2>
      {historicalChecklists && historicalChecklists.length > 0 ? (
        <div className="space-y-3">
          {historicalChecklists.map((histChecklist) => (
            <div
              key={histChecklist.checklist_id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => toggleHistoricalChecklist(histChecklist.checklist_id)}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{formatLocalDate(histChecklist.date)}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{histChecklist.type?.name || "N/A"}</span>
                      <span>•</span>
                      <span>{histChecklist.creator?.user_name || "N/A"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xl text-gray-400 ml-4">
                  {expandedHistoricalChecklists[histChecklist.checklist_id] ? "▼" : "▶"}
                </div>
              </div>

              {expandedHistoricalChecklists[histChecklist.checklist_id] && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="py-4 space-y-4">
                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Versión:</span>
                        <span className="ml-2 text-gray-600">{histChecklist.version_label || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tipo:</span>
                        <span className="ml-2 text-gray-600">{histChecklist.type?.name || "N/A"}</span>
                      </div>
                    </div>

                    {/* Firmas */}
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Firmas:</p>
                      <div className="bg-white rounded-md p-3">
                        {histChecklist.signatures && histChecklist.signatures.length > 0 ? (
                          <div className="space-y-1">
                            {histChecklist.signatures.map((signature, index) => (
                              <div
                                key={`${histChecklist.checklist_id}-signature-${signature.user_id}-${index}`}
                                className="text-sm text-gray-600"
                              >
                                <span className="font-medium">{signature.role_at_signature}</span>
                                <span className="mx-2">por</span>
                                <span>{signature.user?.user_name || "N/A"}</span>
                                <span className="mx-2">el</span>
                                <span>{formatLocalDate(signature.signed_at)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No hay firmas registradas.</p>
                        )}
                      </div>
                    </div>

                    {/* Ítems del checklist */}
                    {histChecklist.items && histChecklist.items.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-700 mb-2">Ítems del Checklist:</p>
                        <div className="bg-white rounded-md max-h-64 overflow-y-auto">
                          <div className="space-y-2 p-3">
                            {histChecklist.items.map((item) => (
                              <div key={item.checklist_item_id} className="border-l-4 border-gray-200 pl-3 py-2">
                                <p className="font-medium text-sm text-gray-800">
                                  {item.item_number}. {item.question_text}
                                </p>
                                {item.responses && item.responses.length > 0 && (
                                  <div className="mt-1 text-sm">
                                    <span className="inline-flex items-center">
                                      {item.responses[0].value === true ? (
                                        <span className="text-green-600 font-medium">✅ Cumple</span>
                                      ) : item.responses[0].value === false ? (
                                        <span className="text-red-600 font-medium">❌ No Cumple</span>
                                      ) : (
                                        <span className="text-gray-500 font-medium">⚠️ N/A</span>
                                      )}
                                    </span>
                                    {item.responses[0].comment && (
                                      <p className="text-gray-600 mt-1 text-xs">
                                        <span className="font-medium">Comentario:</span> {item.responses[0].comment}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay checklists históricos para esta atracción.</p>
        </div>
      )}
    </div>
  )
}
