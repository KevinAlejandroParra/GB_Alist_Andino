'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../components/AuthContext';
import ChecklistHeader from '../../../../components/checklist/components/ChecklistHeader';
import HistorySection from '../../../../components/checklist/HistorySection';
import axiosInstance from '../../../../utils/axiosConfig';
import { formatLocalDate } from '../../../../utils/dateUtils';

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { checklistTypeId } = params;
  const { user } = useAuth();
  
  const [checklistType, setChecklistType] = useState(null);
  const [todayChecklist, setTodayChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChecklistData = async () => {
    try {
      setLoading(true);
      
      const [typeResponse, latestResponse] = await Promise.all([
        axiosInstance.get(`/api/checklists/type/${checklistTypeId}/details`),
        axiosInstance.get(`/api/checklists/type/${checklistTypeId}/latest`).catch(() => null),
      ]);

      setChecklistType(typeResponse.data);

      if (latestResponse?.data?.checklist_id) {
        setTodayChecklist(latestResponse.data);
      }
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
        case 'static':
          router.push(`/checklists/locativo/${checklistTypeId}`);
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {checklistType?.frequency?.toLowerCase() === 'semanal' || checklistType?.frequency?.toLowerCase() === 'weekly' 
                ? 'Checklist de Esta Semana' 
                : 'Checklist de Hoy'}
            </h2>
            {todayChecklist ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-green-700 font-medium">
                      {checklistType?.frequency?.toLowerCase() === 'semanal' || checklistType?.frequency?.toLowerCase() === 'weekly'
                        ? 'Ya existe un checklist para esta semana'
                        : 'Ya existe un checklist para hoy'}
                    </p>
                    <p className="text-sm text-gray-600">Creado: {formatLocalDate(todayChecklist.createdAt)}</p>
                    {todayChecklist.week_identifier && (
                      <p className="text-sm text-gray-600">Semana: {todayChecklist.week_identifier}</p>
                    )}
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
                  <p className="text-gray-700">
                    {checklistType?.frequency?.toLowerCase() === 'semanal' || checklistType?.frequency?.toLowerCase() === 'weekly'
                      ? 'Ingresar a diligenciar el checklist semanal'
                      : 'Ingresar a diligenciar el checklist'}
                  </p>
                  <button onClick={handleCreateOrEditChecklist} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Crear Checklist
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Libro de Fallas — Banner de acceso directo */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-book-medical text-purple-600" />
                  Libro de Fallas
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Consulta, filtra y gestiona todas las fallas asociadas a este checklist desde el libro unificado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/fallas?checklistTypeId=${checklistTypeId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-sm shrink-0"
              >
                <i className="fas fa-book-open" />
                Abrir Libro de Fallas
                <i className="fas fa-arrow-right text-xs opacity-75" />
              </button>
            </div>
          </div>

          {/* Historial de Checklists */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <HistorySection checklistTypeId={checklistTypeId} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
