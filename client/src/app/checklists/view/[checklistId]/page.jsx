'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../components/AuthContext';
import ChecklistHeader from '../../../../components/checklist/components/ChecklistHeader';
import axiosInstance from '../../../../utils/axiosConfig';
import { formatLocalDate } from '../../../../utils/dateUtils';

export default function ViewChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const { checklistId } = params;
  const { user } = useAuth();
  
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos del checklist específico
  useEffect(() => {
    const fetchChecklistData = async () => {
      try {
        setLoading(true);
        
        // Obtener información del checklist
        const response = await axiosInstance.get(`/api/checklists/${checklistId}`);
        setChecklist(response.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos del checklist:', err);
        setError('Error al cargar los datos del checklist. Por favor, intente nuevamente.');
        setLoading(false);
      }
    };
    
    if (checklistId) {
      fetchChecklistData();
    }
  }, [checklistId]);

  const handleDownloadPdf = async () => {
    try {
      const response = await axiosInstance.get(`/api/checklists/${checklistId}/download-pdf`, {
        responseType: 'blob'
      });
      
      // Crear un objeto URL para el blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `checklist-${checklistId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error al descargar el PDF:', err);
      alert('Error al descargar el PDF. Por favor, intente nuevamente.');
    }
  };

  const handleBackToDetail = () => {
    if (checklist && checklist.checklist_type_id) {
      router.push(`/checklists/detail/${checklist.checklist_type_id}`);
    } else {
      router.push('/dashboard');
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists', href: '/dashboard' },
    { label: checklist?.type?.name || 'Detalle de Checklist', 
      href: checklist?.checklist_type_id ? `/checklists/detail/${checklist.checklist_type_id}` : undefined },
    { label: `Checklist ${formatLocalDate(checklist?.date)}` },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
            <div className="text-red-500 text-center">
              <p>{error}</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!checklist) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
            <div className="text-center">
              <p className="text-gray-600">No se encontró el checklist solicitado.</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <ChecklistHeader 
          pageTitle={`${checklist.type?.name || 'Checklist'} - ${formatLocalDate(checklist.date)}`} 
          breadcrumbItems={breadcrumbItems} 
        />
        
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Información del checklist */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Información del Checklist</h2>
              <div className="space-x-2">
                <button 
                  onClick={handleBackToDetail}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Volver
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Descargar PDF
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium">{formatLocalDate(checklist.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Creado por</p>
                <p className="font-medium">{checklist.creator?.user_name || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">{checklist.type?.name || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className="font-medium">
                  {checklist.completed ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completado
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      En progreso
                    </span>
                  )}
                </p>
              </div>
              {checklist.inspectable && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Elemento inspeccionado</p>
                  <p className="font-medium">{checklist.inspectable.name || 'No disponible'}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Respuestas del checklist */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Respuestas</h2>
            
            {checklist.responses && checklist.responses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Respuesta</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comentario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {checklist.responses.map((response) => (
                      <tr key={response.checklist_response_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {response.item?.question_text || 'No disponible'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {response.response_type === 'radio' ? (
                            response.response_value === 'cumple' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Cumple
                              </span>
                            ) : response.response_value === 'no_cumple' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                No Cumple
                              </span>
                            ) : response.response_value === 'observacion' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Observación
                              </span>
                            ) : (
                              response.response_value
                            )
                          ) : (
                            response.response_value
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {response.comment || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay respuestas registradas</p>
            )}
          </div>
          
          {/* Firmas */}
          {checklist.signatures && checklist.signatures.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Firmas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {checklist.signatures.map((signature) => (
                  <div key={signature.checklist_signature_id} className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Firmado por</p>
                    <p className="font-medium">{signature.user?.user_name || 'No disponible'}</p>
                    <p className="text-sm text-gray-500 mt-2">Fecha</p>
                    <p className="font-medium">{formatLocalDate(signature.created_at)}</p>
                    {signature.signature_image && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Firma</p>
                        <img 
                          src={signature.signature_image} 
                          alt="Firma" 
                          className="mt-1 border rounded"
                          style={{ maxHeight: '60px' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}