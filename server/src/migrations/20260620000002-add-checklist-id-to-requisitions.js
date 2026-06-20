'use strict';

async function addColumnIfExists(queryInterface, table, column, definition, opts) {
  try {
    await queryInterface.addColumn(table, column, definition, opts);
  } catch (_) {
    // columna ya existe, ignorar
  }
}

async function addIndexIfExists(queryInterface, table, indexDef) {
  try {
    await queryInterface.addIndex(table, indexDef);
  } catch (_) {
    // índice ya existe, ignorar
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await addColumnIfExists(queryInterface, 'requisitions', 'checklist_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID del checklist asociado a la requisición'
      }, { transaction });

      await addIndexIfExists(queryInterface, 'requisitions', {
        name: 'idx_requisitions_checklist_id',
        fields: ['checklist_id'],
        transaction
      });

      await queryInterface.addConstraint('requisitions', {
        name: 'fk_requisitions_checklist',
        fields: ['checklist_id'],
        type: 'foreign key',
        references: {
          table: 'checklists',
          field: 'checklist_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      try {
        await queryInterface.removeConstraint('requisitions', 'fk_requisitions_checklist', { transaction });
      } catch (_) {}
      try {
        await queryInterface.removeIndex('requisitions', 'idx_requisitions_checklist_id', { transaction });
      } catch (_) {}
      try {
        await queryInterface.removeColumn('requisitions', 'checklist_id', { transaction });
      } catch (_) {}
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
