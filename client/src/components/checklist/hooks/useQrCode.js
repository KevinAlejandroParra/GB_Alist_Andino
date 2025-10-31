'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import Swal from 'sweetalert2';

export const useQrCode = (checklistId, checklistTypeId, user) => {
    const [showQrModal, setShowQrModal] = useState(false);
    const [isLoadingQr, setIsLoadingQr] = useState(false);
    const [qrScans, setQrScans] = useState([]);
    const [completedParentItems, setCompletedParentItems] = useState(0);
    const [isQrRequired, setIsQrRequired] = useState(false);
    const [qrValidationEnabled, setQrValidationEnabled] = useState(false);
    const [totalQrPartitions, setTotalQrPartitions] = useState(1);
    const [currentPartition, setCurrentPartition] = useState(1);
    const [qrAuthorizationInfo, setQrAuthorizationInfo] = useState(null);
    const hasRequiredQr = useRef(false);

   // Cargar historial de escaneos QR para este checklist
  const loadQrScans = useCallback(async () => {
    if (!checklistId) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(
        `${API_URL}/api/qr-codes/checklist/${checklistId}/scans`
      );

      if (response.data.success) {
        setQrScans(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando escaneos QR:', error);
    }
  }, [checklistId]);

  // Cargar información de autorización QR
  const loadQrAuthorizationInfo = useCallback(async () => {
    if (!checklistId) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(
        `${API_URL}/api/qr-codes/checklist/${checklistId}/authorization`
      );

      if (response.data.success) {
        const authInfo = response.data.data;

        // Verificar si la información ha cambiado para evitar actualizaciones innecesarias
        const currentAuthInfo = qrAuthorizationInfo;
        const hasChanged =
          !currentAuthInfo ||
          currentAuthInfo.requires_qr !== authInfo.requires_qr ||
          currentAuthInfo.total_qr_codes !== authInfo.total_qr_codes ||
          JSON.stringify(currentAuthInfo.next_qr_required) !== JSON.stringify(authInfo.next_qr_required) ||
          JSON.stringify(currentAuthInfo.unlocked_items) !== JSON.stringify(authInfo.unlocked_items);

        if (hasChanged) {
          // Actualizar estado basado en la información de autorización
          setQrValidationEnabled(authInfo.requires_qr);
          setTotalQrPartitions(authInfo.total_qr_codes);
          setQrAuthorizationInfo(authInfo);

          // Usar la nueva información del backend para determinar si realmente se requiere QR
          const actuallyRequiresQr = authInfo.checklist_completion_status?.requires_further_qr_scans ||
                                    (authInfo.requires_qr && authInfo.next_qr_required && authInfo.next_qr_required.qr_code);
          
          console.log('🔍 Debug Frontend - Backend info:', {
            requires_qr: authInfo.requires_qr,
            next_qr_required: authInfo.next_qr_required,
            checklist_completion_status: authInfo.checklist_completion_status,
            actuallyRequiresQr: actuallyRequiresQr
          });

          // Solo marcar como requerido si realmente hay un siguiente QR disponible
          if (actuallyRequiresQr) {
            setIsQrRequired(true);
            console.log('🔒 Frontend: Requiriendo QR según backend');
          } else {
            // Si no se requiere QR o no hay siguiente QR requerido, habilitar botones
            setIsQrRequired(false);
            console.log('✅ Frontend: No se requiere QR, habilitando botones');
          }

          console.log('✅ Información de autorización QR cargada:', authInfo);
          console.log('🔓 Items desbloqueados desde backend:', authInfo.unlocked_items?.length || 0);
        }
        return authInfo;
      } else {
        console.warn('⚠️ Respuesta no exitosa al cargar autorización QR:', response.data);
      }
    } catch (error) {
      console.error('❌ Error cargando información de autorización QR:', error);
      // Inicializar con valores por defecto en caso de error
      setQrAuthorizationInfo(null);
    }
  }, [checklistId, qrAuthorizationInfo]);

  // Verificar configuración QR para el tipo de checklist
  const checkQrRequirement = useCallback(async () => {
    if (!checklistTypeId) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
      const response = await axiosInstance.get(`${API_URL}/api/checklist-types/${checklistTypeId}`);

      if (response.data.success) {
        const checklistType = response.data.data;
        setTotalQrPartitions(checklistType.total_qr_partitions || 1);
        // No set qrValidationEnabled or isQrRequired here, let authorization info handle it
      }
    } catch (error) {
      console.error('Error verificando configuración QR:', error);
    }
  }, [checklistTypeId]);

  // Función para manejar respuesta exitosa de escaneo QR
  const handleQrScanSuccess = useCallback(async (qrCode) => {
    try {
      setIsLoadingQr(true);

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

      // 1. Validar si el QR es correcto para la sección actual
      const validationResponse = await axiosInstance.get(
        `${API_URL}/api/qr-codes/checklist/${checklistId}/validate/${qrCode}`
      );

      if (!validationResponse.data.success) {
        throw new Error(validationResponse.data.message || 'Error validando código QR');
      }

      const validationData = validationResponse.data.data;

      if (!validationData.is_valid) {
        const correctQrInfo = validationData.correct_qr;
        throw new Error(
          `QR incorrecto para la sección actual. ` +
          `Se requiere el QR "${correctQrInfo ? correctQrInfo.qr_code : 'desconocido'}" ` +
          `(Grupo ${correctQrInfo ? correctQrInfo.group_number : 'N/A'})`
        );
      }

      // 2. Registrar el escaneo usando el endpoint tradicional
      const scanResponse = await axiosInstance.post(
        `${API_URL}/api/qr-codes/scan`,
        {
          checklist_id: checklistId,
          qr_code: qrCode,
          item_count_at_scan: completedParentItems,
          checklist_status: 'in_progress',
          parent_items_completed: completedParentItems,
          current_partition: validationData.current_progress.next_partition
        }
      );

      if (scanResponse.data.success) {
        // 3. Actualizar estado local
        setQrScans(prev => [...prev, scanResponse.data.data]);
        setShowQrModal(false);

        // 4. Actualizar partición actual
        setCurrentPartition(validationData.current_progress.next_partition);

        // 5. Recargar información de autorización para actualizar estado
        const authInfo = await loadQrAuthorizationInfo();

        // 6. Actualizar el estado de QR requerido basado en la nueva información
        if (authInfo && !authInfo.next_qr_required) {
          setIsQrRequired(false);
        }

        // Mostrar confirmación
        Swal.fire({
          icon: 'success',
          title: '¡QR Válido!',
          text: `Sección ${validationData.current_progress.next_partition} autorizada exitosamente`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });

        return true;
      } else {
        throw new Error(scanResponse.data.message || 'Error registrando escaneo');
      }

    } catch (error) {
      console.error('Error procesando escaneo QR:', error);
      
      // Si es un error de validación de QR (QR incorrecto), recargar modal automáticamente
      if (error.message && error.message.includes('QR incorrecto')) {
        // Cerrar modal actual y reabrirlo inmediatamente para permitir nuevo intento
        setShowQrModal(false);
        
        // Mostrar error por un momento
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reabrir modal automáticamente
        setShowQrModal(true);
        
        // Mostrar mensaje de error de forma no bloqueante
        Swal.fire({
          icon: 'error',
          title: 'QR Incorrecto',
          text: error.message,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } else {
        // Para otros tipos de errores, mostrar modal normal
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Error procesando el código QR',
          confirmButtonText: 'Reintentar'
        });
      }
      
      return false;
    } finally {
      setIsLoadingQr(false);
    }
  }, [checklistId, completedParentItems, loadQrAuthorizationInfo]);

  // Función para requerir QR (llamar cuando se necesite validar)
  const requireQrScan = useCallback(() => {
    if (isQrRequired) {
      setShowQrModal(true);
    }
  }, [isQrRequired]);



  // Función para calcular cuántas secciones padre se han completado
  const calculateCompletedParentSections = useCallback((checklistItems, itemResponses) => {
    if (!checklistItems || !itemResponses) return 0;

    let completedCount = 0;

    const processItems = (items) => {
      if (!items) return;

      items.forEach((item) => {
        // Si es un item padre (tiene subItems y no es item hoja)
        if (item.subItems && item.subItems.length > 0) {
          // Verificar si todos los subItems están completados
          const allSubItemsCompleted = item.subItems.every(subItem => {
            const subItemId = subItem.unique_frontend_id || subItem.checklist_item_id;
            const response = itemResponses[subItemId];
            // Considerar completado si tiene respuesta de cumplimiento
            return response && response.response_compliance && response.response_compliance !== '';
          });

          if (allSubItemsCompleted) {
            completedCount++;
          }
        }

        // Procesar subItems recursivamente
        if (item.subItems) {
          processItems(item.subItems);
        }
      });
    };

    processItems(checklistItems);
    return completedCount;
  }, []);

  // Función para verificar si un item específico está desbloqueado
  const isItemUnlocked = useCallback((itemId) => {
    // Si la validación QR no está habilitada, todo está desbloqueado.
    if (!qrValidationEnabled) {
      return true;
    }

    // Si no hay información de autorización o lista de desbloqueo, todo está bloqueado.
    if (!qrAuthorizationInfo || !qrAuthorizationInfo.unlocked_items) {
      return false;
    }

    // La única fuente de verdad es la lista `unlocked_items` del backend.
    const numericItemId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    
    const isUnlocked = qrAuthorizationInfo.unlocked_items.some(
      (item) => item.checklist_item_id === numericItemId
    );

    return isUnlocked;
  }, [qrValidationEnabled, qrAuthorizationInfo]);

  // Función para actualizar conteo de ítems padre completados
  const updateCompletedParentItems = useCallback(async (count) => {
    setCompletedParentItems(count);

    // Si QR no está habilitado, no hacer nada más
    if (!qrValidationEnabled || totalQrPartitions <= 1) {
      return;
    }

    try {
      // Obtener información actualizada de autorización
      const authInfo = await loadQrAuthorizationInfo();

      if (!authInfo || !authInfo.requires_qr) {
        return;
      }

      // Mantener la última información de QR
      setQrAuthorizationInfo(prevInfo => ({
        ...prevInfo,
        ...authInfo,
        // Mantener los items desbloqueados de particiones anteriores
        unlocked_items: [
          ...(prevInfo?.unlocked_items || []).filter(item => 
            item.partition < (authInfo.last_validated_partition + 1)
          ),
          ...(authInfo.unlocked_items || [])
        ]
      }));

      // Actualizar partición actual basada en el progreso del servidor
      if (authInfo.last_validated_partition !== undefined) {
        const newPartition = authInfo.last_validated_partition + 1;
        if (newPartition !== currentPartition) {
          console.log(`📊 Actualizando partición: ${currentPartition} -> ${newPartition}`);
          setCurrentPartition(newPartition);
        }
      }

      // IMPORTANTE: Solo requerir QR si realmente es necesario según la lógica del servidor
      // El servidor ahora permite completar secciones ya desbloqueadas antes de pedir el siguiente QR
      if (authInfo.next_qr_required && authInfo.next_qr_required.qr_code) {
        // Solo requerir QR si realmente hay un siguiente QR disponible
        console.log('🔒 Requiriendo QR según servidor:', authInfo.next_qr_required);
        setIsQrRequired(true);
      } else {
        // Si no hay siguiente QR requerido o está vacío, el checklist está completo
        console.log('🎉 Checklist completo, no se requiere más QR');
        setIsQrRequired(false);
      }

    } catch (error) {
      console.error('Error actualizando conteo de ítems padre:', error);
    }
  }, [qrValidationEnabled, totalQrPartitions, isQrRequired, loadQrAuthorizationInfo]);


  // Función para actualizar progreso basado en respuestas del checklist
  const updateProgressFromResponses = useCallback(async (checklistItems, itemResponses) => {
    if (!checklistItems || !itemResponses) {
      console.log('❌ updateProgressFromResponses: Parámetros inválidos');
      return;
    }

    try {
      // Calcular cuántas secciones padre se han completado (para compatibilidad)
      const completedSections = calculateCompletedParentSections(checklistItems, itemResponses);
      console.log(`📊 Cálculo de progreso: ${completedSections} secciones completadas`);

      // Solo recargar información de autorización si hay progreso real
      if (completedSections !== completedParentItems) {
        console.log(`🔄 Progreso QR actualizado: ${completedSections} secciones completadas (anterior: ${completedParentItems})`);
        // Recargar información de autorización para obtener items desbloqueados actualizados
        await loadQrAuthorizationInfo();
        await updateCompletedParentItems(completedSections);
      } else {
        console.log(`📋 Progreso sin cambios: ${completedSections} secciones completadas`);
      }
    } catch (error) {
      console.error('❌ Error actualizando progreso desde respuestas:', error);
    }
  }, [calculateCompletedParentSections, updateCompletedParentItems, completedParentItems, loadQrAuthorizationInfo]);

  // Efectos
  useEffect(() => {
    if (checklistId) {
      loadQrScans();
      loadQrAuthorizationInfo();
    }
  }, [checklistId, loadQrScans, loadQrAuthorizationInfo]);

  useEffect(() => {
    if (checklistTypeId) {
      checkQrRequirement();
    }
  }, [checklistTypeId, checkQrRequirement]);

  // Función para obtener información sobre el siguiente QR requerido
  const getNextQrInfo = useCallback(() => {
    // Asegurarse de que qrAuthorizationInfo esté definido
    if (!qrAuthorizationInfo) {
      console.log('⚠️ getNextQrInfo: qrAuthorizationInfo es null');
      return null;
    }

    if (!qrAuthorizationInfo.next_qr_required) {
      console.log('⚠️ getNextQrInfo: no hay siguiente QR requerido');
      return null;
    }

    const info = {
      qrCode: qrAuthorizationInfo.next_qr_required.qr_code,
      groupNumber: qrAuthorizationInfo.next_qr_required.group_number,
      reason: qrAuthorizationInfo.next_qr_required.reason,
      isRequired: isQrRequired
    };

    console.log('✅ getNextQrInfo:', info);
    return info;
  }, [qrAuthorizationInfo, isQrRequired]);

  // Función para determinar la siguiente sección bloqueada disponible
  const getNextLockedSection = useCallback(() => {
    if (!qrAuthorizationInfo || !qrAuthorizationInfo.available_qr_codes) {
      console.log('❌ getNextLockedSection: No hay info de autorización QR o códigos disponibles');
      return null;
    }

    console.log('🔍 Buscando siguiente sección bloqueada...');
    console.log('📊 QRs disponibles:', qrAuthorizationInfo.available_qr_codes.length);
    console.log('🔓 Items desbloqueados:', qrAuthorizationInfo.unlocked_items?.length || 0);

    // Buscar el primer QR que no ha sido completamente desbloqueado
    for (const qr of qrAuthorizationInfo.available_qr_codes) {
      console.log(`🔎 Revisando QR ${qr.qr_code} (Grupo ${qr.group_number})`);

      const hasUnlockedItems = qr.associated_items && qr.associated_items.some(item => {
        // Verificar si este item está desbloqueado en qrAuthorizationInfo.unlocked_items
        const isUnlocked = qrAuthorizationInfo.unlocked_items &&
               qrAuthorizationInfo.unlocked_items.some(unlocked =>
                 unlocked.checklist_item_id === item.item_id
               );
        console.log(`   📋 Item ${item.item_number}: ${isUnlocked ? '✅ Desbloqueado' : '🔒 Bloqueado'}`);
        return isUnlocked;
      });

      console.log(`   🎯 QR ${qr.qr_code} tiene items desbloqueados: ${hasUnlockedItems}`);

      // Si el QR no tiene items desbloqueados, es una sección bloqueada disponible
      if (!hasUnlockedItems) {
        console.log(`   ✅ ENCONTRADO: Sección ${qr.group_number} está bloqueada y disponible para desbloqueo`);
        return {
          sectionNumber: qr.group_number,
          qrCode: qr.qr_code,
          qrId: qr.qr_id,
          associatedItems: qr.associated_items
        };
      }
    }

    console.log('ℹ️ No se encontraron secciones bloqueadas disponibles');
    return null; // No hay secciones bloqueadas
  }, [qrAuthorizationInfo]);

  // Función para obtener información de debug del sistema QR
  const getDebugInfo = useCallback(() => {
    return {
      checklistId,
      checklistTypeId,
      qrValidationEnabled,
      totalQrPartitions,
      currentPartition,
      completedParentItems,
      qrScansCount: qrScans.length,
      isQrRequired,
      hasQrAuthorizationInfo: !!qrAuthorizationInfo,
      nextQrRequired: qrAuthorizationInfo?.next_qr_required || null,
      unlockedItemsCount: qrAuthorizationInfo?.unlocked_items?.length || 0,
      totalItemsInType: qrAuthorizationInfo?.total_items_in_type || 0,
      availableQrCodes: qrAuthorizationInfo?.available_qr_codes || []
    };
  }, [
    checklistId,
    checklistTypeId,
    qrValidationEnabled,
    totalQrPartitions,
    currentPartition,
    completedParentItems,
    qrScans.length,
    isQrRequired,
    qrAuthorizationInfo
  ]);

  return {
    // Estados
    showQrModal,
    setShowQrModal,
    isLoadingQr,
    qrScans,
    completedParentItems,
    isQrRequired,
    qrValidationEnabled,
    totalQrPartitions,
    currentPartition,
    qrAuthorizationInfo,

    // Funciones
    handleQrScanSuccess,
    requireQrScan,
    updateCompletedParentItems,
    updateProgressFromResponses,
    loadQrScans,
    loadQrAuthorizationInfo,
    checkQrRequirement,
    calculateCompletedParentSections,
    isItemUnlocked,
    getNextQrInfo,
    getNextLockedSection,
    getDebugInfo
  };
};