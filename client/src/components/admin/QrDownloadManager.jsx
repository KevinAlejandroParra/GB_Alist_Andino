'use client';

import React, { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

export default function QrDownloadManager({ qrCodes, onRefresh }) {
  const { user } = useAuth();
  const [downloadOptions, setDownloadOptions] = useState({
    format: 'individual', // individual, batch, pdf
    size: 'medium', // small, medium, large
    includeText: true,
    selectedCodes: []
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSelectAll = () => {
    const activeCodes = qrCodes.filter(qr => qr.is_active);
    setDownloadOptions(prev => ({
      ...prev,
      selectedCodes: prev.selectedCodes.length === activeCodes.length ? [] : activeCodes.map(qr => qr.qr_id)
    }));
  };

  const handleCodeToggle = (qrId) => {
    setDownloadOptions(prev => ({
      ...prev,
      selectedCodes: prev.selectedCodes.includes(qrId)
        ? prev.selectedCodes.filter(id => id !== qrId)
        : [...prev.selectedCodes, qrId]
    }));
  };

  const downloadIndividualQr = async (qrCode) => {
    try {
      const link = document.createElement('a');
      link.href = qrCode.qr_image_base64;
      link.download = `QR-${qrCode.attraction_name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (error) {
      console.error('Error descargando QR individual:', error);
      return false;
    }
  };

  const downloadBatchQr = async () => {
    const selectedQrCodes = qrCodes.filter(qr => downloadOptions.selectedCodes.includes(qr.qr_id));

    if (selectedQrCodes.length === 0) {
      Swal.fire('Error', 'Selecciona al menos un código QR para descargar', 'warning');
      return;
    }

    setIsDownloading(true);

    try {
      Swal.fire({
        title: 'Descargando Códigos QR',
        text: `Preparando ${selectedQrCodes.length} códigos QR...`,
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => Swal.showLoading()
      });

      let successCount = 0;
      const errors = [];

      for (let i = 0; i < selectedQrCodes.length; i++) {
        const qr = selectedQrCodes[i];

        Swal.getContent().querySelector('p').textContent =
          `Descargando ${i + 1} de ${selectedQrCodes.length}: ${qr.attraction_name}`;

        const success = await downloadIndividualQr(qr);
        if (success) {
          successCount++;
        } else {
          errors.push(qr.attraction_name);
        }

        // Pequeña pausa entre descargas
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      Swal.close();

      if (successCount > 0) {
        Swal.fire({
          icon: 'success',
          title: '¡Descarga Completa!',
          text: `Se descargaron ${successCount} códigos QR exitosamente${errors.length > 0 ? `. Errores: ${errors.join(', ')}` : ''}`,
          confirmButtonText: 'Aceptar'
        });
      } else {
        Swal.fire('Error', 'No se pudo descargar ningún código QR', 'error');
      }

    } catch (error) {
      console.error('Error en descarga masiva:', error);
      Swal.fire('Error', 'Error durante la descarga masiva', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const generateHighQualityQr = async (qrCode) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      // Solicitar generación de QR de alta calidad
      const response = await axiosInstance.post(`${API_URL}/api/qr-codes/generate-hq`, {
        qr_code: qrCode.qr_code,
        attraction_name: qrCode.attraction_name,
        size: downloadOptions.size,
        include_text: downloadOptions.includeText
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (response.data.success) {
        // Descargar la imagen de alta calidad
        const link = document.createElement('a');
        link.href = response.data.data.qr_image_base64;
        link.download = `QR-HQ-${qrCode.attraction_name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
      }
    } catch (error) {
      console.error('Error generando QR de alta calidad:', error);
      return false;
    }
  };

  const getSelectedQrCodes = () => {
    return qrCodes.filter(qr => downloadOptions.selectedCodes.includes(qr.qr_id));
  };

  const activeQrCodes = qrCodes.filter(qr => qr.is_active);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Gestión de Descargas QR</h3>

      {/* Opciones de descarga */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Selección de códigos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Códigos QR para Descargar
          </label>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            <label className="flex items-center p-2 border rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={downloadOptions.selectedCodes.length === activeQrCodes.length}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="text-sm font-medium">Seleccionar Todos ({activeQrCodes.length})</span>
            </label>

            {activeQrCodes.map(qr => (
              <label key={qr.qr_id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={downloadOptions.selectedCodes.includes(qr.qr_id)}
                  onChange={() => handleCodeToggle(qr.qr_id)}
                  className="mr-2"
                />
                <span className="text-sm">{qr.attraction_name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Opciones de formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Opciones de Descarga
          </label>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tamaño de Imagen</label>
              <select
                value={downloadOptions.size}
                onChange={(e) => setDownloadOptions(prev => ({ ...prev, size: e.target.value }))}
                className="w-full p-1 border rounded text-sm"
              >
                <option value="small">Pequeño (200x200px)</option>
                <option value="medium">Mediano (300x300px)</option>
                <option value="large">Grande (500x500px)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={downloadOptions.includeText}
                  onChange={(e) => setDownloadOptions(prev => ({ ...prev, includeText: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir texto con información</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas de selección */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Seleccionados:</span> {downloadOptions.selectedCodes.length} de {activeQrCodes.length} códigos QR activos
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadBatchQr}
          disabled={isDownloading || downloadOptions.selectedCodes.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isDownloading ? 'Descargando...' : `📥 Descargar ${downloadOptions.selectedCodes.length} Código${downloadOptions.selectedCodes.length !== 1 ? 's' : ''}`}
        </button>

        <button
          onClick={() => {
            // Generar vista previa antes de descargar
            const selectedCodes = getSelectedQrCodes();
            if (selectedCodes.length === 0) {
              Swal.fire('Error', 'Selecciona códigos QR primero', 'warning');
              return;
            }

            Swal.fire({
              title: 'Vista Previa de Descarga',
              html: `
                <div class="max-h-96 overflow-y-auto">
                  ${selectedCodes.map(qr => `
                    <div class="flex items-center justify-between p-2 border-b">
                      <span>${qr.attraction_name}</span>
                      <span class="text-xs text-gray-500">${qr.qr_code}</span>
                    </div>
                  `).join('')}
                </div>
              `,
              confirmButtonText: 'Confirmar Descarga',
              showCancelButton: true,
              cancelButtonText: 'Cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                downloadBatchQr();
              }
            });
          }}
          disabled={downloadOptions.selectedCodes.length === 0}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
        >
          👁️ Vista Previa
        </button>

        <button
          onClick={() => {
            // Limpiar selección
            setDownloadOptions(prev => ({ ...prev, selectedCodes: [] }));
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          🗑️ Limpiar Selección
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-800">
          <p><strong>💡 Consejos:</strong></p>
          <p>• Los códigos QR se descargarán como imágenes PNG individuales</p>
          <p>• Usa la opción "Vista Previa" para confirmar tu selección antes de descargar</p>
          <p>• Los códigos más grandes son ideales para impresión física</p>
        </div>
      </div>
    </div>
  );
}