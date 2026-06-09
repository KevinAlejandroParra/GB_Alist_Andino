'use client';

import {
  hasActiveFilters,
  MONTH_OPTIONS,
  getYearOptions,
  getDayOptions,
  getWeekOptionsForMonth,
  usesWeekPeriod,
  describeHistoricalPeriod,
  isHistoricalPeriodComplete
} from '../utils/failureBookHelpers';

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
  const isWeekly = usesWeekPeriod(checklistTypes, filters.checklistTypeId);
  const dayOptions = getDayOptions(filters.year, filters.month);
  const weekOptions = getWeekOptionsForMonth(filters.year, filters.month);
  const historicalLabel = describeHistoricalPeriod(filters, checklistTypes);
  const checklistSelected = filters.checklistTypeId !== 'all';
  const showHistoricalHint =
    checklistSelected &&
    filters.year !== 'all' &&
    filters.month !== 'all' &&
    !isHistoricalPeriodComplete(filters, checklistTypes);

  const handleChecklistChange = (checklistTypeId) => {
    onFiltersChange({
      checklistTypeId,
      day: 'all',
      week: 'all'
    });
  };

  const handleYearChange = (year) => {
    onFiltersChange({
      year,
      month: year === 'all' ? 'all' : filters.month,
      day: 'all',
      week: 'all'
    });
  };

  const handleMonthChange = (month) => {
    onFiltersChange({
      month,
      day: 'all',
      week: 'all'
    });
  };

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

      <p className="mt-4 text-xs text-gray-500">
        Elige primero el tipo de checklist, luego el período. Al seleccionar día o semana verás las fallas que
        estaban activas al cierre de ese momento (igual que en el PDF del checklist).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-3 pt-4 border-t border-gray-100">
        <FilterSelect
          label="Mostrar"
          value={filters.failureType}
          onChange={(v) => onFiltersChange({ failureType: v })}
          className="col-span-2 md:col-span-1"
        >
          <option value="all">Todas las fallas</option>
          <option value="ar">Actas de Reparación</option>
          <option value="ot">Órdenes de Trabajo</option>
        </FilterSelect>

        <FilterSelect
          label="Tipo de checklist"
          value={filters.checklistTypeId}
          onChange={handleChecklistChange}
          className="col-span-2 md:col-span-1"
        >
          <option value="all">Todos los checklists</option>
          {checklistTypes.map((type) => (
            <option key={type.checklist_type_id} value={type.checklist_type_id}>
              {type.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Año"
          value={filters.year}
          onChange={handleYearChange}
          disabled={!checklistSelected}
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
          onChange={handleMonthChange}
          disabled={!checklistSelected || filters.year === 'all'}
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>

        {isWeekly ? (
          <FilterSelect
            label="Semana"
            value={filters.week}
            onChange={(v) => onFiltersChange({ week: v })}
            disabled={!checklistSelected || filters.year === 'all' || filters.month === 'all'}
            className="col-span-2 md:col-span-1"
          >
            {weekOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
        ) : (
          <FilterSelect
            label="Día"
            value={filters.day}
            onChange={(v) => onFiltersChange({ day: v })}
            disabled={!checklistSelected || filters.year === 'all' || filters.month === 'all'}
            className="col-span-2 md:col-span-1"
          >
            {dayOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      {historicalLabel && (
        <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-900">
          <i className="fas fa-history mr-1.5 text-indigo-600" />
          Vista histórica al cierre de: <span className="font-semibold">{historicalLabel}</span>
        </div>
      )}

      {!checklistSelected && (
        <p className="mt-2 text-[11px] text-gray-500">Selecciona un tipo de checklist para habilitar el filtro por fecha.</p>
      )}

      {showHistoricalHint && (
        <p className="mt-2 text-[11px] text-amber-700">
          Selecciona {isWeekly ? 'la semana' : 'el día'} para activar la vista histórica. Con solo año y mes verás
          fallas reportadas en ese mes.
        </p>
      )}

      {showClear && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all"
          >
            <i className="fas fa-trash-alt mr-1"></i>
            Restablecer filtros
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
