'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// ===============================
// COMPONENTE PRINCIPAL DE GESTIÓN DE INVENTARIO
// ===============================
export default function InventoryManagement() {
    // ===================================
    // ESTADOS PRINCIPALES DEL COMPONENTE
    // ===================================
    const [activeView, setActiveView] = useState('dashboard');
    const [inventory, setInventory] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para filtros y búsqueda
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        location: '',
        status: 'all',
        inStockOnly: false
    });

    // Estados para modales
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Estado para exportación
    const [exporting, setExporting] = useState(false);

    // Estados para formularios
    const [addForm, setAddForm] = useState({
        part_name: '',
        details: '',
        quantity: 0,
        location: '',
        category: 'herramientas',
    });

    const [stockForm, setStockForm] = useState({
        quantity: 0,
        reason: '',
        source: ''
    });

    const [transferForm, setTransferForm] = useState({
        toLocation: '',
        quantity: 0,
        reason: ''
    });

    const [editForm, setEditForm] = useState({
        partName: '',
        details: '',
        quantity: 0,
        location: '',
        category: ''
    });

    // ===================================
    // CONFIGURACIÓN Y CONSTANTES
    // ===================================
    const URL_API = `${process.env.NEXT_PUBLIC_API}`;
    const CATEGORIES = [
        { value: 'locativo', label: 'Locativo', icon: 'fa-building' },
        { value: 'dispositivos', label: 'Dispositivos', icon: 'fa-cog' },
        { value: 'familias', label: 'Familias', icon: 'fa-users' },
        { value: 'herramientas', label: 'Herramientas', icon: 'fa-tools' }
    ];

    // ===================================
    // EFECTOS Y CARGA INICIAL DE DATOS
    // ===================================
    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (activeView === 'inventory') {
            fetchInventory();
        } else if (activeView === 'dashboard') {
            fetchStatistics();
            fetchLowStockAlerts();
        }
    }, [activeView]);

    // ===================================
    // FUNCIONES DE CARGA DE DATOS
    // ===================================
    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            await Promise.all([
                fetchInventory(),
                fetchStatistics(),
                fetchLowStockAlerts()
            ]);
        } catch (err) {
            setError('Error al cargar los datos');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async (overrideParams = {}) => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            let url = `${URL_API}/api/inventory/search?`;
            const params = new URLSearchParams();
            const q = overrideParams.q !== undefined ? overrideParams.q : filters.search;
            const category = overrideParams.category !== undefined ? overrideParams.category : filters.category;
            const location = overrideParams.location !== undefined ? overrideParams.location : filters.location;
            const inStockOnly = overrideParams.inStockOnly !== undefined ? overrideParams.inStockOnly : filters.inStockOnly;
            const page = overrideParams.page !== undefined ? overrideParams.page : undefined;
            const limit = overrideParams.limit !== undefined ? overrideParams.limit : undefined;

            if (q) params.append('q', q);
            if (category) params.append('category', category);
            if (location) params.append('location', location);
            if (inStockOnly) params.append('inStockOnly', 'true');
            if (page) params.append('page', page);
            if (limit) params.append('limit', limit);
            
            url += params.toString();

            const response = await fetch(url, { headers });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al cargar inventario');

            setInventory(data.data.parts || []);
        } catch (err) {
            console.error('Error cargando inventario:', err);
            setError(err.message);
        }
    };

    const fetchStatistics = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            const response = await fetch(`${URL_API}/api/inventory/statistics`, { headers });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al cargar estadísticas');

            setStatistics(data.data || {});
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
        }
    };

    const fetchLowStockAlerts = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            const response = await fetch(`${URL_API}/api/inventory/low-stock-alerts`, { headers });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al cargar alertas');

            setLowStockAlerts(data.data.alerts || []);
        } catch (err) {
            console.error('Error cargando alertas:', err);
        }
    };

    // ===================================
    // FUNCIONES DE GESTIÓN DE INVENTARIO
    // ===================================
    const handleAddItem = async () => {
        const missingFields = [];
        if (!addForm.part_name) {
            missingFields.push('Nombre del Repuesto');
        }
        if (!addForm.location) {
            missingFields.push('Ubicación');
        }
        if (addForm.quantity <= 0) {
            missingFields.push('Cantidad (debe ser mayor a 0)');
        }

        if (missingFields.length > 0) {
            Swal.fire('Campos incompletos', `Por favor, complete los siguientes campos: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            // Mapear campos correctamente para el backend
            const requestBody = {
                partName: addForm.part_name,
                details: addForm.details || '',
                location: addForm.location,
                category: addForm.category,
                quantity: addForm.quantity,
                source: 'Administración'
            };

            const response = await fetch(`${URL_API}/api/inventory/add`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || 'Error al agregar item');

            Swal.fire('¡Éxito!', 'Item agregado al inventario correctamente', 'success');
            setIsAddModalOpen(false);
            setAddForm({
                part_name: '',
                details: '',
                quantity: 0,
                location: '',
                category: 'herramientas',
            });
            // Refresh inventory forcing a search for the new item's name so it appears immediately
            setFilters(prev => ({ ...prev, search: requestBody.partName, category: requestBody.category || prev.category }));
            fetchInventory({ q: requestBody.partName, category: requestBody.category, location: requestBody.location, page: 1, limit: 100 });
            fetchStatistics();
        } catch (err) {
            console.error('Error agregando item:', err);
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleStockUpdate = async (type) => {
        if (!stockForm.quantity || !stockForm.reason) {
            Swal.fire('Error', 'Por favor complete todos los campos', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const endpoint = type === 'increment' ? 'increment' : 'decrement';
            const response = await fetch(`${URL_API}/api/inventory/${selectedItem.id}/${endpoint}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    quantity: parseInt(stockForm.quantity),
                    reason: stockForm.reason
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || `Error al ${type === 'increment' ? 'incrementar' : 'decrementar'} stock`);

            Swal.fire('¡Éxito!', `Stock ${type === 'increment' ? 'incrementado' : 'decrementado'} correctamente`, 'success');
            setIsStockModalOpen(false);
            setStockForm({ quantity: 0, reason: '', source: '' });
            setSelectedItem(null);
            fetchInventory();
            fetchStatistics();
        } catch (err) {
            console.error('Error actualizando stock:', err);
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleTransfer = async () => {
        if (!transferForm.toLocation || !transferForm.quantity || !transferForm.reason) {
            Swal.fire('Error', 'Por favor complete todos los campos', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const response = await fetch(`${URL_API}/api/inventory/transfer`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    partId: selectedItem.id,
                    toLocation: transferForm.toLocation,
                    quantity: parseInt(transferForm.quantity),
                    reason: transferForm.reason
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || 'Error al transferir item');

            Swal.fire('¡Éxito!', 'Transferencia realizada correctamente', 'success');
            setIsTransferModalOpen(false);
            setTransferForm({ toLocation: '', quantity: 0, reason: '' });
            setSelectedItem(null);
            fetchInventory();
            fetchStatistics();
        } catch (err) {
            console.error('Error en transferencia:', err);
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleDeleteItem = async (item) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Deseas eliminar "${item.partName || item.part_name}" del inventario? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('authToken');
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                };

                // Para eliminar, usamos el endpoint de uso con toda la cantidad
                const response = await fetch(`${URL_API}/api/inventory/use`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        partId: item.id,
                        quantity: item.quantity,
                        reason: 'Eliminación por administración'
                    })
                });

                const data = await response.json();

                if (!response.ok) throw new Error(data.error?.message || 'Error al eliminar item');

                Swal.fire('¡Eliminado!', 'Item eliminado del inventario', 'success');
                fetchInventory();
                fetchStatistics();
            } catch (err) {
                console.error('Error eliminando item:', err);
                Swal.fire('Error', err.message, 'error');
            }
        }
    };

    const openEditModal = (item) => {
        setSelectedItem(item);
        setEditForm({
            partName: item.partName || item.part_name || '',
            details: item.details || '',
            quantity: item.quantity || 0,
            location: item.location || '',
            category: item.category || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async () => {
        if (!selectedItem) return;

        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${URL_API}/api/inventory/${selectedItem.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    partName: editForm.partName,
                    details: editForm.details,
                    quantity: editForm.quantity,
                    location: editForm.location,
                    category: editForm.category
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || data.message || 'Error al actualizar item');

            Swal.fire('¡Éxito!', 'Item actualizado correctamente', 'success');
            setIsEditModalOpen(false);
            setSelectedItem(null);
            fetchInventory();
            fetchStatistics();
        } catch (err) {
            console.error('Error actualizando item:', err);
            Swal.fire('Error', err.message || 'No se pudo actualizar el item', 'error');
        }
    };

    // ===================================
    // FUNCIONES DE EXPORTACIÓN A PDF
    // ===================================
    const exportToPDF = async () => {
        setExporting(true);
        try {
            // Crear ventana nueva para impresión
            const printWindow = window.open('', '_blank');
            
            const currentDate = new Date().toLocaleDateString('es-ES');
            const currentTime = new Date().toLocaleTimeString('es-ES');
            
            // Construir HTML para el PDF
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reporte de Inventario</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                            color: #333;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 3px solid #7c3aed;
                            padding-bottom: 15px;
                        }
                        .header h1 {
                            color: #7c3aed;
                            margin: 0;
                            font-size: 24px;
                        }
                        .header p {
                            color: #666;
                            margin: 5px 0;
                        }
                        .stats {
                            display: flex;
                            justify-content: space-around;
                            margin: 20px 0;
                            gap: 15px;
                        }
                        .stat-card {
                            background: #f8fafc;
                            border: 2px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 15px;
                            text-align: center;
                            flex: 1;
                        }
                        .stat-card h3 {
                            margin: 0;
                            color: #7c3aed;
                            font-size: 18px;
                        }
                        .stat-card p {
                            margin: 5px 0 0 0;
                            font-size: 24px;
                            font-weight: bold;
                            color: #333;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 12px 8px;
                            text-align: left;
                        }
                        th {
                            background: linear-gradient(135deg, #7c3aed, #a855f7);
                            color: white;
                            font-weight: bold;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        tr:hover {
                            background-color: #f1f5f9;
                        }
                        .status-badge {
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .status-disponible {
                            background-color: #dcfce7;
                            color: #166534;
                        }
                        .status-stock-bajo {
                            background-color: #fed7aa;
                            color: #9a3412;
                        }
                        .status-agotado {
                            background-color: #fecaca;
                            color: #991b1b;
                        }
                        .footer {
                            margin-top: 30px;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                            border-top: 1px solid #ddd;
                            padding-top: 15px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1><i class="fas fa-warehouse"></i> REPORTE DE INVENTARIO</h1>
                        <p>Generado el ${currentDate} a las ${currentTime}</p>
                        <p>Sistema de Gestión Administrativa</p>
                    </div>

                    <div class="stats">
                        <div class="stat-card">
                            <h3>Total Items</h3>
                            <p>${statistics.totalInventoryItems || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Disponibles</h3>
                            <p>${statistics.availableCount || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Stock Bajo</h3>
                            <p>${statistics.lowStockCount || 0}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Agotados</h3>
                            <p>${statistics.outOfStockCount || 0}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Repuesto</th>
                                <th>Categoría</th>
                                <th>Ubicación</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Agregar filas de datos
            inventory.forEach(item => {
                const categoryLabel = CATEGORIES.find(c => c.value === item.category)?.label || item.category;
                const statusClass = item.quantity === 0 ? 'status-agotado' : 
                                  item.quantity <= 2 ? 'status-stock-bajo' : 'status-disponible';
                const statusText = item.quantity === 0 ? 'Agotado' : 
                                 item.quantity <= 2 ? 'Stock Bajo' : 'Disponible';

                htmlContent += `
                    <tr>
                        <td>${item.id}</td>
                        <td><strong>${item.partName}</strong></td>
                        <td>${categoryLabel}</td>
                        <td>${item.location}</td>
                        <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                        <td style="text-align: center;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${item.details || '-'}</td>
                    </tr>
                `;
            });

            htmlContent += `
                        </tbody>
                    </table>

                    <div class="footer">
                        <p><strong>Nota:</strong> Este reporte incluye ${inventory.length} elementos del inventario.</p>
                        <p>Stock Bajo = Cantidad ≤ 2 | Agotado = Cantidad = 0</p>
                        <p>Generado automáticamente por el Sistema de Gestión de Inventario</p>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Esperar a que cargue y luego imprimir
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };

            Swal.fire('¡Éxito!', 'Reporte PDF generado correctamente', 'success');

        } catch (error) {
            console.error('Error generando PDF:', error);
            Swal.fire('Error', 'No se pudo generar el reporte PDF', 'error');
        } finally {
            setExporting(false);
        }
    };

    // ===================================
    // FUNCIONES DE MANEJO DE FORMULARIOS
    // ===================================
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleAddFormChange = (key, value) => {
        setAddForm(prev => ({ ...prev, [key]: value }));
    };

    const handleStockFormChange = (key, value) => {
        setStockForm(prev => ({ ...prev, [key]: value }));
    };

    const handleEditFormChange = (key, value) => {
        setEditForm(prev => ({ ...prev, [key]: value }));
    };

    const handleTransferFormChange = (key, value) => {
        setTransferForm(prev => ({ ...prev, [key]: value }));
    };

    // ===================================
    // FUNCIONES DE UTILIDAD
    // ===================================
    const getStockStatusColor = (quantity) => {
        if (quantity === 0) return 'text-red-600 bg-red-100';
        if (quantity <= 2) return 'text-orange-600 bg-orange-100';
        return 'text-green-600 bg-green-100';
    };

    const getStockStatusText = (quantity) => {
        if (quantity === 0) return 'Agotado';
        if (quantity <= 2) return 'Stock Bajo';
        return 'Disponible';
    };

    const getCategoryIcon = (category) => {
        const cat = CATEGORIES.find(c => c.value === category);
        return cat ? cat.icon : 'fa-box';
    };

    // ===================================
    // RENDERIZADO CONDICIONAL POR VISTA
    // ===================================
    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100">Total Items</p>
                            <p className="text-3xl font-bold">{statistics.totalInventoryItems || 0}</p>
                        </div>
                        <i className="fa fa-boxes text-4xl text-purple-200"></i>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-500 to-slate-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-100">Disponibles</p>
                            <p className="text-3xl font-bold">{statistics.availableCount || 0}</p>
                        </div>
                        <i className="fa fa-check-circle text-4xl text-slate-200"></i>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100">Stock Bajo</p>
                            <p className="text-3xl font-bold">{statistics.lowStockCount || 0}</p>
                        </div>
                        <i className="fa fa-exclamation-triangle text-4xl text-blue-200"></i>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100">Agotados</p>
                            <p className="text-3xl font-bold">{statistics.outOfStockCount || 0}</p>
                        </div>
                        <i className="fa fa-times-circle text-4xl text-red-200"></i>
                    </div>
                </div>
            </div>

            {/* Alertas de stock bajo */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">
                    <i className="fa fa-bell text-orange-500 mr-2"></i>
                    Alertas de Stock Bajo
                </h3>
                {lowStockAlerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        <i className="fa fa-check-circle text-green-500 text-4xl mb-2"></i><br />
                        No hay alertas de stock bajo
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lowStockAlerts.map((alert) => (
                            <div key={alert.inventoryId} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-gray-800">{alert.partName}</h4>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(alert.currentStock)}`}>
                                        {getStockStatusText(alert.currentStock)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{alert.details}</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        <i className="fa fa-map-marker-alt mr-1"></i>
                                        {alert.location}
                                    </span>
                                    <span className="font-medium">
                                        Stock: {alert.currentStock}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-6">
            {/* Panel de controles */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <h3 className="text-xl font-bold text-gray-800">
                        <i className="fa fa-warehouse text-purple-500 mr-2"></i>
                        Gestión de Inventario
                    </h3>
                    <div className="flex gap-3">
                        <button
                            onClick={exportToPDF}
                            disabled={exporting || inventory.length === 0}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? (
                                <>
                                    <i className="fa fa-spinner fa-spin mr-2"></i>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <i className="fa fa-file-pdf mr-2"></i>
                                    Exportar PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                        >
                            <i className="fa fa-plus mr-2"></i>
                            Agregar Item
                        </button>
                    </div>
                </div>

                {/* Filtros de búsqueda */}
                <div className="mt-6 flex flex-col md:flex-row flex-wrap items-center gap-4">
                    <div className="relative flex-grow w-full md:w-auto">
                        <i className="fa fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar items..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                        <option value="">Todas las categorías</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Ubicación"
                        className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={filters.inStockOnly}
                            onChange={(e) => handleFilterChange('inStockOnly', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">Solo con stock</span>
                    </label>
                    <button
                        onClick={fetchInventory}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-colors shadow-md w-full md:w-auto"
                    >
                        <i className="fa fa-search mr-2"></i>
                        Buscar
                    </button>
                </div>
            </div>

            {/* Tabla de inventario */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium">Item</th>
                                <th className="px-6 py-4 text-left text-sm font-medium">Categoría</th>
                                <th className="px-6 py-4 text-left text-sm font-medium">Ubicación</th>
                                <th className="px-6 py-4 text-left text-sm font-medium">Stock</th>
                                <th className="px-6 py-4 text-left text-sm font-medium">Estado</th>
                                <th className="px-6 py-4 text-left text-sm font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {inventory.slice().sort((a, b) => a.id - b.id).map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="ml-0">
                                                <div className="text-sm font-medium text-gray-900 flex items-center">
                                                    <i className={`fa ${getCategoryIcon(item.category)} text-purple-600 mr-2`}></i>
                                                    <span>{item.partName}</span>
                                                </div>
                                                <div className="text-sm text-gray-500">{item.details}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <i className={`fa ${getCategoryIcon(item.category)} mr-1`}></i>
                                            {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <i className="fa fa-map-marker-alt text-gray-400 mr-1"></i>
                                        {item.location}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(item.quantity)}`}>
                                            {getStockStatusText(item.quantity)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-900 transition-all duration-150"
                                                title="Editar"
                                                aria-label={`Editar ${item.partName}`}
                                            >
                                                <i className="fa fa-edit"></i>
                                                <span className="text-sm">Editar</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item)}
                                                className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-900 transition-all duration-150"
                                                title="Eliminar"
                                                aria-label={`Eliminar ${item.partName}`}
                                            >
                                                <i className="fa fa-trash"></i>
                                                <span className="text-sm">Eliminar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // ===================================
    // RENDERIZADO PRINCIPAL
    // ===================================
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <i className="fa fa-spinner fa-spin text-4xl text-purple-500 mb-4"></i>
                    <p className="text-gray-600">Cargando datos del inventario...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Navegación de vistas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <nav className="flex space-x-1">
                    <button
                        onClick={() => setActiveView('dashboard')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            activeView === 'dashboard'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                        }`}
                    >
                        <i className="fa fa-tachometer-alt mr-2"></i>
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveView('inventory')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            activeView === 'inventory'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                        }`}
                    >
                        <i className="fa fa-warehouse mr-2"></i>
                        Inventario
                    </button>
                    <button
                        onClick={() => setActiveView('reports')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            activeView === 'reports'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                        }`}
                    >
                        <i className="fa fa-chart-bar mr-2"></i>
                        Reportes
                    </button>
                </nav>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <i className="fa fa-exclamation-circle text-red-400 mr-2"></i>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* Renderizado de vistas */}
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'inventory' && renderInventory()}
            {activeView === 'reports' && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                        <i className="fa fa-chart-bar text-purple-500 mr-2"></i>
                        Reportes de Inventario
                    </h3>
                    <p className="text-gray-600">Funcionalidad de reportes en desarrollo...</p>
                </div>
            )}

            {/* ===============================
                MODALES DE GESTIÓN
                =============================== */}

            {/* Modal para agregar item */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    <i className="fa fa-plus text-purple-500 mr-2"></i>
                                    Agregar Nuevo Item
                                </h3>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className="fa fa-times text-xl"></i>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre del Repuesto *
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={addForm.part_name}
                                            onChange={(e) => handleAddFormChange('part_name', e.target.value)}
                                            placeholder="Ej: Tornillo M8x30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Categoría *
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={addForm.category}
                                            onChange={(e) => handleAddFormChange('category', e.target.value)}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Detalles
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows="3"
                                        value={addForm.details}
                                        onChange={(e) => handleAddFormChange('details', e.target.value)}
                                        placeholder="Descripción detallada del repuesto..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ubicación *
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={addForm.location}
                                            onChange={(e) => handleAddFormChange('location', e.target.value)}
                                            placeholder="Ej: Bodega Principal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Cantidad Inicial *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={addForm.quantity}
                                            onChange={(e) => handleAddFormChange('quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddItem}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                                >
                                    <i className="fa fa-plus mr-2"></i>
                                    Agregar Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para gestionar stock */}
            {isStockModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-800">
                                    <i className="fa fa-edit text-purple-500 mr-2"></i>
                                    Gestionar Stock
                                </h3>
                                <button
                                    onClick={() => setIsStockModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className="fa fa-times"></i>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-600">
                                    <strong>Item:</strong> {selectedItem.partName}
                                </p>
                                <p className="text-gray-600">
                                    <strong>Stock actual:</strong> {selectedItem.quantity}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cantidad *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        value={stockForm.quantity}
                                        onChange={(e) => handleStockFormChange('quantity', parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Razón *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        value={stockForm.reason}
                                        onChange={(e) => handleStockFormChange('reason', e.target.value)}
                                        placeholder="Motivo del cambio de stock"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    onClick={() => setIsStockModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleStockUpdate('decrement')}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    <i className="fa fa-minus mr-2"></i>
                                    Decrementar
                                </button>
                                <button
                                    onClick={() => handleStockUpdate('increment')}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    <i className="fa fa-plus mr-2"></i>
                                    Incrementar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para transferencias */}
            {isTransferModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-800">
                                    <i className="fa fa-exchange-alt text-purple-500 mr-2"></i>
                                    Transferir Stock
                                </h3>
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className="fa fa-times"></i>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-600">
                                    <strong>Item:</strong> {selectedItem.partName}
                                </p>
                                <p className="text-gray-600">
                                    <strong>Ubicación actual:</strong> {selectedItem.location}
                                </p>
                                <p className="text-gray-600">
                                    <strong>Stock disponible:</strong> {selectedItem.quantity}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ubicación destino *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        value={transferForm.toLocation}
                                        onChange={(e) => handleTransferFormChange('toLocation', e.target.value)}
                                        placeholder="Ej: Bodega Secundaria"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cantidad a transferir *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.quantity}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        value={transferForm.quantity}
                                        onChange={(e) => handleTransferFormChange('quantity', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Razón de transferencia *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        value={transferForm.reason}
                                        onChange={(e) => handleTransferFormChange('reason', e.target.value)}
                                        placeholder="Motivo de la transferencia"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                                >
                                    <i className="fa fa-exchange-alt mr-2"></i>
                                    Transferir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para editar item */}
            {isEditModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    <i className="fa fa-edit text-purple-500 mr-2"></i>
                                    Editar Item
                                </h3>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className="fa fa-times text-xl"></i>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Repuesto</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={editForm.partName}
                                            onChange={(e) => handleEditFormChange('partName', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={editForm.category}
                                            onChange={(e) => handleEditFormChange('category', e.target.value)}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Detalles</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows="3"
                                        value={editForm.details}
                                        onChange={(e) => handleEditFormChange('details', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={editForm.location}
                                            onChange={(e) => handleEditFormChange('location', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={editForm.quantity}
                                            onChange={(e) => handleEditFormChange('quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 mt-8">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateItem}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                                >
                                    <i className="fa fa-save mr-2"></i>
                                    Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}