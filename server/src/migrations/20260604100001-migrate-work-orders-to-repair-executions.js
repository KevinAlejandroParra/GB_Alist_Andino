'use strict';

/** Copia datos de work_orders → repair_executions y vincula OT formal */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [workOrders] = await queryInterface.sequelize.query(
      'SELECT * FROM work_orders ORDER BY id ASC'
    );

    if (!workOrders.length) {
      return;
    }

    await queryInterface.addColumn('work_orders', 'repair_execution_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'repair_executions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'AR vinculada — toda OT formal tiene su acta'
    });

    for (const wo of workOrders) {
      const arId = (wo.work_order_id || `OT-${wo.id}`).replace(/^OT-/, 'AR-');

      await queryInterface.bulkInsert('repair_executions', [{
        repair_execution_id: arId,
        failure_order_id: wo.failure_order_id,
        status: wo.status,
        activity_performed: wo.activity_performed,
        evidence_url: wo.evidence_url,
        closure_signature: wo.closure_signature,
        start_time: wo.start_time,
        end_time: wo.end_time,
        resolved_by_id: wo.resolved_by_id,
        linked_failure_ids: wo.linked_failure_ids,
        cancellation_reason: wo.cancellation_reason,
        cancelled_at: wo.cancelled_at,
        cancelled_by_id: wo.cancelled_by_id,
        createdAt: wo.createdAt,
        updatedAt: wo.updatedAt
      }]);

      const [[inserted]] = await queryInterface.sequelize.query(
        'SELECT id FROM repair_executions WHERE failure_order_id = ? ORDER BY id DESC LIMIT 1',
        { replacements: [wo.failure_order_id] }
      );

      if (inserted?.id) {
        await queryInterface.sequelize.query(
          'UPDATE work_orders SET repair_execution_id = ? WHERE id = ?',
          { replacements: [inserted.id, wo.id] }
        );
      }
    }

    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_repair_execution_id',
      fields: ['repair_execution_id']
    });
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('work_orders', 'idx_work_orders_repair_execution_id');
    } catch (_) { /* noop */ }
    await queryInterface.removeColumn('work_orders', 'repair_execution_id');
    await queryInterface.bulkDelete('repair_executions', null, {});
  }
};
