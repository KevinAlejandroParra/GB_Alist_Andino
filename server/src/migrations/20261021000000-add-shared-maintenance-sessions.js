'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_machine_configs', 'shared_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('maintenance_machine_configs', 'shared_instructions', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('maintenance_session_evidences', 'uploaded_by_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.createTable('maintenance_session_participants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'maintenance_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      technician_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });
    await queryInterface.addIndex('maintenance_session_participants', ['session_id', 'technician_id'], {
      unique: true,
      name: 'uq_maintenance_session_participant'
    });

    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO maintenance_session_participants
        (session_id, technician_id, joined_at, createdAt, updatedAt)
      SELECT id, technician_id, COALESCE(started_at, createdAt), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM maintenance_sessions
      WHERE technician_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('maintenance_session_participants');
    await queryInterface.removeColumn('maintenance_session_evidences', 'uploaded_by_id');
    await queryInterface.removeColumn('maintenance_machine_configs', 'shared_instructions');
    await queryInterface.removeColumn('maintenance_machine_configs', 'shared_enabled');
  }
};
