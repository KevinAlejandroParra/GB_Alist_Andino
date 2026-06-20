'use strict';

async function removeColumnIfExists(queryInterface, table, column, opts) {
  try {
    await queryInterface.removeColumn(table, column, opts);
  } catch (_) {
    // columna ya no existe, ignorar
  }
}

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await removeColumnIfExists(queryInterface, 'users', 'user_image_public_id', { transaction });
      await removeColumnIfExists(queryInterface, 'failure_orders', 'evidence_public_id', { transaction });
      await removeColumnIfExists(queryInterface, 'repair_executions', 'evidence_public_id', { transaction });
      await removeColumnIfExists(queryInterface, 'requisitions', 'image_public_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('users', 'user_image_public_id', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      await queryInterface.addColumn('failure_orders', 'evidence_public_id', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      await queryInterface.addColumn('repair_executions', 'evidence_public_id', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      await queryInterface.addColumn('requisitions', 'image_public_id', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
