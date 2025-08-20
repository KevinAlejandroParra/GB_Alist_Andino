"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function UserProfile() {
  useEffect(() => {
    // Cargar Font Awesome
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      document.head.appendChild(link)
    }

    // Cargar SweetAlert2
    if (!document.querySelector('script[src*="sweetalert2"]')) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11"
      document.head.appendChild(script)
    }
  }, [])

  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/protected`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })

        if (!response.ok) {
          throw new Error("Error al obtener datos del usuario")
        }

        const data = await response.json()
        if (data.success) {
          setUserData(data.user)
          setEditForm({
            user_name: data.user.name,
            user_email: data.user.email,
            user_document_type: data.user.type_document,
            user_document: data.user.document,
            user_phone: data.user.phone,
            user_password: data.user.password ? data.user.password : "",
          })
        } else {
          throw new Error(data.message || "Error en la respuesta del servidor")
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const showAlert = (type, title, text) => {
    if (typeof window !== "undefined" && window.Swal) {
      const config = {
        title,
        text,
        icon: type,
        background: "rgba(255, 255, 255, 0.1)",
        backdrop: "rgba(0, 0, 0, 0.8)",
        color: "#ffffff",
        confirmButtonColor: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#8b5cf6",
        customClass: {
          popup: "backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl",
          title: "text-white font-bold",
          content: "text-white/90",
          confirmButton: "rounded-xl px-6 py-3 font-semibold shadow-lg hover:scale-105 transition-all duration-300",
        },
      }
      window.Swal.fire(config)
    }
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar selección de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      const authToken = localStorage.getItem("authToken")
      if (!authToken) {
        showAlert(
          "error",
          "Error de autenticación",
          "No se encontró token de autenticación. Por favor, inicia sesión nuevamente.",
        )
        setUpdating(false)
        return
      }

      if (!userData || !userData.id) {
        showAlert(
          "error",
          "Error de usuario",
          "No se pudo obtener el ID del usuario. Recarga la página e intenta nuevamente.",
        )
        setUpdating(false)
        return
      }

      // Crear FormData para enviar imagen y demás campos
      const formData = new FormData()

      // Adjuntar imagen si se seleccionó
      if (selectedImage) {
        if (!selectedImage.type.startsWith("image/")) {
          showAlert("error", "Archivo inválido", "Por favor selecciona un archivo de imagen válido.")
          setUpdating(false)
          return
        }

        if (selectedImage.size > 5 * 1024 * 1024) {
          // 5MB máximo
          showAlert("error", "Archivo muy grande", "La imagen debe ser menor a 5MB.")
          setUpdating(false)
          return
        }

        formData.append("imagen", selectedImage)
      }

      // Crear objeto usuario con los campos del formulario
      const userObj = {
        user_name: editForm.user_name,
        user_email: editForm.user_email,
        user_document_type: editForm.user_document_type,
        user_document: editForm.user_document,
        user_phone: editForm.user_phone,
        user_imagen: editForm.user_imagen,
      }

      // Solo incluir user_password si no está vacío
      if (editForm.user_password && editForm.user_password.trim() !== "") {
        userObj.user_password = editForm.user_password
      }

      if (!userObj.user_name || !userObj.user_email) {
        showAlert("error", "Campos requeridos", "El nombre y email son obligatorios.")
        setUpdating(false)
        return
      }

      // Convertir a string y añadir como "user"
      formData.append("user", JSON.stringify(userObj))

      console.log("[v0] Enviando actualización de perfil:", {
        userId: userData.id,
        endpoint: `${process.env.NEXT_PUBLIC_API}/api/users/${userData.id}`,
        hasImage: !!selectedImage,
        userObj: userObj,
        includesPassword: !!userObj.user_password,
      })

      // Llamar al endpoint PUT con el user_id correcto
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/${userData.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })

      console.log("[v0] Respuesta del servidor:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        let errorMessage = `Error ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.log("[v0] Error del servidor:", errorData)
        } catch (parseError) {
          console.log("[v0] No se pudo parsear el error del servidor:", parseError)
        }

        showAlert("error", "Error del servidor", errorMessage)
        setUpdating(false)
        return
      }

      const result = await response.json()
      console.log("[v0] Resultado exitoso:", result)

      if (result.success) {
        showAlert("success", "¡Perfil actualizado!", "Los cambios se han guardado correctamente")
        setUserData(result.user)
        setIsModalOpen(false)
        setSelectedImage(null)
        setImagePreview(null)
      } else {
        showAlert("error", "Error al actualizar", result.message || "No se pudo actualizar el perfil")
      }
    } catch (error) {
      console.error("[v0] Error completo al actualizar:", error)

      let errorMessage = "Ocurrió un error al conectar con el servidor"

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "No se pudo conectar con el servidor. Verifica tu conexión a internet."
      } else if (error.name === "SyntaxError") {
        errorMessage = "El servidor devolvió una respuesta inválida."
      }

      showAlert("error", "Error de conexión", errorMessage)
    } finally {
      setUpdating(false)
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-800 flex justify-center items-center">
        <div className="backdrop-blur-xl bg-white/10 p-12 rounded-[2rem] border border-white/20 shadow-2xl">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-cyan-400 border-r-purple-400 mx-auto"></div>
            <div
              className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-b-pink-400 border-l-blue-400 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            ></div>
          </div>
          <p className="text-white text-center mt-6 font-medium text-lg">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-800 flex justify-center items-center p-4">
        <div className="backdrop-blur-xl bg-red-500/20 p-8 rounded-[2rem] border border-red-300/30 shadow-2xl max-w-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-red-300 text-3xl"></i>
            </div>
            <p className="text-white text-center font-medium text-lg">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-800 flex justify-center items-center p-4">
        <div className="backdrop-blur-xl bg-yellow-500/20 p-8 rounded-[2rem] border border-yellow-300/30 shadow-2xl max-w-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-user-slash text-yellow-300 text-3xl"></i>
            </div>
            <p className="text-white text-center font-medium text-lg">No se encontraron datos del usuario</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-gradient-to-bl from-purple-400/20 to-pink-600/20 rounded-full blur-3xl transform translate-x-1/2"></div>
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-tr from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl transform translate-y-1/2"></div>

      <div className="absolute top-20 right-20 w-32 h-32 border-2 border-cyan-400/30 rounded-3xl rotate-45 animate-pulse"></div>
      <div
        className="absolute bottom-32 left-16 w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full animate-bounce"
        style={{ animationDuration: "3s" }}
      ></div>
      <div
        className="absolute top-1/2 left-8 w-16 h-16 border-2 border-emerald-400/40 transform rotate-12 animate-spin"
        style={{ animationDuration: "8s" }}
      ></div>

      <div className="container mx-auto max-w-7xl relative z-10 px-4 sm:px-6 lg:px-8">
  <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pt-6">
    
    {/* Home button */}
    <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-40 p-2 rounded-full text-white shadow-lg bg-white/10">
      <Link href="/">
        <i className="fas fa-home text-xl sm:text-2xl"></i>
      </Link>
      </div>         
          {/* Título centrado */}
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl">Perfil de Usuario</h1>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto rounded-full"></div>
          </div>

          {/* Espacio para equilibrar el layout */}
          <div className="w-12"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="relative">
              {/* Forma decorativa de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-[3rem] transform rotate-1"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/20 to-pink-600/20 rounded-[3rem] transform -rotate-1"></div>

              <div className="relative backdrop-blur-xl bg-white/10 rounded-[3rem] border border-white/20 shadow-2xl p-8 hover:scale-105 transition-all duration-500">
                {/* Imagen de perfil con forma hexagonal */}
                <div className="relative mb-6">
                  <div className="w-48 h-48 mx-auto relative">
                    {/* Hexágono decorativo */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-full"></div>
                    <div className="absolute inset-4 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API}/${userData.image}`}
                        alt="Foto de perfil"
                        width={176}
                        height={176}
                        className="w-full h-full object-cover"

                      />
                    </div>
                  </div>
                </div>

                {/* Información centrada */}
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {userData.name} {userData.lastname}
                  </h2>

                  <div className="space-y-2">
                    <p className="text-cyan-300 font-medium">
                      <i className="fas fa-circle mr-2 text-xs"></i>
                      {userData.state}
                    </p>

                    <p className="text-white/80">
                      <i className="fas fa-id-card mr-2 text-purple-300"></i>
                      {userData.type_document}: {userData.document}
                    </p>

                    <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl p-3 border border-white/20">
                      <p className="text-white font-semibold">
                        <i className="fas fa-briefcase mr-2 text-emerald-300"></i>
                        {userData.role && userData.role.name ? userData.role.name : "Rol no definido"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Tarjeta Email */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-3xl transform rotate-1 group-hover:rotate-2 transition-all duration-300"></div>
                <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-envelope text-white text-xl"></i>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Email</span>
                  </div>
                  <p className="text-white font-medium text-lg break-all">{userData.email}</p>
                  <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mt-4"></div>
                </div>
              </div>

              {/* Tarjeta Teléfono */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-3xl transform -rotate-1 group-hover:-rotate-2 transition-all duration-300"></div>
                <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-phone text-white text-xl"></i>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Teléfono</span>
                  </div>
                  <p className="text-white font-medium text-lg">{userData.phone}</p>
                  <div className="w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mt-4"></div>
                </div>
              </div>

              {/* Tarjeta Sede */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-3xl transform rotate-1 group-hover:rotate-2 transition-all duration-300"></div>
                <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-building text-white text-xl"></i>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Sede</span>
                  </div>
                  <p className="text-white font-medium text-lg">{userData.premise?.name || "No definida"}</p>
                  <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mt-4"></div>
                </div>
              </div>

              {/* Tarjeta Entidad */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl transform -rotate-1 group-hover:-rotate-2 transition-all duration-300"></div>
                <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-university text-white text-xl"></i>
                    </div>
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Entidad</span>
                  </div>
                  <p className="text-white font-medium text-lg">{userData.entity?.name || "No definida"}</p>
                  <div className="w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mt-4"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={() => setIsModalOpen(true)} className="group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl transform group-hover:scale-110 transition-all duration-300"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white px-12 py-4 rounded-2xl font-bold text-lg tracking-wider shadow-2xl transform group-hover:scale-105 transition-all duration-300 border border-white/20">
                  <i className="fas fa-edit mr-3"></i>
                  EDITAR PERFIL
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Formas decorativas del modal */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-[3rem] transform rotate-1"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/20 to-pink-500/20 rounded-[3rem] transform -rotate-1"></div>

            <div className="relative backdrop-blur-xl bg-white/10 rounded-[3rem] border border-white/20 shadow-2xl">
              {/* Header del modal simétrico */}
              <div className="p-8 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-2xl flex items-center justify-center mr-4">
                      <i className="fas fa-user-edit text-white text-xl"></i>
                    </div>
                    <h3 className="text-3xl font-bold text-white">Editar Perfil</h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-red-500/30 backdrop-blur-sm border border-white/20 text-white hover:text-red-300 transition-all duration-300 flex items-center justify-center hover:scale-110"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>

              {/* Contenido del formulario con diseño simétrico */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Columna izquierda - Imagen */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <div className="relative inline-block mb-6">
                        <div className="w-40 h-40 mx-auto relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-pulse"></div>
                          <div className="absolute inset-2 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-full"></div>
                          <div className="absolute inset-4 rounded-full overflow-hidden border-4 border-white/30 shadow-xl">
                            <img
                              className="w-full h-full object-cover"
                              src={
                                imagePreview ||
                                `${process.env.NEXT_PUBLIC_API || "/placeholder.svg"}/${userData.image}` ||
                                "/placeholder.svg?height=128&width=128"
                              }
                              alt="Vista previa"
                            />
                          </div>
                        </div>
                        <label className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border-2 border-white/50 hover:scale-110 shadow-xl">
                          <i className="fas fa-camera text-white"></i>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                      </div>
                      <p className="text-white/70 text-sm">Haz clic en la cámara para cambiar tu foto</p>
                    </div>
                  </div>

                  {/* Columnas derecha - Formulario en grid 2x3 */}
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nombre */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-user mr-2 text-purple-300"></i>Nombre
                        </label>
                        <input
                          type="text"
                          name="user_name"
                          value={editForm.user_name}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                          placeholder="Ingresa tu nombre"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-envelope mr-2 text-cyan-300"></i>Email
                        </label>
                        <input
                          type="email"
                          name="user_email"
                          value={editForm.user_email}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                          placeholder="Ingresa tu email"
                        />
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-phone mr-2 text-emerald-300"></i>Teléfono
                        </label>
                        <input
                          type="tel"
                          name="user_phone"
                          value={editForm.user_phone}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                          placeholder="Ingresa tu teléfono"
                        />
                      </div>

                      {/* Tipo de documento */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-id-card mr-2 text-pink-300"></i>Tipo de documento
                        </label>
                        <select
                          name="user_document_type"
                          value={editForm.user_document_type}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white focus:outline-none focus:border-pink-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                        >
                          <option value="CC" className="text-gray-800 bg-white">
                            Cédula de Ciudadanía
                          </option>
                          <option value="TI" className="text-gray-800 bg-white">
                            Tarjeta de Identidad
                          </option>
                          <option value="CE" className="text-gray-800 bg-white">
                            Cédula de Extranjería
                          </option>
                          <option value="PA" className="text-gray-800 bg-white">
                            Pasaporte
                          </option>
                        </select>
                      </div>

                      {/* Número de documento */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-hashtag mr-2 text-indigo-300"></i>Número de documento
                        </label>
                        <input
                          type="text"
                          name="user_document"
                          value={editForm.user_document}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-indigo-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                          placeholder="Ingresa tu número de documento"
                        />
                      </div>

                      {/* Contraseña */}
                      <div className="space-y-2">
                        <label className="block text-white/90 font-semibold text-sm uppercase tracking-wide">
                          <i className="fas fa-lock mr-2 text-red-300"></i>Nueva contraseña
                        </label>
                        <input
                          type="password"
                          name="user_password"
                          value={editForm.user_password}
                          onChange={handleInputChange}
                          className="w-full p-4 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-red-400 focus:bg-white/20 transition-all duration-300 hover:bg-white/15"
                          placeholder="Opcional - deja en blanco para mantener actual"
                        />
                      </div>
                    </div>

                    {/* Información no editable */}
                    <div className="mt-8 p-6 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10">
                      <h4 className="text-white/90 font-semibold mb-4 flex items-center text-sm uppercase tracking-wide">
                        <i className="fas fa-lock mr-2 text-yellow-300"></i>Información del sistema (no editable)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-white/60 text-xs block mb-1 uppercase">Rol</span>
                          <span className="text-white font-medium text-sm">{userData.role?.name || "No definido"}</span>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-white/60 text-xs block mb-1 uppercase">Sede</span>
                          <span className="text-white font-medium text-sm">
                            {userData.premise?.name || "No definida"}
                          </span>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-white/60 text-xs block mb-1 uppercase">Entidad</span>
                          <span className="text-white font-medium text-sm">
                            {userData.entity?.name || "No definida"}
                          </span>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-white/60 text-xs block mb-1 uppercase">Estado</span>
                          <span className="text-white font-medium text-sm">{userData.state}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botones del modal */}
                    <div className="flex gap-4 mt-8">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-4 px-6 rounded-2xl backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all duration-300 hover:scale-105"
                      >
                        <i className="fas fa-times mr-2"></i>Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateProfile}
                        disabled={updating}
                        className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                      >
                        {updating ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>Actualizando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>Guardar cambios
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
