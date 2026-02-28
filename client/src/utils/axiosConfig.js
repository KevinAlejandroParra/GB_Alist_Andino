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

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')

      Swal.fire({
        title: 'Autenticación requerida',
        text: 'Por favor, inicia sesión para continuar',
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
          window.location.href = '/login'
        }
      })

      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default axiosInstance