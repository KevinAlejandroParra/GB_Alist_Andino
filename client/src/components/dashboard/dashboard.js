"use client";
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../AuthContext';
import InspectablesList from './InspectablesList';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const getDashboardTitle = (roleId) => {
    switch (roleId) {
      case 4:
        return "Dashboard de Anfitrión";
      case 7:
        return "Dashboard Técnico";
      case 8:
        return "Dashboard de Anfitrión";
      case 2:
        return "Dashboard de Soporte";
      case 3:
        return "Dashboard Técnico";
      case 1:
        return "Dashboard Administrativo";
      default:
        return "Dashboard";
    }
  };

  const getDashboardDescription = (roleId) => {
    switch (roleId) {
      case 4:
        return "Atención al cliente y supervisión de atracciones";
      case 7:
        return "Mantenimiento y revisiones técnicas de equipos e instalaciones";
      case 8:
        return "Atención al cliente y supervisión de atracciones";
      case 2:
        return "Asistencia técnica y administrativa con acceso completo";
      case 3:
        return "Mantenimiento técnico especializado";
      case 1:
        return "Administración completa del sistema y supervisión general";
      default:
        return "Sistema de gestión de checklists";
    }
  };

  const quickActions = [
    {
      title: "Libro de Fallas",
      description: "Gestión y supervisión completa de fallas",
      icon: "fas fa-book",
      href: "/tecnico/fallas",
      color: "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
    }
  ];

  // Agregar acción de Requisiciones solo si es usuario técnico
  if ([3, 7].includes(user?.role_id)) {
    quickActions.push({
      title: "Requisiciones",
      description: "Ver y gestionar tus solicitudes de repuestos",
      icon: "fas fa-clipboard-list",
      href: "/tecnico/requisiciones",
      color: "bg-gradient-to-r from-purple-500 via-slate-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
    });
  }

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
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Acceso Rápido</h2>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
                {quickActions.map((action, index) => (
                  <div
                    key={index}
                    onClick={() => router.push(action.href)}
                    className={`${action.color} text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer p-6 transform hover:scale-105`}
                  >
                    <div className="flex items-center mb-3">
                      <i className={`${action.icon} text-3xl mr-4`}></i>
                      <h3 className="text-xl font-bold">{action.title}</h3>
                    </div>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <InspectablesList />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}