'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ChecklistHeader from '../../../components/checklist/components/ChecklistHeader';
import { CHECKLIST_TYPES } from '../../../components/checklist/config/checklistTypes.config';
import axiosInstance from '../../../utils/axiosConfig';
import Swal from 'sweetalert2';
import { useAuth } from '../../../components/AuthContext';

const PremiosIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function PremiosChecklistIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists de Premios' },
  ];

  const checklistTypeConfig = CHECKLIST_TYPES.premios;

  const handleOpenAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axiosInstance.get(
        [1, 2].includes(user?.role_id)
          ? '/api/checklist-types'
          : `/api/checklist-types?role_id=${user?.role_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const types = res.data || [];
      const premiosType = types.find((t) => String(t.name || '').toLowerCase().includes('premios'));
      if (!premiosType) {
        Swal.fire({ title: 'No encontrado', text: 'No se encontró el tipo de checklist de premios.', icon: 'warning', confirmButtonText: 'Entendido' });
        return;
      }
      router.push(`/checklists/premios/${premiosType.checklist_type_id}/analytics`);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo acceder al análisis de premios.', icon: 'error', confirmButtonText: 'Entendido' });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <ChecklistHeader 
          pageTitle={checklistTypeConfig.displayName}
          breadcrumbItems={breadcrumbItems}
          icon={checklistTypeConfig.ui.icon}
        />
        
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Información del tipo */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Información del Tipo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="font-medium">{checklistTypeConfig.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Frecuencia</p>
                <p className="font-medium">Según necesidad</p>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">¿Cómo usar los Checklists de Premios?</h2>
            <div className="space-y-4 text-gray-700">
              <p>1. Completa el checklist semanal registrando en cada máquina sus 3 datos:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-gray-600">
                <li><strong>JUGADAS</strong>: lectura del contador de jugadas.</li>
                <li><strong>PREMIOS</strong>: lectura del contador de premios.</li>
                <li><strong>CONFIGURACION DE LA MAQUINA</strong>: texto libre con la configuración actual (potenciómetro/ohm, facil/medio/dificil, etc.).</li>
              </ul>
              <p>2. El sistema calcula automáticamente los premios entregados desde la última lectura y la eficiencia según la configuración del ratio maestro.</p>
              <p>3. Firma el checklist cuando esté completo.</p>
            </div>
          </div>

          {/* Enlace al análisis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Análisis de Premios</h2>
            <p className="text-gray-600 mb-4">
              Revisa jugadas, premios entregados, configuración por máquina, gráficas de eficiencia y el historial exportable.
            </p>
            <button
              onClick={handleOpenAnalytics}
              disabled={loadingAnalytics}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {loadingAnalytics ? 'Cargando...' : 'Ir al Análisis de Premios'}
            </button>
          </div>

          {/* Enlace para volver al dashboard */}
          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-all"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
