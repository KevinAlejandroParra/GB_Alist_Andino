'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import PartitionedQrGeneration from './PartitionedQrGeneration';
import QrWelcomeScreen from './QrWelcomeScreen';
import QrUsageInstructions from './QrUsageInstructions';
import QrSystemStatus from './QrSystemStatus';
import QrDownloadManager from './QrDownloadManager';
import QrPrintManager from './QrPrintManager';
import JSZip from 'jszip';

export default function QrCodeManagement() {
  const { user } = useAuth();
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);

  // Cargar tipos de checklist de atracción
  const loadChecklistTypes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/checklist-types`);

      if (response.data && Array.isArray(response.data)) {
        // Filtrar solo tipos de atracción
        const attractionTypes = response.data.filter(type =>
          type.type_category === 'attraction'
        );
        setChecklistTypes(attractionTypes);
      }
    } catch (error) {
      console.error('Error cargando tipos de checklist:', error);
      Swal.fire('Error', 'No se pudieron cargar los tipos de checklist', 'error');
    }
  };

  // Cargar códigos QR existentes
  const loadQrCodes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/qr-codes`);

      if (response.data.success) {
        setQrCodes(response.data.data || []);
        setLoadError('');
      }
    } catch (error) {
      console.error('Error cargando códigos QR:', error);
      setLoadError(error.response?.data?.message || error.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };


  // Eliminar código QR permanentemente
  const handleDeleteQr = async (qrId) => {
    try {
      const result = await Swal.fire({
        title: '¿Eliminar Código QR?',
        text: 'Esta acción no se puede deshacer. El código QR será eliminado permanentemente junto con todo su historial de uso.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar permanentemente',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        const response = await axiosInstance.post(`${API_URL}/api/qr-codes/delete-multiple`, {
          qr_ids: [qrId]
        });

        if (response.data.success) {
          Swal.fire('¡Eliminado!', 'Código QR eliminado permanentemente', 'success');
          loadQrCodes(); // Recargar la lista
        }
      }
    } catch (error) {
      console.error('Error eliminando código QR:', error);
      Swal.fire('Error', 'No se pudo eliminar el código QR', 'error');
    }
  };

  // Descargar código QR individual
  const downloadQrImage = async (qrId, attractionName) => {
    Swal.fire({
        title: 'Preparando descarga...',
        text: `Obteniendo QR para ${attractionName}`,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        const response = await axiosInstance.get(`${API_URL}/api/qr-codes/${qrId}`);

        if (response.data.success && response.data.data.qr_image_base64) {
            const link = document.createElement('a');
            link.href = response.data.data.qr_image_base64;
            link.download = `QR-${attractionName.replace(/\s+/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            Swal.close(); // Close the loading modal
        } else {
            throw new Error('La imagen del QR no fue encontrada.');
        }
    } catch (error) {
        console.error('Error descargando imagen QR:', error);
        Swal.fire('Error', 'No se pudo descargar la imagen.', 'error');
    }
  };

  // Descargar todos los códigos QR en un ZIP
  const downloadAllQrCodes = async () => {
    if (qrCodes.length === 0) {
      Swal.fire('Información', 'No hay códigos QR para descargar.', 'info');
      return;
    }

    Swal.fire({
      title: 'Generando archivo ZIP',
      html: `Preparando ${qrCodes.length} códigos QR...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const zip = new JSZip();
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      for (let i = 0; i < qrCodes.length; i++) {
        const qr = qrCodes[i];
        Swal.update({
          html: `Procesando ${i + 1} de ${qrCodes.length}: ${qr.attraction_name}`
        });
        
        try {
          const response = await axiosInstance.get(`${API_URL}/api/qr-codes/${qr.qr_id}`);

          const qrCodeData = response.data.data;
          if (qrCodeData && qrCodeData.qr_image_base64) {
            const base64Data = qrCodeData.qr_image_base64.split(',')[1];
            zip.file(`QR-${qr.attraction_name.replace(/\s+/g, '-')}.png`, base64Data, { base64: true });
          }
        } catch (e) {
          console.error(`No se pudo obtener el QR para ${qr.attraction_name}:`, e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'Codigos-QR-Activos.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      Swal.fire('¡Éxito!', `Se ha descargado un archivo ZIP con ${qrCodes.length} códigos QR.`, 'success');

    } catch (error) {
      console.error('Error generando el archivo ZIP:', error);
      Swal.fire('Error', 'Ocurrió un error al generar el archivo ZIP.', 'error');
    }
  };


  useEffect(() => {
    if (user && user.role_id === 1) { // Solo admins
      loadChecklistTypes();
      loadQrCodes();
    }
  }, [user]);

  if (user?.role_id !== 1) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Solo los administradores pueden gestionar códigos QR</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Códigos QR por Particiones</h2>
        <button
          onClick={() => setShowWelcomeScreen(!showWelcomeScreen)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          {showWelcomeScreen ? '← Volver' : 'Ver Instructivo'}
        </button>
      </div>

      {/* Mostrar error de sistema si existe */}
      {loadError && (
        <QrSystemStatus
          error={loadError}
          onRetry={() => {
            setLoadError('');
            loadQrCodes();
          }}
        />
      )}

      {/* Pantalla de bienvenida o contenido principal */}
      {showWelcomeScreen ? (
        <QrWelcomeScreen onStartGeneration={() => {
          setShowWelcomeScreen(false);
        }} />
      ) : (
        <>
          {/* Generación por particiones específicas */}
          <PartitionedQrGeneration
            onQrGenerated={() => {
              setLoadError('');
              loadQrCodes();
            }}
          />

          {/* Lista de códigos QR existentes */}
          {qrCodes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Códigos QR Existentes</h3>
                  <button
                    onClick={downloadAllQrCodes}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    📥 Descargar Todos ({qrCodes.length})
                  </button>
                </div>
              </div>

              <div className="divide-y">
                {qrCodes.map(qr => (
                  <div key={qr.qr_id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-800">
                            {qr.attraction_name}
                          </h4>
                          {qr.group_number && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Grupo {qr.group_number}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          Tipo: {qr.checklist_type_name || 'N/A'}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Usos: {qr.usage_count || 0}</span>
                          <span>
                            Creado: {new Date(qr.createdAt).toLocaleDateString()}
                          </span>
                          {qr.last_used_at && (
                            <span>
                              Último uso: {new Date(qr.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadQrImage(qr.qr_id, qr.attraction_name)}
                          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Descargar
                        </button>

                        <button
                          onClick={() => handleDeleteQr(qr.qr_id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gestión de impresión de códigos QR */}
          {qrCodes.length > 0 && !loadError && (
            <QrPrintManager
              qrCodes={qrCodes}
              onRefresh={loadQrCodes}
            />
          )}

          {/* Si no hay códigos QR y no hay error, mostrar pantalla de bienvenida */}
          {qrCodes.length === 0 && !loadError && (
            <QrWelcomeScreen onStartGeneration={() => {
              setShowWelcomeScreen(false);
            }} />
          )}
        </>
      )}
    </div>
  );
}
