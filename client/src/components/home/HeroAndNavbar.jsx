"use client"
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HeroandNavbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch user data 
  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/protected`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  
  useEffect(() => {
    const checkAuth = async () => {
      const authToken = localStorage?.getItem('authToken');
      
      if (authToken) {
        try {
          const userData = await fetchUserData(authToken);
          
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            localStorage.setItem('userData', JSON.stringify(userData));
          } else {
            localStorage?.removeItem('authToken');
            localStorage?.removeItem('userData');
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
        }
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      // llamada al logout API endpoint
      await fetch('/api/users/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage?.removeItem('authToken');
      localStorage?.removeItem('userData');
      setIsAuthenticated(false);
      setUser(null);
      setShowProfileMenu(false);
      window.location.href = '/';
    }
  };

  const redirectToLogin = () => {
    window.location.href = '/login';
  };
    const redirectToEdit = () => {
    window.location.href = '/Profile';
  };

  const goToWorkspace = () => {
    if (isAuthenticated || localStorage?.getItem('authToken')) {
      window.location.href = '/workspace';
    } else {
      redirectToLogin();
    }
  };
  const navItems = [
    { name: 'Inicio', href: '#home', icon: 'fas fa-home' },
    { name: 'Características', href: '#features', icon: 'fas fa-star' },
    { name: 'Cómo usar', href: '#how-to-use', icon: 'fas fa-question-circle' },
    { name: 'Soporte', href: '#support', icon: 'fas fa-headset' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 relative overflow-hidden">
      {/* Elementos flotantes en el background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
        />
        <motion.div
          animate={{
            y: [0, 30, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-60 right-20 w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/15 to-cyan-500/15 backdrop-blur-sm"
        />
        <motion.div
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-40 left-1/4 w-16 h-16 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm"
        />
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-50 fixed w-full top-0"
      >
        <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Logo */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-3"
              >
                
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  ALIST GBX
                </h1>
              </motion.div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-2">
                {navItems.map((item, index) => (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                    whileHover={{ 
                      scale: 1.05,
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl backdrop-blur-sm"
                  >
                    <i className={`${item.icon} text-sm`}></i>
                    <span className="text-sm font-medium">{item.name}</span>
                  </motion.a>
                ))}
              </div>

              {/* Auth Section */}
              <div className="flex items-center space-x-4">
                {!isAuthenticated ? (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={redirectToLogin}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 flex items-center space-x-2 shadow-lg"
                  >
                    <i className="fas fa-sign-in-alt text-sm"></i>
                    <span>Ingresar</span>
                  </motion.button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="hidden lg:flex items-center space-x-2 text-gray-300"
                    >
                      <span className="text-sm">Hola,</span>
                      <span className="font-semibold text-white">
                        {user?.user_name || user?.name || 'Usuario'}
                      </span>
                    </motion.div>

                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white hover:bg-white/20 transition-all duration-300"
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <i className="fas fa-user text-white text-sm"></i>
                        </div>
                        <span className="hidden sm:block text-sm font-medium">Perfil</span>
                        <motion.i 
                          animate={{ rotate: showProfileMenu ? 180 : 0 }}
                          className="fas fa-chevron-down text-xs"
                        />
                      </motion.button>

                      <AnimatePresence>
                        {showProfileMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-56 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl py-2"
                          >
                            <div className="px-4 py-3 border-b border-white/20">
                              <p className="text-white font-semibold text-sm">
                                {user?.user_name || user?.name || 'Usuario'}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {user?.user_email || user?.email || ''}
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                              onClick={redirectToEdit}
                              className="w-full text-left px-4 py-2 text-gray-300 hover:text-white flex items-center space-x-3 transition-colors"
                            >
                              <i className="fas fa-pen-alt text-green-500 w-4"></i>
                              <span className="text-sm">Editar Perfil</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                              onClick={goToWorkspace}
                              className="w-full text-left px-4 py-2 text-gray-300 hover:text-white flex items-center space-x-3 transition-colors"
                            >
                              <i className="fas fa-tachometer-alt text-blue-400 w-4"></i>
                              <span className="text-sm">Dashboard</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                              onClick={handleLogout}
                              className="w-full text-left px-4 py-2 text-gray-300 hover:text-white flex items-center space-x-3 transition-colors"
                            >
                              <i className="fas fa-sign-out-alt text-red-400 w-4"></i>
                              <span className="text-sm">Cerrar Sesión</span>
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden bg-white/5 backdrop-blur-xl border-t border-white/10"
              >
                <div className="px-4 py-4 space-y-2">
                  {navItems.map((item) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      whileHover={{ x: 10 }}
                      className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
                    >
                      <i className={item.icon}></i>
                      <span>{item.name}</span>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-8 text-center lg:text-left"
            >
              {/* contenido informativo */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-gray-300 mx-auto lg:mx-0"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Sistema de mantenimiento avanzado para Gamebox</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
              >
                <span className="text-white">Operaciones de</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Mantenimiento
                </span>
                <br />
                <span className="text-white">Inteligente</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-lg lg:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                Optimiza y centraliza todas tus operaciones de mantenimiento con nuestra plataforma avanzada. 
                Control total, eficiencia máxima.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToWorkspace}
                  className="group bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center space-x-3 shadow-2xl"
                >
                  <span>Comenzar ahora</span>
                  <motion.i 
                    className="fas fa-arrow-right"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <i className="fas fa-play"></i>
                  <span>Ver instructivo</span>
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="flex flex-col sm:flex-row gap-8 justify-center lg:justify-start pt-8"
              >
                <div className="text-center lg:text-left">
                  <div className="text-2xl lg:text-3xl font-bold text-white">+20</div>
                  <div className="text-sm text-gray-400">Dispositivos gestionados</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl lg:text-3xl font-bold text-white">100%</div>
                  <div className="text-sm text-gray-400">Accesible</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl lg:text-3xl font-bold text-white">365</div>
                  <div className="text-sm text-gray-400">Dias de monitoreo continuo</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Modelos */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative">
                {/* Glassmorphism Card Container */}
                <motion.div
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl "
                >
                  {/* Imagen */}
                  <div className="w-full max-w-3xl mx-auto ">
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      src="/resources/model.png"
                      alt="Professional Team"
                      className="w-full h-full  object-contain"
                      style={{
                        aspectRatio: '4/3',
                        minHeight: '300px',
                        maxHeight: '500px'
                      }}
                    />
                  </div>

                  {/* Floating Info Cards */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    className="absolute -left-4 top-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <i className="fas fa-check text-white"></i>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Eficiencia</div>
                        <div className="text-green-400 text-xs">+150%</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                    className="absolute -right-4 top-24 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <i className="fas fa-users text-white"></i>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Equipos</div>
                        <div className="text-blue-300 text-xs">Conectados</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Decorative Elements */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-6 -right-6 w-12 h-12 border-2 border-purple-400/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-4 -left-4 w-8 h-8 border-2 border-blue-400/30 rounded-full"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FontAwesome CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
      />
    </div>
  );
};

export default HeroandNavbar;