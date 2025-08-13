'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('premises', [
      {
       premise_id: 1,
        premise_name: 'Sede Principal Bogotá',
        premise_address: 'Entidad financiera de recreatec oficina 404',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
       premise_id: 2,
        premise_name: 'Game box andino',
        premise_address: 'recreatec',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
       premise_id: 3,
        premise_name: 'Game box andino',
        premise_address: 'recreatec',
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
       premise_id: 4,
        premise_name: 'Game box andino',
        premise_address: 'recreatec',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('premises', null, {});
  }
}; 
