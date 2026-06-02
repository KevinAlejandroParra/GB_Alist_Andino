'use client';

export default function FailureEmptyState() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
      <i className="fas fa-circle-info text-gray-400 text-4xl mb-4"></i>
      <h3 className="text-md font-semibold text-gray-700">No se encontraron fallas</h3>
      <p className="text-gray-500 text-xs mt-1">Ajusta los filtros o escribe un término diferente para encontrar coincidencias.</p>
    </div>
  );
}

export function FailureLoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-gray-500 text-sm">Cargando libro de fallas...</p>
    </div>
  );
}
