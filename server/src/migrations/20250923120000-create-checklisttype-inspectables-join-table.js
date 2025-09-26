'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ChecklistTypeInspectables', {
      checklist_type_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'checklist_types',
          key: 'checklist_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ins_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'inspectables',
          key: 'ins_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ChecklistTypeInspectables');
  }
};