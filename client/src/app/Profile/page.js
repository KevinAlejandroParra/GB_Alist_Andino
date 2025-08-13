'use client'; 

import { useEffect, useState } from 'react';

export default function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/protected`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener datos del usuario');
        }

        const data = await response.json();
        if (data.success) {
          setUserData(data.user);
        } else {
          throw new Error(data.message || 'Error en la respuesta del servidor');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    console.log( `${process.env.NEXT_PUBLIC_API}/api/users/protected`)

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p>No se encontraron datos del usuario</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Perfil de Usuario</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Información básica */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img 
                className="h-20 w-20 rounded-full object-cover" 
                src={userData.image || '/default-user.png'} 
                alt="Foto de perfil"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {userData.name} {userData.lastname}
              </h2>
              <p className="text-gray-600">{userData.email}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                userData.state === 'activo' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {userData.state}
              </span>
            </div>
          </div>
        </div>

        {/* Datos detallados en tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Tipo de documento
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.type_document}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Número de documento
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.document}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Teléfono
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.phone}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Rol
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.role.name} (ID: {userData.role.id})
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Sede
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.premise.name} (ID: {userData.premise.id})
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Entidad
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.entity.name} (ID: {userData.entity.id})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}