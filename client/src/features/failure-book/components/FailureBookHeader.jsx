'use client';

import { useState } from 'react';
import { runFailureBookExport } from '../utils/runFailureBookExport';
import { hasActiveFilters as checkActiveFilters } from '../utils/failureBookHelpers';

export default function FailureBookHeader({
  loading,
  currentPage,
  pagination,
  totalInDb,
  showCharts,
  onToggleCharts,
  onRefresh,
  onCreate,
  activeTab = 'all',
  filters = {},
  searchQuery = ''
}) {
  const [exporting, setExporting] = useState(false);

  const showing = pagination?.total
    ? `${pagination.total} fallas en vista · Pág. ${currentPage || pagination.page || 1}`
    : `${totalInDb} fallas registradas`;

  const filtersActive = checkActiveFilters(searchQuery, filters, activeTab);

  const handleExportClick = (respectFilters) => {
    if (exporting) return;

    setExporting(true);
    runFailureBookExport({
      activeTab,
      filters,
      searchQuery,
      respectFilters
    }).finally(() => {
      setExporting(false);
    });
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
            <i className="fas fa-book text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Libro de Fallas
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Unificado
              </span>
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {loading ? 'Cargando fallas...' : `${showing} · Todos los roles`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleCharts}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
              showCharts
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-chart-pie"></i>
            {showCharts ? 'Ocultar Estadísticas' : 'Ver Estadísticas'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all text-xs font-semibold text-gray-600 flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
            Actualizar
          </button>

          <button
            type="button"
            id="failure-book-export-excel"
            data-action="export-failure-book-excel"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExportClick(false);
            }}
            disabled={exporting}
            title="Reporte completo del parque (todas las fallas y equipos)"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 shadow-sm cursor-pointer"
          >
            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i>
            {exporting ? 'Generando…' : 'Descargar Excel'}
          </button>

          {filtersActive && (
            <button
              type="button"
              data-action="export-failure-book-excel-filtered"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExportClick(true);
              }}
              disabled={exporting}
              title="Solo fallas que coinciden con los filtros actuales"
              className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <i className="fas fa-filter text-[10px]"></i>
              Excel filtrado
            </button>
          )}

          <button
            type="button"
            onClick={onCreate}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white transition-all text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            <i className="fas fa-plus"></i>
            Nueva Falla
          </button>
        </div>
      </div>
    </div>
  );
}
