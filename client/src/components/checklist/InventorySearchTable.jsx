'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faRotate, faBox, faExclamationTriangle, faCheckCircle, faTimesCircle, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { processMultiplePartsForWorkOrder, getLatestWorkOrderByUser } from '../../utils/inventoryApi';
import { getImageSrc } from '../../utils/imageUrl';

const InventorySearchTable = ({
  show,
  onClose,
  onPartSelected,
  onPartNotFound, // <-- Nueva prop
  initialQuery = '',
  selectedCategories = [],
  selectedLocations = [],
  inStockOnly = true,
  workOrderId,
  failureInfo,
  allowMultiple = false,
  onMultiplePartsComplete
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [stockFilter, setStockFilter] = useState(inStockOnly);
  const [sortBy, setSortBy] = useState('part_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inventoryData, setInventoryData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedParts, setSelectedParts] = useState([]); // Para selección múltiple {id, quantity, ...}
  const [processingParts, setProcessingParts] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (show) {
      loadInitialData();
      // Cargar inventario automáticamente al abrir
      performSearch('');
    }
  }, [show]);

  // Cargar categorías y ubicaciones disponibles
  const loadInitialData = async () => {
    try {
      // Cargar categorías desde el modelo
      const categoryOptions = ['locativo', 'dispositivos', 'familias', 'herramientas'];
      setCategories(categoryOptions);

      // Cargar ubicaciones (esto podría venir de una API)
      const locationOptions = [
        'Bodega Principal',
        'Área de Operación',
        'Mantenimiento',
        'Respaldo',
        'Taller'
      ];
      setLocations(locationOptions);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  };

  // Realizar búsqueda usando el endpoint /api/inventory
  const performSearch = async (query = searchQuery) => {
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;

      const response = await fetch(`${baseUrl}/api/inventory`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      if (response.status === 401) {
        // Sweet Alert personalizado para sesión caducada
        Swal.fire({
          title: 'Autenticación requerida',
          text: 'Por favor, inicia sesión para continuar',
          icon: 'warning',
          confirmButtonText: 'Ir a iniciar sesión',
          confirmButtonColor: '#3085d6',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then((result) => {
          if (result.isConfirmed) {
            // Limpiar datos de autenticación
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
            // Redirigir al login
            window.location.href = '/login';
          }
        });
        setInventoryData([]);
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // El endpoint /api/inventory devuelve {success: true, data: {parts: [...], pagination: {...}}}
      let items = [];

      if (result.success && result.data && result.data.parts) {
        items = result.data.parts;
      } else if (Array.isArray(result)) {
        items = result;
      } else {
        setError('Formato de respuesta del servidor inválido');
        setInventoryData([]);
        return;
      }

      // Aplicar filtros en el frontend ya que el endpoint no los soporta
      let filteredItems = items;

      // Filtro por búsqueda de texto
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        filteredItems = filteredItems.filter(item =>
          (item.part_name && item.part_name.toLowerCase().includes(searchTerm)) ||
          (item.partName && item.partName.toLowerCase().includes(searchTerm)) ||
          (item.item_name && item.item_name.toLowerCase().includes(searchTerm)) ||
          (item.details && item.details.toLowerCase().includes(searchTerm)) ||
          (item.description && item.description.toLowerCase().includes(searchTerm))
        );
      }

      // Filtro por categoría
      if (selectedCategory) {
        filteredItems = filteredItems.filter(item =>
          item.category === selectedCategory
        );
      }

      // Filtro por ubicación
      if (selectedLocation) {
        filteredItems = filteredItems.filter(item =>
          item.location === selectedLocation
        );
      }

      // Filtro de stock disponible
      if (stockFilter) {
        filteredItems = filteredItems.filter(item =>
          (item.quantity || item.quantity_available || 0) > 0 &&
          (item.status === 'disponible' || item.status === 'available' || !item.status)
        );
      }

      // Aplicar ordenamiento
      filteredItems.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case 'part_name':
            aValue = (a.part_name || a.partName || a.item_name || '').toLowerCase();
            bValue = (b.part_name || b.partName || b.item_name || '').toLowerCase();
            break;
          case 'category':
            aValue = (a.category || '').toLowerCase();
            bValue = (b.category || '').toLowerCase();
            break;
          case 'location':
            aValue = (a.location || '').toLowerCase();
            bValue = (b.location || '').toLowerCase();
            break;
          case 'quantity':
            aValue = a.quantity || a.quantity_available || 0;
            bValue = b.quantity || b.quantity_available || 0;
            break;
          default:
            aValue = a.id || 0;
            bValue = b.id || 0;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Aplicar paginación
      const totalFiltered = filteredItems.length;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

      setInventoryData(paginatedItems);
      setTotalItems(totalFiltered);

    } catch (err) {
      console.error('Error obteniendo inventario:', err);
      setError('Error al conectar con el servidor o procesar la respuesta de inventario');
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejar búsqueda al presionar Enter o hacer clic en buscar
  const handleSearch = (e) => {
    if (e.type === 'click' || e.key === 'Enter') {
      e.preventDefault();
      setCurrentPage(1);
      performSearch();
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setStockFilter(true);
    setSortBy('part_name');
    setSortOrder('asc');
    setCurrentPage(1);
    setInventoryData([]);
    setHasSearched(false);
    setError('');
  };

  // Seleccionar/deseleccionar repuesto (toggle)
  const handlePartToggle = (part) => {
    const partName = part.partName || part.part_name || part.item_name || `Repuesto ${part.id}`;
    const availableQuantity = part.quantity || part.quantity_available || 0;
    const partData = {
      id: part.id,
      item_name: partName,
      part_name: partName,
      quantity_available: availableQuantity,
      category: part.category,
      location: part.location,
      status: part.status,
      details: part.details || part.description,
      description: part.details || part.description,
      image_url: part.image_url,
      quantity: 1 // Cantidad por defecto al seleccionar
    };

    if (allowMultiple) {
      // Modo selección múltiple
      setSelectedParts(prev => {
        const isSelected = prev.find(p => p.id === part.id);
        if (isSelected) {
          return prev.filter(p => p.id !== part.id);
        } else {
          return [...prev, partData];
        }
      });
    } else {
      // Modo selección única (comportamiento original)
      if (onPartSelected) {
        onPartSelected(partData);
      }
    }
  };

  // Actualizar cantidad de un repuesto seleccionado
  const handleQuantityChange = (partId, newQuantity) => {
    setSelectedParts(prev =>
      prev.map(part =>
        part.id === partId
          ? { ...part, quantity: Math.max(1, Math.min(newQuantity, part.quantity_available || 999)) }
          : part
      )
    );
  };

  // Seleccionar repuesto (solo para modo único)
  const handlePartSelect = (part) => {
    const partName = part.partName || part.part_name || part.item_name || `Repuesto ${part.id}`;

    if (onPartSelected) {
      onPartSelected({
        id: part.id,
        item_name: partName,
        part_name: partName,
        quantity_available: part.quantity || part.quantity_available,
        category: part.category,
        location: part.location,
        status: part.status,
        details: part.details || part.description,
        description: part.details || part.description,
        image_url: part.image_url
      });
    }
  };

  // Iniciar proceso de confirmación con SweetAlert
  const handleCompleteProcess = async () => {
    if (selectedParts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selecciones',
        text: 'Por favor selecciona al menos un repuesto',
        timer: 3000,
        timerProgressBar: true
      });
      return;
    }

    // Mostrar SweetAlert de confirmación
    const result = await Swal.fire({
      title: '⚠️ Confirmar acción',
      html: `
        <div style="text-align: left;">
          <p><strong>Estás a punto de registrar ${selectedParts.length} repuesto(s) en la orden de trabajo.</strong></p>
          <p>¿Estás seguro de que deseas continuar?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, registrar repuestos',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    });

    if (result.isConfirmed) {
      // Usuario confirmó, proceder con el procesamiento
      processSelectedParts();
    }
    // Si canceló, no hacer nada
  };

  // Procesar los repuestos seleccionados
  const processSelectedParts = async () => {
    setProcessingParts(true);

    try {
      let currentWorkOrderId = workOrderId;

      // Si no tenemos workOrderId, intentar obtenerlo de la BD
      if (!currentWorkOrderId) {
        const latestWorkOrderResult = await getLatestWorkOrderByUser();

        if (latestWorkOrderResult.success) {
          currentWorkOrderId = latestWorkOrderResult.workOrderId;
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Error al obtener orden de trabajo',
            text: latestWorkOrderResult.error || 'No se pudo obtener la orden de trabajo',
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: true
          });
          return;
        }
      }

      // Preparar datos para el backend
      const partsData = selectedParts.map((part, index) => ({
        inventoryId: part.id,
        quantity: part.quantity || 1,
        reason: `Repuesto ${part.item_name} usado en orden de trabajo ${currentWorkOrderId}`
      }));

      // Llamar al API del backend
      const result = await processMultiplePartsForWorkOrder(currentWorkOrderId, partsData);

      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: `${selectedParts.length} repuesto(s) registrado(s) correctamente en la orden de trabajo.`,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        // Limpiar selecciones y cerrar modal
        setSelectedParts([]);
        onClose();

        // Si hay callback del componente padre, ejecutarlo
        if (onMultiplePartsComplete) {
          onMultiplePartsComplete(selectedParts);
        }
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error al registrar repuestos',
          text: result.message || 'Error desconocido',
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true
        });
      }

    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: error.message,
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true
      });
    } finally {
      setProcessingParts(false);
    }
  };

  // Limpiar todas las selecciones
  const handleClearSelections = () => {
    setSelectedParts([]);
  };

  // Verificar si un repuesto está seleccionado
  const isPartSelected = (partId) => {
    return selectedParts.find(p => p.id === partId) !== undefined;
  };

  // Ordenar tabla
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Obtener ícono de estado
  const getStatusIcon = (status, quantity) => {
    if (quantity <= 0) {
      return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
    }
    if (status === 'disponible') {
      return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
    }
    return <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />;
  };

  // Calcular paginación
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems);

  return (
    <>
      {show && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon icon={faBox} className="text-blue-600 text-2xl" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">🔍 Buscar Repuesto en Inventario</h2>
                    <p className="text-sm text-gray-600">
                      {allowMultiple ? 'Selecciona múltiples repuestos para usar en la falla' : 'Selecciona un repuesto para usar en la falla'}
                    </p>
                    {allowMultiple && selectedParts.length > 0 && (
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="text-sm font-medium text-blue-600">
                          📋 {selectedParts.length} repuesto{selectedParts.length !== 1 ? 's' : ''} seleccionado{selectedParts.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={handleClearSelections}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Limpiar todas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Botón de completar proceso para selección múltiple */}
                  {allowMultiple && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCompleteProcess}
                      disabled={selectedParts.length === 0 || processingParts}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${selectedParts.length > 0 && !processingParts
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {processingParts ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span>✓ Completar proceso ({selectedParts.length})</span>
                        </>
                      )}
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                  </motion.button>
                </div>
              </div>

              {/* Filtros de Búsqueda */}
              <div className="p-6 border-b bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  {/* Búsqueda por texto */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FontAwesomeIcon icon={faSearch} className="inline mr-1" />
                      Buscar repuesto
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearch}
                        placeholder="Nombre, descripción, código..."
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
                    </div>
                  </div>

                  {/* Filtro por categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FontAwesomeIcon icon={faFilter} className="inline mr-1" />
                      Categoría
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por ubicación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todas las ubicaciones</option>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de disponibilidad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>
                    <select
                      value={stockFilter ? 'true' : 'false'}
                      onChange={(e) => setStockFilter(e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Solo con stock</option>
                      <option value="false">Todos</option>
                    </select>
                  </div>
                </div>

                {/* Acciones de filtros */}
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSearch}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faSearch} />
                    <span>Buscar</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearFilters}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <FontAwesomeIcon icon={faRotate} />
                    <span>Limpiar</span>
                  </motion.button>

                  {hasSearched && (
                    <div className="text-sm text-gray-600 mt-2">
                      Resultados: {totalItems} repuestos encontrados
                    </div>
                  )}
                </div>
              </div>

              {/* Información general siempre visible */}
              <div className="p-6 bg-blue-50 border-b border-blue-200">
                <div className="flex items-start space-x-3">
                  <FontAwesomeIcon icon={faBox} className="text-blue-600 text-2xl mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">💡 Importante: Valida primero en el inventario</h4>
                    <p className="text-sm text-blue-700">
                      Es necesario que busques tu repuesto para que el sistema valide si necesitas crear una requisición.
                      Si después de buscar no encuentras el repuesto, podrás crear la requisición automáticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabla de Resultados */}
              <div className="flex-1 overflow-hidden">

                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-64"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Buscando repuestos...</span>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 text-center text-red-600"
                  >
                    <FontAwesomeIcon icon={faExclamationTriangle} size="lg" className="mx-auto mb-2" />
                    <p>{error}</p>
                  </motion.div>
                ) : inventoryData.length === 0 && hasSearched ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 text-center text-gray-500 space-y-4"
                  >
                    <FontAwesomeIcon icon={faBox} size="3x" className="mx-auto mb-2 text-gray-300" />
                    <p>No se encontraron repuestos que coincidan con los criterios de búsqueda</p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">⚠️ No encontré el repuesto que necesito</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Si no encuentras el repuesto en la búsqueda, puedes crear una requisición directamente.
                      </p>
                      <button
                        onClick={onPartNotFound} // <-- Llama a la nueva prop
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        📦 No encontré el repuesto, crear requisición
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* Encabezado de tabla */}
                    <div className="bg-gray-50 border-b px-4 py-3">
                      <div className={`grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 ${allowMultiple ? '' : ''}`}>
                        <div className="col-span-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('part_name')}>
                          Nombre {sortBy === 'part_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                        <div className="col-span-2 cursor-pointer hover:text-blue-600" onClick={() => handleSort('category')}>
                          Categoría {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                        <div className="col-span-2 cursor-pointer hover:text-blue-600" onClick={() => handleSort('location')}>
                          Ubicación {sortBy === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                        <div className={`${allowMultiple ? 'col-span-1' : 'col-span-1'} text-center cursor-pointer hover:text-blue-600`} onClick={() => handleSort('quantity')}>
                          Stock {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                        {allowMultiple && (
                          <div className="col-span-1 text-center">
                            Usar
                          </div>
                        )}
                        <div className="col-span-1 text-center">Estado</div>
                        <div className="col-span-1">Descripción</div>
                        <div className="col-span-1 text-center">Acción</div>
                      </div>
                    </div>

                    {/* Cuerpo de tabla */}
                    <div className="overflow-y-auto max-h-96">
                      {inventoryData.map((part, index) => (
                        <div
                          key={part.id || index}
                          className={`border-b hover:bg-blue-50 transition-colors ${allowMultiple && isPartSelected(part.id) ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                        >
                          <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm">
                            {/* Nombre del repuesto */}
                            <div className="col-span-3">
                              <div className="flex items-center space-x-2">
                                {part.image_url ? (
                                  <img
                                    src={getImageSrc(part.image_url)}
                                    alt={part.part_name || part.item_name}
                                    className="w-8 h-8 rounded object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <FontAwesomeIcon icon={faBox} className="text-gray-400" />
                                )}
                                <div className="flex items-center space-x-2">
                                  {allowMultiple && (
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isPartSelected(part.id)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-300 hover:border-blue-400'
                                      }`}>
                                      {isPartSelected(part.id) && (
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-white text-xs" />
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {part.partName || part.part_name || part.item_name || part.name || `Repuesto ${part.id}`}
                                    </div>
                                    <div className="text-gray-500 text-xs">ID: {part.id}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Categoría */}
                            <div className="col-span-2">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {part.category?.charAt(0).toUpperCase() + part.category?.slice(1)}
                              </span>
                            </div>

                            {/* Ubicación */}
                            <div className="col-span-2 text-gray-600">{part.location}</div>

                            {/* Stock disponible */}
                            <div className="col-span-1 text-center">
                              <span className={`font-medium ${(part.quantity || 0) <= 0 ? 'text-red-600' :
                                  (part.quantity || 0) <= 5 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                {part.quantity || 0}
                              </span>
                            </div>

                            {/* Cantidad a usar (solo en modo múltiple) */}
                            {allowMultiple && (
                              <div className="col-span-1 text-center">
                                {isPartSelected(part.id) ? (
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => {
                                        const selectedPart = selectedParts.find(p => p.id === part.id);
                                        const currentQty = selectedPart?.quantity || 1;
                                        if (currentQty > 1) {
                                          handleQuantityChange(part.id, currentQty - 1);
                                        }
                                      }}
                                      className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={part.quantity || part.quantity_available || 999}
                                      value={selectedParts.find(p => p.id === part.id)?.quantity || 1}
                                      onChange={(e) => {
                                        const newQty = parseInt(e.target.value) || 1;
                                        handleQuantityChange(part.id, newQty);
                                      }}
                                      className="w-12 text-center text-xs border rounded"
                                    />
                                    <button
                                      onClick={() => {
                                        const selectedPart = selectedParts.find(p => p.id === part.id);
                                        const currentQty = selectedPart?.quantity || 1;
                                        const maxQty = part.quantity || part.quantity_available || 999;
                                        if (currentQty < maxQty) {
                                          handleQuantityChange(part.id, currentQty + 1);
                                        }
                                      }}
                                      className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                            )}

                            {/* Estado */}
                            <div className="col-span-1 text-center">
                              {getStatusIcon(part.status, part.quantity)}
                            </div>

                            {/* Descripción */}
                            <div className="col-span-1 text-gray-600 text-xs">
                              {part.details?.substring(0, 30)}{part.details?.length > 30 ? '...' : ''}
                            </div>

                            {/* Acción */}
                            <div className="col-span-1 text-center">
                              {allowMultiple ? (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handlePartToggle(part)}
                                  disabled={(part.quantity || 0) <= 0}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${isPartSelected(part.id)
                                      ? 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                                >
                                  {isPartSelected(part.id) ? 'Quitar' : 'Seleccionar'}
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handlePartSelect(part)}
                                  disabled={(part.quantity || 0) <= 0}
                                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  Seleccionar
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paginación */}
                    {hasSearched && totalItems > 0 && (
                      <div className="bg-gray-50 px-4 py-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Mostrando {startIndex} - {endIndex} de {totalItems} repuestos
                          </div>
                          <div className="flex items-center space-x-2">
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(parseInt(e.target.value));
                                setCurrentPage(1);
                                if (hasSearched) performSearch();
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value={5}>5 por página</option>
                              <option value={10}>10 por página</option>
                              <option value={20}>20 por página</option>
                              <option value={50}>50 por página</option>
                            </select>

                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                              Anterior
                            </button>

                            <span className="text-sm text-gray-700">
                              Página {currentPage} de {totalPages}
                            </span>

                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
};

export default InventorySearchTable;