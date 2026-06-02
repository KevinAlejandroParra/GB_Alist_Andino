'use client';

export default function FailurePagination({ currentPage, totalPages, total, onPageChange, loading }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 px-2">
      <p className="text-xs text-gray-600">
        Página {currentPage} de {totalPages} · {total} fallas en total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <i className="fas fa-chevron-left mr-1"></i>
          Anterior
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Siguiente
          <i className="fas fa-chevron-right ml-1"></i>
        </button>
      </div>
    </div>
  );
}
