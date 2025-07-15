'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Roles', [
      {
        role_id: 1,
        role_name: 'Regulador',
        role_description: 'Regulador de la plataforma (Desarrollador de alist_andino)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 2,
        role_name: 'Jefe de Mantenimiento',
        role_description: 'Jefe de mantenimiento de la plataforma (product manager)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 3,
        role_name: 'Direccion de Operaciones',
        role_description: 'Direccion de operaciones de Game Box',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 4,
        role_name: 'Jefe de Operaciones',
        role_description: 'Jefe de operaciones de Game Box (Jefe de area administrativa de Game Box Andino)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 5,
        role_name: 'Direccion de Copass',
        role_description: 'Direccion de copass de Game Box Andino',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 6,
        role_name: 'Tecnico de Copass',
        role_description: 'Tecnico de copass de Game Box Andino',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 7,
        role_name: 'Tecnico de mantenimiento',
        role_description: 'Tecnico de mantenimiento de Game Box Andino',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 8,
        role_name: 'Anfitrion',
        role_description: 'Anfitrion de Game Box Andino',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 9,
        role_name: 'Invitado',
        role_description: 'Invitado de Game Box Andino',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roles', null, {});
  }
}; 