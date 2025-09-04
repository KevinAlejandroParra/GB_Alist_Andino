"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

export default function InspectablesList() {
  const [inspectables, setInspectables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchInspectables = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found.');
        }
        
        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
        const response = await axios.get(`${API_URL}/api/inspectables`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setInspectables(response.data);
      } catch (err) {
        console.error('Error fetching inspectables:', err);
        setError(err.message || 'Failed to fetch inspectables.');
        Swal.fire('Error', err.message || 'Error al cargar inspectables', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInspectables();
  }, []);

  const handleInspectableClick = (inspectable) => {
    router.push(`/inspectables/${inspectable.inspectable_id}?premiseId=${inspectable.premise_id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-600">Cargando inspectables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Selecciona un Elemento Inspeccionable</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspectables.length > 0 ? (
          inspectables.map((inspectable) => (
            <div
              key={inspectable.inspectable_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6 border border-gray-200"
              onClick={() => handleInspectableClick(inspectable)}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{inspectable.inspectable_name}</h3>
              <p className="text-gray-600 mb-1">Tipo: {inspectable.inspectable_type}</p>
              <p className="text-gray-600 mb-1">Ubicación: {inspectable.location}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600 col-span-full text-center">No hay elementos inspeccionables disponibles.</p>
        )}
      </div>
    </div>
  );
}
