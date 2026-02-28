"use client"
import { useState, useEffect, Suspense, lazy } from 'react';
import { useForm } from 'react-hook-form';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faHome, faUser, faIdCard, faPhone, faMapMarkerAlt, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';
import cacheService from '../../utils/cacheService';
import networkOptimizer from '../../utils/networkOptimizer';
import LazyImage from '../../components/common/LazyImage';
import NetworkStatusIndicator from '../../components/common/NetworkStatusIndicator';

// Lazy load de componentes pesados
const OptimizedSwal = lazy(() => import('sweetalert2').then(module => ({ default: module.Swal })));

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState(1);
  const [premises, setPremises] = useState([]);
  const [premisesLoading, setPremisesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [networkConfig] = useState(networkOptimizer.getOptimizedConfig('login'));
  const [isSlowConnection, setIsSlowConnection] = useState(networkOptimizer.isSlowConnection);
  const [animationsEnabled, setAnimationsEnabled] = useState(!networkOptimizer.isSlowConnection);

  // Configuración de formularios optimizada
  const loginForm = useForm({
    mode: 'onChange', // Validación progresiva
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const registerForm = useForm({
    mode: 'onChange',
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

  // Cargar sedes con cache inteligente
  useEffect(() => {
    const loadPremises = async () => {
      try {
        setPremisesLoading(true);
        
        // Intentar obtener del cache primero
        const cachedPremises = await cacheService.getWithCache(
          'premises-list',
          async () => {
            const response = await networkOptimizer.requestWithRetry({
              method: 'GET',
              url: '/api/premises'
            });
            return response.data;
          },
          'premises'
        );

        if (cachedPremises.data && cachedPremises.data.success) {
          const formattedPremises = cachedPremises.data.data.map(premise => ({
            ...premise,
            premise_id: premise.premise_id.toString()
          }));
          setPremises(formattedPremises);
        }
      } catch (error) {
        console.error('Error cargando sedes:', error);
        // Fallback: datos estáticos básicos si hay error de red
        setPremises([
          { premise_id: '1', premise_name: 'Sede Principal' },
          { premise_id: '2', premise_name: 'Sede Norte' }
        ]);
      } finally {
        setPremisesLoading(false);
      }
    };

    loadPremises();

    // Detectar cambios en la conexión
    const handleConnectionChange = () => {
      const connectionInfo = networkOptimizer.getConnectionInfo();
      setIsSlowConnection(connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === 'slow-2g');
      setAnimationsEnabled(!(connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === 'slow-2g'));
    };

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  // Detectar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => {
      setIsSlowConnection(networkOptimizer.isSlowConnection);
    };
    
    const handleOffline = () => {
      setIsSlowConnection(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manejar cambio entre login y registro con animación optimizada
  const toggleAuthMode = (isLoginMode) => {
    if (isSlowConnection) {
      // Sin animación en conexiones lentas
      setIsLogin(isLoginMode);
      return;
    }
    
    setDirection(isLoginMode ? -1 : 1);
    setIsLogin(isLoginMode);
  };

  // Función para mostrar alertas optimizada
  const showOptimizedAlert = async (config) => {
    try {
      const { default: Swal } = await OptimizedSwal;
      await Swal.fire(config);
    } catch (error) {
      // Fallback sin SweetAlert en caso de error
      alert(config.text || config.title);
    }
  };

  // Función para manejar el login optimizada
  const handleLogin = async (data) => {
    setIsLoading(true);
    try {
      const response = await networkOptimizer.requestWithRetry({
        method: 'POST',
        url: '/api/users/login',
        data: {
          user_email: data.email,
          user_password: data.password
        },
        timeout: networkConfig.timeout
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al iniciar sesión');
      }

      // Guardar el token en localStorage
      localStorage.setItem('authToken', response.data.token);

      await showOptimizedAlert({
        title: '<div class="flex flex-col items-center"><i class="fas fa-check-circle text-5xl mb-3 text-purple-400"></i><span class="text-white text-2xl font-bold">¡Éxito!</span></div>',
        html: '<div class="text-white/80 mb-4">Inicio de sesión exitoso</div>',
        background: 'rgba(99, 102, 241, 0.15)',
        showConfirmButton: true,
        confirmButtonText: '<span class="px-6 py-2">Continuar</span>',
        confirmButtonColor: 'transparent',
        width: '26rem',
        timer: 2000,
        customClass: {
          popup: 'backdrop-blur-xl rounded-2xl border border-cyan-200/20 shadow-[0_10px_50px_rgba(167,139,250,0.3)] bg-gradient-to-br from-blue-500/10 to-purple-500/10',
          title: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400',
          htmlContainer: 'text-white/90',
          confirmButton: 'bg-gradient-to-r from-blue-400 to-purple-500 text-white font-medium rounded-xl hover:from-blue-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 shadow-lg',
          actions: 'mt-4'
        }
      });

      // Redirigir al dashboard
      window.location.href = '/';

    } catch (error) {
      await showOptimizedAlert({
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

  // Función para manejar el registro optimizada
  const handleRegister = async (data) => {
    if (data.password !== data.confirmPassword) {
      await showOptimizedAlert({
        title: 'Error',
        text: 'Las contraseñas no coinciden',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }
   
    setIsLoading(true);
    try {
      const selectedPremise = premises.find(premise => premise.premise_id === data.sede);
      
      if (!selectedPremise) {
        throw new Error('Sede no válida');
      }
  
      const response = await networkOptimizer.requestWithRetry({
        method: 'POST',
        url: '/api/users',
        data: {
          user_name: data.nombre,
          user_email: data.correo,
          user_document_type: data.tipoDocumento,
          user_document: data.numeroDocumento,
          user_phone: data.telefono,
          premise_id: parseInt(data.sede),
          user_password: data.password,
          role_id: 4
        },
        timeout: networkConfig.timeout
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al registrar usuario');
      }

      await showOptimizedAlert({
        title: '<div class="flex flex-col items-center"><i class="fas fa-check-circle text-5xl mb-3 text-green-400"></i><span class="text-white text-2xl font-bold">¡Éxito!</span></div>',
        html: '<div class="text-white/80 mb-4">Usuario registrado correctamente</div>',
        background: 'rgba(34, 197, 94, 0.15)',
        showConfirmButton: true,
        confirmButtonText: '<span class="px-6 py-2">Continuar</span>',
        confirmButtonColor: 'transparent',
        width: '26rem',
        timer: 2000,
        customClass: {
          popup: 'backdrop-blur-xl rounded-2xl border border-green-200/20 shadow-[0_10px_50px_rgba(34,197,94,0.3)] bg-gradient-to-br from-green-500/10 to-teal-500/10',
          title: 'text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-teal-400',
          htmlContainer: 'text-white/90',
          confirmButton: 'bg-gradient-to-r from-green-400 to-teal-500 text-white font-medium rounded-xl hover:from-green-500 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-300 shadow-lg',
          actions: 'mt-4'
        }
      });
      
      // Resetear estados
      setIsLoading(false);
      registerForm.reset();
      setShowRegisterPassword(false);
      setShowRegisterConfirmPassword(false);
      
      // Cambiar al formulario de login
      toggleAuthMode(true);
  
    } catch (error) {
      await showOptimizedAlert({
        title: 'Error',
        text: error.message || 'Error al registrar usuario',
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Variantes de animación optimizadas
  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: animationsEnabled ? { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    } : {
      opacity: 1,
      scale: 1
    },
    exit: animationsEnabled ? { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.3 }
    } : {
      opacity: 0,
      scale: 0.9
    }
  };

  const formVariants = animationsEnabled ? {
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
  } : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const fieldVariants = animationsEnabled ? {
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
  } : {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  };

  // Indicador de carga optimizado
  const LoadingIndicator = () => (
    <div className="flex items-center justify-center">
      <motion.div
        animate={animationsEnabled ? { rotate: 360 } : {}}
        transition={animationsEnabled ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
      />
      {isLoading ? (isLogin ? 'Iniciando sesión...' : 'Creando cuenta...') : 'Cargando...'}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-purple-800 to-slate-900 p-4">
      {/* Indicador de conectividad */}
      <NetworkStatusIndicator />
      
      {/* Elementos decorativos optimizados */}
      {animationsEnabled && (
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
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-violet-500/80 to-transparent rounded-full"
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
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-indigo-500/40 to-transparent rounded-full"
          />
        </div>
      )}

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
        
        {/* Contenedor principal optimizado */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Indicador de modo activo */}
          <div className="flex justify-center mb-8">
            <div className="relative bg-white/10 rounded-full p-1 backdrop-blur-sm">
              {animationsEnabled ? (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-y-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  style={{
                    left: isLogin ? '4px' : '50%',
                    right: isLogin ? '50%' : '4px',
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              ) : (
                <div 
                  className="absolute inset-y-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{
                    left: isLogin ? '4px' : '50%',
                    right: isLogin ? '50%' : '4px',
                  }}
                />
              )}
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
                      initial={animationsEnabled ? { scale: 0 } : {}}
                      animate={animationsEnabled ? { scale: 1 } : {}}
                      transition={animationsEnabled ? { delay: 0.2, type: "spring", stiffness: 200 } : {}}
                      className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center border border-white border-2"
                    >
                      <LazyImage
                        src="/resources/felix.png"
                        alt="Imagen de Felix"
                        width={65}
                        height={65}
                        className="rounded-full drop-shadow-[0_0_20px_rgba(191,219,254,0.5)]"
                        placeholderSrc="/images/felix-placeholder.svg"
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
                          initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                          animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                      <div className="relative">
                        <input
                          {...loginForm.register('password', {
                            required: 'La contraseña es requerida',
                            minLength: {
                              value: 8,
                              message: 'La contraseña debe tener al menos 8 caracteres'
                            }
                          })}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••"
                          className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors duration-200"
                        >
                          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <motion.p
                          initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                          animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                      whileHover={animationsEnabled ? { scale: 1.02, y: -2 } : {}}
                      whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LoadingIndicator />
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
                  {/* Formulario de Registro optimizado */}
                  <div className="text-center mb-6">
                    <motion.div
                      initial={animationsEnabled ? { scale: 0 } : {}}
                      animate={animationsEnabled ? { scale: 1 } : {}}
                      transition={animationsEnabled ? { delay: 0.2, type: "spring", stiffness: 200 } : {}}
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
                    {/* Form fields optimizados con validación progresiva */}
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
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.correo.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Campos de documento */}
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
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.numeroDocumento.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Teléfono y Sede */}
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
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                          disabled={premisesLoading}
                        >
                          <option value="">
                            {premisesLoading ? 'Cargando sedes...' : 'Elige'}
                          </option>
                          {premises.map(premise => (
                            <option key={premise.premise_id} value={premise.premise_id}>
                              {premise.premise_name}
                            </option>
                          ))}
                        </select>
                        {registerForm.formState.errors.sede && (
                          <motion.p
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
                            className="text-red-400 text-sm mt-2 ml-2"
                          >
                            {registerForm.formState.errors.sede.message}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Contraseñas */}
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
                        <div className="relative">
                          <input
                            {...registerForm.register('password', {
                              required: 'La contraseña es requerida',
                              minLength: {
                                value: 6,
                                message: 'La contraseña debe tener al menos 6 caracteres'
                              }
                            })}
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••••"
                            className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors duration-200"
                          >
                            <FontAwesomeIcon icon={showRegisterPassword ? faEyeSlash : faEye} />
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <motion.p
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                        <div className="relative">
                          <input
                            {...registerForm.register('confirmPassword', {
                              required: 'Debes confirmar la contraseña'
                            })}
                            type={showRegisterConfirmPassword ? "text" : "password"}
                            placeholder="••••••••••"
                            className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors duration-200"
                          >
                            <FontAwesomeIcon icon={showRegisterConfirmPassword ? faEyeSlash : faEye} />
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <motion.p
                            initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
                            animate={animationsEnabled ? { opacity: 1, y: 0 } : {}}
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
                      whileHover={animationsEnabled ? { scale: 1.02, y: -2 } : {}}
                      whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={isLoading || premisesLoading}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LoadingIndicator />
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