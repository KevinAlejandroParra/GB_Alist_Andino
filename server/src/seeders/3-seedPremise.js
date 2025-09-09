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
        premise_name: 'Centro Comercial Andino Bogotá',
        premise_address: 'recreatec',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
       premise_id: 3,
        premise_name: 'Girardot',
        premise_address: ' Carrera 7A # 33 - 77 LOCAL 253-254-255',
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
       premise_id: 4,
        premise_name: 'Pereira',
        premise_address: 'Victoria CC',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        premise_id: 5,
         premise_name: 'Ibague',
         premise_address: 'CC Multicentro',
         createdAt: new Date(),
         updatedAt: new Date()
       },
       {
        premise_id: 6,
         premise_name: 'Yopal',
         premise_address: 'Victoria CC',
         createdAt: new Date(),
         updatedAt: new Date()
       },
       {
        premise_id: 7,
         premise_name: 'Armenia',
         premise_address: 'Centro Comercial Unicentro, Av. Bolívar ## 02 local 302 303',
         createdAt: new Date(),
         updatedAt: new Date()
       }

    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('premises', null, {});
  }
}; 
