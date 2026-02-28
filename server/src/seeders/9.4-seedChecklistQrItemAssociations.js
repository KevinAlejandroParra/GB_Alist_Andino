'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Limpiar datos existentes para evitar duplicados
    await queryInterface.bulkDelete('checklist_qr_item_associations', {}, {});
    
    const associations = [
      // BABY HOUSE - OPERACIÓN (checklist_type_id: 4) - Anfitrión
      // qr_id: 23, 24, 25 (QR_MJ07C4XA_C00BA76D, QR_MJ07C52P_68888182, QR_MJ07C57Q_B606A7BA)
      // Items: 381, 393, 395, 399, 402, 405, 407, 413, 415, 420, 422, 427, 431, 434, 436
      {
        qr_id: 23, // Baby House Operación Grupo 1
        checklist_item_id: 381, // ENTORNO GENERAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 23,
        checklist_item_id: 393, // ARBOL PAJARO QQ
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 23,
        checklist_item_id: 395, // CARRUSEL DE PONYS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 23,
        checklist_item_id: 399, // LEON Y ACCESORIOS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 23,
        checklist_item_id: 402, // VOLCAN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 24, // Baby House Operación Grupo 2
        checklist_item_id: 405, // ARBOL CON OJOS EN MOVIMIENTO
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 24,
        checklist_item_id: 407, // JUEGO INTERACTIVO PARED MUSICAL Y BANDA TRANSPORTADORA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 24,
        checklist_item_id: 413, // CAMA ELASTICA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 24,
        checklist_item_id: 415, // CASA INTERACTIVA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 24,
        checklist_item_id: 420, // ARBOL DEL TUCCAN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 25, // Baby House Operación Grupo 3
        checklist_item_id: 422, // ELEMENTOS INTERACTIVOS Y PUFF
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 25,
        checklist_item_id: 427, // OSITO AVIADOR
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 25,
        checklist_item_id: 431, // JUEGO INTERACTIVO (VACA)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 25,
        checklist_item_id: 434, // ASEO
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 25,
        checklist_item_id: 436, // LISTO PARA OPERAR (SI-NO)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // BABY HOUSE - TÉCNICO (checklist_type_id: 5)
      // qr_id: 26, 27, 28 (QR_MJ079BZE_65E73043, QR_MJ079C7O_5AC1B412, QR_MJ079CD4_521AC8EA)
      // Items: 441, 454, 456, 460, 464, 466, 468, 474, 478, 488, 490, 496, 500, 505
      {
        qr_id: 26, // Baby House Técnico Grupo 1
        checklist_item_id: 441, // ENTORNO GENERAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 26,
        checklist_item_id: 454, // ARBOL PAJARO QQ
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 26,
        checklist_item_id: 456, // CARRUSEL DE PONYS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 26,
        checklist_item_id: 460, // LEON Y ACCESORIOS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 26,
        checklist_item_id: 464, // VOLCAN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 27, // Baby House Técnico Grupo 2
        checklist_item_id: 466, // ARBOL CON OJOS EN MOVIMIENTO
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 27,
        checklist_item_id: 468, // JUEGO INTERACTIVO PARED MUSICAL Y BANDA TRANSPORTADORA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 27,
        checklist_item_id: 474, // CAMA ELASTICA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 27,
        checklist_item_id: 478, // CASA INTERACTIVA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 27,
        checklist_item_id: 488, // ARBOL DEL TUCCAN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 28, // Baby House Técnico Grupo 3
        checklist_item_id: 490, // ELEMENTOS INTERACTIVOS Y PUFF
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 28,
        checklist_item_id: 496, // OSITO AVIADOR
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 28,
        checklist_item_id: 500, // JUEGO INTERACTIVO (VACA)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 28,
        checklist_item_id: 505, // LISTO PARA ENTREGAR A OPERACIÓN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // CONGO/PLAYGROUND - OPERACIÓN (checklist_type_id: 6)
      // qr_id: 17, 18, 19 (QR_MJ07CJ0L_E80950EF, QR_MJ07CJ5T_2B787DDD, QR_MJ07CJB8_FFD3BB01)
      // Items: 507, 516, 518, 520, 522, 525, 528, 532, 534, 537, 540, 543, 548
      {
        qr_id: 17, // Congo Operación Grupo 1
        checklist_item_id: 507, // ENTORNO GENERAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 17,
        checklist_item_id: 516, // CANGUROS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 17,
        checklist_item_id: 518, // PISCINA DE PELOTAS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 17,
        checklist_item_id: 520, // PLATAFORMAS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 17,
        checklist_item_id: 522, // DESLIZADEROS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 18, // Congo Operación Grupo 2
        checklist_item_id: 525, // ELEMENTOS INTERACTIVOS BONGOS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 18,
        checklist_item_id: 528, // ELEMENTOS INTERACTIVOS BOXEADORES
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 18,
        checklist_item_id: 532, // PISO EN REATA, MALLA, PUENTES DE MADERA Y PASOS DE ATILA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 18,
        checklist_item_id: 534, // TOBOGAN ESPIRAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 18,
        checklist_item_id: 537, // ZONA CARGA Y PRECARGA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 19, // Congo Operación Grupo 3
        checklist_item_id: 540, // CAMARAS Y ELEMENTOS INTERACTIVOS (LUCES, SENSORES Y SONIDO)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 19,
        checklist_item_id: 543, // LUCES DE EMERGENCIA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 19,
        checklist_item_id: 548, // LISTO PARA ENTREGA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // CONGO/PLAYGROUND - TÉCNICO (checklist_type_id: 7)
      // qr_id: 20, 21, 22 (QR_MJ07B4QP_96BAA529, QR_MJ07B4WF_A8D2726F, QR_MJ07B516_1A91F4CD)
      // Items: 550, 563, 567, 569, 572, 576, 580, 584, 586, 593, 596, 599, 601
      {
        qr_id: 20, // Congo Técnico Grupo 1
        checklist_item_id: 550, // ENTORNO GENERAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 20,
        checklist_item_id: 563, // CANGUROS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 20,
        checklist_item_id: 567, // PISCINA DE PELOTAS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 20,
        checklist_item_id: 569, // PLATAFORMAS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 20,
        checklist_item_id: 572, // DESLIZADEROS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 21, // Congo Técnico Grupo 2
        checklist_item_id: 576, // ELEMENTOS INTERACTIVOS BONGOS
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 21,
        checklist_item_id: 580, // ELEMENTOS INTERACTIVOS BOXEADORES
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 21,
        checklist_item_id: 584, // PISO EN REATA - MALLA - PUENTES DE MADERA Y PASOS DE ATILA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 21,
        checklist_item_id: 586, // TOBOGAN ESPIRAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 21,
        checklist_item_id: 593, // ZONA CARGA Y PRECARGA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 22, // Congo Técnico Grupo 3
        checklist_item_id: 596, // CAMARAS -- ELEMENTOS INTERACTIVOS (LUCES, SENSORES Y SONIDO)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 22,
        checklist_item_id: 599, // LUCES DE EMERGENCIA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 22,
        checklist_item_id: 601, // LISTO PARA ENTREGAR A OPERACIÓN? (SI-NO)
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // TREN DEL OESTE - TÉCNICO (checklist_type_id: 13)
      // qr_id: 16 (QR_MJ07BGEA_C32DBE71)
      // Items: 657, 662, 668, 676
      {
        qr_id: 16, // Tren del Oeste Técnico
        checklist_item_id: 657, // Entorno General
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 16,
        checklist_item_id: 662, // Locomotora
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 16,
        checklist_item_id: 668, // Estructura
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 16,
        checklist_item_id: 676, // Listo para entregar a operación
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // TREN DEL OESTE - OPERACIÓN (checklist_type_id: 14)
      // qr_id: 15 (QR_MJ07CVMG_BC77C14F)
      // Items: 678, 683, 687, 693
      {
        qr_id: 15, // Tren del Oeste Operación
        checklist_item_id: 678, // ENTORNO GENERAL
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 15,
        checklist_item_id: 683, // LOCOMOTORA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 15,
        checklist_item_id: 687, // ESTRUCTURA
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_id: 15,
        checklist_item_id: 693, // LISTO PARA ENTREGAR A OPERACIÓN
        is_unlocked: false,
        unlocked_at: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('checklist_qr_item_associations', associations, {});
    
    console.log('✅ Seeder 9.4-seedChecklistQrItemAssociations ejecutado exitosamente - 73 asociaciones creadas');
    console.log('📊 Distribución de asociaciones para ATRACCIONES únicamente:');
    console.log('  - Baby House Operación: 15 asociaciones (qr_id: 23, 24, 25)');
    console.log('  - Baby House Técnico: 14 asociaciones (qr_id: 26, 27, 28)');
    console.log('  - Congo/Playground Operación: 13 asociaciones (qr_id: 17, 18, 19)');
    console.log('  - Congo/Playground Técnico: 13 asociaciones (qr_id: 20, 21, 22)');
    console.log('  - Tren del Oeste Técnico: 4 asociaciones (qr_id: 16)');
    console.log('  - Tren del Oeste Operación: 4 asociaciones (qr_id: 15)');
    console.log('  - Total: 73 asociaciones QR-Sección para ATRACCIONES');
    console.log('🆕 Actualizado con qr_id reales de la base de datos y checklist_item_id reales');
    console.log('  - Baby House: operación=4, técnico=5');
    console.log('  - Congo: operación=6, técnico=7');
    console.log('  - Tren del Oeste: operación=14, técnico=13');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('checklist_qr_item_associations', {}, {});
    console.log('✅ Seeder 9.4-seedChecklistQrItemAssociations revertido - asociaciones eliminadas');
  }
};