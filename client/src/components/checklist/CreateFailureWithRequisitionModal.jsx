'use client'

import React, { useState, useEffect } from 'react';
import useFailureRequisitionSystem from './hooks/useFailureRequisitionSystem';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import InventorySearchModal from './InventorySearchModal';
import WorkOrderPartsManager from './WorkOrderPartsManager';
import CreateRequisitionModal from './requisitions/CreateRequisitionModal';
import axiosInstance from '../../utils/axiosConfig';

const CreateFailureWithRequisitionModal = ({
  show,
  onClose,
  checklistItemId,
  initialDescription,
  onSuccess,
  checklistData,
  responseManager,
  failureSystem,
  user: propUser,
  checklistTypeId,
  recurringFailure,
  // ✅ NUEVO: Recibir prop requiresReplacement
  requiresReplacement = false
}) => {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const failureSystemHook = useFailureRequisitionSystem();

  // Estado inicial del formulario
  const initialFormData = {
    description: initialDescription || '',
    severity: 'LEVE',
    evidence_file: null,
    requires_replacement: requiresReplacement,
    requestedPartInfo: {
      name: '',
      quantity: 1,
      category: 'Repuesto',
      urgency: 'NORMAL',
      image_url: '',
    }
  };

  const [formData, setFormData] = useState(initialFormData);
  const [view, setView] = useState('create_failure');
  const [loading, setLoading] = useState(false);

  // 📥 DEBUG: Log de props recibidos al montar el componente
  React.useEffect(() => {
    if (show) {
      console.log('📋 [CreateFailureWithRequisitionModal] Modal abierto, props recibidas:')
      console.log('  - checklistItemId:', checklistItemId)
      console.log('  - initialDescription:', initialDescription)
      console.log('  - checklistData:', checklistData)
      console.log('  - recurringFailure:', recurringFailure)
      console.log('  - responseManager:', responseManager)
    }
  }, [show, checklistItemId, initialDescription, checklistData, recurringFailure, responseManager]);
  const [selectedPartFromInventory, setSelectedPartFromInventory] = useState(null);
  const [selectedPartsFromInventory, setSelectedPartsFromInventory] = useState([]);
  
  // Estados para vista previa de imagen
  const [imagePreview, setImagePreview] = useState(null);
  
  // Estados para controlar el flujo
  const [workOrderId, setWorkOrderId] = useState(null);
  const [failureOrderId, setFailureOrderId] = useState(null);
  const [failureCreated, setFailureCreated] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [pendingRequisitionRequest, setPendingRequisitionRequest] = useState(false);

  // Resetear estado cuando el modal se cierra o se abre
  useEffect(() => {
    if (show) {
      console.log('🔄 [CreateFailureWithRequisitionModal] Reseteando modal con:')
      console.log('  - requiresReplacement recibido:', requiresReplacement)
      console.log('  - initialDescription:', initialDescription)
      
      setView('create_failure');
      setFailureCreated(false);
      setSelectedPartsFromInventory([]);
      setSelectedPartFromInventory(null);
      setWorkOrderId(null);
      setShowRequisitionModal(false);
      setPendingRequisitionRequest(false);
      setImagePreview(null);
      setFormData({
        ...initialFormData,
        description: initialDescription || '',
        requires_replacement: requiresReplacement
      });
      
      console.log('✅ [CreateFailureWithRequisitionModal] Estado inicializado con requires_replacement:', requiresReplacement)
    } else {
      // Resetear vista previa cuando se cierra el modal
      setImagePreview(null);
    }
  }, [show, initialDescription, requiresReplacement]);

  // Efecto eliminado - no es necesario

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      requestedPartInfo: { ...prev.requestedPartInfo, [field]: value }
    }));
  };

  const autofillPartInfo = (part) => {
    setFormData(prev => ({
      ...prev,
      requestedPartInfo: {
        name: part.item_name || part.part_name || '',
        quantity: 1,
        category: part.category || 'Repuesto',
        urgency: 'NORMAL',
        description: part.description || part.details || ''
      }
    }));
  };

  // Flujo cuando se selecciona un repuesto del inventario
  const handlePartSelectedFromInventory = async (partData) => {
    if (!partData) {
      // Si no hay repuesto seleccionado, ir directamente a crear requisición
      setView('create_requisition');
      return;
    }

    setLoading(true);
    try {
      // Registrar repuesto en la orden de trabajo (sin consumir del inventario)
      if (workOrderId && partData.useExistingPart) {
        const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        
        // Agregar repuesto a la orden de trabajo
        const response = await axiosInstance.post(`${API_URL}/api/work-orders/${workOrderId}/parts`, {
          inventory_id: partData.inventoryId,
          quantity_requested: partData.quantityRequested,
          status: 'RESERVADO', // Estado de reservado para usar después
          notes: `Repuesto registrado desde checklist - se usará en próxima reparación`
        });

        if (response.data.success) {
          Swal.fire('✅ Repuesto Registrado',
            `Se ha registrado el uso de ${partData.quantityRequested} unidad(es) de "${partData.partData.item_name}" en la orden de trabajo.`,
            'success');
        }
      }

      // Continuar con el flujo - completar el checklist
      if (onSuccess) {
        onSuccess({
          action: 'part_registered',
          data: partData,
          workOrderId: workOrderId
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error registrando repuesto en orden de trabajo:', error);
      Swal.fire('Error', 'No se pudo registrar el repuesto en la orden de trabajo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePartNotFoundFromInventory = () => {
    // Repuesto no encontrado, proceder con requisición
    // Asegurar que tenemos un workOrderId antes de abrir el modal
    
    if (!workOrderId && !failureCreated) {
      // Si no hay workOrderId, marcar que hay una requisición pendiente
      setPendingRequisitionRequest(true);
      Swal.fire({
        title: 'Preparando requisición...',
        text: 'Se necesita crear la orden de trabajo primero.',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        // Crear la falla con requisición
        createFailureWithRequisition();
      });
    } else {
      // Ya tenemos workOrderId, abrir modal directamente
      setShowRequisitionModal(true);
    }
  };

  const handlePartNotFound = () => {
    setView('create_failure');
  };

  // Manejar éxito de requisición
  const handleRequisitionSuccess = (data) => {
    if (onSuccess) {
      onSuccess({
        action: 'requisition_created',
        data: data,
        workOrderId: workOrderId
      });
    }
    setShowRequisitionModal(false);
    setPendingRequisitionRequest(false);
    onClose();
  };

  // Crear falla con requisición
  const createFailureWithRequisition = async () => {
    if (!formData.description.trim()) {
      Swal.fire('Error', 'La descripción de la falla es requerida', 'error');
      return;
    }
    if (!checklistItemId) {
      Swal.fire('Error', 'No se ha proporcionado un ID de ítem de checklist. No se puede crear la falla.', 'error');
      return;
    }

    // 📤 DEBUG: Log antes de enviar datos
    console.log('📤 [CreateFailureWithRequisitionModal] Enviando datos para crear falla:')
    console.log('  - description:', formData.description)
    console.log('  - severity:', formData.severity)
    console.log('  - evidence_file:', formData.evidence_file)
    console.log('  - checklistItemId:', checklistItemId)
    console.log('  - requires_replacement:', formData.requires_replacement)
    console.log('  - requestedPartInfo:', formData.requestedPartInfo)

    setLoading(true);
    try {
      const result = await failureSystemHook.createFailureWithRequisition({
        description: formData.description,
        severity: formData.severity,
        assignedTechnicianArea: 'TECNICO', // Valor por defecto
        evidenceUrl: null,
        checklistItemId,
        requires_replacement: formData.requires_replacement,
        requestedPartInfo: formData.requestedPartInfo
      });

      if (result.success) {
        // ✅ IMPORTANTE: Marcar que la falla fue creada exitosamente
        setFailureCreated(true);
        
        // Guardar el failure_order_id
        const failureOrderId = result.data.failure_order_id || result.data.data?.failure_order_id;
        setFailureOrderId(failureOrderId);
        
        // Si no se creó automáticamente una WorkOrder, crearla manualmente
        let newWorkOrderId = result.data.work_order_id || result.data.data?.work_order_id || null;
        
        if (!newWorkOrderId && failureOrderId) {
          // Crear WorkOrder manualmente después de crear la FailureOrder
          try {
            const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
            const workOrderResponse = await axiosInstance.post(`${API_URL}/api/work-orders`, {
              failure_order_id: failureOrderId,
              description: `WorkOrder para falla ${failureOrderId}`,
              status: 'pending',
              priority: formData.severity === 'CRITICA' ? 'high' : 'normal'
            });
            
            newWorkOrderId = workOrderResponse.data.work_order_id;
            console.log('✅ WorkOrder creada manualmente:', newWorkOrderId);
          } catch (workOrderError) {
            console.error('Error creando WorkOrder:', workOrderError);
            Swal.fire('Error', 'Se creó la falla pero no se pudo crear la orden de trabajo', 'warning');
          }
        }
        
        setWorkOrderId(newWorkOrderId);
        
        // Si hay una requisición pendiente, abrir el modal de requisición
        if (pendingRequisitionRequest && failureOrderId) {
          setPendingRequisitionRequest(false);
          setShowRequisitionModal(true);
        } else {
          // Abrir automáticamente búsqueda de inventario
          setView('search_inventory');
        }
      } else {
        Swal.fire('Error', result.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error interno del servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityOptions = () => [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADA', label: 'Moderada' },
    { value: 'CRITICA', label: 'Crítica' }
  ];

  if (!show) return null;

  // Modal principal que contiene las diferentes vistas
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Vista de Crear Falla */}
        {view === 'create_failure' && (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Reportar Nueva Falla</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">🔄 Proceso de 2 pasos</h3>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li><strong>Paso 1:</strong> Describe la falla y haz clic en "Crear Falla"</li>
                <li><strong>Paso 2:</strong> Busca el repuesto en inventario automáticamente</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la Falla *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Describe la falla en detalle..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidad *</label>
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {getSeverityOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia de la Falla</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  setFormData(prev => ({ ...prev, evidence_file: file }))
                  
                  // Generar vista previa de la imagen
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      setImagePreview(e.target.result)
                    }
                    reader.readAsDataURL(file)
                  } else {
                    setImagePreview(null)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              
              {/* Vista previa de la imagen */}
              {imagePreview && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Vista previa de evidencia"
                      className="max-w-xs max-h-48 rounded-lg border border-gray-300 shadow-sm"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null)
                        setFormData(prev => ({ ...prev, evidence_file: null }))
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <button 
                onClick={createFailureWithRequisition} 
                disabled={loading} 
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Falla'}
              </button>
            </div>
          </div>
        )}

        {/* Vista de Búsqueda de Inventario */}
        {view === 'search_inventory' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Buscar Repuesto en Inventario</h2>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-900 mb-2">✅ Falla creada exitosamente</h3>
              <p className="text-sm text-green-700">Ahora busca el repuesto necesario para esta falla en el inventario.</p>
            </div>

            <InventorySearchModal
              show={true}
              onClose={() => setView('create_failure')}
              onPartSelected={handlePartSelectedFromInventory}
              onPartNotFound={handlePartNotFoundFromInventory}
              allowMultiple={true}
              requestedPartInfo={formData.requestedPartInfo}
              workOrderId={workOrderId}
              onMultiplePartsComplete={(parts) => {
                // Procesar múltiples partes seleccionadas
                parts.forEach(part => {
                  handlePartSelectedFromInventory(part);
                });
              }}
            />
          </div>
        )}

        {/* Vista de Confirmar Uso */}
        {view === 'confirm_use' && selectedPartFromInventory && (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Confirmar Uso de Repuesto</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">✅ Repuesto Encontrado</h3>
              <p className="text-sm text-green-700">El repuesto está disponible en inventario.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border">
              <h4 className="font-semibold text-gray-800">{selectedPartFromInventory.item_name}</h4>
              <p className="text-sm text-gray-600">Disponibles: {selectedPartFromInventory.quantity_available}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Utilizar *</label>
              <input
                type="number"
                min="1"
                max={selectedPartFromInventory.quantity_available}
                value={formData.requestedPartInfo.quantity}
                onChange={(e) => handlePartInfoChange('quantity', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={() => setView('search_inventory')} 
                className="text-sm text-gray-600 hover:underline"
              >
                ← Volver a buscar
              </button>
              <button 
                onClick={handleUseExistingPart} 
                disabled={loading} 
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar y Usar'}
              </button>
            </div>
          </div>
        )}

        {/* Vista de Crear Requisición - ELIMINADA: ahora se usa el modal separado */}

        {/* Vista de Gestionar Partes */}
        {view === 'manage_parts' && workOrderId && (
          <div className="p-6">
            <WorkOrderPartsManager
              show={true}
              workOrderId={workOrderId}
              onClose={() => {
                setWorkOrderId(null);
                setView('create_failure');
              }}
              onSuccess={() => onClose()}
            />
          </div>
        )}
      </div>

      {/* Modal de Requisición */}
      <CreateRequisitionModal
        show={showRequisitionModal}
        onClose={() => setShowRequisitionModal(false)}
        onSuccess={handleRequisitionSuccess}
        failureOrderId={failureOrderId}
        workOrderId={workOrderId}
        partInfo={formData.requestedPartInfo}
        failureInfo={{
          description: formData.description,
          severity: formData.severity
        }}
      />
    </div>
  );
};

export default CreateFailureWithRequisitionModal;