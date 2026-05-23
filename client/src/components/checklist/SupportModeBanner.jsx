'use client';
import { useRouter } from 'next/navigation';

/**
 * Banner que se muestra cuando se está en modo soporte
 * Indica al usuario de soporte que está actuando como otro usuario
 */
export default function SupportModeBanner({ supportContext, onExit }) {
  const router = useRouter();

  if (!supportContext) return null;

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
    router.push('/AdminDashboard');
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <i className="fa fa-user-shield text-2xl"></i>
              <div>
                <div className="font-bold text-sm">MODO SOPORTE ACTIVO</div>
                <div className="text-xs text-purple-100">
                  Actuando como: <span className="font-semibold">{supportContext.impersonated_user_name}</span>
                  {' '}({supportContext.impersonated_user_role})
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">
              <i className="fa fa-info-circle"></i>
              <span>
                Todas las acciones se registrarán bajo el usuario seleccionado
              </span>
            </div>
          </div>

          <button
            onClick={handleExit}
            className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm"
          >
            <i className="fa fa-sign-out-alt"></i>
            Salir del Modo Soporte
          </button>
        </div>
      </div>
    </div>
  );
}
