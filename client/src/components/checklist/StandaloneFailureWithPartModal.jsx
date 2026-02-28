'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import InventorySearchModal from './InventorySearchModal';
import CreateRequisitionModal from './requisitions/CreateRequisitionModal';
import SignaturePad from './SignaturePad';
import axiosInstance from '../../utils/axiosConfig';

const StandaloneFailureWithPartModal = ({
  show,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  
  const initialFormData = {
    description: '',
    categoria: 'TECNICA',
    severity: 'LEVE',
    evidenceFile: null,
    evidencePreview: null,
    signatureData: null,
    needsSignature: false,
    selectedParts: [], // Array para los repuestos seleccionados del inventario
    assignedTechnicianArea: 'TECNICO'
  };

  const [formData, setFormData] = useState(initialFormData);
  const [view, setView] = useState('create_ot_failure');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Estados para controlar el flujo
  const [workOrderId, setWorkOrderId] = useState(null);
  const [failureOrderId, setFailureOrderId] = useState(null);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [ordersCreated, setOrdersCreated] = useState(false);
  const [linkedParts, setLinkedParts] = useState([]); // Repuestos ya enlazados
  const [loadingParts, setLoadingParts] = useState(false);

  // Resetear estado cuando el modal se cierra o se abre
  useEffect(() => {
    if (show) {
      setView('create_ot_failure');
      setFailureOrderId(null);
      setWorkOrderId(null);
      setShowRequisitionModal(false);
      setShowInventoryModal(false);
      setOrdersCreated(false);
      setLinkedParts([]);
      setFormData(initialFormData);
    }
  }, [show]);

  // Cargar repuestos ya enlazados desde work order parts
  const loadLinkedParts = async () => {
    if (!workOrderId) {
      setLinkedParts([]);
      return;
    }
    
    setLoadingParts(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      const response = await axiosInstance.get(`${API_URL}/api/work-orders/${workOrderId}/parts`);
      
      if (response.data.success) {
        // Transformar los datos para incluir información del inventario
        const partsWithInventoryInfo = response.data.data.map(part => ({
          ...part,
          partName: part.inventory?.part_name || `Repuesto ID: ${part.inventory_id}`,
          partCategory: part.inventory?.category || 'Repuesto',
          partLocation: part.inventory?.location || 'No especificado',
          inventoryAvailable: part.inventory?.quantity || 0
        }));
        
        setLinkedParts(partsWithInventoryInfo);
      } else {
        // Si la respuesta no es exitosa, simplemente establecer lista vacía
        setLinkedParts([]);
      }
    } catch (error) {
      console.error('Error cargando repuestos enlazados:', error);
      // En lugar de mostrar error, simplemente establecer lista vacía
      setLinkedParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Enlazar repuestos seleccionados al work order parts y al inventario
  const handlePartsSelected = async (selectedParts) => {
    if (!workOrderId || !selectedParts || (Array.isArray(selectedParts) && selectedParts.length === 0) || (!Array.isArray(selectedParts) && !Object.keys(selectedParts).length)) {
      setShowInventoryModal(false);
      return;
    }

    setLoadingParts(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Asegurar que selectedParts es un array
      const partsToProcess = Array.isArray(selectedParts) ? selectedParts : [selectedParts];
      
      // Procesar cada repuesto seleccionado
      for (const part of partsToProcess) {
        try {
          // Registrar en work order parts
          const workOrderPartResponse = await axiosInstance.post(`${API_URL}/api/work-orders/${workOrderId}/parts`, {
            inventory_id: part.inventoryId,
            quantity_requested: part.quantityRequested,
            status: 'ASIGNADO',
            notes: `Repuesto usado en reparación de falla ${failureOrderId}`
          });

          if (workOrderPartResponse.data.success) {
            // Descontar del inventario
            await axiosInstance.put(`${API_URL}/api/inventory/${part.inventoryId}/decrement`, {
              quantity: part.quantityRequested,
              reason: `Usado en falla ${failureOrderId}`,
              workOrderId: workOrderId
            });

            console.log(`✅ Repuesto ${part.partData?.item_name || part.inventoryId} enlazado y descontado del inventario`);
          }
        } catch (partError) {
          console.error(`Error procesando repuesto ${part.inventoryId}:`, partError);
          // Continuar con los otros repuestos aunque uno falle
        }
      }

      // Cerrar modal y recargar repuestos
      setShowInventoryModal(false);
      await loadLinkedParts();
      
      Swal.fire('✅ Repuestos Enlazados',
        `${partsToProcess.length} repuesto(s) enlazado(s) exitosamente a la orden de trabajo`,
        'success');
        
    } catch (error) {
      console.error('Error enlazando repuestos:', error);
      setShowInventoryModal(false);
      await loadLinkedParts(); // Recargar de todas formas para mostrar los que sí se enlazaron
      Swal.fire('Advertencia', 'Algunos repuestos pudieron no haberse enlazado correctamente. Verifique la tabla para confirmar.', 'warning');
    } finally {
      setLoadingParts(false);
    }
  };

  const removePart = async (index) => {
    const partToRemove = linkedParts[index];
    if (!partToRemove) return;

    // Confirmar eliminación
    const result = await Swal.fire({
      title: '¿Eliminar repuesto?',
      text: 'Se eliminará el repuesto de la orden de trabajo y se devolverá al inventario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoadingParts(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Eliminar del work order parts usando el ID de la relación
      await axiosInstance.delete(`${API_URL}/api/work-orders/${workOrderId}/parts/${partToRemove.id}`);
      
      // Devolver la cantidad al inventario
      await axiosInstance.put(`${API_URL}/api/inventory/${partToRemove.inventory_id}/increment`, {
        quantity: partToRemove.quantity_used,
        reason: `Eliminado de falla ${failureOrderId}`,
        workOrderId: workOrderId
      });

      // Recargar la lista
      await loadLinkedParts();
      
      Swal.fire('✅ Repuesto Eliminado',
        `Se eliminó el repuesto de la orden de trabajo y se devolvió al inventario`,
        'success');
        
    } catch (error) {
      console.error('Error eliminando repuesto:', error);
      setLoadingParts(false);
      Swal.fire('Error', 'No se pudo eliminar el repuesto: ' + error.message, 'error');
      return;
    }
    setLoadingParts(false);
  };

  const handleEvidenceChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        evidenceFile: file,
        evidencePreview: URL.createObjectURL(file)
      }));
    }
  };

  const removeEvidence = () => {
    setFormData(prev => ({
      ...prev,
      evidenceFile: null,
      evidencePreview: null
    }));
    setImagePreview(null);
  };

  // Flujo cuando se selecciona un repuesto del inventario
  const handlePartSelectedFromInventory = async (partData) => {
    if (!partData) {
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
          notes: `Repuesto registrado desde falla independiente - se usará en próxima reparación`
        });

        if (response.data.success) {
          Swal.fire('✅ Repuesto Registrado',
            `Se ha registrado el uso de ${partData.quantityRequested} unidad(es) de "${partData.partData.item_name}" en la orden de trabajo.`,
            'success');
        }
      }

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
    if (!workOrderId) {
      // Si no hay workOrderId, marcar que hay una requisición pendiente
      setShowRequisitionModal(true);
    } else {
      setShowRequisitionModal(true);
    }
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
    onClose();
  };

  // Funciones de manejo de firma
  const handleSignatureSave = (signatureData) => {
    setFormData(prev => ({ ...prev, signatureData, needsSignature: true }));
    setShowSignaturePad(false);
  };

  const handleCloseSignaturePad = () => {
    setShowSignaturePad(false);
  };

  const requireSignature = () => {
    if (!formData.signatureData) {
      setShowSignaturePad(true);
      return true;
    }
    return false;
  };

  // Paso 1: Crear solo la Orden de Falla y Orden de Trabajo
  const createOrdersOnly = async () => {
    if (!formData.description.trim()) {
      Swal.fire('Error', 'La descripción de la falla es requerida', 'error');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Crear FormData para enviar la falla
      const submitData = new FormData();
      submitData.append('description', formData.description);
      submitData.append('categoria', formData.categoria);
      submitData.append('severity', formData.severity);
      submitData.append('requiresReplacement', true); // Crear OT automáticamente
      submitData.append('assignedTechnicianArea', formData.assignedTechnicianArea);
      
      // Agregar evidencia si se seleccionó un archivo
      if (formData.evidenceFile) {
        submitData.append('evidence', formData.evidenceFile);
      }

      // Crear OF independiente (que automáticamente crea OT si requiresReplacement=true)
      const response = await axiosInstance.post(`${API_URL}/api/failures/independent`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const failureOrder = response.data.data;
        setFailureOrderId(failureOrder.id);
        
        // Si se creó una OT automáticamente, obtener su ID
        let newWorkOrderId = null;
        if (failureOrder.workOrder && failureOrder.workOrder.id) {
          newWorkOrderId = failureOrder.workOrder.id;
        }
        
        setWorkOrderId(newWorkOrderId);
        setOrdersCreated(true);
        setView('select_parts_signature');
        
        const failureOrderId = failureOrder.failure_order_id || failureOrder.id;
        const workOrderIdDisplay = failureOrder.workOrder ?
          (failureOrder.workOrder.work_order_id || failureOrder.workOrder.id) : 'N/A';
        
        Swal.fire('✅ Órdenes Creadas Exitosamente',
          `Se crearon la Orden de Falla ${failureOrderId} y la Orden de Trabajo ${workOrderIdDisplay}`,
          'success');
      } else {
        throw new Error(response.data.error || 'No se pudieron crear las órdenes.');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Procesar repuestos y firma
  const processPartsAndSignature = async () => {
    if (linkedParts.length === 0) {
      Swal.fire('Error', 'Debe enlazar al menos un repuesto a la orden de trabajo', 'error');
      return;
    }

    if (!formData.signatureData) {
      setShowSignaturePad(true);
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      
      // Crear la firma en la Orden de Falla
      const signatureResponse = await axiosInstance.post(`${API_URL}/api/failures/${failureOrderId}/signatures`, {
        signatureData: formData.signatureData,
        signatureType: 'REPORT',
        userName: user.user_name,
        roleName: user.role_name
      });

      if (!signatureResponse.data.success) {
        throw new Error(signatureResponse.data.error || 'No se pudo crear la firma.');
      }
      
      // Los repuestos ya están enlazados en work order parts, solo firmar la falla
      try {
        // Ya no necesitamos registrar repuestos aquí porque ya están enlazados
        // Solo confirmar que están enlazados
        const partsCount = linkedParts.length;

        Swal.fire('✅ Proceso Completado',
          `Falla firmada y ${partsCount} repuesto(s) ya enlazado(s) a la orden de trabajo.`,
          'success');
      } catch (partsError) {
        console.error('Error procesando repuestos:', partsError);
        Swal.fire('⚠️ Falla Firmada con Advertencia',
          'La falla se firmo exitosamente, pero hubo un error procesando algunos repuestos. Contacte al administrador.',
          'warning');
      }
      
      if (onSuccess) onSuccess({ failureOrderId, workOrderId });
      onClose();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityOptions = () => [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADA', label: 'Moderada' },
    { value: 'CRITICA', label: 'Crítica' }
  ];

  const getCategoriaOptions = () => [
    { value: 'TECNICA', label: 'Técnica' },
    { value: 'OPERATIVA', label: 'Operativa' },
    { value: 'LOCATIVA', label: 'Locativa' }
  ];

  const getTechnicianAreaOptions = () => [
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'OPERACION', label: 'Operación' }
  ];

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Paso 1: Crear Orden de Falla y Orden de Trabajo */}
        {view === 'create_ot_failure' && (
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reportar Falla - Paso 1 de 2</h2>
              <p className="text-gray-600 mt-2">Crear Orden de Falla (OF) y Orden de Trabajo (OT)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 Información Básica</h3>
              <p className="text-sm text-blue-700">Complete los datos básicos de la falla para crear las órdenes</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {getCategoriaOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área Asignada</label>
              <select
                value={formData.assignedTechnicianArea}
                onChange={(e) => handleInputChange('assignedTechnicianArea', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {getTechnicianAreaOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Campo de Evidencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evidencia de la Falla (Opcional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {!formData.evidencePreview ? (
                  <div className="text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEvidenceChange}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="cursor-pointer inline-flex flex-col items-center space-y-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm font-medium">Subir foto de la falla</span>
                      <span className="text-xs">PNG, JPG hasta 10MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={formData.evidencePreview}
                      alt="Evidencia"
                      className="max-w-full h-32 object-cover rounded mx-auto"
                    />
                    <button
                      type="button"
                      onClick={removeEvidence}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

          <div className="space-y-4">
            {/* Botón de salir sin guardar más prominente */}
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-red-600 shadow-md flex items-center gap-3"
              >
                <span className="text-xl">❌</span>
                <span>Salir Sin Guardar</span>
              </button>
            </div>
            
            <div className="text-center">
              <span className="text-sm text-gray-500">¿No deseas continuar? Puedes salir sin guardar</span>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={createOrdersOnly}
                disabled={loading || !formData.description.trim()}
                className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                {loading ? 'Creando Órdenes...' : 'Crear OF y OT ✅'}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Paso 2: Seleccionar Repuestos y Firmar */}
        {view === 'select_parts_signature' && (
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reportar Falla - Paso 2 de 2</h2>
              <p className="text-gray-600 mt-2">Seleccionar repuestos y firmar</p>
              
              {ordersCreated && failureOrderId && workOrderId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-800">
                    ✅ <strong>OF-{failureOrderId}</strong> y <strong>OT-{workOrderId}</strong> creadas exitosamente
                  </p>
                </div>
              )}
            </div>

            {/* Enlazados a Orden de Trabajo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">🔧 Repuestos Enlazados a OT-{workOrderId}</h4>
              
              {loadingParts ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Cargando repuestos...</p>
                </div>
              ) : linkedParts.length === 0 ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowInventoryModal(true)}
                    className="w-full py-6 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-sm font-medium">Seleccionar Repuestos del Inventario</span>
                    <span className="text-xs block">Haga clic para buscar y enlazar repuestos necesarios</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">
                      {linkedParts.length} repuesto(s) enlazado(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowInventoryModal(true)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      + Enlazar más
                    </button>
                  </div>
                  
                  {/* Tabla de repuestos enlazados */}
                  <div className="overflow-hidden border border-blue-200 rounded-lg">
                    <table className="min-w-full divide-y divide-blue-200">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Repuesto</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Cantidad</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Categoría</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Ubicación</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Disponible</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-blue-800 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-200">
                        {linkedParts.map((part, index) => (
                          <tr key={part.id}>
                            <td className="px-3 py-2 text-sm text-gray-900 font-medium">{part.partName}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                {part.quantity_used}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{part.partCategory}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{part.partLocation}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{part.inventoryAvailable}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removePart(index)}
                                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                              >
                                🗑️ Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Campo de Firma Obligatoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firma del Reporte <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {!formData.signatureData ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="cursor-pointer inline-flex flex-col items-center space-y-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-sm font-medium">Firmar reporte de la falla</span>
                      <span className="text-xs">Su firma es requerida para continuar</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="bg-white border rounded p-2">
                      <img
                        src={formData.signatureData}
                        alt="Firma"
                        className="max-w-full h-24 mx-auto"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-blue-600"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>

          <div className="space-y-4">
            {/* Botón de salir sin guardar más prominente */}
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-red-600 shadow-md flex items-center gap-3"
              >
                <span className="text-xl">❌</span>
                <span>Salir Sin Guardar</span>
              </button>
            </div>
            
            <div className="text-center">
              <span className="text-sm text-gray-500">¿No deseas continuar? Puedes salir sin guardar</span>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={processPartsAndSignature}
                disabled={loading || linkedParts.length === 0 || !formData.signatureData}
                className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                {loading ? 'Procesando...' : 'Finalizar Proceso ✅'}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Vista de Búsqueda de Inventario */}
        {view === 'search_inventory' && (
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Buscar Repuesto en Inventario</h2>
              <p className="text-gray-600">Busca y selecciona los repuestos necesarios para reparar esta falla</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-900 mb-2">✅ Falla creada exitosamente</h3>
              <p className="text-sm text-green-700">Ahora busca el repuesto necesario para esta falla en el inventario.</p>
            </div>

            <div className="flex justify-center mb-6">
              <button
                onClick={() => setView('create_ot_failure')}
                className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-red-600 shadow-md flex items-center gap-2"
              >
                <span>❌</span>
                <span>Salir Sin Buscar Repuestos</span>
              </button>
            </div>

            <InventorySearchModal
              show={true}
              onClose={() => setView('create_ot_failure')}
              onPartSelected={handlePartSelectedFromInventory}
              onPartNotFound={handlePartNotFoundFromInventory}
              allowMultiple={true}
              requestedPartInfo={{}}
              workOrderId={workOrderId}
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
        partInfo={{}}
        failureInfo={{
          description: formData.description,
          severity: formData.severity
        }}
      />

      {/* Modal de Firma */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={handleCloseSignaturePad}
        />
      )}

      {/* Modal de Inventario para Selección de Repuestos */}
      <InventorySearchModal
        show={showInventoryModal}
        onClose={() => {
          // Al cerrar el modal, recargar los repuestos enlazados
          loadLinkedParts();
          setShowInventoryModal(false);
        }}
        onPartSelected={handlePartsSelected}
        onPartNotFound={() => {
          // Al cancelar, solo cerrar el modal
          setShowInventoryModal(false);
        }}
        allowMultiple={true}
        selectedParts={[]} // No pasa repuestos seleccionados ya que se cargan desde la DB
        workOrderId={workOrderId}
        failureOrderId={failureOrderId}
      />
    </div>
  );
};

export default StandaloneFailureWithPartModal;