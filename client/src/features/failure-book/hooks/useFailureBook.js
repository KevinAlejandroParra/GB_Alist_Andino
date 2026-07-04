'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  fetchFailuresPage,
  fetchFailureBookStats,
  fetchChecklistTypes,
  linkFailureToWorkOrder
} from '../../../utils/failureBookApi';
import { DEFAULT_FILTERS, PAGE_SIZE, hasActiveFilters } from '../utils/failureBookHelpers';

export function useFailureBook() {
  const searchParams = useSearchParams();
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0 });
  const [totalInDb, setTotalInDb] = useState(0);
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [bookStats, setBookStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    critical: 0,
    topChecklists: [],
    topDevices: [],
    topTechnicians: []
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [viewMode, setViewMode] = useState('checklist');
  const [showCharts, setShowCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [collapsedSections, setCollapsedSections] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFailure, setSelectedFailure] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const searchDebounceRef = useRef(null);
  const initialChecklistTypeId = searchParams.get('checklistTypeId');
  const [checklistFilterFromUrl, setChecklistFilterFromUrl] = useState(initialChecklistTypeId);

  const refresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  useEffect(() => {
    const checklistTypeId = searchParams.get('checklistTypeId');
    if (!checklistTypeId) return;
    setChecklistFilterFromUrl(checklistTypeId);
    setFilters((prev) =>
      prev.checklistTypeId === checklistTypeId
        ? prev
        : { ...prev, checklistTypeId }
    );
  }, [searchParams]);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  const loadFailures = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('authToken');
      const { failures: rows, pagination: pag } = await fetchFailuresPage(token, {
        page: currentPage,
        limit: PAGE_SIZE,
        activeTab,
        filters,
        searchQuery: debouncedSearch
      });

      setFailures(rows);
      setPagination(pag);
      setTotalInDb(pag.total);
    } catch (error) {
      if (error.code === 401 || error.message === 'UNAUTHORIZED') {
        Swal.fire({
          title: 'Autenticación requerida',
          text: 'Por favor, inicia sesión para continuar',
          icon: 'warning',
          confirmButtonText: 'Ir a iniciar sesión'
        }).then(() => {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        });
        return;
      }
      setLoadError(error.message || 'Ocurrió un error al cargar el libro de fallas');
      Swal.fire('Error', error.message || 'Ocurrió un error al cargar el libro de fallas', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, filters, debouncedSearch, refreshTrigger]);

  useEffect(() => {
    loadFailures();
  }, [loadFailures]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchChecklistTypes(token)
        .then((types) => setChecklistTypes(Array.isArray(types) ? types : []))
        .catch((err) => console.error('Error cargando tipos de checklist:', err));
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (loading) return;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const data = await fetchFailureBookStats(token, {
          activeTab,
          ...filters,
          searchQuery: debouncedSearch
        });
        setBookStats(data);
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [activeTab, filters, debouncedSearch, loading, refreshTrigger]);

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilters({ ...DEFAULT_FILTERS });
    setActiveTab('all');
    setCurrentPage(1);
    setChecklistFilterFromUrl(null);
    if (typeof window !== 'undefined' && searchParams.get('checklistTypeId')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('checklistTypeId');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  const handleViewDetail = (failure) => {
    setSelectedFailure(failure);
    setShowDetailModal(true);
  };

  const handleLinkToWorkOrder = async (failure) => {
    const { value: workOrderId } = await Swal.fire({
      title: 'Enlazar a Orden de Trabajo',
      html: `
        <p class="text-sm text-gray-600 mb-4">Ingresa el ID de la orden de trabajo existente</p>
        <p class="text-xs text-gray-500 mb-2">Ejemplo: OT-2026-444594</p>
      `,
      input: 'text',
      inputPlaceholder: 'OT-2026-XXXXXX',
      showCancelButton: true,
      confirmButtonText: 'Enlazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value) return 'Debes ingresar un ID de OT';
        if (!value.startsWith('OT-')) return 'El ID debe comenzar con "OT-"';
      }
    });

    if (!workOrderId) return;

    try {
      const token = localStorage.getItem('authToken');
      await linkFailureToWorkOrder(failure.id, workOrderId, token);
      Swal.fire({
        title: '¡Enlazado!',
        text: 'La falla ha sido enlazada a la orden de trabajo',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
      refresh();
    } catch (error) {
      Swal.fire('Error', error.message || 'Ocurrió un error al enlazar la falla', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / PAGE_SIZE));

  const totals = {
    all: bookStats.total ?? pagination.total ?? 0,
    pending: bookStats.pending ?? 0,
    resolved: bookStats.resolved ?? 0,
    canceled: bookStats.canceled ?? 0,
    critical: bookStats.critical ?? 0
  };

  const stats = {
    topChecklists: bookStats.topChecklists || [],
    topDevices: bookStats.topDevices || [],
    topTechs: bookStats.topTechnicians || []
  };

  const filteredChecklistName =
    checklistFilterFromUrl && checklistTypes.length > 0
      ? checklistTypes.find(
          (t) => String(t.checklist_type_id) === String(checklistFilterFromUrl)
        )?.name
      : null;

  return {
    failures,
    loading,
    checklistFilterFromUrl,
    filteredChecklistName,
    loadError,
    pagination,
    totalInDb,
    checklistTypes,
    bookStats,
    statsLoading,
    stats,
    totals,
    viewMode,
    setViewMode,
    showCharts,
    setShowCharts,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    collapsedSections,
    toggleSection,
    clearFilters,
    currentPage,
    setCurrentPage,
    totalPages,
    selectedFailure,
    showDetailModal,
    setShowDetailModal,
    showCreateModal,
    setShowCreateModal,
    hasActiveFilters: hasActiveFilters(searchQuery, filters, activeTab),
    refresh,
    handleViewDetail,
    handleLinkToWorkOrder
  };
}
