"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
          throw new Error('No authentication token found.');
        }
        
        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
        
        // Si es Jefe de Operaciones (rol 4), obtener todos los checklist types
        const checklistTypesResponse = await axios.get(
          user?.role_id === 4
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
    if (checklistType.type_category === 'attraction') {
      Swal.fire({ title: 'Cargando atracción...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const token = localStorage.getItem('authToken');
        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
        const response = await axios.get(`${API_URL}/api/inspectables/${checklistType.associated_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const attractionInspectable = response.data;
        Swal.close();
        router.push(`/inspectables/${checklistType.associated_id}?premiseId=${attractionInspectable.premise_id}&checklistTypeId=${checklistType.checklist_type_id}`);
      } catch (err) {
        console.error('Error fetching attraction inspectable:', err);
        Swal.fire('Error', 'No se pudo cargar la información de la atracción.', 'error');
      }
    } else if (checklistType.type_category === 'family') {
      Swal.fire({ title: 'Buscando dispositivo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const token = localStorage.getItem('authToken');
        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
        
        const response = await axios.get(`${API_URL}/api/devices?family_id=${checklistType.associated_id}&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const devices = response.data;

        if (!devices || devices.length === 0) {
          Swal.fire('Información', 'No se encontraron dispositivos para esta familia.', 'info');
          Swal.close();
          return;
        }

        const firstDevice = devices[0];
        Swal.close();
        router.push(`/inspectables/${firstDevice.parentInspectable.ins_id}?premiseId=${firstDevice.parentInspectable.premise_id}&checklistTypeId=${checklistType.checklist_type_id}`);

      } catch (err) {
        console.error('Error fetching device for family:', err);
        Swal.fire('Error', 'No se pudo cargar el dispositivo de la familia.', 'error');
      }
    } else if (checklistType.type_category === 'specific' || checklistType.type_category === 'static') {
      Swal.fire({ title: 'Cargando checklist...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      Swal.close();
    router.push(`/checklists/type/${checklistType.checklist_type_id}`);
    } else {
      console.warn("ChecklistType con categoría de tipo desconocida. Mostrar mensaje.", checklistType);
      Swal.fire('Información', 'Este tipo de checklist no está asociado a una atracción, familia o local específico.', 'info');
    }
  };

  if (loading || authLoading) {
    return <p className="text-gray-600">Cargando...</p>;
  }

  if (error) {
    return <p className="text-red-600">Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Checklists disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {checklistTypes.length > 0 ? (
          checklistTypes.map((checklistType) => (
            <div
              key={checklistType.checklist_type_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6 border border-gray-200"
              onClick={() => handleChecklistTypeClick(checklistType)}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{checklistType.name}</h3>
              <p className="text-gray-600 mb-1">{checklistType.description}</p>
              <p className="text-sm text-gray-500">Frecuencia: {checklistType.frequency}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600 col-span-full text-center">No hay checklists disponibles para tu rol.</p>
        )}
      </div>
    </div>
  );
}
