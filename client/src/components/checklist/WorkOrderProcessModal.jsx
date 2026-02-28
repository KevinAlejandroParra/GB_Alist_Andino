'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import WorkOrderPartsManager from './WorkOrderPartsManager'
import SignaturePad from './SignaturePad'
import Swal from 'sweetalert2'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlay,
    faTools,
    faVial,
    faCheckCircle,
    faTimes,
    faClock,
    faClipboardCheck,
    faImage,
    faSpinner,
    faSignature,
    faPenNib,
    faExchangeAlt
} from '@fortawesome/free-solid-svg-icons'

export default function WorkOrderProcessModal({
    isOpen,
    onClose,
    workOrder,
    onUpdate,
    user
}) {
    const [loading, setLoading] = useState(false)
    const [showPartsManager, setShowPartsManager] = useState(false)
    const [showSignaturePad, setShowSignaturePad] = useState(false)
    const [showStatusSelector, setShowStatusSelector] = useState(false)
    const [workOrderParts, setWorkOrderParts] = useState([])
    const [loadingParts, setLoadingParts] = useState(false)
    const [signaturesInfo, setSignaturesInfo] = useState(null)
    const [loadingSignatures, setLoadingSignatures] = useState(false)

    const [formData, setFormData] = useState({
        activityPerformed: '',
        requiresReplacement: false,
        evidence: null,
        signature: null,
        endTime: null,
        startTime: ''
    })
    const [evidencePreview, setEvidencePreview] = useState(null)
    const [uploadedEvidenceUrl, setUploadedEvidenceUrl] = useState(null)
    const [hasExistingEvidence, setHasExistingEvidence] = useState(false)

    const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"

    // Función para cargar repuestos de la orden de trabajo
    const loadWorkOrderParts = async () => {
        if (!workOrder?.id) {
            setWorkOrderParts([]);
            return;
        }

        setLoadingParts(true);
        try {
            const response = await axiosInstance.get(`${API_URL}/api/work-orders/${workOrder.id}/parts`);

            if (response.data.success) {
                setWorkOrderParts(response.data.data || []);
            } else {
                setWorkOrderParts([]);
            }
        } catch (error) {
            console.error('Error cargando repuestos:', error);
            setWorkOrderParts([]);
        } finally {
            setLoadingParts(false);
        }
    };

    useEffect(() => {
        if (isOpen && workOrder) {
            setFormData({
                activityPerformed: workOrder.activity_performed || '',
                requiresReplacement: workOrder.requiere_replacement || false,
                evidence: null,
                signature: workOrder.closure_signature || null,
                endTime: workOrder.end_time || null,
                startTime: ''
            })

            // Verificar si ya existe evidencia cargada
            const existingEvidenceUrl = workOrder.evidence_url
            setUploadedEvidenceUrl(existingEvidenceUrl)

            if (existingEvidenceUrl) {
                // Construir URL completa con API
                const fullEvidenceUrl = existingEvidenceUrl.startsWith('http')
                    ? existingEvidenceUrl
                    : `${API_URL}${existingEvidenceUrl}`
                setEvidencePreview(fullEvidenceUrl)
                setHasExistingEvidence(true)
            } else {
                setEvidencePreview(null)
                setHasExistingEvidence(false)
            }

            // Cargar repuestos de la orden de trabajo
            loadWorkOrderParts()
        }
    }, [isOpen, workOrder])

    // Cerrar selector de estado cuando se hace click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showStatusSelector && !event.target.closest('.status-selector-container')) {
                setShowStatusSelector(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showStatusSelector])

    if (!isOpen || !workOrder) return null

    const handleStartWork = async () => {
        setLoading(true)
        try {
            const startTime = formData.startTime ? new Date(formData.startTime) : new Date()

            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { start_time: startTime },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            Swal.fire({
                icon: 'success',
                title: 'Hora de Inicio Registrada',
                text: `Inicio: ${startTime.toLocaleString()}`,
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: 'rounded-xl shadow-xl',
                    title: 'text-slate-800 font-bold'
                }
            })

            onUpdate && onUpdate({ ...workOrder, start_time: startTime })
        } catch (error) {
            console.error('Error starting work:', error)
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo registrar la hora de inicio',
                customClass: { popup: 'rounded-xl' }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setFormData(prev => ({ ...prev, evidence: file }))

        const reader = new FileReader()
        reader.onload = (e) => setEvidencePreview(e.target.result)
        reader.readAsDataURL(file)
    }

    const handleSaveEvidence = async () => {
        if (!formData.evidence) return

        setLoading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append("evidence", formData.evidence)

            const response = await axiosInstance.post(`${API_URL}/api/checklists/upload-evidence`, formDataUpload, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            const newFilePath = response.data.filePath
            setUploadedEvidenceUrl(newFilePath)

            // Construir URL completa para preview
            const fullEvidenceUrl = newFilePath.startsWith('http')
                ? newFilePath
                : `${API_URL}${newFilePath}`
            setEvidencePreview(fullEvidenceUrl)

            // Actualizar estado para indicar que hay evidencia
            setHasExistingEvidence(true)

            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { evidence_url: newFilePath },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            Swal.fire('Evidencia guardada', 'La imagen se ha subido exitosamente', 'success')
            onUpdate && onUpdate({ ...workOrder, evidence_url: newFilePath })

            // Limpiar el formulario
            setFormData(prev => ({ ...prev, evidence: null }))

        } catch (error) {
            console.error('Error uploading evidence:', error)
            Swal.fire('Error', 'Error al subir la imagen', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleReplaceEvidence = () => {
        // Permitir seleccionar nueva imagen para reemplazar
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/*'
        fileInput.onchange = (e) => {
            const file = e.target.files[0]
            if (file) {
                setFormData(prev => ({ ...prev, evidence: file }))

                // Mostrar preview de la nueva imagen
                const reader = new FileReader()
                reader.onload = (e) => setEvidencePreview(e.target.result)
                reader.readAsDataURL(file)
            }
        }
        fileInput.click()
    }


    const handleSaveActivity = async () => {
        if (!formData.activityPerformed.trim()) {
            Swal.fire('Atención', 'Debes describir la actividad realizada', 'warning')
            return
        }

        setLoading(true)
        try {
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { activity_performed: formData.activityPerformed },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            Swal.fire({
                icon: 'success',
                title: 'Actividad Guardada',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-xl' }
            })

            onUpdate && onUpdate({ ...workOrder, activity_performed: formData.activityPerformed })
        } catch (error) {
            console.error('Error saving activity:', error)
            Swal.fire('Error', 'No se pudo guardar la actividad', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleRequiresReplacement = async () => {
        const currentValue = formData.requiresReplacement
        const newValue = !currentValue

        console.log('Toggle requires replacement:', { currentValue, newValue })

        setLoading(true)
        try {
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { requiere_replacement: newValue },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            // Actualizar estado inmediatamente en el frontend
            setFormData(prev => ({ ...prev, requiresReplacement: newValue }))

            // Si se cambia a "No Requiere Repuestos", limpiar repuestos cargados
            if (!newValue) {
                setWorkOrderParts([])
            }

            Swal.fire({
                icon: 'success',
                title: newValue ? 'Repuestos requeridos' : 'Sin repuestos requeridos',
                timer: 1000,
                showConfirmButton: false,
                customClass: { popup: 'rounded-xl' }
            })

            onUpdate && onUpdate({ ...workOrder, requiere_replacement: newValue })
        } catch (error) {
            console.error('Error updating requires replacement:', error)
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRecordEndTime = async () => {
        setLoading(true)
        try {
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { end_time: new Date() },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            setFormData(prev => ({ ...prev, endTime: new Date() }))
            Swal.fire({
                icon: 'success',
                title: 'Hora de Finalización Registrada',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-xl' }
            })

            onUpdate && onUpdate({ ...workOrder, end_time: new Date() })
        } catch (error) {
            console.error('Error recording end time:', error)
            Swal.fire('Error', 'No se pudo registrar la hora de finalización', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handlePreFinish = () => {
        // Cambiar el estado de la orden sin abrir modal de firma
        handleFinalizeOrder()
    }

    const handleChangeStatus = async (newStatus) => {
        setLoading(true)
        try {
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            Swal.fire({
                icon: 'success',
                title: 'Estado Actualizado',
                text: `El estado de la orden ha sido cambiado a ${newStatus}`,
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-xl' }
            })

            onUpdate && onUpdate({ ...workOrder, status: newStatus })
            setShowStatusSelector(false)
        } catch (error) {
            console.error('Error updating status:', error)
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar el estado de la orden',
                customClass: { popup: 'rounded-xl' }
            })
        } finally {
            setLoading(false)
        }
    }

    // Función para validar campos obligatorios antes de finalizar
    const validateRequiredFields = () => {
        const missingFields = []

        // 1. Validar evidencia de la solución
        if (!workOrder.evidence_url || workOrder.evidence_url.trim() === '') {
            missingFields.push('Evidencia de la solución (imagen/foto)')
        }

        // 2. Validar firma digital
        if (!formData.signature || formData.signature.trim() === '') {
            missingFields.push('Firma digital')
        }

        // 3. Validar hora de inicio
        if (!workOrder.start_time) {
            missingFields.push('Hora de inicio')
        }

        // 4. Validar hora de fin
        if (!workOrder.end_time) {
            missingFields.push('Hora de finalización')
        }

        // 5. Validar actividad realizada
        if (!formData.activityPerformed.trim()) {
            missingFields.push('Evidencia de la solución (descripción de la actividad)')
        }

        return missingFields
    }

    // Función para finalizar la orden y actualizar estado de falla
    const handleFinalizeOrder = async () => {
        // Validar campos obligatorios del lado del cliente
        const missingFields = validateRequiredFields()

        if (missingFields.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos Obligatorios Faltantes',
                html: `
                    <div class="text-left">
                        <p class="mb-3">Para finalizar la orden de trabajo, debes completar los siguientes campos:</p>
                        <ul class="list-disc list-inside space-y-1">
                            ${missingFields.map(field => `<li>${field}</li>`).join('')}
                        </ul>
                    </div>
                `,
                customClass: {
                    popup: 'rounded-xl',
                    title: 'text-slate-800 font-bold'
                }
            })
            return
        }

        setLoading(true)
        try {
            // Actualizar estado de la orden de trabajo a RESUELTA
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                { status: 'RESUELTA' },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            // Si tiene falla asociada, actualizar su estado a RESUELTO
            if (workOrder.failure_order_id) {
                try {
                    await axiosInstance.put(
                        `${API_URL}/api/failures/${workOrder.failure_order_id}`,
                        { status: 'RESUELTO' },
                        { headers: { Authorization: `Bearer ${user.token}` } }
                    )
                } catch (failureError) {
                    console.error('Error actualizando estado de falla:', failureError)
                    // No bloquear el proceso si falla la actualización de la falla
                }
            }

            // Mostrar alerta educativa
            Swal.fire({
                icon: 'success',
                title: 'Orden Finalizada Exitosamente',
                text: 'La orden de trabajo ha sido marcada como RESUELTA con todos los campos obligatorios completos.',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: true,
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'rounded-xl',
                    title: 'text-slate-800 font-bold',
                    content: 'text-slate-600'
                }
            }).then(() => {
                // Actualizar estado local y cerrar modal con información de finalización
                const updatedWorkOrder = { ...workOrder, status: 'RESUELTA' }
                onUpdate && onUpdate(updatedWorkOrder)
                onClose(updatedWorkOrder)
            })

        } catch (error) {
            console.error('Error finalizando orden:', error)

            // Mostrar errores específicos del backend
            let errorMessage = 'No se pudo finalizar la orden de trabajo. '

            if (error.response?.data?.error?.message) {
                // Si el error contiene información sobre campos faltantes, mostrarla
                const backendError = error.response.data.error.message
                if (backendError.includes('Campos obligatorios faltantes')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Validación del Servidor',
                        html: `
                            <div class="text-left">
                                <p class="mb-3">El servidor indica que faltan los siguientes campos obligatorios:</p>
                                <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                                    ${backendError}
                                </div>
                            </div>
                        `,
                        customClass: { popup: 'rounded-xl' }
                    })
                    return
                } else {
                    errorMessage += backendError
                }
            } else {
                errorMessage += error.message || 'Error desconocido'
            }

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                customClass: { popup: 'rounded-xl' }
            })
        } finally {
            setLoading(false)
        }
    }

    const getStatusOptions = () => {
        const currentStatus = workOrder.status
        const allStatuses = [
            { value: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
            { value: 'EN_PRUEBAS', label: 'En Pruebas', color: 'bg-indigo-100 text-indigo-800' },
            { value: 'PAUSADO', label: 'Pausado', color: 'bg-amber-100 text-amber-800' },
            { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
        ]

        // Filtrar para mostrar solo los estados diferentes al actual
        return allStatuses.filter(status => status.value !== currentStatus)
    }

    // Función para verificar si el estado permite interacción (proceso activo)
    const isWorkOrderActive = () => {
        return ['EN_PROCESO', 'EN_PRUEBAS'].includes(workOrder.status)
    }

    const handleSignatureSave = async (signatureDataUrl) => {
        setShowSignaturePad(false)
        setFormData(prev => ({ ...prev, signature: signatureDataUrl }))
        setLoading(true)

        try {
            // ✅ CORRECCIÓN: La firma se guarda directamente en la orden de trabajo
            // Sin llamadas a endpoints inexistentes
            await axiosInstance.put(
                `${API_URL}/api/work-orders/${workOrder.id}/update`,
                {
                    closure_signature: signatureDataUrl,
                    resolved_by_id: user.user_id
                },
                { headers: { Authorization: `Bearer ${user.token}` } }
            )

            onUpdate && onUpdate({
                ...workOrder,
                closure_signature: signatureDataUrl,
                resolved_by_id: user.user_id
            })

            Swal.fire({
                icon: 'success',
                title: 'Firma Actualizada',
                text: 'La firma digital ha sido guardada exitosamente. Puedes continuar editando o finalizar cuando estés listo.',
                timer: 3000,
                showConfirmButton: true,
                confirmButtonText: 'Continuar',
                customClass: { popup: 'rounded-xl' }
            })

        } catch (error) {
            console.error('Error saving signature:', error)

            let errorMessage = 'No se pudo guardar la firma: '
            errorMessage += (error.response?.data?.error?.message || error.message)

            Swal.fire('Error', errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const clearSignature = () => {
        setFormData(prev => ({ ...prev, signature: null }))
    }

    const getStatusBadge = (status) => {
        const baseClasses = "px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2"
        switch (status) {
            case 'EN_PROCESO':
                return <span className={`${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`}>
                    <FontAwesomeIcon icon={faPlay} /> EN PROCESO
                </span>
            case 'EN_PRUEBAS':
                return <span className={`${baseClasses} bg-indigo-100 text-indigo-800 border border-indigo-200`}>
                    <FontAwesomeIcon icon={faVial} /> EN PRUEBAS
                </span>
            case 'RESUELTA':
                return <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`}>
                    <FontAwesomeIcon icon={faCheckCircle} /> RESUELTA
                </span>
            case 'CANCELADO':
                return <span className={`${baseClasses} bg-red-100 text-red-800 border border-red-200`}>
                    <FontAwesomeIcon icon={faTimes} /> CANCELADO
                </span>
            case 'PAUSADO':
                return <span className={`${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`}>
                    <FontAwesomeIcon icon={faClock} /> PAUSADO
                </span>
            default:
                return <span className={`${baseClasses} bg-slate-100 text-slate-800 border border-slate-200`}>{status}</span>
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 bg-slate-50 border-b border-slate-200">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <h3 className="text-2xl font-bold text-slate-800">
                                    Orden de Trabajo #{workOrder.work_order_id || workOrder.id}
                                </h3>
                                {getStatusBadge(workOrder.status)}
                            </div>
                            <p className="text-slate-600 font-medium">
                                {workOrder.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Botón Cambiar Estado */}
                            <div className="relative status-selector-container">
                                <button
                                    onClick={() => setShowStatusSelector(!showStatusSelector)}
                                    className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-2"
                                    title="Cambiar estado de la orden"
                                >
                                    <FontAwesomeIcon icon={faExchangeAlt} className="text-sm" />
                                    <span className="text-sm font-medium hidden md:inline">Cambiar Estado</span>
                                </button>

                                {/* Dropdown Selector de Estado */}
                                {showStatusSelector && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                                        <div className="p-4">
                                            <h4 className="text-sm font-bold text-slate-700 mb-3">Seleccionar Nuevo Estado</h4>
                                            <div className="space-y-2">
                                                {getStatusOptions().map((status) => (
                                                    <button
                                                        key={status.value}
                                                        onClick={() => handleChangeStatus(status.value)}
                                                        disabled={loading}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-50 disabled:opacity-50 ${status.color}`}
                                                    >
                                                        {status.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-200">
                                                <button
                                                    onClick={() => setShowStatusSelector(false)}
                                                    className="w-full text-xs text-slate-500 hover:text-slate-700 py-1"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botón Cerrar */}
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xl" />
                            </button>
                        </div>
                    </div>

                    <div className="p-8 overflow-y-auto space-y-8 bg-white flex-1">

                        {/* Step 1: Start Work */}
                        <div className={`rounded-xl border transition-all duration-300 ${!workOrder.start_time
                            ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-200'
                            : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${!workOrder.start_time ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                            <span className="font-bold">1</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-800 mb-1">Inicio de Trabajo</h4>
                                            {workOrder.start_time ? (
                                                <p className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faCheckCircle} />
                                                    Iniciado el: {new Date(workOrder.start_time).toLocaleString()}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-slate-600">Registrar el momento exacto de inicio de labores.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {!workOrder.start_time && (
                                    <div className="mt-4 pl-16">
                                        <div className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Hora de inicio
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.startTime}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <button
                                                onClick={handleStartWork}
                                                disabled={loading}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 font-semibold disabled:opacity-70"
                                            >
                                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlay} />}
                                                {loading ? 'Registrando...' : 'Registrar Inicio'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 2: Requires Replacement */}
                        <div className={`rounded-xl border transition-all duration-300 ${isWorkOrderActive()
                            ? 'bg-amber-50 border-amber-200 shadow-sm hover:shadow-md'
                            : 'opacity-60 bg-slate-50 border-slate-100 grayscale'
                            }`}>
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${isWorkOrderActive() ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        <span className="font-bold">2</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">¿Requiere Repuestos?</h4>
                                </div>

                                <div className="pl-16">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleToggleRequiresReplacement}
                                            disabled={!isWorkOrderActive() || loading}
                                            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 ${formData.requiresReplacement
                                                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                }`}
                                        >
                                            <FontAwesomeIcon icon={formData.requiresReplacement ? faTimes : faCheckCircle} />
                                            {formData.requiresReplacement ? 'NO - No Requiere Repuestos' : 'SÍ - Requiere Repuestos'}
                                        </button>

                                        {formData.requiresReplacement && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <FontAwesomeIcon icon={faTools} />
                                                <span className="text-sm font-medium">Se deshabilitará la gestión de repuestos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Parts Management - Solo se renderiza cuando se requieren repuestos */}
                        {formData.requiresReplacement && (
                            <div className={`rounded-xl border transition-all duration-300 ${isWorkOrderActive()
                                ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                                : 'opacity-60 bg-slate-50 border-slate-100 grayscale'
                                }`}>
                                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${isWorkOrderActive() ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                            <span className="font-bold">3</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-800 mb-1">Gestión de Repuestos</h4>
                                            <p className="text-sm text-slate-600">
                                                {loadingParts ? (
                                                    <span className="text-purple-600">Cargando...</span>
                                                ) : (
                                                    <>
                                                        <span className="font-semibold text-purple-700">{workOrderParts.length}</span> repuestos asignados actualmente.
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowPartsManager(true)}
                                        disabled={!isWorkOrderActive()}
                                        className="w-full md:w-auto px-6 py-3 border-2 border-purple-100 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-200 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FontAwesomeIcon icon={faTools} />
                                        Gestionar Repuestos
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Finish & Resolve */}
                        <div className={`rounded-xl border transition-all duration-300 ${isWorkOrderActive()
                            ? 'bg-emerald-50 border-emerald-200 shadow-md ring-1 ring-emerald-100'
                            : 'opacity-60 bg-slate-50 border-slate-100 grayscale'
                            }`}>
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${isWorkOrderActive() ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        <span className="font-bold">4</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">Trabajo Realizado y Finalización</h4>
                                </div>

                                <div className="pl-16 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faClipboardCheck} className="text-emerald-600" />
                                            Actividad Realizada *
                                        </label>
                                        <textarea
                                            value={formData.activityPerformed}
                                            onChange={(e) => setFormData(prev => ({ ...prev, activityPerformed: e.target.value }))}
                                            disabled={!isWorkOrderActive()}
                                            placeholder="Detalle técnico completo de la solución aplicada..."
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-slate-100 text-slate-700"
                                            rows={3}
                                        />
                                        {isWorkOrderActive() && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={handleSaveActivity}
                                                    disabled={loading || !formData.activityPerformed.trim()}
                                                    className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faClipboardCheck} />}
                                                    {loading ? 'Guardando...' : (workOrder.activity_performed ? 'Actualizar Actividad' : 'Guardar Actividad')}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faImage} className="text-emerald-600" />
                                            Evidencia de Solución *
                                        </label>

                                        {hasExistingEvidence ? (
                                            // Ya hay evidencia cargada - mostrar la imagen existente
                                            <div className="space-y-4">
                                                <div className="relative w-full max-w-md">
                                                    <img
                                                        src={evidencePreview}
                                                        alt="Evidencia existente"
                                                        className="w-full h-64 object-cover rounded-xl border-2 border-emerald-200 shadow-sm"
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTQuNDc3MSA3MCA5MCA3NC40NzcxIDkwIDgwVjEyMEM5MCAxNS41MjI5IDk0LjQ3NzEgMTcwIDEwMCAxNzBDMTA1LjUyMyAxNzAgMTEwIDE2NS41MjMgMTEwIDE2MFYxMjBDMTEwIDExNS41MjMgMTA1LjUyMyAxMTAgMTAwIDExMFYzMDBNMTMwIDEzMFYxNDBIMTc1VjEzMEgxMzBaIiBmaWxsPSIjOUNBM0FGQSIvPgo8cGF0aCBkPSJNMTMwIDEzMFYxNDBIMTc1VjEzMEgxMzBaIiBmaWxsPSIjOUNBM0FGQSIvPgo8L3N2Zz4K'
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                                                        Evidencia Cargada
                                                    </div>
                                                </div>

                                                {isWorkOrderActive() && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleReplaceEvidence}
                                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
                                                        >
                                                            <FontAwesomeIcon icon={faImage} />
                                                            Reemplazar Imagen
                                                        </button>
                                                    </div>
                                                )}

                                                {formData.evidence && (
                                                    <div className="mt-3 flex justify-end">
                                                        <button
                                                            onClick={handleSaveEvidence}
                                                            disabled={loading}
                                                            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faImage} />}
                                                            {loading ? 'Reemplazando...' : 'Confirmar Reemplazo'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // No hay evidencia cargada - permitir subir nueva
                                            <div className="flex items-start gap-6">
                                                <div className="flex-1">
                                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isWorkOrderActive()
                                                        ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                                                        : 'border-slate-300 bg-slate-50 cursor-not-allowed'
                                                        }`}>
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <FontAwesomeIcon icon={faImage} className="text-3xl text-emerald-500 mb-2" />
                                                            <p className="text-sm text-slate-600">Click para subir imagen</p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            disabled={!isWorkOrderActive()}
                                                        />
                                                    </label>
                                                </div>

                                                {evidencePreview && !hasExistingEvidence && (
                                                    <div className="relative w-32 h-32 flex-shrink-0 group">
                                                        <img
                                                            src={evidencePreview}
                                                            alt="Vista previa"
                                                            className="w-full h-full object-cover rounded-xl border-2 border-emerald-200 shadow-sm"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                            <button
                                                                onClick={() => {
                                                                    setEvidencePreview(null)
                                                                    setFormData(prev => ({ ...prev, evidence: null }))
                                                                }}
                                                                className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isWorkOrderActive() && formData.evidence && !hasExistingEvidence && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={handleSaveEvidence}
                                                    disabled={loading}
                                                    className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faImage} />}
                                                    {loading ? 'Subiendo...' : 'Guardar Imagen'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faClock} className="text-emerald-600" />
                                            Registro de Finalización *
                                        </label>
                                        <div className="pl-4 space-y-4">
                                            {workOrder.end_time ? (
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                                    <p className="text-emerald-800 font-medium flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faCheckCircle} />
                                                        Finalizado el: {new Date(workOrder.end_time).toLocaleString()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleRecordEndTime}
                                                    disabled={loading}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faClock} />}
                                                    {loading ? 'Registrando...' : 'Registrar Hora Final'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faSignature} className="text-emerald-600" />
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
                                                onClick={() => setShowSignaturePad(true)}
                                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
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

                                    {/* Información sobre campos obligatorios */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <h5 className="text-sm font-bold text-amber-800 mb-2">Campos Obligatorios para Finalizar:</h5>
                                        <ul className="text-sm text-amber-700 space-y-1">
                                            <li className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faClipboardCheck} className="text-xs" />
                                                Evidencia de la solución (descripción)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faImage} className="text-xs" />
                                                Evidencia de la solución (imagen/foto)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faClock} className="text-xs" />
                                                Hora de inicio y finalización
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faSignature} className="text-xs" />
                                                Firma digital
                                            </li>
                                        </ul>
                                    </div>

                                    {isWorkOrderActive() && formData.signature && (
                                        <div className="pt-6 border-t border-emerald-200 flex justify-end">
                                            <button
                                                onClick={handlePreFinish}
                                                disabled={loading}
                                                className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-1 flex items-center gap-3 disabled:opacity-70 disabled:transform-none"
                                            >
                                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                                                {loading ? 'Procesando...' : 'Finalizar Orden'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Parts Manager Modal */}
                {showPartsManager && (
                    <WorkOrderPartsManager
                        workOrderId={workOrder.id}
                        show={showPartsManager}
                        onClose={() => setShowPartsManager(false)}
                        onSuccess={(parts) => {
                            // Actualizar el estado local de repuestos
                            setWorkOrderParts(parts)
                            // Actualizar el objeto workOrder para mantener consistencia
                            onUpdate && onUpdate({ ...workOrder, WorkOrderParts: parts })
                        }}
                    />
                )}

                {/* Signature Pad Modal */}
                {showSignaturePad && (
                    <SignaturePad
                        onSave={handleSignatureSave}
                        onClose={() => setShowSignaturePad(false)}
                    />
                )}
            </div>
        </>
    )
}