
import { useCallback } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../../utils/axiosConfig';

export function useChecklistActions(config, user, checklistTypeId) {

  const handleDownloadPdf = useCallback(async () => {
    if (!user) {
        Swal.fire('Error', 'Usuario no autenticado.', 'error');
        return;
    }

    Swal.fire({
        title: "Generando PDF...",
        text: "Por favor espera mientras se genera el documento",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
    });

    try {
        const response = await axiosInstance.get(config.downloadEndpoint, {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${user.token}` },
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `checklist-${checklistTypeId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.close();
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        Swal.fire('Error', 'No se pudo descargar el PDF.', 'error');
    }
  }, [config, user, checklistTypeId]);

  return { handleDownloadPdf };
}
