import axiosInstance from './axiosConfig';
import { appendBookQueryParams } from '../features/failure-book/utils/failureBookHelpers';

const getApiUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
  return String(raw).trim().replace(/\/$/, '');
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

function triggerBrowserDownload(blob, filename) {
  if (!blob || blob.size === 0) {
    throw new Error('El archivo recibido está vacío. Verifique que el servidor esté actualizado.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 200);
}

function parseFilenameFromDisposition(disposition) {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim());
  }
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  return match?.[1]?.trim() || null;
}

async function parseBlobError(blob) {
  try {
    const text = await blob.text();
    const data = JSON.parse(text);
    return data.error?.message || data.message || 'No se pudo generar el reporte Excel';
  } catch {
    return 'No se pudo generar el reporte Excel';
  }
}

export async function fetchFailureSuggestions(q, token, { limit = 5 } = {}) {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    allRoles: 'true'
  });

  const response = await fetch(`${getApiUrl()}/api/failures/suggest?${params}`, {
    headers: authHeaders(token)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al buscar sugerencias');
  }

  const result = await response.json();
  return result.data || { devices: [], failures: [], technicians: [] };
}

export async function fetchFailureBookStats(token, filters = {}) {
  const params = new URLSearchParams({ allRoles: 'true' });
  appendBookQueryParams(params, {
    activeTab: filters.activeTab || 'all',
    filters,
    searchQuery: filters.searchQuery
  });

  const response = await fetch(`${getApiUrl()}/api/failures/stats?${params}`, {
    headers: authHeaders(token)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al cargar estadísticas');
  }

  const result = await response.json();
  return result.data;
}

export async function fetchChecklistTypes(token) {
  const response = await fetch(`${getApiUrl()}/api/checklist-types`, {
    headers: authHeaders(token)
  });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los tipos de checklist');
  }

  return response.json();
}

export async function fetchFailuresPage(
  token,
  { page = 1, limit = 30, activeTab = 'all', filters = {}, searchQuery = '' } = {}
) {
  const params = new URLSearchParams({
    allRoles: 'true',
    page: String(page),
    limit: String(limit)
  });
  appendBookQueryParams(params, { activeTab, filters, searchQuery });

  const response = await fetch(`${getApiUrl()}/api/failures?${params}`, {
    headers: authHeaders(token)
  });

  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    err.code = 401;
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'No se pudieron cargar las fallas');
  }

  const result = await response.json();
  return {
    failures: result.data?.failures || [],
    pagination: result.data?.pagination || { page: 1, limit, total: 0 }
  };
}

export async function downloadFailureBookExcel({
  activeTab = 'all',
  filters = {},
  searchQuery = '',
  respectFilters = false,
  onProgress
} = {}) {
  const params = new URLSearchParams({ allRoles: 'true' });

  if (respectFilters) {
    params.set('respectFilters', 'true');
  }

  appendBookQueryParams(params, { activeTab, filters, searchQuery });

  let simulated = 8;
  const simTimer =
    typeof onProgress === 'function'
      ? setInterval(() => {
          simulated = Math.min(simulated + 4, 28);
          onProgress(simulated, 'Generando reporte en el servidor…');
        }, 450)
      : null;

  try {
    const response = await axiosInstance.get(`/api/failures/export/excel?${params}`, {
      responseType: 'blob',
      timeout: 300000,
      onDownloadProgress: (event) => {
        if (typeof onProgress !== 'function') return;
        if (event.total) {
          const pct = 30 + Math.round((event.loaded / event.total) * 70);
          onProgress(Math.min(pct, 99), 'Descargando archivo Excel…');
        } else if (event.loaded) {
          onProgress(45, `Recibiendo datos (${Math.round(event.loaded / 1024)} KB)…`);
        }
      }
    });

    if (simTimer) clearInterval(simTimer);

    const blob = response.data;
    const contentType = response.headers['content-type'] || blob.type || '';

    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      throw new Error(await parseBlobError(blob));
    }

    if (typeof onProgress === 'function') {
      onProgress(100, 'Guardando archivo…');
    }

    const filename =
      parseFilenameFromDisposition(response.headers['content-disposition']) ||
      `Libro_Fallas_${new Date().toISOString().slice(0, 10)}.xlsx`;

    triggerBrowserDownload(blob, filename);
  } finally {
    if (simTimer) clearInterval(simTimer);
  }
}

export async function linkFailureToWorkOrder(failureId, workOrderId, token) {
  const response = await fetch(`${getApiUrl()}/api/failures/${failureId}/link-work-order`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ work_order_id: workOrderId })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'No se pudo enlazar la falla');
  }
  return result;
}
