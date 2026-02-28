'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Primero limpiar la tabla para evitar duplicados
    await queryInterface.bulkDelete('roles', null, {});
    
    // Insertar los nuevos roles
    await queryInterface.bulkInsert('roles', [
      {
        role_id: 1,
        role_name: 'Administrador',
        role_description: 'Administradores de los parques, pueden ver todo y interactuar con los datos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 2,
        role_name: 'Soporte',
        role_description: 'Asistente de TI, acceso total y asigna permisos, como asistente de los admins',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 3,
        role_name: 'Tecnico',
        role_description: 'Técnicos de mantenimiento',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        role_id: 4,
        role_name: 'Anfitrion',
        role_description: 'Que manejan el área operativa del parque',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
}; 