import { useState, useCallback } from 'react'
import Swal from 'sweetalert2'
import axiosInstance from '../../../utils/axiosConfig'

/**
 * Hook para manejar la firma de checklists
 * @param {Object} user - Usuario autenticado
 * @param {Object} checklist - Datos del checklist
 * @param {Function} onSuccess - Callback después de firma exitosa
 * @returns {Object} - Estado y funciones para firma
 */
export function useSignature(user, checklist, onSuccess) {
  const [showSignaturePad, setShowSignaturePad] = useState(false)

  /**
   * Abre el modal de firma
   */
  const openSignaturePad = useCallback(() => {
    if (!checklist) {
      Swal.fire({
        title: "Error",
        text: "No hay un checklist cargado para firmar.",
        icon: "error",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
      })
      return
    }
    setShowSignaturePad(true)
  }, [checklist])

  /**
   * Maneja el guardado de la firma
   */
  const handleSaveSignature = useCallback(async (digital_token) => {
    if (!user || !checklist) return

    setShowSignaturePad(false)

    Swal.fire({
      title: "Firmando checklist...",
      text: "Por favor espera mientras se procesa la firma",
      allowOutsideClick: false,
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-slate-800 font-bold",
        content: "text-slate-600",
      },
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      await axiosInstance.post(
        `${API_URL}/api/checklists/${checklist.checklist_id}/sign`,
        { digital_token },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )

      await Swal.fire({
        title: "¡Éxito!",
        text: "Checklist firmado exitosamente",
        icon: "success",
        confirmButtonColor: "#7c3aed",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
        },
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      if (err.response?.data?.incompleteItems) {
        const incompleteItems = err.response.data.incompleteItems

        await Swal.fire({
          title: "Checklist Incompleto",
          html: `
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
              <p style="margin-bottom: 15px; color: #475569;">Los siguientes <strong>${incompleteItems.length}</strong> ítems deben ser respondidos antes de firmar:</p>
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #7c3aed;">
                ${incompleteItems
                  .map(
                    (item) => `
                    <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <strong style="color: #1e293b;">${item.item_number}.</strong> <span style="color: #475569;">${item.question_text}</span>
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            </div>
          `,
          icon: "warning",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#7c3aed",
          width: "700px",
          customClass: {
            popup: "rounded-2xl shadow-2xl",
            title: "text-slate-800 font-bold",
            confirmButton: "rounded-xl font-semibold px-6 py-3",
          },
        })
      } else {
        await Swal.fire({
          title: "Error",
          text: err.response?.data?.error || "Error al firmar checklist",
          icon: "error",
          confirmButtonColor: "#7c3aed",
          confirmButtonText: "Entendido",
          customClass: {
            popup: "rounded-2xl shadow-2xl",
            title: "text-slate-800 font-bold",
            content: "text-slate-600",
            confirmButton: "rounded-xl font-semibold px-6 py-3",
          },
        })
      }
    }
  }, [user, checklist, onSuccess])

  /**
   * Cierra el modal de firma
   */
  const closeSignaturePad = useCallback(() => {
    setShowSignaturePad(false)
  }, [])

  return {
    showSignaturePad,
    openSignaturePad,
    handleSaveSignature,
    closeSignaturePad
  }
}