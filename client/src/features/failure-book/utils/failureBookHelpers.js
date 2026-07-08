export const RESOLVED_STATUSES = ['RESUELTA', 'CANCELADO'];

export const DEFAULT_FILTERS = {
  checklistTypeId: 'all',
  year: 'all',
  month: 'all',
  day: 'all',
  week: 'all'
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

export function isWeeklyFrequency(frequency) {
  const f = (frequency || '').toLowerCase().trim();
  return f === 'weekly' || f === 'semanal';
}

export function getSelectedChecklistType(checklistTypes, checklistTypeId) {
  if (!checklistTypeId || checklistTypeId === 'all') return null;
  return (
    checklistTypes.find((t) => String(t.checklist_type_id) === String(checklistTypeId)) || null
  );
}

export function usesWeekPeriod(checklistTypes, checklistTypeId) {
  const type = getSelectedChecklistType(checklistTypes, checklistTypeId);
  return type ? isWeeklyFrequency(type.frequency) : false;
}

export function getYearOptions(yearsBack = 6) {
  const current = new Date().getFullYear();
  const options = [{ value: 'all', label: 'Todos los años' }];
  for (let y = current; y >= current - yearsBack; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}

export function getDayOptions(year, month) {
  const options = [{ value: 'all', label: 'Todos los días' }];
  if (year === 'all' || month === 'all') return options;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) return options;

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    options.push({ value: String(d), label: String(d) });
  }
  return options;
}

const APP_TIMEZONE = 'America/Bogota';
const BOGOTA_UTC_OFFSET_HOURS = 5;
const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getCalendarPartsInAppTz(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(new Date(date));

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    dayOfWeek: WEEKDAY_MAP[get('weekday')] ?? 0,
  };
}

function addCalendarDays(year, month, day, delta) {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function bogotaStartOfDayUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, BOGOTA_UTC_OFFSET_HOURS, 0, 0, 0));
}

function getMondayOfWeekAppTz(date) {
  const { year, month, day, dayOfWeek } = getCalendarPartsInAppTz(date);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addCalendarDays(year, month, day, diff);
  return bogotaStartOfDayUtc(monday.year, monday.month, monday.day);
}

function getWeekIdentifierAppTz(date) {
  const monday = getMondayOfWeekAppTz(date);
  const mondayParts = getCalendarPartsInAppTz(monday);
  const year = mondayParts.year;

  const startOfYear = bogotaStartOfDayUtc(year, 1, 1);
  let firstMonday = getMondayOfWeekAppTz(startOfYear);
  const firstMondayParts = getCalendarPartsInAppTz(firstMonday);

  if (firstMondayParts.year < year) {
    const adjusted = addCalendarDays(firstMondayParts.year, firstMondayParts.month, firstMondayParts.day, 7);
    firstMonday = bogotaStartOfDayUtc(adjusted.year, adjusted.month, adjusted.day);
  }

  const weekNumber =
    Math.floor((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function getSundayOfWeekAppTz(monday) {
  const mondayParts = getCalendarPartsInAppTz(monday);
  const sunday = addCalendarDays(mondayParts.year, mondayParts.month, mondayParts.day, 6);
  return new Date(Date.UTC(sunday.year, sunday.month - 1, sunday.day + 1, BOGOTA_UTC_OFFSET_HOURS - 1, 59, 59, 999));
}

function formatWeekRangeLabel(monday, sunday) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const startParts = getCalendarPartsInAppTz(monday);
  const endParts = getCalendarPartsInAppTz(sunday);
  return `${days[startParts.dayOfWeek]} ${startParts.day} ${months[startParts.month - 1]} – ${days[endParts.dayOfWeek]} ${endParts.day} ${months[endParts.month - 1]}`;
}

export function getWeekOptionsForMonth(year, month) {
  const options = [{ value: 'all', label: 'Todas las semanas' }];
  if (year === 'all' || month === 'all') return options;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1;
  if (Number.isNaN(y) || Number.isNaN(m)) return options;

  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const seen = new Map();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(y, m, d, 12, 0, 0));
    const weekId = getWeekIdentifierAppTz(date);
    if (seen.has(weekId)) continue;
    const monday = getMondayOfWeekAppTz(date);
    const sunday = getSundayOfWeekAppTz(monday);
    const weekNum = weekId.split('-W')[1];
    seen.set(weekId, {
      value: weekId,
      label: `Semana ${weekNum} (${formatWeekRangeLabel(monday, sunday)})`
    });
  }

  return [...options, ...Array.from(seen.values())];
}

export function isHistoricalPeriodComplete(filters, checklistTypes) {
  const weekly = usesWeekPeriod(checklistTypes, filters.checklistTypeId);
  if (filters.year === 'all' || filters.month === 'all') return false;
  if (weekly) return filters.week !== 'all';
  return filters.day !== 'all';
}

export function describeHistoricalPeriod(filters, checklistTypes) {
  if (!isHistoricalPeriodComplete(filters, checklistTypes)) return null;
  const weekly = usesWeekPeriod(checklistTypes, filters.checklistTypeId);
  const monthName = MONTH_OPTIONS.find((o) => o.value === filters.month)?.label || filters.month;

  if (weekly && filters.week !== 'all') {
    const opt = getWeekOptionsForMonth(filters.year, filters.month).find((o) => o.value === filters.week);
    return opt?.label || filters.week;
  }
  if (filters.day !== 'all') {
    return `${filters.day} de ${monthName} ${filters.year}`;
  }
  return null;
}

export const PAGE_SIZE = 30;

export const DONUT_COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

export const isFailureActive = (failure) => {
  const status = failure?.repairExecution?.status || failure?.workOrder?.status || null;
  if (!status) return true;
  return !RESOLVED_STATUSES.includes(status);
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
  filters.checklistTypeId !== 'all' ||
  filters.year !== 'all' ||
  filters.month !== 'all' ||
  filters.day !== 'all' ||
  filters.week !== 'all' ||
  activeTab !== 'all';

export function appendBookQueryParams(params, { activeTab, filters, searchQuery }) {
  const map = {
    status: activeTab === 'all' ? 'all' : activeTab,
    checklistTypeId: filters?.checklistTypeId,
    year: filters?.year,
    month: filters?.month,
    day: filters?.day,
    week: filters?.week,
    searchQuery: searchQuery?.trim()
  };

  Object.entries(map).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      params.set(key, value);
    }
  });
}
