'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ChecklistHeader from '../../../components/checklist/components/ChecklistHeader';
import { CHECKLIST_TYPES } from '../../../components/checklist/config/checklistTypes.config';

const AttractionIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function AttractionChecklistIndex() {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists de Atracción' },
  ];

  const checklistTypeConfig = CHECKLIST_TYPES.attraction;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
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
                <p className="font-medium">{checklistTypeConfig.frequency}</p>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">¿Cómo usar los Checklists de Atracción?</h2>
            <div className="space-y-4 text-gray-700">
              <p>1. Selecciona el tipo de checklist específico que necesitas revisar</p>
              <p>2. El checklist se creará automáticamente para el día actual</p>
              <p>3. Completa cada ítem con la respuesta correspondiente (Cumple, Observación, No Cumple)</p>
              <p>4. Añade comentarios y evidencia cuando sea necesario</p>
              <p>5. Firma el checklist cuando esté completo</p>
            </div>
          </div>

          {/* Enlace para volver al dashboard */}
          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}