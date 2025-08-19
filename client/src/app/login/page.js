"use client"
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faHome, faUser, faIdCard, faPhone, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  // Configuración de formularios con react-hook-form
  const loginForm = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const registerForm = useForm({
    defaultValues: {
      nombre: '',
      correo: '',
      tipoDocumento: '',
      numeroDocumento: '',
      telefono: '',
      sede: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Manejar cambio entre login y registro con animación
  const toggleAuthMode = (isLoginMode) => {
    setDirection(isLoginMode ? -1 : 1);
    setIsLogin(isLoginMode);
  };

  // Función para manejar el login
  const handleLogin = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: data.email,
          user_password: data.password
        }),
      });
      console.log(`Ruta interpretada: ${process.env.NEXT_PUBLIC_API}/api/users/login`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al iniciar sesión');
      }

      // Guardar el token en localStorage
      localStorage.setItem('authToken', result.token);
      console.log ('tokens del localstorage:', localStorage.getItem('authToken'))

      await Swal.fire({
        title: '<div class="flex flex-col items-center"><i class="fas fa-check-circle text-5xl mb-3 text-purple-400"></i><span class="text-white text-2xl font-bold">¡Éxito!</span></div>',
        html: '<div class="text-white/80 mb-4">Inicio de sesión exitoso</div>',
        background: 'rgba(99, 102, 241, 0.15)', 
        backdrop: `
          rgba(59, 130, 246, 0.1)
          url("/images/glass-texture.png")
          center center
          no-repeat
        `,
        showConfirmButton: true,
        confirmButtonText: '<span class="px-6 py-2">Continuar</span>',
        confirmButtonColor: 'transparent',
        width: '26rem',
        customClass: {
          container: 'backdrop-blur-sm',
          popup: `
            backdrop-blur-xl 
            rounded-2xl 
            border border-cyan-200/20 
            shadow-[0_10px_50px_rgba(167,139,250,0.3)]
            bg-gradient-to-br from-blue-500/10 to-purple-500/10
          `,
          title: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400',
          htmlContainer: 'text-white/90',
          confirmButton: `
            bg-gradient-to-r from-blue-400 to-purple-500 
            text-white font-medium rounded-xl 
            hover:from-blue-500 hover:to-purple-600 
            focus:outline-none focus:ring-2 focus:ring-cyan-300 
            transition-all duration-300
            shadow-lg
          `,
          actions: 'mt-4',
          closeButton: 'text-white/50 hover:text-white'
        },
        buttonsStyling: false,
        showCloseButton: false,
        showCancelButton: false,
        timerProgressBar: false,
        grow: 'row'
      });
      // Redirigir al dashboard o página principal
      window.location.href = '/';

    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Credenciales incorrectas',
        icon: 'error',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar el registro
  const handleRegister = async (data) => {
    if (data.password !== data.confirmPassword) {
      await Swal.fire({
        title: 'Error',
        text: 'Las contraseñas no coinciden',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }
  
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: data.nombre,
          user_email: data.correo,
          user_document_type: data.tipoDocumento,
          user_document: data.numeroDocumento,
          user_phone: data.telefono,
          premise_id: data.sede,
          user_password: data.password,
          role_id: 9 
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.message || result.data || 'Error al registrar usuario');
      }
  
      await Swal.fire({
        title: '<div class="flex flex-col items-center"><i class="fas fa-check-circle text-5xl mb-3 text-purple-400"></i><span class="text-white text-2xl font-bold">¡Éxito!</span></div>',
        html: '<div class="text-white/80 mb-4">Usuario registrado correctamente</div>',
        background: 'rgba(99, 102, 241, 0.15)', 
        backdrop: `
          rgba(59, 130, 246, 0.1)
          url("/images/glass-texture.png")
          center center
          no-repeat
        `,
        showConfirmButton: true,
        confirmButtonText: '<span class="px-6 py-2">Continuar</span>',
        confirmButtonColor: 'transparent',
        width: '26rem',
        customClass: {
          container: 'backdrop-blur-sm',
          popup: `
            backdrop-blur-xl 
            rounded-2xl 
            border border-cyan-200/20 
            shadow-[0_10px_50px_rgba(167,139,250,0.3)]
            bg-gradient-to-br from-blue-500/10 to-purple-500/10
          `,
          title: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400',
          htmlContainer: 'text-white/90',
          confirmButton: `
            bg-gradient-to-r from-blue-400 to-purple-500 
            text-white font-medium rounded-xl 
            hover:from-blue-500 hover:to-purple-600 
            focus:outline-none focus:ring-2 focus:ring-cyan-300 
            transition-all duration-300
            shadow-lg
          `,
          actions: 'mt-4',
          closeButton: 'text-white/50 hover:text-white'
        },
        buttonsStyling: false,
        showCloseButton: false,
        showCancelButton: false,
        timerProgressBar: false,
        grow: 'row'
      });
      toggleAuthMode(true);
  
    } // En el frontend, modifica el catch:
    catch (error) {
      console.error('Error completo:', error);
      let errorMessage = error.message;
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error'
      });
    }
  };

  // Variantes de animación 
  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.3 }
    }
  };

  const formVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      rotateY: direction > 0 ? 25 : -25
    }),
    animate: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      rotateY: direction > 0 ? -25 : 25,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    })
  };

  const fieldVariants = {
    initial: { y: 20, opacity: 0 },
    animate: (index) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.1 * index,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-cyan-500/80 to-transparent rounded-full"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-blue-600/20 to-transparent rounded-full"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative w-full max-w-md"
      >
        {/* Home button */}
        <motion.div
          className="fixed top-6 left-8 z-40 p-2 rounded-full text-white shadow-lg"
        >
          <Link href="/">
            <FontAwesomeIcon icon={faHome} className="text-2xl" />
          </Link>
        </motion.div>
        
        {/* Contenedor principal con efecto glassmorphism */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Indicador de modo activo */}
          <div className="flex justify-center mb-8">
            <div className="relative bg-white/10 rounded-full p-1 backdrop-blur-sm">
              <motion.div
                layoutId="activeTab"
                className="absolute inset-y-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                style={{
                  left: isLogin ? '4px' : '50%',
                  right: isLogin ? '50%' : '4px',
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
              <div className="relative flex">
                <button
                  onClick={() => toggleAuthMode(true)}
                  className={`px-6 py-2 text-sm font-medium rounded-full transition-colors z-10 ${
                    isLogin ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => toggleAuthMode(false)}
                  className={`px-6 py-2 text-sm font-medium rounded-full transition-colors z-10 ${
                    !isLogin ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>
            </div>
          </div>

          {/* Contenedor de formularios */}
          <div className="relative h-auto overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {isLogin ? (
                <motion.div
                  key="login"
                  custom={-1}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {/* Formulario de Login */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center border border-white border-2"
                    >
                      <Image
                        src="/resources/felix.png"
                        alt="Imagen de Felix"
                        layout="fixed"
                        width={65}
                        height={65}
                        style={{ objectFit: 'cover' }}                        
                        className="rounded-full drop-shadow-[0_0_20px_rgba(191,219,254,0.5)]"
                        priority
                      />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">¡Bienvenido!</h1>
                    <p className="text-white/70">Inicia sesión en tu cuenta</p>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                      className="relative"
                    >
                      <p className="text-white text-mb pb-2">Correo Electrónico</p>
                      <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                        <FontAwesomeIcon icon={faEnvelope} className="text-white" />
                      </div>
                      <input
                        {...loginForm.register('email', { 
                          required: 'El correo es requerido',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Correo electrónico no válido'
                          }
                        })}
                        type="email"
                        placeholder="tucorreo@email.com"
                        className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      />
                      {loginForm.formState.errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-sm mt-2 ml-2"
                        >
                          {loginForm.formState.errors.email.message}
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                      className="relative"
                    >
                      <p className="text-white text-mb pb-2">Contraseña</p>
                      <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                        <FontAwesomeIcon icon={faLock} className="text-white" />
                      </div>
                      <input
                        {...loginForm.register('password', { 
                          required: 'La contraseña es requerida',
                          minLength: {
                            value: 8,
                            message: 'La contraseña debe tener al menos 8 caracteres'
                          }
                        })}
                        type="password"
                        placeholder="••••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      />
                      {loginForm.formState.errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-sm mt-2 ml-2"
                        >
                          {loginForm.formState.errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                      className="text-right"
                    >
                      <Link
                        href="/forgot-password"
                        className="text-purple-300 hover:text-purple-200 text-sm transition-colors duration-300"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </motion.div>

                    <motion.button
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={3}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Iniciando sesión...
                        </div>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  custom={1}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {/* Formulario de Registro */}
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center"
                    >
                      <FontAwesomeIcon icon={faUser} className="text-white text-2xl" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">¡Únete a Alist!</h1>
                    <p className="text-white/70">Crea tu cuenta y comienza</p>
                  </div>

                  <form 
                    onSubmit={registerForm.handleSubmit(handleRegister)} 
                    className="space-y-4 max-w-2xl mx-auto px-2"
                  >
                    {/* Nombre Completo y Correo Electrónico en una línea */}
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Nombre Completo</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faUser} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('nombre', { 
                            required: 'El nombre es requerido',
                            minLength: {
                              value: 3,
                              message: 'El nombre debe tener al menos 3 caracteres'
                            }
                          })}
                          type="text"
                          placeholder="Tu nombre"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.nombre && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.nombre.message}
                          </motion.p>
                        )}
                      </div>
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Correo Electrónico</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faEnvelope} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('correo', { 
                            required: 'El correo es requerido',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Correo electrónico no válido'
                            }
                          })}
                          type="email"
                          placeholder="@email.com"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.correo && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.correo.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Tipo y Número de Documento */}
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Tipo de Documento</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faIdCard} className="text-white" />
                        </div>
                        <select
                          {...registerForm.register('tipoDocumento', { required: 'Selecciona el tipo de documento' })}
                          className="w-full pl-12 pr-4 py-4 bg-green-500/50 border border-white/20 rounded-2xl text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 appearance-none"
                        >
                          <option value="">Tipo Doc.</option>
                          <option value="TI">TI</option>
                          <option value="CC">CC</option>
                          <option value="CE">CE</option>
                        </select>
                        {registerForm.formState.errors.tipoDocumento && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.tipoDocumento.message}
                          </motion.p>
                        )}
                      </div>
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Número de Documento</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faIdCard} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('numeroDocumento', { 
                            required: 'El número de documento es requerido',
                            pattern: {
                              value: /^[0-9]+$/,
                              message: 'Solo se permiten números'
                            }
                          })}
                          type="text"
                          placeholder="Número"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.numeroDocumento && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.numeroDocumento.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Teléfono y Sede en una línea */}
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Teléfono</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faPhone} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('telefono', { 
                            required: 'El teléfono es requerido',
                            pattern: {
                              value: /^[0-9]+$/,
                              message: 'Solo se permiten números'
                            },
                            minLength: {
                              value: 7,
                              message: 'El teléfono debe tener al menos 7 dígitos'
                            }
                          })}
                          type="tel"
                          placeholder="Teléfono"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.telefono && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.telefono.message}
                          </motion.p>
                        )}
                      </div>
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Sede</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-white" />
                        </div>
                        <select
                          {...registerForm.register('sede', { required: 'Selecciona una sede' })}
                          className="w-full pl-12 pr-4 py-4 bg-green-500/50 border border-white/20 rounded-2xl text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 appearance-none"
                        >
                          <option value="">Elige</option>
                          <option value="bogota">Bogotá</option>
                          <option value="yopal">Yopal</option>
                          <option value="ibague">Ibagué</option>
                          <option value="girardot">Girardot</option>
                          <option value="pereira">Pereira</option>
                          <option value="armenia">Armenia</option>
                        </select>
                        {registerForm.formState.errors.sede && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.sede.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Contraseña y Confirmar Contraseña en una línea */}
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={3}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Contraseña</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faLock} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('password', { 
                            required: 'La contraseña es requerida',
                            minLength: {
                              value: 6,
                              message: 'La contraseña debe tener al menos 6 caracteres'
                            }
                          })}
                          type="password"
                          placeholder="••••••••••"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.password && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.password.message}
                          </motion.p>
                        )}
                      </div>
                      <div className="relative">
                        <p className="text-white text-mb pb-2">Confirmar Contraseña</p>
                        <div className="absolute inset-y-0 left-0 pt-6 pl-4 flex items-center pointer-events-none">
                          <FontAwesomeIcon icon={faLock} className="text-white" />
                        </div>
                        <input
                          {...registerForm.register('confirmPassword', { 
                            required: 'Debes confirmar la contraseña'
                          })}
                          type="password"
                          placeholder="••••••••••"
                          className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {registerForm.formState.errors.confirmPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.confirmPassword.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    <motion.button
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={4}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Creando cuenta...
                        </div>
                      ) : (
                        'Crear Cuenta'
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

