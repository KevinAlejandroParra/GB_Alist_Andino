'use strict';

/** Campos de cancelación en work_orders (legacy sync durante transición) */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('work_orders');

    if (!table.cancellation_reason) {
      await queryInterface.addColumn('work_orders', 'cancellation_reason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    if (!table.cancelled_at) {
      await queryInterface.addColumn('work_orders', 'cancelled_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!table.cancelled_by_id) {
      await queryInterface.addColumn('work_orders', 'cancelled_by_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('work_orders', 'cancelled_by_id').catch(() => {});
    await queryInterface.removeColumn('work_orders', 'cancelled_at').catch(() => {});
    await queryInterface.removeColumn('work_orders', 'cancellation_reason').catch(() => {});
  }
};
