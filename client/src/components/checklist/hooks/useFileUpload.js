import { useCallback } from 'react'
import Swal from 'sweetalert2'
import axiosInstance from '../../../utils/axiosConfig'

/**
 * Hook para manejar subida de archivos de evidencia
 * @param {Object} user - Usuario autenticado
 * @returns {Object} - Función para subir archivos
 */
export function useFileUpload(user) {
  const handleFileUpload = useCallback(async (itemId, file, onSuccess) => {
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      await Swal.fire({
        title: "Tipo de archivo no válido",
        text: "Solo se permiten archivos de imagen (JPEG, PNG, WebP)",
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
      })
      return
    }

    if (file.size > maxSize) {
      await Swal.fire({
        title: "Archivo muy grande",
        text: "El archivo no debe superar los 5MB",
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
      })
      return
    }

    try {
      Swal.fire({
        title: "Subiendo archivo...",
        text: "Por favor espera mientras se sube la imagen",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      const formData = new FormData()
      formData.append("evidence", file)

      const API_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000"
      const response = await axiosInstance.post(`${API_URL}/api/checklists/upload-evidence`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (onSuccess) {
        onSuccess(itemId, response.data.filePath)
      }

      await Swal.fire({
        title: "¡Éxito!",
        text: "Archivo subido correctamente",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err) {
      console.error('Error al subir archivo:', err)
      await Swal.fire({
        title: "Error",
        text: err.response?.data?.error || "Error al subir el archivo",
        icon: "error",
        confirmButtonColor: "#7c3aed",
      })
    }
  }, [])

  return { handleFileUpload }
}