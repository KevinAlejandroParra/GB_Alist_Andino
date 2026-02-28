'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';
import PremiseManagement from '../../components/admin/PremiseManagement';
import EntityManagement from '../../components/admin/EntityManagement';
import RoleManagement from '../../components/admin/RoleManagement';
import UserManagement from '../../components/admin/UserManagement';
import FamilyManagement from '../../components/admin/FamilyManagement';
import DeviceManagement from '../../components/admin/DeviceManagement';
import AttractionManagement from '../../components/admin/AttractionManagement';
import QrCodeManagement from '../../components/admin/QrCodeManagement';
import InventoryManagement from '../../components/admin/InventoryManagement';
import RequisitionManagement from '../../components/admin/RequisitionManagement';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      // Sweet Alert personalizado para sesión caducada
      Swal.fire({
        title: 'Autenticación requerida',
        text: 'Por favor, inicia sesión para continuar',
        icon: 'warning',
        confirmButtonText: 'Ir a iniciar sesión',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then((result) => {
        if (result.isConfirmed) {
          // Limpiar datos de autenticación
          localStorage.removeItem('authToken');
          // Redirigir al login
          window.location.href = '/login';
        }
      });
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const role_id = decoded.role_id;

      console.log('Decoded Role ID:', role_id);

      if (role_id !== 1 && role_id !== 2) { // Admin y Soporte
        setErrorMessage('Tu rol no tiene permisos para acceder a este panel.');
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      setErrorMessage('Token inválido. Por favor inicia sesión nuevamente.');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [router]);

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'premises':
        return <PremiseManagement />;
      case 'entities':
        return <EntityManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'families':
        return <FamilyManagement />;
      case 'devices':
        return <DeviceManagement />;
      case 'attractions':
        return <AttractionManagement />;
      case 'qr-codes':
        return <QrCodeManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'requisitions':
        return <RequisitionManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md shadow-md mb-4">
          {errorMessage}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-center">
        <i className="fa fa-cogs text-purple-500 mr-3"></i>
        Panel de Administración
      </h1>

      <nav className="mb-6">
        <ul className="flex flex-wrap justify-center space-x-2 md:space-x-4 gap-2">
          {['users', 'premises', 'entities', 'roles', 'families', 'devices', 'attractions', 'qr-codes', 'inventory', 'requisitions'].map((tab) => (
            <li key={tab}>
              <button
                className={`px-4 py-2 rounded-md transition-all duration-200 ${activeTab === tab
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-200 text-gray-800 hover:bg-purple-200 hover:shadow-md'
                  }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'users' && (
                  <>
                    <i className="fa fa-users mr-2"></i>
                    Gestión de Usuarios
                  </>
                )}
                {tab === 'premises' && (
                  <>
                    <i className="fa fa-building mr-2"></i>
                    Gestión de Sedes
                  </>
                )}
                {tab === 'entities' && (
                  <>
                    <i className="fa fa-sitemap mr-2"></i>
                    Gestión de Entidades
                  </>
                )}
                {tab === 'roles' && (
                  <>
                    <i className="fa fa-user-shield mr-2"></i>
                    Gestión de Roles
                  </>
                )}
                {tab === 'families' && (
                  <>
                    <i className="fa fa-users-cog mr-2"></i>
                    Gestión de Familias
                  </>
                )}
                {tab === 'devices' && (
                  <>
                    <i className="fa fa-cog mr-2"></i>
                    Gestión de Dispositivos
                  </>
                )}
                {tab === 'attractions' && (
                  <>
                    <i className="fa fa-mountain mr-2"></i>
                    Gestión de Atracciones
                  </>
                )}
                {tab === 'qr-codes' && (
                  <>
                    <i className="fa fa-qrcode mr-2"></i>
                    Códigos QR
                  </>
                )}
                {tab === 'inventory' && (
                  <>
                    <i className="fa fa-warehouse mr-2"></i>
                    Gestión de Inventario
                  </>
                )}
                {tab === 'requisitions' && (
                  <>
                    <i className="fa fa-clipboard-check mr-2"></i>
                    Requisiciones
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        {renderContent()}
      </div>
    </div>
  );
}