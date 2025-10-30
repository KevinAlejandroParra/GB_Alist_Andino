'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../components/AuthContext';
import ChecklistHeader from '../../../../components/checklist/components/ChecklistHeader';
import FailureList from '../../../../components/checklist/FailureList';
import HistorySection from '../../../../components/checklist/HistorySection';
import ResolvedFailuresHistory from '../../../../components/checklist/ResolvedFailuresHistory';
import axiosInstance from '../../../../utils/axiosConfig';
import { formatLocalDate, formatLocalDateTime } from '../../../../utils/dateUtils';

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { checklistTypeId } = params;
  const { user } = useAuth();
  
  const [checklistType, setChecklistType] = useState(null);
  const [todayChecklist, setTodayChecklist] = useState(null);
  const [checklistHistory, setChecklistHistory] = useState([]);
  const [failures, setFailures] = useState([]);
  const [resolvedFailures, setResolvedFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedHistoricalChecklists, setExpandedHistoricalChecklists] = useState({});
  const [downloading, setDownloading] = useState(null);

  const fetchChecklistData = async () => {
    try {
      setLoading(true);
      
      const [typeResponse, historyResponse, failuresResponse, resolvedFailuresResponse] = await Promise.all([
        axiosInstance.get(`/api/checklist-types/${checklistTypeId}`),
        axiosInstance.get(`/api/checklists/type/${checklistTypeId}/history`),
        axiosInstance.get(`/api/work-orders/by-type/${checklistTypeId}`),
        axiosInstance.get(`/api/work-orders/resolved/by-type/${checklistTypeId}`)
      ]);

      setChecklistType(typeResponse.data);
      setFailures(failuresResponse.data?.data || []);
      setResolvedFailures(resolvedFailuresResponse.data?.data || []);
      
      if (historyResponse.data && historyResponse.data.length > 0) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const todayChecklist = historyResponse.data.find(checklist =>
          checklist.createdAt.split('T')[0] === today
        );
        if (todayChecklist) {
          setTodayChecklist(todayChecklist);
        }
      }
      
      setChecklistHistory(historyResponse.data);
    } catch (err) {
      console.error('Error al cargar datos del checklist:', err);
      setError('Error al cargar los datos del checklist. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checklistTypeId && user && user.token) {
      fetchChecklistData();
    }
  }, [checklistTypeId, user]);

  const handleCreateOrEditChecklist = async () => {
    try {
      // Primero obtener el tipo real del checklist
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/checklists/type/${checklistTypeId}/details`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      const checklistTypeData = response.data;
      const typeCategory = checklistTypeData?.type_category;
      
      // Redirigir según el tipo real del checklist
      switch (typeCategory) {
        case 'attraction':
          router.push(`/checklists/attraction/${checklistTypeId}`);
          break;
        case 'family':
          router.push(`/checklists/family/${checklistTypeId}`);
          break;
        case 'premios':
        case 'specific':
          router.push(`/checklists/premios/${checklistTypeId}`);
          break;
        default:
          console.warn(`Tipo de checklist desconocido: ${typeCategory}`);
          // Fallback a atracción por compatibilidad
          router.push(`/checklists/attraction/${checklistTypeId}`);
          break;
      }
    } catch (error) {
      console.error("Error al obtener el tipo de checklist:", error);
      // En caso de error, usar el comportamiento anterior
      router.push(`/checklists/attraction/${checklistTypeId}`);
    }
  };

  const handleViewHistoricChecklist = (checklistId) => {
    router.push(`/checklists/view/${checklistId}`);
  };

  const toggleHistoricalChecklist = (checklistId) => {
    setExpandedHistoricalChecklists(prev => ({
      ...prev,
      [checklistId]: !prev[checklistId]
    }));
  };

  const handleDownload = async (checklistId, date) => {
    if (!user || !user.token) {
      alert('No estás autenticado. Por favor, inicia sesión de nuevo.');
      return;
    }

    setDownloading(checklistId);
    try {
      const response = await axiosInstance.get(`/api/checklists/${checklistId}/download`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const formattedDate = new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      link.download = `checklist-${checklistType?.name}-${formattedDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar el PDF:', err);
      setError('No se pudo descargar el PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists' },
    { label: checklistType?.name || 'Detalle de Checklist' },
  ];

  if (loading || !user) {
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <ChecklistHeader pageTitle={checklistType?.name || 'Detalle de Checklist'} breadcrumbItems={breadcrumbItems} />
        
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Información del tipo de checklist */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Información del Checklist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Tipo</p><p className="font-medium">{checklistType?.type_category || 'No disponible'}</p></div>
                <div><p className="text-sm text-gray-500">Frecuencia</p><p className="font-medium">{checklistType?.frequency || 'No disponible'}</p></div>
                <div className="md:col-span-2"><p className="text-sm text-gray-500">Descripción</p><p className="font-medium">{checklistType?.description || 'Sin descripción'}</p></div>
            </div>
          </div>
          
          {/* Instancia de hoy o botón para crear */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Checklist de Hoy</h2>
            {todayChecklist ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-green-700 font-medium">Ya existe un checklist para hoy</p>
                    <p className="text-sm text-gray-600">Creado: {formatLocalDate(todayChecklist.createdAt)}</p>
                    {todayChecklist.completed && <p className="text-sm text-green-600 font-medium mt-1">✓ Completado</p>}
                  </div>
                  <button onClick={handleCreateOrEditChecklist} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    {todayChecklist.completed ? 'Ver Checklist' : 'Continuar Checklist'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-700">Ingresar a diligenciar el checklist</p>
                  <button onClick={handleCreateOrEditChecklist} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Crear Checklist
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fallas Activas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Fallas Activas ({failures.length})</h2>
            <p className="text-sm text-gray-600 mb-4">Fallas reportadas que aún están pendientes de resolución o en proceso.</p>
            <FailureList failures={failures} />
          </div>

          {/* Historial de Fallas Resueltas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Fallas Resueltas ({resolvedFailures.length})</h2>
            <p className="text-sm text-gray-600 mb-4">Historial completo de fallas que han sido resueltas o cerradas.</p>
            <ResolvedFailuresHistory resolvedFailures={resolvedFailures} />
          </div>

          {/* Historial de Checklists */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <HistorySection
              historicalChecklists={checklistHistory}
              expandedHistoricalChecklists={expandedHistoricalChecklists}
              onToggleExpand={toggleHistoricalChecklist}
              onDownload={handleDownload}
              onView={handleViewHistoricChecklist}
              downloading={downloading}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
