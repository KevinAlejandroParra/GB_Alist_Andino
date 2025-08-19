'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
export default function UserProfile() {
  // Cargar Font Awesome
  useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/protected`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener datos del usuario');
        }

        const data = await response.json();
        if (data.success) {
          setUserData(data.user);
          // Inicializar formulario de edición con datos actuales
          setEditForm({
            user_name: data.user.name,
            user_email: data.user.email,
            user_document_type: data.user.type_document,
            user_document: data.user.document,
            user_phone: data.user.phone,
            user_password: data.user.password ? data.user.password : ''
          });
        } else {
          throw new Error(data.message || 'Error en la respuesta del servidor');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar selección de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Actualizar perfil
  const handleUpdateProfile= async (e) => {
    e.preventDefault();
    setUpdating(true);
  
    try {
      // Crear FormData para enviar imagen y demás campos
      const formData = new FormData();
  
      // Adjuntar imagen si se seleccionó
      if (selectedImage) {
        formData.append("imagen", selectedImage);
      }
  
      // Crear objeto usuario con los campos del formulario
      const userObj = {
        user_name: editForm.user_name,
        user_email: editForm.user_email,
        user_document_type: editForm.user_document_type,
        user_document: editForm.user_document,
        user_phone: editForm.user_phone,
        user_password: editForm.user_password,
        user_imagen: editForm.user_imagen
      };
  
      // Convertir a string y añadir como "user"
      formData.append("user", JSON.stringify(userObj));
  
      // Llamar al endpoint PUT con el user_id correcto
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/${userData.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        },
        body: formData
      });
  
      const result = await response.json();
  
      if (result.success) {
        alert("Usuario actualizado correctamente");
        setUserData(result.user);
        setIsModalOpen(false);
      } else {
        alert(result.message || "Error al actualizar usuario");
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("Ocurrió un error en la actualización");
    } finally {
      setUpdating(false);
    }
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600 flex justify-center items-center">
        <div className="backdrop-blur-md bg-white/20 p-8 rounded-3xl border border-white/30 shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto"></div>
          <p className="text-white text-center mt-4 font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600 flex justify-center items-center p-4">
        <div className="backdrop-blur-md bg-red-500/20 p-6 rounded-3xl border border-red-300/30 shadow-xl max-w-md">
          <i className="fas fa-exclamation-triangle text-red-300 text-4xl block text-center mb-4"></i>
          <p className="text-white text-center font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600 flex justify-center items-center p-4">
        <div className="backdrop-blur-md bg-yellow-500/20 p-6 rounded-3xl border border-yellow-300/30 shadow-xl max-w-md">
          <i className="fas fa-user-slash text-yellow-300 text-4xl block text-center mb-4"></i>
          <p className="text-white text-center font-medium">No se encontraron datos del usuario</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600 p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Perfil de Usuario
          </h1>
          <div className="w-24 h-1 bg-white/50 mx-auto rounded-full"></div>
        </div>

        {/* Contenedor principal del perfil */}
        <div className="backdrop-blur-xl bg-white/15 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Sección superior con foto y datos principales */}
          <div className="relative p-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Foto de perfil */}
              <div className="relative group">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-white/10 backdrop-blur-sm">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_API}/${userData.image}`}
                    alt="Foto de perfil"
                    width={192}  
                    height={192}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "/avatar-fallback.jpg";
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <i className="fas fa-camera text-white text-2xl"></i>
                </div>
              </div>

              {/* Información principal */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {userData.name} {userData.lastname}
                </h2>
                <p className="text-xl text-white/80 mb-1">CC: {userData.document}</p>
                <p className="text-lg text-white/70 mb-4 uppercase tracking-wide font-medium">
                  {userData.role.name}
                </p>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border ${
                  userData.state === 'activo' 
                    ? 'bg-green-500/20 text-green-100 border-green-400/30' 
                    : 'bg-red-500/20 text-red-100 border-red-400/30'
                }`}>
                  <i className={`fas ${userData.state === 'activo' ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                  {userData.state}
                </span>
              </div>

              {/* Botón editar perfil */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 border border-white/30 hover:border-white/50 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <i className="fas fa-edit mr-3"></i>
                EDITAR PERFIL
              </button>
            </div>
          </div>

          {/* Grid de información */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card Email */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-envelope text-3xl text-blue-300"></i>
                  <span className="text-xs text-white/60 uppercase tracking-wide font-semibold">Email</span>
                </div>
                <p className="text-white font-medium text-lg break-all">{userData.email}</p>
              </div>

              {/* Card Sede */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-6 rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-building text-3xl text-purple-300"></i>
                  <span className="text-xs text-white/60 uppercase tracking-wide font-semibold">Sede</span>
                </div>
                <p className="text-white font-medium text-lg">{userData.premise.name}</p>
              </div>

              {/* Card Teléfono */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-phone text-3xl text-blue-300"></i>
                  <span className="text-xs text-white/60 uppercase tracking-wide font-semibold">Teléfono</span>
                </div>
                <p className="text-white font-medium text-lg">{userData.phone}</p>
              </div>

              {/* Card Entidad */}
              <div className="backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-6 rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-university text-3xl text-purple-300"></i>
                  <span className="text-xs text-white/60 uppercase tracking-wide font-semibold">Entidad</span>
                </div>
                <p className="text-white font-medium text-lg">{userData.entity.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/20 rounded-3xl border border-white/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <i className="fas fa-user-edit mr-3 text-purple-300"></i>
                  Editar Perfil
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white hover:text-red-300 transition-all duration-300 flex items-center justify-center"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-6">
              {/* Sección de imagen */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-lg bg-white/10 backdrop-blur-sm mx-auto mb-4">
                    <img 
                      className="w-full h-full object-cover" 
                      src={imagePreview || userData.image || '/api/placeholder/128/128'} 
                      alt="Vista previa"
                    />
                  </div>
                  <label className="absolute bottom-2 right-2 w-10 h-10 bg-purple-500/80 hover:bg-purple-500 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border-2 border-white/50">
                    <i className="fas fa-camera text-white"></i>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-white/70 text-sm">Haz clic en la cámara para cambiar tu foto</p>
              </div>

              {/* Grid de campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-white/80 font-medium mb-2">
                    <i className="fas fa-user mr-2"></i>Nombre
                  </label>
                  <input
                    type="text"
                    name="user_name"
                    value={editForm.user_name}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                    placeholder="Ingresa tu nombre"
                  />
                </div>


                {/* Email */}
                <div>
                  <label className="block text-white/80 font-medium mb-2">
                    <i className="fas fa-envelope mr-2"></i>Email
                  </label>
                  <input
                    type="email"
                    name="user_email"
                    value={editForm.user_email}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                    placeholder="Ingresa tu email"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-white/80 font-medium mb-2">
                    <i className="fas fa-phone mr-2"></i>Teléfono
                  </label>
                  <input
                    type="tel"
                    name="user_phone"
                    value={editForm.user_phone}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                    placeholder="Ingresa tu teléfono"
                  />
                </div>

                {/* Tipo de documento */}
                <div>
                  <label className="block text-white/80 font-medium mb-2">
                    <i className="fas fa-id-card mr-2"></i>Tipo de documento
                  </label>
                  <select
                    name="user_document_type"
                    value={editForm.user_document_type}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                  >
                    <option value="CC" className="text-gray-800">Cédula de Ciudadanía</option>
                    <option value="TI" className="text-gray-800">Tarjeta de Identidad</option>
                    <option value="CE" className="text-gray-800">Cédula de Extranjería</option>
                    <option value="PA" className="text-gray-800">Pasaporte</option>
                  </select>
                </div>

                {/* Número de documento */}
                <div>
                  <label className="block text-white/80 font-medium mb-2">
                    <i className="fas fa-hashtag mr-2"></i>Número de documento
                  </label>
                  <input
                    type="text"
                    name="user_document"
                    value={editForm.user_document}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                    placeholder="Ingresa tu número de documento"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-white/80 font-medium mb-2">
                  <i className="fas fa-lock mr-2"></i>Nueva contraseña (opcional)
                </label>
                <input
                  type="password"
                  name="user_password"
                  value={editForm.user_password}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 focus:bg-white/25 transition-all duration-300"
                  placeholder="Deja en blanco para mantener la actual"
                />
              </div>

              {/* Campos no editables */}
              <div className="border-t border-white/20 pt-6">
                <h4 className="text-white/80 font-medium mb-4 flex items-center">
                  <i className="fas fa-lock mr-2"></i>Información del sistema (no editable)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="backdrop-blur-sm bg-white/10 p-3 rounded-xl border border-white/20">
                    <span className="text-white/60 text-sm block mb-1">Rol</span>
                    <span className="text-white font-medium">{userData.role.name}</span>
                  </div>
                  <div className="backdrop-blur-sm bg-white/10 p-3 rounded-xl border border-white/20">
                    <span className="text-white/60 text-sm block mb-1">Sede</span>
                    <span className="text-white font-medium">{userData.premise.name}</span>
                  </div>
                  <div className="backdrop-blur-sm bg-white/10 p-3 rounded-xl border border-white/20">
                    <span className="text-white/60 text-sm block mb-1">Entidad</span>
                    <span className="text-white font-medium">{userData.entity.name}</span>
                  </div>
                  <div className="backdrop-blur-sm bg-white/10 p-3 rounded-xl border border-white/20">
                    <span className="text-white/60 text-sm block mb-1">Estado</span>
                    <span className="text-white font-medium">{userData.state}</span>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-xl backdrop-blur-sm bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition-all duration-300 hover:scale-105"
                >
                  <i className="fas fa-times mr-2"></i>Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
      )}
    </div>
  );
}