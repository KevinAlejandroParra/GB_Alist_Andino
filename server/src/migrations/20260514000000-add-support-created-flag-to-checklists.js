'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('checklists', 'created_by_support', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el checklist fue creado por personal de soporte'
    });

    await queryInterface.addColumn('checklists', 'support_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID del usuario de soporte que creó el checklist'
    });

    await queryInterface.addColumn('checklists', 'support_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Notas del personal de soporte sobre la creación del checklist'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('checklists', 'created_by_support');
    await queryInterface.removeColumn('checklists', 'support_user_id');
    await queryInterface.removeColumn('checklists', 'support_notes');
  }
};
