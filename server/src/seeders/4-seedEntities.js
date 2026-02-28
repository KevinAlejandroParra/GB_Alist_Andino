'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('entities', [
      {
        entity_id: 1,
        entity_name: 'Gerencia General ',
        entity_description: 'Entidad general administrativa de recreatec',
        premise_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
            {
        entity_id: 2,
        entity_name: 'Soporte Alist GBX',
        entity_description: 'Entidad encargada del mantenimiento y soporte tecnico de la plataforma Alist GBX',
        premise_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 3,
        entity_name: 'Mantenimiento Andino',
        entity_description: 'Entidad encargada del mantenimiento de dispositivos y atracciones del parque del centro comercial andino',
        premise_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 6,
        entity_name: 'Anfitriones Andino',
        entity_description: 'Entidad encargada de logistica y recreacion del parque del centro comercial andino',
        premise_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('entities', null, {});
  }
}; 