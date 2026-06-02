'use client';

import Swal from 'sweetalert2';
import { downloadFailureBookExcel } from '../../../utils/failureBookApi';

const PROGRESS_HTML = `
<div class="text-left w-full min-w-[280px]">
  <p id="export-phase" class="text-sm text-gray-700 mb-3 font-medium">Iniciando exportación…</p>
  <div class="w-full h-3 rounded-full bg-gray-200 overflow-hidden shadow-inner">
    <div id="export-progress-bar" class="h-full rounded-full transition-all duration-300 ease-out"
      style="width:0%; background: linear-gradient(90deg, #059669, #10b981);"></div>
  </div>
  <p id="export-percent" class="text-xs text-gray-500 mt-2 text-right font-semibold">0%</p>
</div>
`;

function updateProgressBar(percent, phase) {
  const bar = document.getElementById('export-progress-bar');
  const pct = document.getElementById('export-percent');
  const ph = document.getElementById('export-phase');
  const safe = Math.min(100, Math.max(0, Math.round(percent)));
  if (bar) bar.style.width = `${safe}%`;
  if (pct) pct.textContent = `${safe}%`;
  if (ph && phase) ph.textContent = phase;
}

function openProgressModal() {
  Swal.fire({
    title: 'Exportando libro de fallas',
    html: PROGRESS_HTML,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      updateProgressBar(5, 'Conectando con el servidor…');
    }
  });
}

/**
 * Exportación Excel con barra de progreso.
 */
export async function runFailureBookExport({
  activeTab = 'all',
  filters = {},
  searchQuery = '',
  respectFilters = false
} = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  if (!token) {
    await Swal.fire({
      title: 'Sesión requerida',
      text: 'Debes iniciar sesión para exportar el libro de fallas.',
      icon: 'warning',
      confirmButtonColor: '#7c3aed'
    });
    return;
  }

  openProgressModal();

  try {
    await downloadFailureBookExcel({
      activeTab,
      filters,
      searchQuery,
      respectFilters,
      onProgress: updateProgressBar
    });

    Swal.close();
    await Swal.fire({
      title: 'Descarga completada',
      text: 'El reporte Excel debería estar en su carpeta de descargas.',
      icon: 'success',
      confirmButtonColor: '#7c3aed',
      timer: 4000
    });
  } catch (error) {
    const status = error.response?.status;
    let message = error.message;

    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        message = json.error?.message || json.message || message;
      } catch {
        /* noop */
      }
    }

    Swal.close();

    if (status === 401) {
      return;
    }

    await Swal.fire({
      title: 'Error al exportar',
      html: `<p>${message || 'No se pudo generar el reporte.'}</p>`,
      icon: 'error',
      confirmButtonColor: '#7c3aed'
    });
  }
}
