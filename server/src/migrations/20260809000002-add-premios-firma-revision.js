'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('premios_analisis', 'revisado_firma', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: 'Firma (dataURL) del administrador que aprueba la semana',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('premios_analisis', 'revisado_firma');
  }
};
