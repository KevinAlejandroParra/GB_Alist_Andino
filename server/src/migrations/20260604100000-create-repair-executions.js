'use strict';

/** Actas de Reparación (AR): ejecución de reparación sin documento OT formal */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('repair_executions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      repair_execution_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Identificador único AR-YYYY-XXXXXX'
      },
      failure_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'failure_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Falla asociada (1:1)'
      },
      status: {
        type: Sequelize.ENUM('EN_PROCESO', 'EN_PRUEBAS', 'RESUELTA', 'CANCELADO', 'PAUSADO'),
        allowNull: false,
        defaultValue: 'EN_PROCESO'
      },
      activity_performed: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      evidence_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      closure_signature: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolved_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      linked_failure_ids: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array de failure_order ids enlazados'
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelled_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('repair_executions', {
      name: 'idx_repair_executions_failure_order_id',
      fields: ['failure_order_id']
    });
    await queryInterface.addIndex('repair_executions', {
      name: 'idx_repair_executions_status',
      fields: ['status']
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('repair_executions');
  }
};
