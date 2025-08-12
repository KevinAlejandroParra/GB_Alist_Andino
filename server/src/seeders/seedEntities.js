'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('entities', [
      {
        entity_id: 1,
        entity_name: 'Gerencia General Financiera',
        entity_description: 'Entidad financiera de recreatec',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 2,
        entity_name: 'Gerencia de Talento Humano',
        entity_description: 'Entidad de gestion de recursos humanos',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 3,
        entity_name: 'Administracion de planta',
        entity_description: 'Entidad encargada de la administracion de los parques',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('entities', null, {});
  }
}; 