import axios from 'axios'
import Swal from 'sweetalert2'

// Crear instancia de axios
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API || 'http://localhost:5000',
})

// Interceptor de solicitud para agregar el token de autenticación
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('Token agregado a la solicitud:', token.substring(0, 20) + '...')
    } else {
      console.warn('No se encontró token en localStorage')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor de respuesta para manejar errores 401
axiosInstance.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, simplemente la devolvemos
    return response
  },
  (error) => {
    // Verificar si el error es 401 (token expirado o inválido)
    if (error.response?.status === 401) {
      // Limpiar el token del localStorage
      localStorage.removeItem('authToken')

      // Mostrar Sweet Alert personalizado para sesión caducada
      Swal.fire({
        title: 'Sesión caducada',
        text: 'La sesión ha caducado, vuelve a iniciar sesión',
        icon: 'warning',
        confirmButtonText: 'Ir a iniciar sesión',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: 'rounded-2xl shadow-2xl',
          title: 'text-slate-800 font-bold',
          content: 'text-slate-600',
          confirmButton: 'rounded-xl font-semibold px-6 py-3 hover:bg-blue-600 transition-colors',
        },
        showCancelButton: false,
        showDenyButton: false,
      }).then((result) => {
        if (result.isConfirmed) {
          // Redirigir a la página de login
          window.location.href = '/login'
        }
      })

      // Retornar una promesa rechazada para evitar que el código continúe
      return Promise.reject(error)
    }

    // Para otros errores, simplemente los rechazamos
    return Promise.reject(error)
  }
)

export default axiosInstance