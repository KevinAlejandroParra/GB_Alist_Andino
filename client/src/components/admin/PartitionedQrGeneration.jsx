'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

export default function PartitionedQrGeneration({ onQrGenerated }) {
  const { user } = useAuth();
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [selectedChecklistType, setSelectedChecklistType] = useState('');
  const [parentItems, setParentItems] = useState([]);
  const [selectedParentItems, setSelectedParentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [partitionConfig, setPartitionConfig] = useState({
    partition_size: 2,
    partition_label: ''
  });

  // Cargar tipos de checklist de atracción al montar el componente
  useEffect(() => {
    loadChecklistTypes();
  }, []);

  // Cargar items padre cuando se selecciona un tipo de checklist
  useEffect(() => {
    if (selectedChecklistType) {
      loadParentItems(selectedChecklistType);
    } else {
      setParentItems([]);
      setSelectedParentItems([]);
    }
  }, [selectedChecklistType]);

  const loadChecklistTypes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/checklist-types`);

      if (response.data && Array.isArray(response.data)) {
        // Filtrar tipos de atracción (ya que estos son los únicos que usan QR)
        const attractionTypes = response.data.filter(type =>
          type.type_category === 'attraction'
        );
        setChecklistTypes(attractionTypes);
      }
    } catch (error) {
      console.error('Error cargando tipos de checklist:', error);
      Swal.fire('Error', 'No se pudieron cargar los tipos de checklist', 'error');
    }
  };

  const loadParentItems = async (checklistTypeId) => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(
        `${API_URL}/api/checklists/type/${checklistTypeId}/parent-items`
      );

      if (response.data.success) {
        setParentItems(response.data.data.parent_items || []);
      }
    } catch (error) {
      console.error('Error cargando items padre:', error);
      Swal.fire('Error', 'No se pudieron cargar los items padre', 'error');
      setParentItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleParentItemToggle = (itemId) => {
    setSelectedParentItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllItems = () => {
    setSelectedParentItems(parentItems.map(item => item.checklist_item_id));
  };

  const handleDeselectAllItems = () => {
    setSelectedParentItems([]);
  };

  const handleGeneratePartitionedQrs = async () => {
    if (!selectedChecklistType || selectedParentItems.length === 0) {
      Swal.fire('Error', 'Selecciona un tipo de checklist y al menos un item padre', 'warning');
      return;
    }

    try {
      setGenerating(true);
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      const response = await axiosInstance.post(`${API_URL}/api/qr-codes/generate-partitioned`, {
        checklist_type_id: selectedChecklistType,
        parent_item_ids: selectedParentItems,
        partition_config: partitionConfig
      });

      if (response.data.success) {
        const { qr_codes } = response.data.data;

        // Mostrar resultado detallado
        let qrListHtml = qr_codes.map(qr => `
          <div class="mb-3 p-3 border rounded bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="font-semibold">${qr.attraction_name}</p>
                <p class="text-sm text-gray-600">Grupo: ${qr.group_number}</p>
                <p class="text-sm text-gray-600">
                  Items: ${qr.group_items.map(item => item.item_number).join(', ')}
                </p>
                <p class="text-sm text-gray-600">Código: ${qr.qr_code}</p>
              </div>
              <img src="${qr.qr_image_base64}" alt="QR Code" class="w-20 h-20" />
            </div>
          </div>
        `).join('');

        Swal.fire({
          icon: 'success',
          title: '¡Códigos QR Generados!',
          html: `
            <div class="text-left">
              <p class="mb-3"><strong>Se generaron ${qr_codes.length} códigos QR para particiones específicas:</strong></p>
              <div class="max-h-96 overflow-y-auto">
                ${qrListHtml}
              </div>
              <p class="text-sm text-gray-600 mt-3">
                Cada código QR está asociado a una seccion dentro del checklist, y puede ser usado para validar el seguimiento del diligenciamiento de los checklists.
              </p>
            </div>
          `,
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'text-left'
          }
        });

        // Resetear formulario
        setSelectedChecklistType('');
        setSelectedParentItems([]);
        setPartitionConfig({
          partition_size: 1,
          partition_label: ''
        });

        // Notificar al componente padre
        if (onQrGenerated) {
          onQrGenerated();
        }
      }
    } catch (error) {
      console.error('Error generando códigos QR por particiones:', error);
      Swal.fire('Error',
        error.response?.data?.message || 'Error generando códigos QR por particiones',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  if (user?.role_id !== 1) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Solo los administradores pueden generar códigos QR por particiones</p>
      </div>
    );
  }

  if (checklistTypes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">No hay tipos de checklist de atracción disponibles</p>
          <p className="text-sm text-gray-500">
            Se necesitan tipos de checklist con <code>type_category: 'attraction'</code> para generar códigos QR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Generar Códigos QR por Particiones Específicas
      </h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Flujo de trabajo:</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>1. Selecciona</strong> las secciones del checklist que quieres incluir</p>
              <p><strong>2. Configura</strong> cómo agrupar esos items seleccionados</p>
              <p><strong>3. Se generan</strong> códigos QR, cada uno validando únicamente su grupo de items</p>

              <div className="mt-3 p-3 bg-white rounded border">
                <p className="font-medium text-gray-800 mb-2">Ejemplo práctico:</p>
                <div className="space-y-2 text-xs">
                  <p>• Seleccionas 6 items padre específicos</p>
                  <p>• Configuras "Cada 2 items"</p>
                  <p>• <strong>Resultado:</strong> 3 códigos QR generados</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-100 px-2 py-1 rounded text-center min-w-[60px]">
                        <div className="font-semibold text-green-800">QR 1</div>
                      </div>
                      <div className="text-green-700">→ Valida secciones 1, 2</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-100 px-2 py-1 rounded text-center min-w-[60px]">
                        <div className="font-semibold text-green-800">QR 2</div>
                      </div>
                      <div className="text-green-700">→ Valida secciones 3, 4</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-100 px-2 py-1 rounded text-center min-w-[60px]">
                        <div className="font-semibold text-green-800">QR 3</div>
                      </div>
                      <div className="text-green-700">→ Valida secciones 5, 6</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Selección de tipo de checklist */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Checklist con QR Habilitado
          </label>
          <select
            value={selectedChecklistType}
            onChange={(e) => setSelectedChecklistType(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar tipo de checklist</option>
            {checklistTypes.map(type => (
              <option key={type.checklist_type_id} value={type.checklist_type_id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Configuración de particiones */}
        {selectedChecklistType && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Configuración de Particiones</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cómo agrupar los items seleccionados?
                </label>
                <select
                  value={partitionConfig.partition_size}
                  onChange={(e) => setPartitionConfig(prev => ({
                    ...prev,
                    partition_size: parseInt(e.target.value) || 1
                  }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Un código QR por seccion (máxima granularidad)</option>
                  <option value={2}>Un código QR cada 2 secciones</option>
                  <option value={3}>Un código QR cada 3 secciones</option>
                  <option value={5}>Un código QR cada 5 secciones</option>
                  <option value={10}>Un código QR cada 10 secciones</option>
                </select>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p><strong>¿Cómo funciona?</strong></p>
                  <p>• Si seleccionas 6 secciones y configuras "Cada 2 secciones" → Se generan 3 códigos QR</p>
                  <p>• Cada código QR valida únicamente los items de su grupo</p>
                  <p>• Los items sobrantes forman un grupo adicional si no completan el tamaño</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Etiqueta de Partición (opcional)
                </label>
                <input
                  type="text"
                  value={partitionConfig.partition_label}
                  onChange={(e) => setPartitionConfig(prev => ({
                    ...prev,
                    partition_label: e.target.value
                  }))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Inspección inicial, Verificación final"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deja vacío para generar automáticamente basado en el número de la seccion
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de secciones */}
        {selectedChecklistType && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Secciones Disponibles ({parentItems.length})
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllItems}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Seleccionar Todas
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllItems}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : parentItems.length > 0 ? (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <div className="divide-y">
                  {parentItems.map(item => (
                    <label
                      key={item.checklist_item_id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParentItems.includes(item.checklist_item_id)}
                        onChange={() => handleParentItemToggle(item.checklist_item_id)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {item.item_number}. {item.question_text}
                        </div>
                        {item.guidance_text && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.guidance_text}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No se encontraron items para este tipo de checklist
              </div>
            )}

            {selectedParentItems.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <p className="mb-2">
                    <strong>Seleccionadas:</strong> {selectedParentItems.length} secciones
                  </p>
                  <p className="text-xs text-blue-700">
                    Estos {selectedParentItems.length} items se agruparán según la configuración de particiones.
                    Cada grupo generará un código QR específico que solo valida sus items correspondientes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón de generación */}
        {selectedChecklistType && selectedParentItems.length > 0 && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleGeneratePartitionedQrs}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium"
            >
              {generating ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </span>
              ) : (
                `Generar ${Math.ceil(selectedParentItems.length / partitionConfig.partition_size)} Código${Math.ceil(selectedParentItems.length / partitionConfig.partition_size) > 1 ? 's' : ''} QR`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}