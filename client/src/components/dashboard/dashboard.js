"use client";
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../AuthContext';
import InspectablesList from './InspectablesList';

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Función para obtener el nombre del dashboard según el rol
  const getDashboardTitle = (roleId) => {
    switch (roleId) {
      case 4: // Jefe de Operaciones
        return "Dashboard de Operaciones";
      case 7: // Técnico de mantenimiento
        return "Dashboard Técnico";
      case 8: // Anfitrión
        return "Dashboard de Anfitrión";
      case 2: // Jefe de Mantenimiento
        return "Dashboard de Mantenimiento";
      case 3: // Dirección de Operaciones
        return "Dashboard Ejecutivo";
      case 5: // Dirección de Copass
        return "Dashboard de Copass";
      case 6: // Técnico de Copass
        return "Dashboard Técnico Copass";
      default:
        return "Dashboard";
    }
  };

  // Función para obtener la descripción según el rol
  const getDashboardDescription = (roleId) => {
    switch (roleId) {
      case 4: // Jefe de Operaciones
        return "Gestión y supervisión de todos los checklists de la plataforma";
      case 7: // Técnico de mantenimiento
        return "Mantenimiento y revisiones técnicas de equipos e instalaciones";
      case 8: // Anfitrión
        return "Atención al cliente y supervision de atracciones";
      case 2: // Jefe de Mantenimiento
        return "Supervisión general del mantenimiento";
      case 3: // Dirección de Operaciones
        return "Visión ejecutiva de operaciones y mantenimiento";
      case 5: // Dirección de Copass
        return "Gestión de operaciones de copass";
      case 6: // Técnico de Copass
        return "Mantenimiento técnico especializado";
      default:
        return "Sistema de gestión de checklists";
    }
  };

  const dashboardTitle = getDashboardTitle(user?.role_id);
  const dashboardDescription = getDashboardDescription(user?.role_id);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dashboardTitle}</h1>
              <p className="text-gray-600 mt-1">{dashboardDescription}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <InspectablesList />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}