"use client";
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';
import GuidanceTextModal from './GuidanceTextModal';
import CloseFailureModal from './CloseFailureModal';
import RecurringFailureModal from './RecurringFailureModal';
import WorkOrderStatusIndicator from './WorkOrderStatusIndicator';
import ActiveFailuresList from './ActiveFailuresList';
import { useWorkOrderDetection } from './hooks/useWorkOrderDetection';

// Componente Memoizado para optimizar el rendimiento de las opciones de radio.
const RadioOption = React.memo(({ value, label, color, isSelected, isDisabled, onChange }) => (
  <label className={`
    flex items-center p-3 border rounded-lg 
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer hover:bg-${color}-50`}
    ${isSelected ? `bg-${color}-100 border-${color}-500 border-2` : 'border-gray-200'}
    transition-all duration-200 ease-in-out
  `}>
    <input
      type="radio"
      className={`form-radio h-4 w-4 text-${color}-600 transition-all duration-200 ease-in-out`}
      checked={isSelected}
      onChange={() => !isDisabled && onChange()}
      disabled={isDisabled}
    />
    <span className={`ml-2 text-sm font-medium ${isSelected ? `text-${color}-800` : 'text-gray-700'}`}>{label}</span>
  </label>
));

// Componente para el grupo de radio buttons
const RadioGroup = React.memo(({ uniqueId, currentResponse, itemDisabled, handleResponseChange }) => {
  const options = [
    { value: 'cumple', label: '✅ Cumple', color: 'green' },
    { value: 'observación', label: '⚠️ Observación', color: 'yellow' },
    { value: 'no cumple', label: '❌ No Cumple', color: 'red' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {options.map(option => (
        <RadioOption
          key={option.value}
          value={option.value}
          label={option.label}
          color={option.color}
          isSelected={currentResponse?.response_compliance === option.value}
          isDisabled={itemDisabled}
          onChange={() => handleResponseChange(uniqueId, "response_compliance", option.value)}
        />
      ))}
    </div>
  );
});

// Componente mejorado para renderizar ítems con integración de WorkOrders
const ChecklistItemRenderer = React.memo((props) => {
  const {
    item,
    level = 0,
    itemResponses,
    handleResponseChange,
    handleFileUpload,
    getEvidenceUrl,
    handleMarkAllSiblings,
    isFamilyChecklist,
    config,
    disabled = false,
    isItemUnlocked,
    onUnlockSection,
    user,
    activeWorkOrders, // ✅ NUEVO: Array de work orders activas
    onRecurringFailureClick,
  } = props;

  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  
  if (!item) return null;

  const uniqueId = item.unique_frontend_id || item.checklist_item_id;
  const currentResponse = itemResponses[uniqueId] || {};

  const isItemDirectlyUnlocked = isItemUnlocked ? isItemUnlocked(item.checklist_item_id) : true;
  const isParentUnlocked = item.parent_item_id && isItemUnlocked ? isItemUnlocked(item.parent_item_id) : false;
  const isUnlocked = isItemDirectlyUnlocked || isParentUnlocked;
  
  // El item está deshabilitado si el checklist general está deshabilitado, o si el sistema de QR está activo y el item no está desbloqueado.
  const itemDisabled = disabled || (isItemUnlocked && !isUnlocked);
  // El bloqueo por QR solo se muestra si el checklist no está deshabilitado por otra razón y el item no está desbloqueado.
  const qrLocked = !disabled && isItemUnlocked && !isUnlocked;

  const renderInputField = () => {
    switch (item.input_type) {
      case 'radio':
        return (
          <RadioGroup
            uniqueId={uniqueId}
            currentResponse={currentResponse}
            itemDisabled={itemDisabled}
            handleResponseChange={(id, field, value) => {
              const workOrdersForItem = (activeWorkOrders || []).filter(wo => wo.checklist_item_id === item.checklist_item_id);

              // NUEVO: Bloquear marcar como "cumple" si hay fallas activas.
              if (field === 'response_compliance' && value === 'cumple' && workOrdersForItem.length > 0) {
                Swal.fire({
                  icon: 'error',
                  title: 'Acción no permitida',
                  text: 'Este ítem tiene fallas activas y no puede ser marcado como "Cumple". Resuelva las fallas primero.',
                  confirmButtonColor: '#d33',
                });
                return; // Prevenir el cambio de estado.
              }

              // Lógica para fallas recurrentes
              if (field === 'response_compliance' &&
                  (value === 'no cumple' || value === 'observación') &&
                  workOrdersForItem.length > 0) {
                
                handleResponseChange(id, field, value);
                
                const responseData = {
                  uniqueId: id,
                  response_compliance: value,
                  comment: currentResponse?.comment || '',
                  evidence_url: currentResponse?.evidence_url || ''
                };
                
                onRecurringFailureClick(workOrdersForItem, responseData);
                return;
              }
              
              // Si no hay condiciones especiales, actualizar la respuesta.
              handleResponseChange(id, field, value);
            }}
          />
        );
      case 'numeric':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta Numérica:</label>
            <input
              type="number"
              className={`w-full p-2 border rounded-md ${itemDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              value={currentResponse?.response_numeric ?? ''}
              onChange={(e) => !itemDisabled && handleResponseChange(uniqueId, "response_numeric", e.target.value)}
              placeholder="Ingrese un valor numérico"
              disabled={itemDisabled}
            />
          </div>
        );
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observación:</label>
            <textarea
              className={`w-full p-2 border rounded-md ${itemDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows="3"
              value={currentResponse?.response_text ?? ''}
              onChange={(e) => !itemDisabled && handleResponseChange(uniqueId, "response_text", e.target.value)}
              placeholder="Ingrese texto libre"
              disabled={itemDisabled}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // ✅ NUEVO: Determinar si mostrar WorkOrderStatusIndicator (obsoleto, se usa ActiveFailuresList)
  const shouldShowWorkOrder = activeWorkOrders && activeWorkOrders.length > 0 &&
    (currentResponse?.response_compliance === 'no cumple' ||
     currentResponse?.response_compliance === 'observación');

  return (
    <div
      style={{ marginLeft: `${level * 20}px` }}
      className={`mb-4 ${item.input_type === "section" || item.subItems?.length > 0 ? "bg-gray-50 p-3 rounded-lg" : "border border-gray-200 rounded-lg p-4"} ${qrLocked ? 'relative' : ''}`}
    >
      {qrLocked && (
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none z-10 rounded-lg" />
      )}
      
      <div className="flex items-center mb-2 flex-wrap">
        <span className={`${item.input_type === "section" ? "text-lg font-bold" : "text-md font-medium"} text-gray-900`}>
          {item.item_number}. {item.question_text}
        </span>
        
        {qrLocked && (
          <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">
            🔒 QR
          </span>
        )}
        
        {qrLocked && onUnlockSection && (
          <button
            onClick={() => onUnlockSection(item)}
            className="ml-2 px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-xs"
          >
            📱 Desbloquear
          </button>
        )}
        
        {item.guidance_text && (
          <button 
            onClick={() => setShowGuidanceModal(true)} 
            className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
          >
            ℹ️
          </button>
        )}

        {(item.input_type === "section" || (config?.category === 'Atracción' && item.subItems?.length > 0)) && !isFamilyChecklist && (
          <button
            onClick={() => {
              if (itemDisabled || !item.subItems?.length) return;

              const firstSubItem = item.subItems[0];
              const firstSubItemUniqueId = firstSubItem.unique_frontend_id || firstSubItem.checklist_item_id;
              const responseTypeToApply = itemResponses[firstSubItemUniqueId]?.response_compliance || "cumple";

              // Si la acción es marcar como "cumple", verificar que ningún hijo tenga fallas.
              if (responseTypeToApply === 'cumple') {
                const subItemWithFailure = item.subItems.find(subItem => 
                  (activeWorkOrders || []).some(wo => wo.checklist_item_id === subItem.checklist_item_id)
                );

                if (subItemWithFailure) {
                  Swal.fire({
                    icon: 'error',
                    title: 'Acción no permitida',
                    text: `No se pueden marcar todos como "Cumple" porque el ítem "${subItemWithFailure.item_number}" (y posiblemente otros) tiene fallas activas.`,
                    confirmButtonColor: '#d33',
                  });
                  return;
                }
              }

              // Si las validaciones pasan, proceder a marcar todos.
              handleMarkAllSiblings(item.checklist_item_id, item.type?.family_id ? firstSubItem.inspectable_id_for_response : null, responseTypeToApply);
            }}
            className={`ml-auto px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs ${itemDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={itemDisabled || !item.subItems?.length}
          >
            Marcar todos como "{currentResponse?.response_compliance || 'Cumple'}"
          </button>
        )}
      </div>

      {item.guidance_text && showGuidanceModal && (
        <GuidanceTextModal 
          show={showGuidanceModal}
          onClose={() => setShowGuidanceModal(false)}
          guidanceText={item.guidance_text}
        />
      )}

      {item.input_type !== "section" && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          {renderInputField()}
          
          {(currentResponse?.response_compliance === "observación" || currentResponse?.response_compliance === "no cumple") && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario Adicional:</label>
                <textarea
                  className={`w-full p-2 border rounded-md ${itemDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  rows="2"
                  value={currentResponse?.comment ?? ""}
                  onChange={(e) => !itemDisabled && handleResponseChange(uniqueId, "comment", e.target.value)}
                  disabled={itemDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidencia:</label>
                <input
                  type="file"
                  accept="image/*"
                  className={`w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 ${itemDisabled ? 'cursor-not-allowed' : ''}`}
                  onChange={(e) => !itemDisabled && handleFileUpload(uniqueId, e.target.files[0])}
                  disabled={itemDisabled}
                />
                {currentResponse?.evidence_url && (
                  <div className="mt-2">
                    <p className="text-sm">Vista previa:</p>
                    <img
                      src={getEvidenceUrl(currentResponse.evidence_url)}
                      alt="Evidencia"
                      className="max-w-full h-auto max-h-32 rounded-md border"
                    />
                  </div>
                )}
              </div>

              {/* ✅ CORREGIDO: Lista de fallas activas (solo si hay work orders para ESTE ítem) */}
              {(activeWorkOrders || []).filter(wo => wo.checklist_item_id === item.checklist_item_id).length > 0 && (
                <div className="mt-4">
                  <ActiveFailuresList
                    workOrders={(activeWorkOrders || []).filter(wo => wo.checklist_item_id === item.checklist_item_id)}
                    user={user}
                    onUpdate={() => {
                      // Callback para actualizar la lista de work orders después de acciones
                      // Se actualizará automáticamente a través del hook en el componente padre
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {item.subItems?.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          {item.subItems.map((subItem) => (
            <ChecklistItemRenderer
              key={subItem.unique_frontend_id || subItem.checklist_item_id}
              item={subItem}
              level={level + 1}
              itemResponses={itemResponses}
              handleResponseChange={handleResponseChange}
              handleFileUpload={handleFileUpload}
              getEvidenceUrl={getEvidenceUrl}
              handleMarkAllSiblings={handleMarkAllSiblings}
              isFamilyChecklist={isFamilyChecklist}
              config={config}
              disabled={itemDisabled} // Los hijos heredan el estado de deshabilitado del padre
              isItemUnlocked={isItemUnlocked}
              onUnlockSection={onUnlockSection}
              user={user}
              activeWorkOrders={activeWorkOrders}
              onRecurringFailureClick={onRecurringFailureClick}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Componente principal de la sección de checklist
const ChecklistSection = (props) => {
  const {
    checklist,
    itemResponses,
    handleResponseChange,
    handleFileUpload,
    // getEvidenceUrl, // No longer used from props
    handleMarkAllSiblings,
    error,
    user,
    config,
    disabled = false,
    isItemUnlocked,
    onUnlockSection,
    isFamilyChecklist,
  } = props;

  // Define a local, corrected version of getEvidenceUrl
  const getEvidenceUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
    return `${API_URL}${url}`;
  };
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showCloseFailureModal, setShowCloseFailureModal] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState(null);
  
  // Estados para manejo de fallas recurrentes
  const [showRecurringFailureModal, setShowRecurringFailureModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  // Hook para detectar WorkOrders pendientes
  const workOrderDetection = useWorkOrderDetection(checklist, checklist?.items, user);

  useEffect(() => {
    if (user && checklist?.signatures) {
      const hasTechnicalSignature = checklist.signatures.some(
        sig => [7, '7'].includes(sig.role_id) || [7, '7'].includes(sig.role_at_signature) || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklist.signatures.some(
        sig => [4, '4'].includes(sig.role_id) || [4, '4'].includes(sig.role_at_signature) || sig.role?.role_name === 'Jefe de Operaciones'
      );

      const locked = hasTechnicalSignature && hasOperationsSignature;
      setIsLocked(locked);
      setLockReason(locked ? 'Este checklist ha sido firmado por el Técnico de mantenimiento y el Jefe de Operaciones.' : '');
    }
  }, [checklist?.signatures, user]);

  const handleCloseFailureSubmit = async (failureId, solutionText, responsibleArea) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
await axiosInstance.put(
        `${API_URL}/api/work-orders/${failureId}`,
        {
          solution_text: solutionText,
          responsible_area: responsibleArea,
          status: "resuelto",
          closed_by: user.user_id,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setShowCloseFailureModal(false);
      setSelectedFailure(null);
      Swal.fire("¡Falla Cerrada!", "La falla ha sido resuelta exitosamente.", "success");
    } catch (err) {
      console.error("Error cerrando falla:", err);
      Swal.fire("Error", `Error al cerrar la falla: ${err.message}`, "error");
    }
  };

  // ✅ NUEVA FUNCIÓN: Para manejar fallas recurrentes con múltiples work orders
  const handleRecurringFailureClick = (workOrders, responseData) => {
    // 🔍 DEBUG: Mostrar detección de falla recurrente
    console.log('🚨 DEBUG: Falla recurrente detectada!', {
      workOrdersCount: workOrders?.length || 0,
      userAction: 'Usuario marcó respuesta en ítem con OT pendiente',
      responseData
    });
    
    // Convertir a array si es un solo objeto
    const workOrdersArray = Array.isArray(workOrders) ? workOrders : [workOrders];
    
    // Añadir datos de la respuesta a cada work order para el modal
    const workOrdersWithResponse = workOrdersArray.map(wo => ({
      ...wo,
      userResponse: responseData?.response_compliance,
      userComment: responseData?.comment,
      userEvidence: responseData?.evidence_url,
      uniqueResponseId: responseData?.uniqueId
    }));
    
    setSelectedWorkOrder(workOrdersWithResponse);
    setShowRecurringFailureModal(true);
  };

  const handleRecurringFailureSuccess = (action, data, updatedResponseData) => {
    // Si es mantener falla y hay datos actualizados, actualizar la respuesta
    if (action === 'maintain' && updatedResponseData?.updated && selectedWorkOrder) {
      // Actualizar los datos de respuesta en el estado del checklist
      if (updatedResponseData.uniqueResponseId && updatedResponseData.comment) {
        handleResponseChange(
          updatedResponseData.uniqueResponseId,
          "comment",
          updatedResponseData.comment
        );
      }
      
      // Mostrar mensaje de éxito específico para mantener
      Swal.fire(
        '¡Falla Mantenida!',
        'La falla ha sido mantenida y el comentario actualizado.',
        'success'
      );
    } else {
      // Para otras acciones, mostrar mensajes estándar
      const messages = {
        'new': 'Nueva falla creada exitosamente.',
        'resolve': 'Falla resuelta exitosamente.'
      };
      
      Swal.fire('¡Éxito!', messages[action] || 'Acción completada exitosamente.', 'success');
    }
    
    // Actualizar la lista de WorkOrders (común para todas las acciones)
    workOrderDetection.refreshWorkOrders();
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-red-600 mb-4">Error al cargar</h2>
        <p className="text-gray-700">{error}</p>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Checklist no encontrado</h2>
        <p className="text-gray-700">No se encontró un checklist o aún no se ha creado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-semibold text-gray-800">{checklist?.name || 'Checklist de Inspección'}</h2>
        {isLocked && (
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">🔒 Bloqueado</div>
        )}
      </div>

      {isLocked && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4 rounded">
          <p className="font-medium">Checklist bloqueado:</p>
          <p>{lockReason}</p>
        </div>
      )}

      {disabled && !isItemUnlocked && (
        <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-4 rounded">
          <p className="font-medium">📱 QR Requerido</p>
          <p>Debes escanear el código QR para comenzar o continuar con el checklist.</p>
        </div>
      )}

      {showCloseFailureModal && selectedFailure && (
        <CloseFailureModal
          show={showCloseFailureModal}
          onClose={() => {
            setShowCloseFailureModal(false);
            setSelectedFailure(null);
          }}
          failure={selectedFailure}
          onSubmit={handleCloseFailureSubmit}
          userId={user?.user_id}
        />
      )}

      {/* ✅ NUEVO: Modal de fallas recurrentes mejorado */}
      {showRecurringFailureModal && selectedWorkOrder && (
        <RecurringFailureModal
          isOpen={showRecurringFailureModal}
          onClose={() => {
            // ✅ LIMPIAR ESTADO AL CERRAR MODAL
            setShowRecurringFailureModal(false);
            setSelectedWorkOrder(null);
          }}
          workOrders={selectedWorkOrder} // ✅ NUEVO: Pasar array de work orders
          user={user}
          onSuccess={handleRecurringFailureSuccess}
          onWorkOrdersUpdate={() => {
            workOrderDetection.refreshWorkOrders();
          }}
          responseData={{
            userResponse: selectedWorkOrder[0]?.userResponse, // Usar primera work order para datos de respuesta
            userComment: selectedWorkOrder[0]?.userComment,
            userEvidence: selectedWorkOrder[0]?.userEvidence,
            uniqueResponseId: selectedWorkOrder[0]?.uniqueResponseId
          }}
        />
      )}

      {checklist.items?.map((item) => {
        // ✅ NUEVO: Obtener todas las work orders activas para este ítem
        const activeWorkOrders = workOrderDetection.getWorkOrderForItem(item);
        
        // 🔍 DEBUG: Mostrar qué ítems tienen OTs asignadas
        if (activeWorkOrders && activeWorkOrders.length > 0) {
          console.log(`🔍 DEBUG: Ítem "${item.item_number}" tiene ${activeWorkOrders.length} OT(s) activa(s):`, {
            itemId: item.checklist_item_id,
            itemNumber: item.item_number,
            activeWorkOrdersCount: activeWorkOrders.length,
            workOrders: activeWorkOrders.map(wo => ({
              id: wo.id,
              status: wo.status,
              description: wo.description?.substring(0, 30) + '...'
            }))
          });
        }
        
        return (
          <ChecklistItemRenderer
            key={item.unique_frontend_id || item.checklist_item_id}
            item={item}
            itemResponses={itemResponses}
            handleResponseChange={handleResponseChange}
            handleFileUpload={handleFileUpload}
            getEvidenceUrl={getEvidenceUrl}
            handleMarkAllSiblings={handleMarkAllSiblings}
            isFamilyChecklist={isFamilyChecklist}
            config={config}
            disabled={disabled || isLocked}
            isItemUnlocked={isItemUnlocked}
            onUnlockSection={onUnlockSection}
            user={user}
            activeWorkOrders={activeWorkOrders} // ✅ NUEVO: Pasar array de work orders activas
            onRecurringFailureClick={handleRecurringFailureClick}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ChecklistSection);