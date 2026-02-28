"use client";
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthContext';

export default function InspectablesList() {
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          // Manejo específico para token de autenticación faltante
          Swal.fire({
            title: 'Autenticación requerida',
            text: 'Por favor, inicia sesión para continuar',
            icon: 'warning',
            confirmButtonText: 'Ir a iniciar sesión',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then((result) => {
            if (result.isConfirmed) {
              // Limpiar datos de autenticación
              localStorage.removeItem('authToken');
              // Redirigir al login
              window.location.href = '/login';
            }
          });
          setLoading(false);
          return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';

        // Si es Admin (rol 1) o Soporte (rol 2), obtener todos los checklist types
        const checklistTypesResponse = await axiosInstance.get(
          user?.role_id === 1 || user?.role_id === 2
            ? `${API_URL}/api/checklist-types`
            : `${API_URL}/api/checklist-types?role_id=${user?.role_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setChecklistTypes(checklistTypesResponse.data);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data.');
        Swal.fire('Error', err.message || 'Error al cargar datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  const handleChecklistTypeClick = async (checklistType) => { // Async para la llamada a la API
    // Ahora todos los tipos de checklist se dirigen primero a la página de detalle
    router.push(`/checklists/detail/${checklistType.checklist_type_id}`);
  };

  // Función para determinar si un checklist es de operación o técnico
  const getChecklistType = (checklist) => {
    // Clasificación por role_id únicamente
    if (checklist.role_id === 4) {
      return 'operacion'; // Anfitriones - Operación
    }
    if (checklist.role_id === 3) {
      return 'tecnico'; // Técnico - Mantenimiento
    }

    // Si no se puede clasificar
    if (user?.role_id === 1 || user?.role_id === 2) {
      return null; // Sin clasificar para admin/soporte
    }

    return 'otros'; // Para usuarios normales
  };

  // Agrupar checklists por tipo
  const groupChecklistsByType = () => {
    const isAdmin = user?.role_id === 1 || user?.role_id === 2;

    if (isAdmin) {
      // Para admin y soporte, mostrar por secciones
      const operacion = [];
      const tecnico = [];
      const otros = [];

      checklistTypes.forEach(checklist => {
        const type = getChecklistType(checklist);
        if (type === 'operacion') {
          operacion.push(checklist);
        } else if (type === 'tecnico') {
          tecnico.push(checklist);
        } else {
          otros.push(checklist);
        }
      });

      return { operacion, tecnico, otros };
    } else {
      // Para usuarios normales, mostrar en una sola sección
      return { todos: checklistTypes };
    }
  };

  // Componente para renderizar una sección de checklists
  const renderChecklistSection = (title, checklists, bgColor = 'bg-gray-50', icon = 'fas fa-list') => {
    if (checklists.length === 0) return null;

    return (
      <div className={`${bgColor} rounded-lg p-6 mb-8`}>
        <div className="flex items-center mb-6">
          <i className={`${icon} text-2xl text-blue-600 mr-3`}></i>
          <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
          <span className="ml-3 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {checklists.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.map((checklistType) => (
            <div
              key={checklistType.checklist_type_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer p-6 border border-gray-200 transform hover:scale-105"
              onClick={() => handleChecklistTypeClick(checklistType)}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-bold text-gray-900 leading-tight">{checklistType.name}</h4>
                <div className="ml-2">
                  {getChecklistType(checklistType) === 'operacion' && (
                    <i className="fas fa-user-tie text-green-600" title="Checklist de Operación"></i>
                  )}
                  {getChecklistType(checklistType) === 'tecnico' && (
                    <i className="fas fa-tools text-orange-600" title="Checklist Técnico"></i>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-3 text-sm leading-relaxed">{checklistType.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {checklistType.frequency}
                </span>
                <i className="fas fa-arrow-right text-gray-400"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando checklists...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  const groupedChecklists = groupChecklistsByType();
  const isAdmin = user?.role_id === 1 || user?.role_id === 2;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Checklists</h2>
        <p className="text-gray-600">
          {isAdmin
            ? 'Organizados por tipo de operación para mejor gestión administrativa'
            : 'Checklists disponibles para tu rol'
          }
        </p>
      </div>

      {checklistTypes.length > 0 ? (
        isAdmin ? (
          // Vista para Admin y Soporte - organizada por secciones
          <>
            {renderChecklistSection(
              'Checklists de Operación',
              groupedChecklists.operacion,
              'bg-green-50',
              'fas fa-user-tie'
            )}
            {renderChecklistSection(
              'Checklists Técnicos',
              groupedChecklists.tecnico,
              'bg-orange-50',
              'fas fa-tools'
            )}
            {renderChecklistSection(
              'Otros Checklists',
              groupedChecklists.otros,
              'bg-blue-50',
              'fas fa-list'
            )}
          </>
        ) : (
          // Vista para usuarios normales
          renderChecklistSection(
            'Checklists Disponibles',
            groupedChecklists.todos,
            'bg-gray-50',
            'fas fa-list'
          )
        )
      ) : (
        <div className="text-center py-12">
          <i className="fas fa-clipboard-list text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">No hay checklists disponibles para tu rol.</p>
        </div>
      )}
    </div>
  );
}
