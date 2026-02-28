'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getImageSrc } from '../../utils/imageUrl';

export default function RequisitionManagement() {
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const URL_API = `${process.env.NEXT_PUBLIC_API}`;

    // Estado para el modal de recepción e inventario
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState(null);
    const [receiveForm, setReceiveForm] = useState({
        partName: '',
        quantity: 0,
        location: 'Almacén Central',
        category: 'Repuesto',
        details: '',
        notes: ''
    });

    const CATEGORIES = [
        { value: 'locativo', label: 'Locativo' },
        { value: 'dispositivos', label: 'Dispositivos' },
        { value: 'familias', label: 'Familias' },
        { value: 'herramientas', label: 'Herramientas' },
        { value: 'Repuesto', label: 'Repuesto General' }
    ];

    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'received', 'cancelled'

    useEffect(() => {
        fetchRequisitions();
    }, [activeTab]);

    const fetchRequisitions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${URL_API}/api/requisitions`;

            if (activeTab === 'pending') {
                url = `${URL_API}/api/requisitions/pending`;
            } else if (activeTab === 'received') {
                url = `${URL_API}/api/requisitions?status=RECIBIDO`;
            } else if (activeTab === 'cancelled') {
                url = `${URL_API}/api/requisitions?status=CANCELADO`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                // Handle different response structures
                if (activeTab === 'pending') {
                    setRequisitions(data.data.requisitions || []);
                } else {
                    setRequisitions(data.data.requisitions || []);
                }
            } else {
                console.error('Error fetching requisitions:', data.error);
                setRequisitions([]);
            }
        } catch (error) {
            console.error('Error fetching requisitions:', error);
            setRequisitions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        const { value: notes } = await Swal.fire({
            title: 'Aprobar Requisición',
            input: 'textarea',
            inputLabel: 'Notas de aprobación',
            inputPlaceholder: 'Escribe una nota opcional...',
            showCancelButton: true,
            confirmButtonText: 'Aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#ef4444'
        });

        if (notes !== undefined) {
            setProcessingId(id);
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${URL_API}/api/requisitions/${id}/approve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notes })
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Aprobado!',
                        text: 'La requisición ha sido aprobada correctamente.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchRequisitions();
                } else {
                    throw new Error(data.error?.message || 'Error al aprobar');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Rechazar Requisición',
            input: 'textarea',
            inputLabel: 'Razón del rechazo',
            inputPlaceholder: '¿Por qué se rechaza esta solicitud?',
            inputValidator: (value) => {
                if (!value) {
                    return '¡Debes escribir una razón!';
                }
            },
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        });

        if (reason) {
            setProcessingId(id);
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${URL_API}/api/requisitions/${id}/cancel`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Rechazada',
                        text: 'La requisición ha sido rechazada.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchRequisitions();
                } else {
                    throw new Error(data.error?.message || 'Error al rechazar');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleReceive = (id) => {
        const requisition = requisitions.find(r => r.id === id);
        if (!requisition) return;

        setSelectedRequisition(requisition);
        setReceiveForm({
            partName: requisition.part_reference,
            quantity: requisition.quantity_requested,
            location: 'Almacén Central',
            category: 'Repuesto',
            details: `Repuesto para OT: ${requisition.workOrder?.work_order_id || 'N/A'} - ${requisition.workOrder?.failureOrder?.description || ''}`,
            notes: ''
        });
        setIsReceiveModalOpen(true);
    };

    const submitReceive = async (e) => {
        e.preventDefault();

        if (!selectedRequisition) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/requisitions/${selectedRequisition.id}/receive-and-add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: receiveForm.location,
                    category: receiveForm.category,
                    status: 'Disponible',
                    notes: receiveForm.notes,
                    image_url: selectedRequisition.image_url
                })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Recibido e Inventariado!',
                    text: 'El repuesto ha sido agregado al inventario y la requisición marcada como recibida.',
                    timer: 2500,
                    showConfirmButton: false
                });
                setIsReceiveModalOpen(false);
                fetchRequisitions();
            } else {
                throw new Error(data.error?.message || 'Error al procesar la recepción');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (requisition) => {
        const token = localStorage.getItem('authToken');
        const { isConfirmed } = await Swal.fire({
            title: 'Eliminar Requisición',
            text: `¿Desea eliminar la requisición #${requisition.id}? Esta acción no se puede reversar.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!isConfirmed) return;

        setProcessingId(requisition.id);
        try {
            const response = await fetch(`${URL_API}/api/requisitions/${requisition.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || 'Error al eliminar requisición');
            }
            Swal.fire('Eliminado', 'Requisición eliminada correctamente', 'success');
            fetchRequisitions();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            <i className="fa fa-boxes text-purple-600 mr-3"></i> Gestión de Requisiciones </h2>
                        <p className="text-gray-500 mt-1">Administra las solicitudes de repuestos</p>
                    </div>
                    <button
                        onClick={fetchRequisitions}
                        className="mt-4 md:mt-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm"
                    >
                        <i className={`fa fa-sync-alt mr-2 ${loading ? 'fa-spin' : ''}`}></i>
                        Actualizar
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'pending'
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa fa-clock mr-2"></i>
                        Pendientes
                    </button>
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'received'
                            ? 'text-emerald-600 border-b-2 border-emerald-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa fa-check-circle mr-2"></i>
                        Recibidas
                    </button>
                    <button
                        onClick={() => setActiveTab('cancelled')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'cancelled'
                            ? 'text-red-600 border-b-2 border-red-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa fa-ban mr-2"></i>
                        Canceladas
                    </button>
                </div>
            </div>

            {loading && requisitions.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                </div>
            ) : requisitions.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                    <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <i className="fa fa-info-circle text-purple-600 text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">No hay requisiciones {activeTab === 'pending' ? 'pendientes' : activeTab === 'received' ? 'recibidas' : 'canceladas'}</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {requisitions.map((req) => (
                        <div key={req.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 relative group">
                            {/* Indicador de estado visual (barra lateral) */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${req.status === 'RECIBIDO' ? 'bg-emerald-500' :
                                req.status === 'CANCELADO' ? 'bg-red-500' :
                                    'bg-yellow-400'
                                }`}></div>

                            <div className="p-6 ml-2">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${req.status === 'RECIBIDO' ? 'bg-emerald-100 text-emerald-800' :
                                            req.status === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {req.status}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            <i className="far fa-clock mr-1"></i>
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="mt-2 md:mt-0 text-right">
                                        <p className="text-sm font-semibold text-gray-700">Solicitado por:</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                {req.requester?.user_name?.charAt(0) || 'U'}
                                            </div>
                                            <span className="text-gray-900">{req.requester?.user_name || 'Desconocido'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Imagen si existe */}
                                    {req.image_url ? (
                                        <div className="w-full md:w-48 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={getImageSrc(req.image_url)}
                                                alt="Repuesto"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full md:w-32 h-32 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 border border-gray-200">
                                            <i className="fa fa-image text-3xl"></i>
                                        </div>
                                    )}

                                    {/* Detalles */}
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 truncate" title={req.part_reference}>
                                            {req.part_reference}
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cantidad Solicitada</p>
                                                <p className="text-2xl font-bold text-purple-600">{req.quantity_requested}</p>
                                            </div>
                                            {req.workOrder && (
                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                                    <p className="text-xs text-blue-500 uppercase font-bold mb-1">Orden de Trabajo</p>
                                                    <p className="text-sm font-semibold text-blue-700 flex items-center">
                                                        <i className="fa fa-clipboard-list mr-2"></i>
                                                        {req.workOrder.work_order_id || 'N/A'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {req.notes && (
                                            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                                                <i className="fa fa-sticky-note text-yellow-500 mr-2"></i>
                                                "{req.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones - Solo mostrar si está activo */}
                                {activeTab === 'pending' && (
                                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            disabled={processingId === req.id}
                                            className="px-4 py-2 bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all font-medium flex items-center"
                                        >
                                            <i className="fa fa-times mr-2"></i>
                                            Rechazar
                                        </button>

                                        {req.status === 'PENDIENTE' ? (
                                            <button
                                                onClick={() => handleReceive(req.id)}
                                                disabled={processingId === req.id}
                                                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-medium flex items-center transform active:scale-95"
                                            >
                                                {processingId === req.id ? (
                                                    <>
                                                        <i className="fa fa-spinner fa-spin mr-2"></i> Procesando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-box-open mr-2"></i> Recibir
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleApprove(req.id)}
                                                disabled={processingId === req.id}
                                                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg hover:from-purple-600 hover:to-indigo-700 transition-all font-medium flex items-center transform active:scale-95"
                                            >
                                                {processingId === req.id ? (
                                                    <>
                                                        <i className="fa fa-spinner fa-spin mr-2"></i> Procesando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-check mr-2"></i> Aprobar
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(req)}
                                            disabled={processingId === req.id}
                                            className="px-4 py-2 bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all font-medium flex items-center"
                                        >
                                            <i className="fa fa-trash mr-2"></i>
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Recepción e Inventario */}
            {isReceiveModalOpen && selectedRequisition && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn transform transition-all">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center text-white relative">
                                <h3 className="text-xl font-bold flex items-center">
                                    <i className="fa fa-box-open mr-2"></i>
                                    Recibir e Inventariar
                                </h3>
                                <button
                                    onClick={() => setIsReceiveModalOpen(false)}
                                    className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors focus:outline-none"
                                >
                                    <i className="fa fa-times"></i>
                                </button>
                            </div>
                            <p className="text-emerald-100 text-sm mt-2 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                Registrando entrada para: <span className="text-white font-bold">{selectedRequisition.part_reference}</span>
                            </p>
                        </div>

                        <form onSubmit={submitReceive} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre del Repuesto</label>
                                    <input
                                        type="text"
                                        value={receiveForm.partName}
                                        readOnly
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cantidad</label>
                                    <input
                                        type="number"
                                        value={receiveForm.quantity}
                                        readOnly
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-bold focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Categoría</label>
                                    <div className="relative">
                                        <select
                                            value={receiveForm.category}
                                            onChange={(e) => setReceiveForm({ ...receiveForm, category: e.target.value })}
                                            className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white appearance-none text-gray-700"
                                            required
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ubicación de Almacenamiento</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fa fa-map-marker-alt text-gray-400 group-focus-within:text-emerald-500 transition-colors"></i>
                                    </div>
                                    <input
                                        type="text"
                                        value={receiveForm.location}
                                        onChange={(e) => setReceiveForm({ ...receiveForm, location: e.target.value })}
                                        placeholder="Ej. Estante A-3, Caja 2"
                                        className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Detalles / Descripción</label>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 italic">
                                        {receiveForm.details || "Sin detalles adicionales"}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notas de Recepción</label>
                                <textarea
                                    value={receiveForm.notes}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                                    placeholder="Observaciones adicionales..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                    rows="2"
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsReceiveModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 font-bold shadow-md hover:shadow-lg transform active:scale-95 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {loading ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin mr-2"></i> Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-check-circle mr-2"></i> Confirmar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
