'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('families', [
    {
        "family_id": 1,
        "family_name": "Redención",
        "family_description": "son aquellos dispostivos que proporcionan tickets al jugador segun su desempeño",
        "is_deleted": false,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "family_id": 2,
        "family_name": "Kiddies",
        "family_description": "son aquellos dispositivos que ejecutan un movimiento mecanico",
        "is_deleted": false,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "family_id": 3,
        "family_name": "Video",
        "family_description": "son aquellos videojuegos en los que el cliente interactua tipo arcade",
        "is_deleted": false,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
        {
        "family_id": 4,
        "family_name": "Apoyo",
        "family_description": "son aquellos videojuegos que generalmente son multijugador y no entregan tickets y no se clasifican en las demas familias",
        "is_deleted": false,
        "createdAt": new Date(),
        "updatedAt": new Date()
    }
]);
  },
  
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('families', null, {});
  }
}; 