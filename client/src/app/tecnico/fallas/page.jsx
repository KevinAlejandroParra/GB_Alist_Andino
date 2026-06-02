// Redirigir al libro de fallas compartido unificado
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TecnicoFallasRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/fallas');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Cargando libro de fallas unificado...</p>
      </div>
    </div>
  );
}
