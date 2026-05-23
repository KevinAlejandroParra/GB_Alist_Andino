// Redirigir al libro de fallas compartido
// El filtrado por rol se hace automáticamente en el backend
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFallasRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tecnico/fallas');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando libro de fallas...</p>
      </div>
    </div>
  );
}
