"use client";
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';
import GuidanceTextModal from './GuidanceTextModal';
import CloseFailureModal from './CloseFailureModal';
import RecurringFailureModal from './RecurringFailureModal';
import StandaloneFailureModal from './StandaloneFailureModal';
import WorkOrderStatusIndicator from './WorkOrderStatusIndicator';
import ActiveFailuresList from './ActiveFailuresList';
import { useWorkOrderDetection } from './hooks/useWorkOrderDetection';

// Helper para normalizar valores de cumplimiento y manejar variaciones de datos (legacy/nuevos)
const normalizeCompliance = (value) => {
  if (!value) return null;
  const v = String(value).toLowerCase().trim();
  if (v === 'cumple') return 'cumple';
  if (v.includes('no_cumple') || v.includes('no cumple')) return 'no_cumple';
  if (v.includes('observ')) return 'observaciones';
  return value;
};

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
    { value: 'observaciones', label: '⚠️ Observación', color: 'yellow' },
    { value: 'no_cumple', label: '❌ No Cumple', color: 'red' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {options.map(option => (
        <RadioOption
          key={option.value}
          value={option.value}
          label={option.label}
          color={option.color}
          isSelected={normalizeCompliance(currentResponse?.response_compliance) === option.value}
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
    activeWorkOrders,
    onRecurringFailureClick,
    onManageItemFailures, // ✅ NUEVO: Función para gestionar fallas de items guardados
    onWorkOrdersUpdate, // ✅ NUEVO: Callback para refrescar fallas
    isLocked, // ✅ NUEVO: Estado de bloqueo por firmas
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

              if (field === 'response_compliance' && value === 'cumple' && workOrdersForItem.length > 0) {
                Swal.fire({
                  icon: 'error',
                  title: 'Acción no permitida',
                  text: 'Este ítem tiene fallas activas y no puede ser marcado como "Cumple". Resuelva las fallas primero.',
                  confirmButtonColor: '#d33',
                });
                return;
              }

              if (field === 'response_compliance' && (value === 'no_cumple' || value === 'observaciones')) {
                handleResponseChange(id, field, value);

                const responseData = {
                  uniqueId: id,
                  response_compliance: value,
                  checklistItemId: item.checklist_item_id
                };

                if (workOrdersForItem.length > 0) {
                  onRecurringFailureClick(workOrdersForItem, responseData, item);
                } else {
                  onRecurringFailureClick([], responseData, item);
                }
                return;
              }

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

  // Helper para normalizar valores de cumplimiento y manejar variaciones de datos (legacy/nuevos)
  const normalizeCompliance = (value) => {
    if (!value) return null;
    const v = String(value).toLowerCase().trim();
    if (v === 'cumple') return 'cumple';
    if (v.includes('no_cumple') || v.includes('no cumple')) return 'no_cumple';
    if (v.includes('observ')) return 'observaciones';
    return value;
  };

  const normalizedCompliance = normalizeCompliance(currentResponse?.response_compliance);
  const shouldShowWorkOrder = activeWorkOrders && activeWorkOrders.length > 0;

  return (
    <div
      style={{ marginLeft: `${level * 20}px` }}
      className={`mb-4 ${item.input_type === "section" || item.subItems?.length > 0 ? "bg-gray-50 p-3 rounded-lg" : "border border-gray-200 rounded-lg p-4"} ${qrLocked ? 'relative' : ''}`}
    >
      {qrLocked && (
        <div className="absolute inset-0 bg-gray-900/10 pointer-events-none z-10 rounded-lg" />
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
            className="relative z-20 ml-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 pointer-events-auto"
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

          {/* Mostrar lista de fallas activas si hay fallas, independientemente de la selección actual (para administradores/revisores) 
              o si la selección coincide con no_cumple/observaciones */}
          {((activeWorkOrders || []).length > 0) ? (
            <div className="mt-4">
              <ActiveFailuresList
                workOrders={(activeWorkOrders || []).filter(wo => wo.checklist_item_id === item.checklist_item_id)}
                user={user}
                onUpdate={onWorkOrdersUpdate} // ✅ Conectado el callback de actualización
              />
            </div>
          ) : null}

          {/* ✅ NUEVO: Botón "Gestionar Fallas" cuando el checklist está firmado y hay respuestas guardadas */}
          {isLocked && !qrLocked && currentResponse?.response_id && props.onManageItemFailures && (
            <div className="mt-4">
              <button
                onClick={() => props.onManageItemFailures(item, (activeWorkOrders || []).filter(wo => wo.checklist_item_id === item.checklist_item_id))}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>🔧 Gestionar Fallas de este Item</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Ver y gestionar las fallas asociadas a esta pregunta del checklist
              </p>
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
              onManageItemFailures={onManageItemFailures} // ✅ Pasamos la función a los hijos
              onWorkOrdersUpdate={onWorkOrdersUpdate} // ✅ Pasamos callback a los hijos recursivamente
              isLocked={isLocked}
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
    handleMarkAllSiblings,
    error,
    user,
    config,
    disabled = false,
    isItemUnlocked,
    onUnlockSection,
    isFamilyChecklist,
    onFailureCreated,
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
  const [showStandaloneFailureModal, setShowStandaloneFailureModal] = useState(false);

  // Estados para manejo de fallas recurrentes
  const [showRecurringFailureModal, setShowRecurringFailureModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [currentChecklistItem, setCurrentChecklistItem] = useState(null);

  // ✅ NUEVO: Estados para gestionar fallas de items guardados
  const [showItemFailuresModal, setShowItemFailuresModal] = useState(false);
  const [selectedItemForFailures, setSelectedItemForFailures] = useState(null);

  // Hook para detectar WorkOrders pendientes
  const workOrderDetection = useWorkOrderDetection(checklist, checklist?.items, user);

  // ✅ NUEVO: Handler centralizado para refrescar fallas con delay
  const handleRefreshWorkOrders = React.useCallback(() => {
    setTimeout(() => {
      console.log('🔄 Refrescando órdenes de trabajo (desde ActiveFailuresList o Modal)...');
      workOrderDetection.refreshWorkOrders();
    }, 500);
  }, [workOrderDetection]);

  useEffect(() => {
    if (user && checklist?.signatures) {
      const hasTechnicalSignature = checklist.signatures.some(
        sig => [7, '7'].includes(sig.role_id) || [7, '7'].includes(sig.role_at_signature) || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklist.signatures.some(
        sig => [2, '2'].includes(sig.role_id) || [2, '2'].includes(sig.role_at_signature) || sig.role?.role_name === 'Soporte'
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

  const handleRecurringFailureClick = (workOrders, responseData, currentItem) => {
    console.log('🔍 ========== DEBUG: RECURRING FAILURE CLICK ==========');
    console.log('📋 Checklist completo:', checklist);
    console.log('🏷️ Checklist inspectable_id:', checklist?.inspectable_id);
    console.log('📝 Current Item completo:', currentItem);
    console.log('🔢 Current Item checklist_item_id:', currentItem?.checklist_item_id);
    console.log('🏢 Current Item parent_item_id:', currentItem?.parent_item_id);
    console.log('🏢 Current Item inspectable_id_for_response:', currentItem?.inspectable_id_for_response);
    console.log('📊 Response Data:', responseData);
    console.log('⚠️ Work Orders recibidos:', workOrders);

    // ✅ NUEVO: Extraer inspectable_id de múltiples fuentes posibles
    let extractedInspectableId = null;

    // Prioridad 1: inspectable_id_for_response del item actual (para items de familia)
    if (currentItem?.inspectable_id_for_response) {
      extractedInspectableId = currentItem.inspectable_id_for_response;
      console.log(`🔍 Inspectable ID obtenido de inspectable_id_for_response: ${extractedInspectableId}`);
    }

    // Prioridad 2: Buscar el ítem padre si existe parent_item_id
    if (!extractedInspectableId && currentItem?.parent_item_id && checklist?.items) {
      const parentItem = checklist.items.find(item =>
        item.checklist_item_id === currentItem.parent_item_id ||
        item.unique_frontend_id === currentItem.parent_item_id
      );

      if (parentItem) {
        console.log('🔍 Parent Item encontrado:', parentItem);

        // Intentar extraer de inspectable_id_for_response del padre
        if (parentItem.inspectable_id_for_response) {
          extractedInspectableId = parentItem.inspectable_id_for_response;
          console.log(`🔍 Inspectable ID obtenido del parent inspectable_id_for_response: ${extractedInspectableId}`);
        }
        // O extraer del checklist_item_id del padre si tiene formato "device-X"
        else if (parentItem.checklist_item_id) {
          const parentItemId = String(parentItem.checklist_item_id);
          if (parentItemId.startsWith('device-')) {
            const deviceIdMatch = parentItemId.match(/^device-(\d+)$/);
            if (deviceIdMatch) {
              extractedInspectableId = parseInt(deviceIdMatch[1]);
              console.log(`🔍 Inspectable ID extraído del parent item "${parentItemId}": ${extractedInspectableId}`);
            }
          }
        }
      }
    }

    // Prioridad 3: Extraer del checklist_item_id del item actual si tiene formato "device-X"
    if (!extractedInspectableId && currentItem?.checklist_item_id) {
      const currentItemId = String(currentItem.checklist_item_id);
      if (currentItemId.startsWith('device-')) {
        const deviceIdMatch = currentItemId.match(/^device-(\d+)$/);
        if (deviceIdMatch) {
          extractedInspectableId = parseInt(deviceIdMatch[1]);
          console.log(`🔍 Inspectable ID extraído del item actual "${currentItemId}": ${extractedInspectableId}`);
        }
      }
    }

    // Prioridad 4: Usar checklist.inspectable_id como último recurso
    if (!extractedInspectableId) {
      extractedInspectableId = checklist?.inspectable_id;
      console.log(`🔍 Usando inspectable_id del checklist: ${extractedInspectableId}`);
    }

    console.log(`✅ Inspectable ID final para el modal: ${extractedInspectableId}`);
    console.log('🔍 ====================================================');

    const workOrdersArray = Array.isArray(workOrders) ? workOrders : [workOrders];
    const workOrdersWithResponse = workOrdersArray.map(wo => ({
      ...wo,
      userResponse: responseData?.response_compliance,
      uniqueResponseId: responseData?.uniqueId,
      checklistItemId: responseData?.checklistItemId
    }));

    setCurrentChecklistItem({
      ...currentItem,
      extractedInspectableId  // ✅ Agregar el inspectable_id extraído
    });
    setSelectedWorkOrder(workOrdersWithResponse);
    setShowRecurringFailureModal(true);
  };

  const handleRecurringFailureSuccess = (action, data, updatedResponseData) => {
    if (action === 'maintain' && selectedWorkOrder) {
      Swal.fire('¡Falla Mantenida!', 'La falla ha sido mantenida exitosamente.', 'success');
    } else {
      const messages = {
        'new': 'Nueva falla creada exitosamente.',
        'resolve': 'Falla resuelta exitosamente.'
      };

      Swal.fire('¡Éxito!', messages[action] || 'Acción completada exitosamente.', 'success');
    }

    // Pequeño delay para asegurar que la BD se actualizó antes de refrescar
    // Usamos el handler centralizado
    handleRefreshWorkOrders();
  };

  // ✅ NUEVO: Función para manejar gestión de fallas de un item guardado
  const handleManageItemFailures = (item, workOrders) => {
    console.log('🔧 Abriendo gestión de fallas para item:', item);
    console.log('⚠️ Work Orders del item:', workOrders);

    setSelectedItemForFailures({
      item,
      workOrders: workOrders || []
    });
    setShowItemFailuresModal(true);
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
        <div className="flex items-center space-x-3">
          {checklist?.inspectable_id && (
            <button
              onClick={() => setShowStandaloneFailureModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              ⚠️ Reportar Falla Independiente
            </button>
          )}
          {isLocked && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">🔒 Bloqueado</div>
          )}
        </div>
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
            setShowRecurringFailureModal(false);
            setSelectedWorkOrder(null);
            setCurrentChecklistItem(null);
          }}
          workOrders={selectedWorkOrder} // ✅ NUEVO: Pasar array de work orders
          user={user}
          onSuccess={handleRecurringFailureSuccess}
          onWorkOrdersUpdate={handleRefreshWorkOrders} // ✅ Usar handler centralizado
          responseData={{
            userResponse: selectedWorkOrder[0]?.userResponse,
            userComment: selectedWorkOrder[0]?.userComment,
            userEvidence: selectedWorkOrder[0]?.userEvidence,
            uniqueResponseId: selectedWorkOrder[0]?.uniqueResponseId
          }}
          checklistItemId={currentChecklistItem?.checklist_item_id}
          inspectableId={currentChecklistItem?.extractedInspectableId} // ✅ NUEVO: Usar el inspectable_id extraído
        />
      )}

      {/* Modal de fallas independientes */}
      {showStandaloneFailureModal && checklist?.inspectable_id && (
        <StandaloneFailureModal
          show={showStandaloneFailureModal}
          onClose={() => setShowStandaloneFailureModal(false)}
          inspectableId={checklist.inspectable_id}
          onSuccess={(failureData) => {
            handleRefreshWorkOrders();
          }}
        />
      )}

      {/* ✅ NUEVO: Modal para gestionar fallas de items guardados (botón "Gestionar Fallas") */}
      {showItemFailuresModal && selectedItemForFailures && (
        <RecurringFailureModal
          isOpen={showItemFailuresModal}
          onClose={() => {
            setShowItemFailuresModal(false);
            setSelectedItemForFailures(null);
          }}
          workOrders={selectedItemForFailures.workOrders}
          user={user}
          onSuccess={(action) => {
            handleRecurringFailureSuccess(action);
            setShowItemFailuresModal(false);
          }}
          onWorkOrdersUpdate={handleRefreshWorkOrders} // ✅ Usar handler centralizado
          responseData={{
            uniqueResponseId: selectedItemForFailures.item?.unique_frontend_id || selectedItemForFailures.item?.checklist_item_id,
            // Pasamos valores por defecto si no hay respuesta activa editable
            userResponse: 'observación'
          }}
          checklistItemId={selectedItemForFailures.item?.checklist_item_id}
          // Intentamos obtener el inspectable ID de la mejor manera posible
          inspectableId={
            selectedItemForFailures.item?.inspectable_id_for_response ||
            checklist?.inspectable_id
          }
        />
      )}

      {checklist.items?.map((item) => {
        const activeWorkOrders = workOrderDetection.getWorkOrderForItem(item);

        // 🔍 DEBUG: Log de cada item para ver su estructura
        if (item.checklist_item_id) {
          console.log(`📌 Item ${item.item_number}:`, {
            checklist_item_id: item.checklist_item_id,
            inspectable_id: item.inspectable_id,
            inspectable_id_for_response: item.inspectable_id_for_response,
            type: item.type,
            subItems: item.subItems?.length || 0
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
            activeWorkOrders={activeWorkOrders}
            onRecurringFailureClick={handleRecurringFailureClick}
            onManageItemFailures={handleManageItemFailures} // ✅ Conectamos la función principal
            onWorkOrdersUpdate={handleRefreshWorkOrders} // ✅ Pasamos callback a los hijos principal
            isLocked={isLocked}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ChecklistSection);