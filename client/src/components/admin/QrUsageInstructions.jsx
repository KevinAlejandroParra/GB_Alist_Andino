'use client';

import React from 'react';

export default function QrUsageInstructions() {
  return (
    <div className="bg-blue-50 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-blue-600 text-sm">📋</span>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2">📖 Guía de Uso de Códigos QR</h4>

          <div className="text-sm text-blue-800 space-y-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-900 mb-1">🎯 Para el Personal:</h5>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Lleva tu dispositivo móvil al área de la atracción</li>
                  <li>Al iniciar el checklist, se requerirá escanear el código QR</li>
                  <li>El código QR debe estar ubicado físicamente en la atracción</li>
                  <li>Una vez escaneado, podrás continuar con las respuestas</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium text-blue-900 mb-1">🏷️ Para los Códigos QR:</h5>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Imprime cada código QR en tamaño A6 o carta</li>
                  <li>Colócalo en un lugar visible cerca de la atracción</li>
                  <li>Protege la impresión con plástico o laminado</li>
                  <li>Un código QR por atracción específica</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-400">
              <p className="font-medium text-blue-900 mb-1">💡 Consejos Importantes:</p>
              <p className="text-blue-700">
                • Los códigos QR aseguran que el personal esté físicamente presente en la atracción antes de realizar la inspección
                • Cada escaneo queda registrado con fecha, hora y usuario
                • Puedes desactivar códigos QR antiguos y generar nuevos cuando sea necesario
                • Usa la descarga masiva para generar múltiples códigos QR de una sola vez
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}