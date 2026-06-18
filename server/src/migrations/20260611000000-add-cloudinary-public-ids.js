'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Agregar 'user_image_public_id' a la tabla 'users'
      await queryInterface.addColumn('users', 'user_image_public_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID público de la imagen en Cloudinary'
      }, { transaction });

      // 2. Agregar 'evidence_public_id' a la tabla 'failure_orders'
      await queryInterface.addColumn('failure_orders', 'evidence_public_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID público de la evidencia en Cloudinary'
      }, { transaction });

      // 3. Agregar 'evidence_public_id' a la tabla 'repair_executions'
      await queryInterface.addColumn('repair_executions', 'evidence_public_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID público de la evidencia en Cloudinary'
      }, { transaction });

      // 4. Agregar 'image_public_id' a la tabla 'requisitions'
      await queryInterface.addColumn('requisitions', 'image_public_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID público de la imagen en Cloudinary'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('users', 'user_image_public_id', { transaction });
      await queryInterface.removeColumn('failure_orders', 'evidence_public_id', { transaction });
      await queryInterface.removeColumn('repair_executions', 'evidence_public_id', { transaction });
      await queryInterface.removeColumn('requisitions', 'image_public_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
