'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import PremiseManagement from '../../components/admin/PremiseManagement';
import EntityManagement from '../../components/admin/EntityManagement';
import RoleManagement from '../../components/admin/RoleManagement';
import UserManagement from '../../components/admin/UserManagement';
import FamilyManagement from '../../components/admin/FamilyManagement';
import DeviceManagement from '../../components/admin/DeviceManagement';
import AttractionManagement from '../../components/admin/AttractionManagement';
import QrCodeManagement from '../../components/admin/QrCodeManagement';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setErrorMessage('No tienes autorización para acceder a este recurso.');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const role_id = decoded.role_id;

      console.log('Decoded Role ID:', role_id);

      if (role_id !== 1 && role_id !== 2) {
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

      <h1 className="text-3xl font-bold mb-6 text-center">Panel de Administración</h1>

      <nav className="mb-6">
        <ul className="flex flex-wrap justify-center space-x-2 md:space-x-4">
          {['users', 'premises', 'entities', 'roles', 'families', 'devices', 'attractions', 'qr-codes'].map((tab) => (
            <li key={tab}>
              <button
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-blue-200'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'users' && 'Gestión de Usuarios'}
                {tab === 'premises' && 'Gestión de Sedes'}
                {tab === 'entities' && 'Gestión de Entidades'}
                {tab === 'roles' && 'Gestión de Roles'}
                {tab === 'families' && 'Gestión de Familias'}
                {tab === 'devices' && 'Gestión de Dispositivos'}
                {tab === 'attractions' && 'Gestión de Atracciones'}
                {tab === 'qr-codes' && 'Códigos QR'}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {renderContent()}
      </div>
    </div>
  );
}