'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Limpiar datos existentes para evitar duplicados
    await queryInterface.bulkDelete('checklist_qr_codes', {}, {});
    
    const qrCodes = [
      // TREN DEL OESTE - OPERACIÓN (checklist_type_id: 14) - 1 QR para 4 secciones (<5)
      {
        qr_code: 'QR_MJ07CVMG_BC77C14F',
        checklist_type_id: 14,
        attraction_name: 'Tren del Oeste',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
       
      // TREN DEL OESTE - TÉCNICO (checklist_type_id: 13) - 1 QR para 4 secciones (<5)
      {
        qr_code: 'QR_MJ07BGEA_C32DBE71',
        checklist_type_id: 13,
        attraction_name: 'Tren del Oeste',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // CONGO/PLAYGROUND - OPERACIÓN (checklist_type_id: 6) - 3 QRs para 13 secciones
      {
        qr_code: 'QR_MJ07CJ0L_E80950EF',
        checklist_type_id: 6,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07CJ5T_2B787DDD',
        checklist_type_id: 6,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07CJB8_FFD3BB01',
        checklist_type_id: 6,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // CONGO/PLAYGROUND - TÉCNICO (checklist_type_id: 7) - 3 QRs para 13 secciones
      {
        qr_code: 'QR_MJ07B4QP_96BAA529',
        checklist_type_id: 7,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07B4WF_A8D2726F',
        checklist_type_id: 7,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07B516_1A91F4CD',
        checklist_type_id: 7,
        attraction_name: 'Congo',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // BABY HOUSE - OPERACIÓN (checklist_type_id: 4) - 3 QRs para 15 secciones
      {
        qr_code: 'QR_MJ07C4XA_C00BA76D',
        checklist_type_id: 4,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07C52P_68888182',
        checklist_type_id: 4,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ07C57Q_B606A7BA',
        checklist_type_id: 4,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // BABY HOUSE - TÉCNICO (checklist_type_id: 5) - 3 QRs para 14 secciones
      {
        qr_code: 'QR_MJ079BZE_65E73043',
        checklist_type_id: 5,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ079C7O_5AC1B412',
        checklist_type_id: 5,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        qr_code: 'QR_MJ079CD4_521AC8EA',
        checklist_type_id: 5,
        attraction_name: 'Baby House',
        is_active: true,
        created_by: 1,
        usage_count: 0,
        last_used_at: null,
        group_number: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('checklist_qr_codes', qrCodes, {});
    
    console.log('✅ Seeder 9.3-seedChecklistQrCodes ejecutado exitosamente - 14 QRs insertados');
    console.log('📊 Distribución correcta basada en análisis de secciones padre:');
    console.log('  - Tren del Oeste: 2 QRs (1 técnico + 1 operación)');
    console.log('  - Congo/Playground: 6 QRs (3 técnico + 3 operación)');
    console.log('  - Baby House: 6 QRs (3 técnico + 3 operación)');
    console.log('  - Total: 14 QRs');
    console.log('🆕 Actualizado con nuevos checklist_type_id:');
    console.log('  - Tren del Oeste: operación=14, técnico=13');
    console.log('  - Congo: operación=6, técnico=7');
    console.log('  - Baby House: operación=4, técnico=5');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('checklist_qr_codes', {}, {});
    console.log('✅ Seeder 9.3-seedChecklistQrCodes revertido - QRs eliminados');
  }
};