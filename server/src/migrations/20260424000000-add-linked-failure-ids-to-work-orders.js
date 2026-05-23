'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('work_orders', 'linked_failure_ids', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array de IDs de FailureOrders enlazadas que comparten esta información de OT'
    });

    console.log('✅ Campo linked_failure_ids agregado a work_orders');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('work_orders', 'linked_failure_ids');
    console.log('✅ Campo linked_failure_ids eliminado de work_orders');
  }
};
