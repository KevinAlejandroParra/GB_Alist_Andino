'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('checklists', 'week_identifier', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'Identificador de semana en formato YYYY-Wxx (ej: 2026-W18) para checklists semanales'
    });

    // Crear índice para mejorar búsquedas de checklists semanales
    await queryInterface.addIndex('checklists', ['week_identifier', 'checklist_type_id'], {
      name: 'idx_checklists_week_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('checklists', 'idx_checklists_week_type');
    await queryInterface.removeColumn('checklists', 'week_identifier');
  }
};
