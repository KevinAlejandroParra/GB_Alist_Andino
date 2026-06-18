'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import { compressImage } from '../../utils/imageCompression'
import WorkOrderProcessModal from './WorkOrderProcessModal'
import SignaturePad from './SignaturePad'
import Swal from 'sweetalert2'
import { formatLocalDate } from '../../utils/dateUtils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTools,
  faExclamationTriangle,
  faTimes,
  faSync,
  faPlusCircle,
  faCheckCircle,
  faClipboardList,
  faArrowRight,
  faSpinner,
  faImage,
  faInfoCircle,
  faHardHat,
  faWrench,
  faTag,
  faEye,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons'

/**
 * Modal para manejar fallas que se mantienen con opciones de mantener, nueva falla o resolver
 */
export default function RecurringFailureModal({
  isOpen,
  onClose,
  workOrders, // Lista de fallas/OTs existentes
  user,
  onOptionSelected,
  onSuccess,
  onWorkOrdersUpdate,
  responseData,
  checklistItemId,
  inspectableId // ID del dispositivo/inspectable del checklist
}) {
  const [activeTab, setActiveTab] = useState('new')
  const [selectedWorkOrderIndex, setSelectedWorkOrderIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [workOrdersWithOT, setWorkOrdersWithOT] = useState({}) // Para mapear qué fallas tienen OT

  // Estado para el modal de proceso de OT
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [selectedProcessWorkOrder, setSelectedProcessWorkOrder] = useState(null)

  const [imagePreviews, setImagePreviews] = useState({ newFailure: null })
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  // Para firmar una falla existente desde el modal
  const [signingExistingFailureId, setSigningExistingFailureId] = useState(null)
  // Para actualizar imagen de falla existente
  const [updatingImageForId, setUpdatingImageForId] = useState(null)
  const [existingImageFile, setExistingImageFile] = useState(null)
  const [existingImagePreview, setExistingImagePreview] = useState(null)
  const [updatingExistingImage, setUpdatingExistingImage] = useState(false)
  const [formData, setFormData] = useState({
    maintainReason: responseData?.userComment || '',
    newFailureDescription: '',
    newFailureSeverity: 'leve',
    newFailureEvidence: null,
    assignedTechnicianArea: '',
    signature: null
  })

  const selectedWorkOrder = workOrders?.[selectedWorkOrderIndex]
  const effectiveChecklistItemId = checklistItemId || responseData?.checklistItemId || responseData?.uniqueResponseId
  const isNewFailure = !workOrders || workOrders.length === 0
  const isAdmin = user?.role_id === 1 || user?.role_id === 2

  const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"

  // Calcula días transcurridos desde la creación de una falla
  const getDaysOpen = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  };

  // Retorna config visual de la alerta según días transcurridos
  const getDaysAlertConfig = (days) => {
    if (days >= 60) return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', icon: '🔴', label: 'Crítico' };
    if (days >= 30) return { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', icon: '🟠', label: 'Urgente' };
    if (days >= 14) return { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', icon: '🟡', label: 'Atención' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '🔵', label: 'Activa' };
  };

  useEffect(() => {
    // Siempre empezar con el tab adecuado
    if (workOrders && workOrders.length > 0) {
      setSelectedWorkOrderIndex(0)
      setActiveTab('maintain')
    } else {
      setActiveTab('new')
    }
  }, [workOrders])

  // 🔍 DEBUG: Log de props recibidos
  useEffect(() => {
    console.log('🔍 ========== DEBUG: RECURRING FAILURE MODAL PROPS ==========');
    console.log('📋 inspectableId recibido:', inspectableId);
    console.log('🔢 checklistItemId recibido:', checklistItemId);
    console.log('📊 responseData recibido:', responseData);
    console.log('⚠️ workOrders recibidos:', workOrders);
    console.log('👤 user:', user);
    console.log('🔍 ===========================================================');
  }, [inspectableId, checklistItemId, responseData, workOrders]);

  useEffect(() => {
    if (responseData?.userComment) {
      setFormData(prev => ({ ...prev, maintainReason: responseData.userComment }));
    }
  }, [responseData?.userComment]);

  // Verificar qué fallas tienen órdenes de trabajo asociadas
  useEffect(() => {
    const checkWorkOrders = async () => {
      if (!workOrders || workOrders.length === 0) return;

      try {
        const response = await axiosInstance.get(`${API_URL}/api/work-orders`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (response.data.success && response.data.data) {
          const workOrdersData = response.data.data;
          const workOrdersMap = {};

          // Mapear qué falla_id tiene qué órdenes de trabajo
          workOrdersData.forEach(wo => {
            if (wo.failure_order_id) {
              if (!workOrdersMap[wo.failure_order_id]) {
                workOrdersMap[wo.failure_order_id] = [];
              }
              workOrdersMap[wo.failure_order_id].push(wo);
            }
          });

          setWorkOrdersWithOT(workOrdersMap);
        }
      } catch (error) {
        console.error('Error verificando órdenes de trabajo:', error);
        // En caso de error, asumir que no tienen OT
        setWorkOrdersWithOT({});
      }
    };

    checkWorkOrders();
  }, [workOrders, user?.user_id]); // Cambiado de user.token a user?.user_id

  if (!isOpen) return null

  // --- HANDLERS ---

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field, file) => {
    setFormData(prev => ({ ...prev, [field]: file }))
    if (file && field === 'newFailureEvidence') {
      const reader = new FileReader()
      reader.onload = (e) => setImagePreviews(prev => ({ ...prev, newFailure: e.target.result }))
      reader.readAsDataURL(file)
    }
  }

  const uploadEvidenceToServer = async (file) => {
    if (!file) return null
    try {
      // Comprimir imagen antes de subir
      const compressedFile = await compressImage(file)
      const formData = new FormData()
      formData.append("evidence", compressedFile)
      const response = await axiosInstance.post(`${API_URL}/api/checklists/upload-evidence`, formData)
      return response.data.filePath
    } catch (error) {
      throw new Error(`Error al subir archivo: ${error.response?.data?.error || error.message}`)
    }
  }

  // Opción 1: Mantener Falla — incrementa el contador de persistencia
  const handleMaintainFailure = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.put(
        `${API_URL}/api/failures/${selectedWorkOrder.id}/increment-recurrence`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      )

      onSuccess && onSuccess('maintain', response.data)
      onWorkOrdersUpdate && onWorkOrdersUpdate()
      onClose()

      Swal.fire({
        icon: 'success',
        title: 'Persistencia Registrada',
        text: `La falla ahora tiene ${response.data.data?.recurrence_count} reporte(s) de persistencia`,
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo registrar la persistencia', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Opción 1b: Mantener TODAS las fallas del ítem
  const handleMaintainAllFailures = async () => {
    if (!workOrders || workOrders.length === 0) return
    setLoading(true)
    try {
      await Promise.all(
        workOrders.map(wo =>
          axiosInstance.put(
            `${API_URL}/api/failures/${wo.id}/increment-recurrence`,
            {},
            { headers: { Authorization: `Bearer ${user.token}` } }
          )
        )
      )

      onSuccess && onSuccess('maintain')
      onWorkOrdersUpdate && onWorkOrdersUpdate()
      onClose()

      Swal.fire({
        icon: 'success',
        title: 'Persistencia Registrada',
        text: `Se incrementó la persistencia de ${workOrders.length} falla(s)`,
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo registrar la persistencia en todas las fallas', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Opción 2: Crear Nueva Falla (Solo OF)
  const handleCreateNewFailure = async () => {
    setLoading(true)
    try {
      console.log('🔍 ========== DEBUG: ANTES DE CREAR FALLA ==========');
      console.log('📋 inspectableId (prop):', inspectableId);
      console.log('🔢 checklistItemId (prop):', checklistItemId);
      console.log('📊 responseData:', responseData);
      console.log('📝 effectiveChecklistItemId:', effectiveChecklistItemId);
      console.log('🔍 ==================================================');

      // Validar inspectableId
      if (!inspectableId) {
        Swal.fire('Error', 'No se pudo identificar el dispositivo asociado al checklist. Contacte al administrador.', 'error')
        setLoading(false)
        return
      }

      let evidenceUrl = null
      if (formData.newFailureEvidence) {
        evidenceUrl = await uploadEvidenceToServer(formData.newFailureEvidence)
      }

      const newFailureData = {
        checklistItemId: effectiveChecklistItemId,
        description: formData.newFailureDescription,
        severity: formData.newFailureSeverity === 'crítica' ? 'CRITICA' : 'LEVE',
        evidenceUrl: evidenceUrl,
        assignedTechnicianArea: formData.assignedTechnicianArea || 'TECNICO',
        inspectableId: inspectableId,
        categoria: formData.assignedTechnicianArea === 'OPERACION' ? 'OPERATIVA' : 'TECNICA'
      }

      console.log('🔍 [CREATE NEW FAILURE] Datos de nueva falla:', newFailureData);

      // Crear la Failure Order
      const response = await axiosInstance.post(
        `${API_URL}/api/failures`,
        newFailureData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      )

      const createdFailure = response.data?.data
      const createdFailureId = createdFailure?.id

      // ✅ PROBLEMA 4: Enviar firma de reporte si se capturó
      if (createdFailureId && formData.signature) {
        try {
          await axiosInstance.post(
            `${API_URL}/api/failures/${createdFailureId}/report-signature`,
            {
              signatureData: formData.signature,
              userName: user.user_name || user.name || 'Usuario',
              roleName: user.role_name || 'Operador'
            },
            { headers: { Authorization: `Bearer ${user.token}` } }
          )
          console.log('✅ [CREATE NEW FAILURE] Firma de reporte guardada correctamente')
        } catch (sigError) {
          console.warn('⚠️ [CREATE NEW FAILURE] No se pudo guardar la firma:', sigError.message)
          // No bloqueamos el flujo; la falla ya fue creada
        }
      }

      onSuccess && onSuccess('new', response.data)
      onWorkOrdersUpdate && onWorkOrdersUpdate()
      onClose()

      Swal.fire({
        icon: 'success',
        title: 'Falla Registrada',
        text: 'La orden de falla ha sido creada correctamente',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      console.error(error)
      Swal.fire('Error', error.response?.data?.error?.message || 'No se pudo crear la falla', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Opción 3: Resolver (Gestionar OT)
  const handleManageWorkOrder = async (failureOrder) => {
    setLoading(true)
    try {
      let workOrderToProcess = null;

      console.log('Gestionando falla:', failureOrder.id, failureOrder.failure_order_id);

      // Caso A: El objeto ya tiene estructura de OT
      if (failureOrder.work_order_id && failureOrder.work_order_id.startsWith('OT-')) {
        workOrderToProcess = failureOrder;
        console.log('Usando OT existente:', workOrderToProcess);
      } else {
        // Caso B: Es una FailureOrder - buscar si ya existe una OT específica para esta falla
        const existingWos = await axiosInstance.get(`${API_URL}/api/work-orders`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        console.log('Respuesta de búsqueda:', existingWos.data);

        if (existingWos.data.success && existingWos.data.data && existingWos.data.data.length > 0) {
          // Filtrar específicamente las OTs que pertenezcan a esta falla
          const matchingWorkOrders = existingWos.data.data.filter(wo =>
            wo.failure_order_id === failureOrder.id ||
            wo.failureOrder?.id === failureOrder.id
          );

          if (matchingWorkOrders.length > 0) {
            // Tomar la OT más reciente (con mayor ID)
            const mostRecentWorkOrder = matchingWorkOrders.sort((a, b) => b.id - a.id)[0];
            workOrderToProcess = mostRecentWorkOrder;
            console.log('OT encontrada para la falla específica:', workOrderToProcess);
          } else {
            console.log('No se encontró OT para esta falla específica');
          }
        }

        // Si no existe OT específica, crear nueva
        if (!workOrderToProcess) {
          console.log('Creando nueva OT para falla:', failureOrder.id);
          const createResponse = await axiosInstance.post(
            `${API_URL}/api/work-orders`,
            {
              failure_order_id: failureOrder.id,
              description: failureOrder.description,
              priority_level: failureOrder.severity === 'CRITICA' ? 'URGENTE' : 'NORMAL',
              created_by_id: user.user_id
            },
            { headers: { Authorization: `Bearer ${user.token}` } }
          );
          workOrderToProcess = createResponse.data.data;
          console.log('Nueva OT creada:', workOrderToProcess);
        }
      }

      if (workOrderToProcess && workOrderToProcess.failure_order_id === failureOrder.id) {
        setSelectedProcessWorkOrder(workOrderToProcess);
        setShowProcessModal(true);
      } else {
        throw new Error("No se pudo obtener ni crear la Orden de Trabajo correcta para esta falla");
      }

    } catch (error) {
      console.error("Error gestionando OT:", error);
      Swal.fire('Error', 'No se pudo iniciar la gestión de la orden de trabajo', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Función para manejar la firma (nueva falla)
  const handleSignatureSave = (signatureData) => {
    if (signingExistingFailureId) {
      // Firmar una falla existente
      handleSaveExistingSignature(signatureData)
    } else {
      // Firma para nueva falla
      setFormData(prev => ({ ...prev, signature: signatureData }))
      setShowSignaturePad(false)
    }
  }

  // Guardar firma en una falla existente (report_signature)
  const handleSaveExistingSignature = async (signatureData) => {
    setShowSignaturePad(false)
    try {
      await axiosInstance.post(
        `${API_URL}/api/failures/${signingExistingFailureId}/report-signature`,
        {
          signatureData,
          userName: user.user_name || user.name || 'Usuario',
          roleName: user.role_name || 'Operador'
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      )
      Swal.fire({ icon: 'success', title: '✅ Firma guardada', text: 'La firma de reporte fue guardada correctamente', timer: 1500, showConfirmButton: false })
      onWorkOrdersUpdate && onWorkOrdersUpdate()
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error?.message || 'No se pudo guardar la firma', 'error')
    } finally {
      setSigningExistingFailureId(null)
    }
  }

  const handleOpenSignExisting = (failureId) => {
    setSigningExistingFailureId(failureId)
    setShowSignaturePad(true)
  }

  // Actualizar imagen de una falla existente
  const handleExistingImageFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setExistingImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setExistingImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpdateExistingImage = async () => {
    if (!existingImageFile || !updatingImageForId) return
    setUpdatingExistingImage(true)
    try {
      // Comprimir imagen antes de subir
      const compressedFile = await compressImage(existingImageFile)
      const fd = new FormData()
      fd.append('evidence', compressedFile)
      await axiosInstance.post(`${API_URL}/api/failures/${updatingImageForId}/update-image`, fd, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      Swal.fire({ icon: 'success', title: '✅ Imagen actualizada', timer: 1500, showConfirmButton: false })
      setUpdatingImageForId(null)
      setExistingImageFile(null)
      setExistingImagePreview(null)
      onWorkOrdersUpdate && onWorkOrdersUpdate()
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error?.message || 'No se pudo actualizar la imagen', 'error')
    } finally {
      setUpdatingExistingImage(false)
    }
  }

  const clearSignature = () => {
    setFormData(prev => ({ ...prev, signature: null }))
  }

  const canSubmit = () => {
    if (activeTab === 'new') {
      return formData.newFailureDescription.trim().length > 0 &&
        formData.assignedTechnicianArea.trim().length > 0 &&
        formData.newFailureEvidence !== null &&
        formData.signature !== null
    }
    return true
  }

  const getRecurrenceText = (wo) => {
    if (!wo) return ''
    if (wo.recurrence_count <= 1) return 'Primera vez'
    return `${wo.recurrence_count} persistencias`
  }


  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-slate-50 border-b border-slate-200">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500" /> Gestión de Fallas
              </h3>
              {workOrders && workOrders.length > 0 ? (
                <p className="text-slate-600 font-medium mt-1">
                  Existen <span className="text-amber-600 font-bold">{workOrders.length}</span> fallas activas asociadas a este ítem.
                </p>
              ) : (
                <p className="text-slate-600 font-medium mt-1">
                  No hay fallas previas. Puedes crear una nueva falla.
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full">
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>

          {/* Tabs - SIEMPRE VISIBLES */}
          <div className="border-b border-slate-200 bg-white px-8">
            <nav className="flex gap-6">
              {[
                { id: 'maintain', label: isAdmin ? 'Ver Fallas' : 'Mantener Falla', icon: faSync, disabledWhenNew: true },
                { id: 'new', label: 'Nueva Falla', icon: faPlusCircle, disabledWhenNew: false, hiddenForAdmin: isAdmin && !isNewFailure },
                { id: 'resolve', label: 'Resolver / Gestionar', icon: faHardHat, disabledWhenNew: true }
              ].filter(tab => !tab.hiddenForAdmin).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={tab.disabledWhenNew && isNewFailure}
                  className={`py-4 px-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } ${tab.disabledWhenNew && isNewFailure ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FontAwesomeIcon icon={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto flex-1 bg-white">

            {/* TAB: MANTENER */}
            {activeTab === 'maintain' && (
              <div className="space-y-6 animate-fadeIn">
                {isNewFailure ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-slate-400 text-4xl mb-4" />
                    <h4 className="font-bold text-slate-700 mb-2">No hay fallas previas</h4>
                    <p className="text-slate-600">No existen fallas anteriores para este ítem. Puedes crear una nueva falla en la pestaña "Nueva Falla".</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
                      <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 text-xl mt-1" />
                      <div>
                        <h4 className="font-bold text-blue-900">
                          {isAdmin ? 'Historial de Fallas Activas' : 'Mantener Falla Existente'}
                        </h4>
                        <p className="text-sm text-blue-700">
                          {isAdmin
                            ? 'Vista de revisión. Las fallas activas para este ítem se muestran a continuación.'
                            : 'Seleccione la falla que persiste. Se incrementará su contador de persistencia.'}
                        </p>
                      </div>
                    </div>

                    {workOrders.length > 1 && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Falla:</label>
                        <select
                          value={selectedWorkOrderIndex}
                          onChange={(e) => setSelectedWorkOrderIndex(parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {workOrders.map((wo, index) => (
                            <option key={wo.id} value={index}>
                              {wo.failure_order_id || `OF-${wo.id}`} - {wo.description?.substring(0, 50)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedWorkOrder && (() => {
                      const fullEvidenceUrl = selectedWorkOrder.evidence_url
                        ? (selectedWorkOrder.evidence_url.startsWith('http')
                          ? selectedWorkOrder.evidence_url
                          : `${API_URL}${selectedWorkOrder.evidence_url}`)
                        : null

                      const daysOpen = getDaysOpen(selectedWorkOrder.createdAt);
                      const alertConfig = getDaysAlertConfig(daysOpen);

                      return (
                        <div className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-lg transition-all">
                          <div className="space-y-6">
                            {/* Alerta de días sin resolver */}
                            <div className={`${alertConfig.bg} border ${alertConfig.border} rounded-lg p-3 flex items-center gap-3`}>
                              <span className="text-xl">{alertConfig.icon}</span>
                              <div>
                                <span className={`font-bold text-sm ${alertConfig.text}`}>{alertConfig.label} — </span>
                                <span className={`text-sm ${alertConfig.text}`}>
                                  Esta falla lleva <strong>{daysOpen} día{daysOpen !== 1 ? 's' : ''}</strong> sin resolverse
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded text-sm">
                                  {selectedWorkOrder.failure_order_id || `OF-${selectedWorkOrder.id}`}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
                                <FontAwesomeIcon icon={faSync} /> {getRecurrenceText(selectedWorkOrder)}
                              </span>
                            </div>

                            {/* Descripción */}
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faClipboardList} className="text-blue-600" />
                                <h5 className="font-bold text-blue-900">Descripción de la Falla</h5>
                              </div>
                              <p className="text-blue-800 leading-relaxed">{selectedWorkOrder.description}</p>
                            </div>

                            {/* Metadatos en Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Severidad */}
                              <div className="bg-red-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FontAwesomeIcon icon={faTag} className="text-red-600" />
                                  <span className="text-sm font-bold text-red-900">Severidad</span>
                                </div>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${selectedWorkOrder.severity === 'CRITICA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {selectedWorkOrder.severity || 'LEVE'}
                                </span>
                              </div>

                              {/* Estado de Orden de Trabajo */}
                              <div className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FontAwesomeIcon icon={faTools} className="text-green-600" />
                                  <span className="text-sm font-bold text-green-900">Orden de Trabajo</span>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded ${workOrdersWithOT[selectedWorkOrder.id] && workOrdersWithOT[selectedWorkOrder.id].length > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {workOrdersWithOT[selectedWorkOrder.id] && workOrdersWithOT[selectedWorkOrder.id].length > 0
                                    ? `OT Creada (${workOrdersWithOT[selectedWorkOrder.id].length})`
                                    : 'Sin OT'
                                  }
                                </span>
                              </div>

                              {/* Fecha de Creación */}
                              <div className="bg-purple-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600" />
                                  <span className="text-sm font-bold text-purple-900">Creado</span>
                                </div>
                                <span className="text-sm text-purple-800 font-medium">
                                  {formatLocalDate(selectedWorkOrder.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Evidencia */}
                            {fullEvidenceUrl ? (
                              <div className="bg-orange-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <FontAwesomeIcon icon={faEye} className="text-orange-600" />
                                  <h5 className="font-bold text-orange-900">Evidencia Registrada</h5>
                                </div>
                                <div className="flex items-center gap-4">
                                  <img
                                    src={fullEvidenceUrl}
                                    alt="Evidencia de la falla"
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-orange-200 shadow-sm cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => window.open(fullEvidenceUrl, '_blank')}
                                    onError={(e) => {
                                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01NSAyNUw3NSAzNUw1NSA0NVY1NVoiIGZpbGw9IiM5Q0EzQUZBIi8+Cjwvc3ZnPgo='
                                    }}
                                  />
                                  <div>
                                    <p className="text-sm text-orange-800 font-medium">Imagen de evidencia</p>
                                    <button
                                      onClick={() => window.open(fullEvidenceUrl, '_blank')}
                                      className="text-xs text-orange-700 hover:text-orange-900 underline"
                                    >
                                      Ver imagen completa
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <FontAwesomeIcon icon={faImage} className="text-slate-400" />
                                  <h5 className="font-bold text-slate-500">Sin Evidencia</h5>
                                </div>
                                <p className="text-sm text-slate-400">No se ha registrado evidencia para esta falla</p>
                              </div>
                            )}

                            {/* Información del Reportante */}
                            <div className="bg-slate-100 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faInfoCircle} className="text-slate-600" />
                                <span className="text-sm font-bold text-slate-700">Reportado por:</span>
                                <span className="text-sm text-slate-600 font-medium">
                                  {selectedWorkOrder.reporter?.user_name || selectedWorkOrder.reporter?.name || 'Desconocido'}
                                </span>
                              </div>
                            </div>

                            {/* ✅ Acciones sobre falla existente: Firmar + Actualizar imagen */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                              <button
                                onClick={() => handleOpenSignExisting(selectedWorkOrder.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                ✍️ {selectedWorkOrder.report_signature ? 'Re-firmar reporte' : 'Firmar reporte'}
                              </button>
                              <button
                                onClick={() => setUpdatingImageForId(v => v === selectedWorkOrder.id ? null : selectedWorkOrder.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                📷 Actualizar imagen
                              </button>
                            </div>

                            {/* Panel de actualizar imagen */}
                            {updatingImageForId === selectedWorkOrder.id && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-blue-800 mb-3">Nueva imagen de evidencia:</p>
                                <div className="flex items-start gap-4 flex-wrap">
                                  {existingImagePreview ? (
                                    <div className="relative">
                                      <img src={existingImagePreview} alt="preview" className="w-28 h-28 object-cover rounded-lg border shadow" />
                                      <button onClick={() => { setExistingImageFile(null); setExistingImagePreview(null); }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center w-28 h-28 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-white hover:bg-blue-50">
                                      <FontAwesomeIcon icon={faImage} className="text-blue-400 text-2xl mb-1" />
                                      <span className="text-xs text-blue-600">Subir foto</span>
                                      <input type="file" className="hidden" accept="image/*" onChange={handleExistingImageFileChange} />
                                    </label>
                                  )}
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={handleUpdateExistingImage}
                                      disabled={!existingImageFile || updatingExistingImage}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
                                    >
                                      {updatingExistingImage ? 'Guardando...' : '💾 Guardar'}
                                    </button>
                                    <button onClick={() => { setUpdatingImageForId(null); setExistingImageFile(null); setExistingImagePreview(null); }}
                                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            )}

            {/* TAB: NUEVA FALLA */}
            {activeTab === 'new' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Descripción de la falla *</label>
                    <textarea
                      value={formData.newFailureDescription}
                      onChange={(e) => handleInputChange('newFailureDescription', e.target.value)}
                      placeholder="Describa detalladamente la falla..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Severidad</label>
                      <select
                        value={formData.newFailureSeverity}
                        onChange={(e) => handleInputChange('newFailureSeverity', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="leve">Leve</option>
                        <option value="crítica">Crítica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Área Asignada *</label>
                      <select
                        value={formData.assignedTechnicianArea}
                        onChange={(e) => handleInputChange('assignedTechnicianArea', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Seleccionar área...</option>
                        <option value="TECNICO">🔧 Técnico</option>
                        <option value="OPERACION">⚙️ Operación</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Evidencia *</label>
                    <div className="flex items-start gap-6">
                      {!imagePreviews.newFailure ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FontAwesomeIcon icon={faImage} className="text-3xl text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Subir foto</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange('newFailureEvidence', e.target.files[0])} />
                        </label>
                      ) : (
                        <div className="relative">
                          <img src={imagePreviews.newFailure} alt="Preview" className="w-32 h-32 object-cover rounded-xl border shadow-sm" />
                          <button
                            onClick={() => {
                              setImagePreviews(prev => ({ ...prev, newFailure: null }))
                              setFormData(prev => ({ ...prev, newFailureEvidence: null }))
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                            title="Cancelar imagen"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección de Firma */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Firma Digital <span className="text-red-500">*</span>
                    </label>

                    {formData.signature ? (
                      <div className="mt-3">
                        <div className="relative inline-block border rounded-lg p-2">
                          <img
                            src={formData.signature}
                            alt="Firma digital"
                            className="h-20 object-contain"
                          />
                          <button
                            onClick={clearSignature}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                            title="Limpiar firma"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">Firma capturada</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSigningExistingFailureId(null)
                          setShowSignaturePad(true)
                        }}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                      >
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Firmar Digitalmente</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RESOLVER */}
            {activeTab === 'resolve' && (
              <div className="space-y-4 animate-fadeIn">
                {isNewFailure ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-slate-400 text-4xl mb-4" />
                    <h4 className="font-bold text-slate-700 mb-2">No hay fallas para resolver</h4>
                    <p className="text-slate-600">No existen fallas activas para gestionar. Crea una nueva falla primero y luego podrás resolverla.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} /> Gestión de Fallas
                      </h4>
                      <p className="text-sm text-emerald-700">
                        Seleccione "Gestionar" para crear una Orden de Trabajo y comenzar la resolución.
                      </p>
                    </div>

                    {workOrders.map((wo) => {
                      const fullEvidenceUrl = wo.evidence_url
                        ? (wo.evidence_url.startsWith('http')
                          ? wo.evidence_url
                          : `${API_URL}${wo.evidence_url}`)
                        : null

                      const daysOpen = getDaysOpen(wo.createdAt);
                      const alertConfig = getDaysAlertConfig(daysOpen);

                      return (
                        <div key={wo.id} className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-lg transition-all">
                          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                            <div className="flex-1 space-y-4">
                              {/* Alerta de días sin resolver */}
                              <div className={`${alertConfig.bg} border ${alertConfig.border} rounded-lg p-3 flex items-center gap-3`}>
                                <span className="text-xl">{alertConfig.icon}</span>
                                <div>
                                  <span className={`font-bold text-sm ${alertConfig.text}`}>{alertConfig.label} — </span>
                                  <span className={`text-sm ${alertConfig.text}`}>
                                    Esta falla lleva <strong>{daysOpen} día{daysOpen !== 1 ? 's' : ''}</strong> sin resolverse
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded text-sm">
                                  {wo.failure_order_id || `OF-${wo.id}`}
                                </span>
                              </div>

                              {/* Descripción */}
                              <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FontAwesomeIcon icon={faClipboardList} className="text-slate-600" />
                                  <h5 className="font-bold text-slate-800">Descripción de la Falla</h5>
                                </div>
                                <p className="text-slate-700 leading-relaxed">{wo.description}</p>
                              </div>

                              {/* Metadatos */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Severidad */}
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FontAwesomeIcon icon={faTag} className="text-blue-600" />
                                    <span className="text-sm font-bold text-blue-900">Severidad</span>
                                  </div>
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${wo.severity === 'CRITICA'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {wo.severity || 'LEVE'}
                                  </span>
                                </div>

                                {/* Estado de Orden de Trabajo */}
                                <div className="bg-green-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FontAwesomeIcon icon={faTools} className="text-green-600" />
                                    <span className="text-sm font-bold text-green-900">Orden de Trabajo</span>
                                  </div>
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${workOrdersWithOT[wo.id] && workOrdersWithOT[wo.id].length > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {workOrdersWithOT[wo.id] && workOrdersWithOT[wo.id].length > 0
                                      ? `OT Creada (${workOrdersWithOT[wo.id].length})`
                                      : 'Sin OT'
                                    }
                                  </span>
                                </div>

                                {/* Fecha de Creación */}
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600" />
                                    <span className="text-sm font-bold text-purple-900">Creado</span>
                                  </div>
                                  <span className="text-sm text-purple-800 font-medium">
                                    {formatLocalDate(wo.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* Evidencia */}
                              {fullEvidenceUrl && (
                                <div className="bg-orange-50 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FontAwesomeIcon icon={faEye} className="text-orange-600" />
                                    <h5 className="font-bold text-orange-900">Evidencia Registrada</h5>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <img
                                      src={fullEvidenceUrl}
                                      alt="Evidencia de la falla"
                                      className="w-20 h-20 object-cover rounded-lg border-2 border-orange-200 shadow-sm cursor-pointer hover:shadow-md transition-all"
                                      onClick={() => window.open(fullEvidenceUrl, '_blank')}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01NSAyNUw3NSAzNUw1NSA0NVY1NVoiIGZpbGw9IiM5Q0EzQUZBIi8+Cjwvc3ZnPgo='
                                      }}
                                    />
                                    <div>
                                      <p className="text-sm text-orange-800 font-medium">Imagen de evidencia</p>
                                      <button
                                        onClick={() => window.open(fullEvidenceUrl, '_blank')}
                                        className="text-xs text-orange-700 hover:text-orange-900 underline"
                                      >
                                        Ver imagen completa
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ✅ Acciones rápidas: firmar + actualizar imagen */}
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                              <button
                                onClick={() => handleOpenSignExisting(wo.id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                ✍️ {wo.report_signature ? 'Re-firmar' : 'Firmar reporte'}
                              </button>
                              <button
                                onClick={() => setUpdatingImageForId(v => v === wo.id ? null : wo.id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                📷 Actualizar imagen
                              </button>
                            </div>

                            {/* Panel de actualizar imagen */}
                            {updatingImageForId === wo.id && (
                              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-blue-800 mb-2">Nueva imagen de evidencia:</p>
                                <div className="flex items-start gap-3 flex-wrap">
                                  {existingImagePreview ? (
                                    <div className="relative">
                                      <img src={existingImagePreview} alt="preview" className="w-24 h-24 object-cover rounded-lg border shadow" />
                                      <button onClick={() => { setExistingImageFile(null); setExistingImagePreview(null); }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-white hover:bg-blue-50">
                                      <FontAwesomeIcon icon={faImage} className="text-blue-400 text-xl mb-1" />
                                      <span className="text-xs text-blue-600">Subir</span>
                                      <input type="file" className="hidden" accept="image/*" onChange={handleExistingImageFileChange} />
                                    </label>
                                  )}
                                  <div className="flex flex-col gap-1">
                                    <button onClick={handleUpdateExistingImage}
                                      disabled={!existingImageFile || updatingExistingImage}
                                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold">
                                      {updatingExistingImage ? 'Guardando...' : '💾 Guardar'}
                                    </button>
                                    <button onClick={() => { setUpdatingImageForId(null); setExistingImageFile(null); setExistingImagePreview(null); }}
                                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs hover:bg-slate-50">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Botón de Acción */}
                            <div className="flex-shrink-0 mt-4">
                              <button
                                onClick={() => handleManageWorkOrder(wo)}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 w-full lg:w-auto"
                              >
                                <FontAwesomeIcon icon={faHardHat} />
                                Gestionar OT
                                <FontAwesomeIcon icon={faArrowRight} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-4 p-6 border-t border-slate-200 bg-slate-50">
            <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50">
              Cancelar
            </button>

            {activeTab === 'maintain' && !isNewFailure && !isAdmin && (
              <>
                <button
                  onClick={handleMaintainFailure}
                  disabled={loading}
                  className="px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSync} />}
                  Confirmar y Mantener
                </button>
                {workOrders && workOrders.length > 1 && (
                  <button
                    onClick={handleMaintainAllFailures}
                    disabled={loading}
                    className="px-8 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"
                    title={`Incrementa persistencia de las ${workOrders.length} fallas activas del ítem`}
                  >
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSync} />}
                    Mantener Todas ({workOrders.length})
                  </button>
                )}
              </>
            )}

            {activeTab === 'new' && (
              <button
                onClick={handleCreateNewFailure}
                disabled={!canSubmit() || loading}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlusCircle} />}
                Crear Falla
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Modal de Firma */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => {
            setShowSignaturePad(false)
            setSigningExistingFailureId(null)
          }}
        />
      )}

      {/* Modal de Proceso de OT */}
      {showProcessModal && selectedProcessWorkOrder && (
        <WorkOrderProcessModal
          isOpen={showProcessModal}
          onClose={async (updatedWorkOrder) => {
            // Si se proporcionó una orden actualizada
            if (updatedWorkOrder) {
              // Si la orden fue RESUELTA, actualizar también la falla asociada
              if (updatedWorkOrder.status === 'RESUELTA') {
                try {
                  console.log('✅ OT Resuelta, actualizando estado de falla...');
                  await axiosInstance.put(
                    `${API_URL}/api/failures/${selectedProcessWorkOrder.failure_order_id || selectedProcessWorkOrder.failureOrder?.id}`,
                    { status: 'RESUELTO' },
                    { headers: { Authorization: `Bearer ${user.token}` } }
                  );

                  // Notificar al padre que se resolvió
                  if (onSuccess) {
                    onSuccess('resolve', updatedWorkOrder);
                  }

                  // Cerrar este modal y el padre
                  setShowProcessModal(false);
                  setSelectedProcessWorkOrder(null);
                  onClose(); // Cerrar el RecurringFailureModal
                  return;
                } catch (error) {
                  console.error('Error actualizando estado de falla:', error);
                }
              }
            }

            // Flujo normal si no se resolvió o hubo error
            onWorkOrdersUpdate && onWorkOrdersUpdate();
            setShowProcessModal(false);
            setSelectedProcessWorkOrder(null);
          }}
          workOrder={selectedProcessWorkOrder}
          user={user}
          onUpdate={(updatedWorkOrder) => {
            setSelectedProcessWorkOrder(updatedWorkOrder);
          }}
        />
      )}
    </>
  )
}