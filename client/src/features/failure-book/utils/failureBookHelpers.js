export const RESOLVED_STATUSES = ['RESUELTA', 'CANCELADO'];

export const DEFAULT_FILTERS = {
  severity: 'all',
  assigned_to: 'all',
  hasWorkOrder: 'all',
  hasParts: 'all',
  checklistTypeId: 'all',
  year: 'all',
  month: 'all'
};

export const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos los meses' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

export function getYearOptions(yearsBack = 6) {
  const current = new Date().getFullYear();
  const options = [{ value: 'all', label: 'Todos los años' }];
  for (let y = current; y >= current - yearsBack; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}

export const PAGE_SIZE = 30;

export const DONUT_COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

export const isFailureActive = (failure) => {
  if (!failure?.workOrder) return true;
  return !RESOLVED_STATUSES.includes(failure.workOrder.status);
};

export const buildGroupedSuggestions = (query, failuresList) => {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return { devices: [], failures: [], technicians: [] };

  const deviceMap = new Map();
  const techMap = new Map();
  const failureMatches = [];
  const seenFailureIds = new Set();

  failuresList.forEach((f) => {
    const deviceName = f.affectedInspectable?.name;
    if (deviceName?.toLowerCase().includes(q)) {
      const entry = deviceMap.get(deviceName) || { name: deviceName, active: 0, total: 0 };
      entry.total += 1;
      if (isFailureActive(f)) entry.active += 1;
      deviceMap.set(deviceName, entry);
    }

    const failureId = f.failure_order_id || `OF-${f.id}`;
    const desc = f.description || '';
    if (
      (desc.toLowerCase().includes(q) || failureId.toLowerCase().includes(q)) &&
      !seenFailureIds.has(failureId)
    ) {
      seenFailureIds.add(failureId);
      failureMatches.push({
        id: failureId,
        label: desc.length > 42 ? `${desc.slice(0, 42)}...` : desc,
        searchValue: desc.length > 60 ? desc.slice(0, 60) : desc || id
      });
    }

    const reporterName = f.reporter?.user_name;
    if (reporterName?.toLowerCase().includes(q)) {
      const entry = techMap.get(reporterName) || { name: reporterName, reported: 0 };
      entry.reported += 1;
      techMap.set(reporterName, entry);
    }

    const resolverName = f.workOrder?.resolver?.user_name;
    if (resolverName?.toLowerCase().includes(q)) {
      const entry = techMap.get(resolverName) || { name: resolverName, reported: 0, resolved: 0 };
      entry.resolved = (entry.resolved || 0) + 1;
      techMap.set(resolverName, entry);
    }
  });

  return {
    devices: Array.from(deviceMap.values()).sort((a, b) => b.active - a.active).slice(0, 5),
    failures: failureMatches.slice(0, 5),
    technicians: Array.from(techMap.values()).slice(0, 5)
  };
};

export const hasActiveFilters = (searchQuery, filters, activeTab) =>
  Boolean(searchQuery) ||
  filters.severity !== 'all' ||
  filters.assigned_to !== 'all' ||
  filters.hasWorkOrder !== 'all' ||
  filters.hasParts !== 'all' ||
  filters.checklistTypeId !== 'all' ||
  filters.year !== 'all' ||
  filters.month !== 'all' ||
  activeTab !== 'all';

export function appendBookQueryParams(params, { activeTab, filters, searchQuery }) {
  const map = {
    status: activeTab === 'all' ? 'all' : activeTab,
    severity: filters?.severity,
    assigned_to: filters?.assigned_to,
    hasWorkOrder: filters?.hasWorkOrder,
    hasParts: filters?.hasParts,
    checklistTypeId: filters?.checklistTypeId,
    year: filters?.year,
    month: filters?.month,
    searchQuery: searchQuery?.trim()
  };

  Object.entries(map).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      params.set(key, value);
    }
  });
}
