'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ChecklistHeader from '../../../components/checklist/components/ChecklistHeader';
import { CHECKLIST_TYPES } from '../../../components/checklist/config/checklistTypes.config';

const PremiosIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function PremiosChecklistIndex() {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Checklists de Premios' },
  ];

  const checklistTypeConfig = CHECKLIST_TYPES.premios;

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
              <p>1. Los checklists de premios tienen un propósito específico para registro de datos especiales</p>
              <p>2. Completa el checklist con las respuestas correspondientes</p>
              <p>3. Utiliza la acción "Registrar Datos de Premios" para añadir información específica</p>
              <p>4. El historial de estos checklists se maneja de forma especial en el sistema</p>
              <p>5. Añade comentarios y evidencia cuando sea necesario</p>
              <p>6. Firma el checklist cuando esté completo</p>
            </div>
          </div>

          {/* Enlace para volver al dashboard */}
          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}