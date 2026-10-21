'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useMaintenanceCalendar } from './hooks/useMaintenanceCalendar';
import MaintenanceCalendarView from './components/MaintenanceCalendarView';
import MaintenanceDayDrawer from './components/MaintenanceDayDrawer';
import MaintenanceConfigPanel from './components/MaintenanceConfigPanel';
import MaintenanceSettingsPanel from './components/MaintenanceSettingsPanel';
import MaintenanceQrPanel from './components/MaintenanceQrPanel';
import MaintenanceSessionWizard from './MaintenanceSessionWizard';

export default function MaintenanceSchedulerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'configs', 'settings', 'qrs'

    const calendar = useMaintenanceCalendar(user?.premise_id || 2);

  const isAdminOrSupport = user?.role_id === 1 || user?.role_id === 2;

  const tabs = [
    { id: 'calendar', label: 'Calendario Operativo', icon: 'fa-calendar-alt' },
    ...(isAdminOrSupport
      ? [
          { id: 'configs', label: 'Configuración Máquinas', icon: 'fa-cogs' },
          { id: 'settings', label: 'Estrategia y Capacidad', icon: 'fa-sliders-h' },
          { id: 'qrs', label: 'Códigos QR', icon: 'fa-qrcode' }
        ]
      : [])
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 sm:py-0 sm:h-16">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Volver al Dashboard"
                >
                  <i className="fas fa-arrow-left text-lg" />
                </button>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                    Cronograma de Mantenimiento Preventivo
                  </h1>
                  <p className="text-xs text-slate-500">
                    Sede Andino • Preventivo Semanal y Programado (PP)
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <i className={`fas ${tab.icon}`} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {activeTab === 'calendar' && (
            <MaintenanceCalendarView
              planData={calendar.planData}
              currentMonth={calendar.currentMonth}
              onMonthChange={calendar.setCurrentMonth}
              onGeneratePlan={calendar.generatePlan}
              onPublishPlan={calendar.publishPlan}
              loading={calendar.loading}
              onSelectSlot={(slot) => calendar.setSelectedSlot(slot)}
              onSelectDay={(dayInfo) => calendar.setSelectedDay(dayInfo)}
            />
          )}

          {activeTab === 'configs' && isAdminOrSupport && (
            <MaintenanceConfigPanel premiseId={calendar.premiseId} />
          )}

          {activeTab === 'settings' && isAdminOrSupport && (
            <MaintenanceSettingsPanel premiseId={calendar.premiseId} />
          )}

          {activeTab === 'qrs' && isAdminOrSupport && (
            <MaintenanceQrPanel premiseId={calendar.premiseId} />
          )}
        </main>

        {/* Day Detail Drawer */}
        {calendar.selectedDay && (
          <MaintenanceDayDrawer
            dayData={calendar.selectedDay}
            onClose={() => calendar.setSelectedDay(null)}
            onOpenSlotWizard={(slot) => {
              calendar.setSelectedDay(null);
              calendar.setSelectedSlot(slot);
            }}
            onDayStatusChange={calendar.refreshPlan}
          />
        )}

        {/* Slot Maintenance Wizard Modal */}
        {calendar.selectedSlot && (
          <MaintenanceSessionWizard
            slot={calendar.selectedSlot}
            onClose={() => calendar.setSelectedSlot(null)}
            onComplete={() => {
              calendar.setSelectedSlot(null);
              calendar.refreshPlan();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
