import { useState, useEffect, useCallback } from 'react';
import { maintenanceApi } from '../utils/maintenanceSchedulerApi';
import Swal from 'sweetalert2';

export function useMaintenanceCalendar(initialPremiseId = 2) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [premiseId, setPremiseId] = useState(initialPremiseId);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (initialPremiseId && initialPremiseId !== premiseId) {
      setPremiseId(initialPremiseId);
    }
  }, [initialPremiseId]);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maintenanceApi.getPlanForMonth(premiseId, currentMonth);
      setPlanData(data);
    } catch (err) {
      console.error('Error fetching maintenance plan:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar cronograma',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  }, [premiseId, currentMonth]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const generatePlan = async () => {
    const result = await Swal.fire({
      title: '¿Generar plan mensual?',
      text: `Se generará la distribución de mantenimientos preventivos para el mes ${currentMonth}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar plan',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const data = await maintenanceApi.generatePlan(premiseId, currentMonth);
      setPlanData(data);
      Swal.fire({
        icon: 'success',
        title: 'Plan generado con éxito',
        text: `Se programaron ${data.stats?.total || 0} mantenimientos para ${currentMonth}.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al generar plan',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoading(false);
    }
  };

  const publishPlan = async () => {
    if (!planData?.plan?.id) return;

    const result = await Swal.fire({
      title: '¿Publicar cronograma?',
      text: 'Una vez publicado, los técnicos podrán ejecutar sus sesiones operativas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, publicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await maintenanceApi.publishPlan(planData.plan.id);
      await fetchPlan();
      Swal.fire({
        icon: 'success',
        title: 'Plan publicado',
        text: 'El cronograma ya es visible y oficial para los técnicos.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al publicar plan',
        text: err.response?.data?.error || err.message,
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    currentMonth,
    setCurrentMonth,
    premiseId,
    setPremiseId,
    planData,
    loading,
    selectedDay,
    setSelectedDay,
    selectedSlot,
    setSelectedSlot,
    refreshPlan: fetchPlan,
    generatePlan,
    publishPlan
  };
}
