'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('entities', [
      {
        entity_id: 1,
        entity_name: 'Gerencia General Financiera',
        entity_description: 'Entidad financiera de recreatec',
        premise_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 2,
        entity_name: 'Gerencia de Talento Humano',
        entity_description: 'Entidad de gestion de recursos humanos',
        premise_id: 1,

        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 3,
        entity_name: 'COPAS',
        entity_description: 'Comite Paritario de Salud y Seguridad en el trabajo',
        premise_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 4,
        entity_name: 'Administracion de planta',
        entity_description: 'Entidad encargada de la administracion del parque del centro comercial andino',
        premise_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        entity_id: 5,
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