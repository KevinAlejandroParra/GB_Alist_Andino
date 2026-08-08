'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import ProtectedRoute from '../../../../../components/ProtectedRoute'
import PremiosDashboard from '../../../../../components/premios/PremiosDashboard'

export default function PremiosAnalyticsPage() {
  const params = useParams()
  const { checklistTypeId } = params

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Análisis de Premios</h1>
                <p className="text-gray-600 mt-1">
                  Control de jugadas, premios entregados y configuración por máquina de premios.
                </p>
              </div>
            </div>
          </div>
          <PremiosDashboard checklistTypeId={checklistTypeId} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
