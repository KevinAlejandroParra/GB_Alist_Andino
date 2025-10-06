'use client'

import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../AuthContext';

export function usePremios(checklistTypeId) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [premiosData, setPremiosData] = useState({
    fecha: '',
    tickets_vendidos: '',
    tickets_canjeados: '',
    tickets_disponibles: '',
    observaciones: ''
  });

  const handleDataChange = useCallback((field, value) => {
    setPremiosData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveData = useCallback(async () => {
    if (!user) return;

    try {
      await axiosInstance.post(
        `/api/checklists/special/${checklistTypeId}/premios-data`,
        premiosData,
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      await Swal.fire({
        title: '¡Éxito!',
        text: 'Datos de premios guardados exitosamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      // Aquí se podría llamar a una función para refrescar el historial si fuera necesario
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'Error al guardar datos de premios',
        icon: 'error'
      });
    }
  }, [user, checklistTypeId, premiosData]);

  return {
    isPremiosModalOpen: isModalOpen,
    openPremiosModal: () => setIsModalOpen(true),
    closePremiosModal: () => setIsModalOpen(false),
    premiosData,
    handlePremiosDataChange: handleDataChange,
    handleSavePremiosData: handleSaveData,
  };
}
