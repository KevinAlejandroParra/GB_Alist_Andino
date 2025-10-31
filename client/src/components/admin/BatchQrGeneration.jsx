'use client';

import React, { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

export default function BatchQrGeneration({ checklistTypes, onQrGenerated }) {
   const { user } = useAuth();
   const [selectedTypes, setSelectedTypes] = useState([]);
   const [generating, setGenerating] = useState(false);
   const [baseName, setBaseName] = useState('');
   const [partitionSize, setPartitionSize] = useState(4);
   const [maxPartitions, setMaxPartitions] = useState(0);

  const handleTypeToggle = (typeId) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === checklistTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(checklistTypes.map(type => type.checklist_type_id));
    }
  };

  const handleGenerateBatch = async () => {
    if (selectedTypes.length === 0) {
      Swal.fire('Error', 'Selecciona al menos un tipo de checklist', 'warning');
      return;
    }

    if (!baseName.trim()) {
      Swal.fire('Error', 'Ingresa un nombre base para las atracciones', 'warning');
      return;
    }

    try {
      setGenerating(true);
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const generatedQrs = [];

      for (let i = 0; i < selectedTypes.length; i++) {
        const typeId = selectedTypes[i];
        const attractionName = `${baseName.trim()} ${i + 1}`;

        const response = await axiosInstance.post(`${API_URL}/api/qr-codes/generate`, {
          checklist_type_id: typeId,
          attraction_name: attractionName,
          max_partitions: maxPartitions || partitionSize
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (response.data.success) {
          generatedQrs.push(response.data.data);
        }
      }

      if (generatedQrs.length > 0) {
        Swal.fire({
          icon: 'success',
          title: `¡Códigos QR Generados! (${generatedQrs.length})`,
          html: `
            <div class="text-center">
              <p class="mb-4">Se generaron ${generatedQrs.length} códigos QR exitosamente</p>
              <div class="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                ${generatedQrs.map((qr, index) => `
                  <div class="border p-3 rounded bg-gray-50">
                    <p class="font-semibold text-sm mb-2">${qr.attraction_name}</p>
                    <img src="${qr.qr_image_base64}" alt="QR ${qr.attraction_name}" class="w-full h-auto" />
                    <p class="text-xs text-gray-600 mt-1">${qr.qr_code}</p>
                  </div>
                `).join('')}
              </div>
              <p class="text-sm text-gray-600 mt-4">Descarga cada imagen individualmente usando el botón "Descargar QR" en la lista principal</p>
            </div>
          `,
          width: '800px',
          confirmButtonText: 'Aceptar'
        });

        if (onQrGenerated) {
          onQrGenerated();
        }
      }

    } catch (error) {
      console.error('Error generando códigos QR en lote:', error);
      Swal.fire('Error', error.response?.data?.message || 'Error generando códigos QR', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Generación Masiva de Códigos QR</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre Base para las Atracciones
        </label>
        <input
          type="text"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej: Play Ground, Carros chocones, etc."
        />
        <p className="text-sm text-gray-500 mt-1">
          Se agregará un número secuencial: "{baseName} 1", "{baseName} 2", etc.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número Total de Validaciones QR
          </label>
          <select
            value={partitionSize}
            onChange={(e) => setPartitionSize(parseInt(e.target.value))}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={1}>Sin partición (1 QR único)</option>
            <option value={2}>2 validaciones QR</option>
            <option value={3}>3 validaciones QR</option>
            <option value={4}>4 validaciones QR</option>
            <option value={5}>5 validaciones QR</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Número total de QR que se requerirán durante el checklist
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Máximo de Particiones (opcional)
          </label>
          <input
            type="number"
            value={maxPartitions}
            onChange={(e) => setMaxPartitions(parseInt(e.target.value) || 0)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0 = ilimitado"
            min="0"
          />
          <p className="text-sm text-gray-500 mt-1">
            Límite de validaciones QR (0 = sin límite)
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-700">
            Tipos de Checklist Disponibles
          </label>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {selectedTypes.length === checklistTypes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {checklistTypes.map(type => (
            <label key={type.checklist_type_id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.checklist_type_id)}
                onChange={() => handleTypeToggle(type.checklist_type_id)}
                className="mr-3 h-4 w-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-sm">{type.name}</div>
                <div className="text-xs text-gray-500">{type.type_category}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleGenerateBatch}
          disabled={generating || selectedTypes.length === 0 || !baseName.trim()}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {generating ? 'Generando...' : `Generar ${selectedTypes.length} Código${selectedTypes.length !== 1 ? 's' : ''} QR`}
        </button>
      </div>
    </div>
  );
}