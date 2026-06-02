'use client';

import { hasActiveFilters, MONTH_OPTIONS, getYearOptions } from '../utils/failureBookHelpers';

export default function FailureFiltersPanel({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  checklistTypes,
  searchQuery,
  activeTab,
  onClearFilters
}) {
  const showClear = hasActiveFilters(searchQuery, filters, activeTab);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative">
      <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
        {[
          { id: 'status', icon: 'fa-clipboard-check', label: 'Estado OT' },
          { id: 'checklist', icon: 'fa-file-invoice', label: 'Checklist' },
          { id: 'device', icon: 'fa-cogs', label: 'Dispositivo' }
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onViewModeChange(mode.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              viewMode === mode.id
                ? 'bg-white text-purple-700 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fas ${mode.icon} text-[10px]`}></i>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-100">
        <FilterSelect
          label="Año"
          value={filters.year}
          onChange={(v) => onFiltersChange({ year: v, month: v === 'all' ? 'all' : filters.month })}
        >
          {getYearOptions().map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Mes"
          value={filters.month}
          onChange={(v) => onFiltersChange({ month: v })}
          disabled={filters.year === 'all'}
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Tipo de Checklist"
          value={filters.checklistTypeId}
          onChange={(v) => onFiltersChange({ checklistTypeId: v })}
          className="col-span-2 md:col-span-3 lg:col-span-1"
        >
          <option value="all">Todos los checklists</option>
          {checklistTypes.map((type) => (
            <option key={type.checklist_type_id} value={type.checklist_type_id}>
              {type.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Severidad" value={filters.severity} onChange={(v) => onFiltersChange({ severity: v })}>
          <option value="all">Todas las Severidades</option>
          <option value="LEVE">Leve</option>
          <option value="MODERADA">Moderada</option>
          <option value="CRITICA">Crítica</option>
        </FilterSelect>

        <FilterSelect label="Área Asignada" value={filters.assigned_to} onChange={(v) => onFiltersChange({ assigned_to: v })}>
          <option value="all">Todos los Responsables</option>
          <option value="TECNICA">Técnica</option>
          <option value="OPERATIVA">Operativa</option>
        </FilterSelect>

        <FilterSelect label="Tiene Orden Trabajo" value={filters.hasWorkOrder} onChange={(v) => onFiltersChange({ hasWorkOrder: v })}>
          <option value="all">Ver Todas</option>
          <option value="true">Con Orden de Trabajo</option>
          <option value="false">Sin Orden de Trabajo</option>
        </FilterSelect>

        <FilterSelect label="Tiene Repuestos" value={filters.hasParts} onChange={(v) => onFiltersChange({ hasParts: v })}>
          <option value="all">Ver Todas</option>
          <option value="true">Con Repuestos</option>
          <option value="false">Sin Repuestos</option>
        </FilterSelect>
      </div>

      {showClear && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all"
          >
            <i className="fas fa-trash-alt mr-1"></i>
            Restablecer Filtros
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children, className = '', disabled = false }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
      >
        {children}
      </select>
    </div>
  );
}
