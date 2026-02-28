'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Datos de inventario con la nueva estructura simplificada
    await queryInterface.bulkInsert('inventories', [
      // UBICACIÓN: Bodega Principal
      {
        part_name: 'Fusibles 15A 250V',
        details: 'Fusibles de protección para circuitos eléctricos estándar',
        quantity: 25,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Fusibles 20A 250V',
        details: 'Fusibles de protección para circuitos de alta potencia',
        quantity: 18,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Sensores PIR HC-SR501',
        details: 'Sensores de movimiento infrarrojo pasivo',
        quantity: 8,
        location: 'bodega',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Cables HDMI 2 metros',
        details: 'Cables HDMI para conexiones de video y audio',
        quantity: 12,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Pulsadores arcade estándar',
        details: 'Pulsadores de alta calidad para máquinas arcade',
        quantity: 0,
        location: 'bodega',
        status: 'agotado',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Joysticks arcade profesionales',
        details: 'Joysticks robustos para uso intensivo en arcade',
        quantity: 6,
        location: 'bodega',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Llaves allen 10 piezas',
        details: 'Juego completo de llaves allen para mantenimiento',
        quantity: 8,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Lubricante multiusos',
        details: 'Lubricante para mecanismos y motores de juegos',
        quantity: 15,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Bolas de pinball transparentes',
        details: 'Bolas de repuesto para máquinas de pinball',
        quantity: 50,
        location: 'bodega',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Ventiladores 120mm',
        details: 'Ventiladores de refrigeración para equipos electrónicos',
        quantity: 10,
        location: 'bodega',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // UBICACIÓN: Almacén técnico
      {
        part_name: 'Tickets de 100 puntos',
        details: 'Tickets impresos de 100 puntos para máquinas de redención',
        quantity: 200,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Tickets de 500 puntos',
        details: 'Tickets impresos de 500 puntos para máquinas de redención',
        quantity: 120,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Baterías AA (pack 4)',
        details: 'Baterías para controles y dispositivos pequeños',
        quantity: 30,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Baterías AAA (pack 4)',
        details: 'Baterías para dispositivos electrónicos',
        quantity: 22,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Memoria USB 8GB',
        details: 'Memoria USB para almacenamiento y respaldo',
        quantity: 0,
        location: 'almacén técnico',
        status: 'agotado',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Discos duros 500GB',
        details: 'Discos duros para almacenamiento de juegos',
        quantity: 4,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Monedas de 500 pesos (rollo 500u)',
        details: 'Rollo con 500 monedas de 500 pesos',
        quantity: 8,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Monedas de 1000 pesos (rollo 500u)',
        details: 'Rollo con 500 monedas de 1000 pesos',
        quantity: 5,
        location: 'almacén técnico',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // UBICACIÓN: Depósito de premios
      {
        part_name: 'Peluches medianos 20-30cm',
        details: 'Peluches de tamaño mediano como premios',
        quantity: 45,
        location: 'depósito de premios',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Peluches grandes 30-50cm',
        details: 'Peluches de gran tamaño como premios premium',
        quantity: 28,
        location: 'depósito de premios',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Peluches pequeños 10-20cm',
        details: 'Peluches pequeños para juegos frecuentes',
        quantity: 0,
        location: 'depósito de premios',
        status: 'agotado',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Juguetes educativos',
        details: 'Juguetes para edades 3-8 años',
        quantity: 35,
        location: 'depósito de premios',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Artículos coleccionables',
        details: 'Artículos especiales para premios de alto valor',
        quantity: 12,
        location: 'depósito de premios',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // UBICACIÓN: Taller de reparación
      {
        part_name: 'Componentes electrónicos varios',
        details: 'Resistencias, capacitores, diodos para reparaciones',
        quantity: 150,
        location: 'taller',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Fuentes de poder 12V',
        details: 'Fuentes de alimentación para equipos arcade',
        quantity: 3,
        location: 'taller',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Pantallas LCD 19 pulgadas',
        details: 'Pantallas de repuesto para máquinas de video',
        quantity: 2,
        location: 'taller',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Motores stepper',
        details: 'Motores para mecanismos de juegos',
        quantity: 8,
        location: 'taller',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Sensores ópticos',
        details: 'Sensores para detección de presencia y movimiento',
        quantity: 6,
        location: 'taller',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // UBICACIÓN: Almacén Andino (sede principal)
      {
        part_name: 'Tickets premium 1000 puntos',
        details: 'Tickets de alto valor para máquinas premium',
        quantity: 80,
        location: 'almacén andino',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Artículos tech gaming',
        details: 'Accesorios modernos para gaming y tecnología',
        quantity: 25,
        location: 'almacén andino',
        status: 'disponible',
        category: 'locativo',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Componentes de reconstrucción',
        details: 'Partes para reconstrucción completa de máquinas',
        quantity: 15,
        location: 'almacén andino',
        status: 'disponible',
        category: 'dispositivos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Herramientas especializadas',
        details: 'Herramientas específicas para tecnología moderna',
        quantity: 18,
        location: 'almacén andino',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        part_name: 'Equipos de diagnóstico',
        details: 'Equipos para diagnóstico y testing de fallas',
        quantity: 4,
        location: 'almacén andino',
        status: 'disponible',
        category: 'herramientas',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('inventories', null, {});
  }
};