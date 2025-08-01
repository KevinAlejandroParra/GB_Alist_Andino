"use client"
import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faHome,
  faUser,
  faEnvelope,
  faLock,
  faIdCard,
  faPhone,
  faBirthdayCake,
  faUserTag,
  faIdBadge,
  faSchool
} from "@fortawesome/free-solid-svg-icons"
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Formularios separados para login y registro
  const loginForm = useForm();
  const registerForm = useForm();

  // Función para manejar el envío del login
  const handleLogin = async (data) => {
    setIsLoading(true);
    console.log('Datos de login:', data);
    // Aquí conectarás con tu API
    setTimeout(() => setIsLoading(false), 2000); // Simulación
  };

  // Función para manejar el envío del registro
  const handleRegister = async (data) => {
    setIsLoading(true);
    console.log('Datos de registro:', data);
    // Aquí conectarás con tu API
    setTimeout(() => setIsLoading(false), 2000); // Simulación
  };

  // Variantes de animación para el contenedor principal
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

  // Variantes para los formularios
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

  // Variantes para los elementos del formulario
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
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-600/20 to-transparent rounded-full"
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
                  onClick={() => setIsLogin(true)}
                  className={`px-6 py-2 text-sm font-medium rounded-full transition-colors z-10 ${
                    isLogin ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setIsLogin(false)}
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
            <AnimatePresence mode="wait" custom={isLogin ? -1 : 1}>
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
                      className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center"
                    >
                      { /*<FontAwesomeIcon icon={faUser} className=" text-white text-2xl" />*/}
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">¡Bienvenido!</h1>
                    <p className="text-white/70">Inicia sesión en tu cuenta</p>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FontAwesomeIcon icon={faEnvelope} className=" text-white" />

                      </div>
                      <input
                        {...loginForm.register('email', { required: 'El correo es requerido' })}
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
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                       <FontAwesomeIcon icon={faLock} className=" text-white" />
                      </div>
                      <input
                        {...loginForm.register('password', { required: 'La contraseña es requerida' })}
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
                      <a
                        href="#"
                        className="text-purple-300 hover:text-purple-200 text-sm transition-colors duration-300"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
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
                      <i className="fas fa-user-plus text-white text-2xl"></i>
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">¡Únete a Alist!</h1>
                    <p className="text-white/70">Crea tu cuenta y comienza</p>
                  </div>

                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={0}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fas fa-user text-white/50"></i>
                      </div>
                      <input
                        {...registerForm.register('nombre', { required: 'El nombre es requerido' })}
                        type="text"
                        placeholder="Tu nombre completo"
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                      />
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={1}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fas fa-envelope text-white/50"></i>
                      </div>
                      <input
                        {...registerForm.register('correo', { required: 'El correo es requerido' })}
                        type="email"
                        placeholder="tucorreo@email.com"
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                      />
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={2}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <i className="fas fa-id-card text-white/50"></i>
                        </div>
                        <select
                          {...registerForm.register('tipoDocumento', { required: 'Selecciona el tipo' })}
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 appearance-none"
                        >
                          <option value="" className="bg-gray-800">Tipo Doc.</option>
                          <option value="TI" className="bg-gray-800">TI</option>
                          <option value="CC" className="bg-gray-800">CC</option>
                          <option value="CE" className="bg-gray-800">CE</option>
                        </select>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <i className="fas fa-hashtag text-white/50"></i>
                        </div>
                        <input
                          {...registerForm.register('numeroDocumento', { required: 'Número requerido' })}
                          type="text"
                          placeholder="Número"
                          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={3}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fas fa-phone text-white/50"></i>
                      </div>
                      <input
                        {...registerForm.register('telefono', { required: 'El teléfono es requerido' })}
                        type="tel"
                        placeholder="Número de teléfono"
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                      />
                    </motion.div>

                    <motion.div
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={4}
                      className="relative"
                    >
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fas fa-map-marker-alt text-white/50"></i>
                      </div>
                      <select
                        {...registerForm.register('sede', { required: 'Selecciona una sede' })}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 appearance-none"
                      >
                        <option value="" className="bg-gray-800">Selecciona tu sede</option>
                        <option value="bogota" className="bg-gray-800">Bogotá</option>
                        <option value="yopal" className="bg-gray-800">Yopal</option>
                        <option value="ibague" className="bg-gray-800">Ibagué</option>
                        <option value="girardot" className="bg-gray-800">Girardot</option>
                      </select>
                    </motion.div>

                    <motion.button
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                      custom={5}
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

        {/* Elementos decorativos adicionales */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60"
        />
        <motion.div
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full opacity-60"
        />
      </motion.div>

      {/* Agregar Font Awesome y librerías necesarias */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    </div>
  );
}