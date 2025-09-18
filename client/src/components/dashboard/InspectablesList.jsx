"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

export default function InspectablesList() {
  const [attractions, setAttractions] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found.');
        }
        
        const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
        
        const [inspectablesResponse, familiesResponse] = await Promise.all([
          axios.get(`${API_URL}/api/inspectables`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/families`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const attractionsOnly = inspectablesResponse.data.filter(insp => insp.inspectable_type === 'attraction');
        setAttractions(attractionsOnly);
        setFamilies(familiesResponse.data);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data.');
        Swal.fire('Error', err.message || 'Error al cargar datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInspectableClick = (inspectable) => {
    router.push(`/inspectables/${inspectable.inspectable_id}?premiseId=${inspectable.premise_id}`);
  };

  const handleFamilyClick = async (family) => {
    Swal.fire({ title: 'Buscando dispositivos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const token = localStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
      
      const response = await axios.get(`${API_URL}/api/devices?family_id=${family.family_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const devices = response.data;

      if (!devices || devices.length === 0) {
        Swal.fire('Información', 'No se encontraron dispositivos para esta familia.', 'info');
        return;
      }

      const firstDevice = devices[0];
      Swal.close();
      router.push(`/inspectables/${firstDevice.ins_id}?premiseId=${firstDevice.inspectable.premise_id}`);

    } catch (err) {
      console.error('Error fetching devices for family:', err);
      Swal.fire('Error', 'No se pudieron cargar los dispositivos de la familia.', 'error');
    }
  };

  if (loading) {
    return <p className="text-gray-600">Cargando...</p>;
  }

  if (error) {
    return <p className="text-red-600">Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Selecciona la Atracción que deseas inspeccionar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attractions.length > 0 ? (
          attractions.map((attraction) => (
            <div
              key={attraction.inspectable_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6 border border-gray-200"
              onClick={() => handleInspectableClick(attraction)}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{attraction.inspectable_name} - <span className='text-gray-500'>{attraction.location}</span></h3>
              <p className="text-gray-600 mb-1">ID: {attraction.inspectable_id}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600 col-span-full text-center">No hay atracciones disponibles.</p>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Selecciona la Familia que deseas inspeccionar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {families.length > 0 ? (
            families.map((family) => (
              <div
                key={family.family_id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6 border border-gray-200"
                onClick={() => handleFamilyClick(family)}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{family.family_name}</h3>
                <p className="text-gray-600">{family.family_description}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 col-span-full text-center">No hay familias disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}
