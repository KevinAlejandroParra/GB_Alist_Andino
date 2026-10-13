"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_settings", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      premise_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'premises', key: 'premise_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },

      strategy: { type: Sequelize.ENUM('LAST_SCHEDULED', 'FAILURE_COUNT', 'HYBRID'), defaultValue: 'HYBRID' },
      max_scheduled_per_day: { type: Sequelize.INTEGER, defaultValue: 5 },
      working_days: { type: Sequelize.STRING, defaultValue: '1,2,3,4,5' }, // Monday to Friday
      hybrid_weights: { type: Sequelize.JSON, defaultValue: { failure_count: 0.6, days_since_last: 0.4 } },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_machine_configs", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      ins_id: { 
        type: Sequelize.INTEGER, 
        unique: true, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      weekly_enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      weekly_weekday: { type: Sequelize.INTEGER, allowNull: true }, // 0-6
      scheduled_exempt: { type: Sequelize.BOOLEAN, defaultValue: false },
      last_scheduled_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_schedule_plans", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      year_month: { type: Sequelize.STRING, allowNull: false }, // YYYY-MM
      status: { type: Sequelize.ENUM('DRAFT', 'PUBLISHED'), defaultValue: 'DRAFT' },
      generated_at: { type: Sequelize.DATE, allowNull: true },
      published_by: { 
        type: Sequelize.INTEGER, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_schedule_slots", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      plan_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'maintenance_schedule_plans', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      scheduled_date: { type: Sequelize.DATEONLY, allowNull: false },
      ins_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      slot_type: { type: Sequelize.ENUM('WEEKLY', 'SCHEDULED'), allowNull: false },
      sort_priority: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_manual_override: { type: Sequelize.BOOLEAN, defaultValue: false },
      assigned_user_id: { 
        type: Sequelize.INTEGER, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_sessions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      slot_id: { 
        type: Sequelize.INTEGER, 
        allowNull: true, 
        references: { model: 'maintenance_schedule_slots', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      ins_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      type: { type: Sequelize.ENUM('WEEKLY', 'SCHEDULED'), allowNull: false },
      status: { type: Sequelize.ENUM('DRAFT', 'COMPLETED'), defaultValue: 'DRAFT' },
      technician_id: { 
        type: Sequelize.INTEGER, 
        allowNull: true, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_session_evidences", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      session_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'maintenance_sessions', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      phase: { type: Sequelize.ENUM('INICIO', 'PROCESO_1', 'PROCESO_2', 'FIN'), allowNull: false },
      file_url: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_session_parts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      session_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'maintenance_sessions', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      inventory_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'inventories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_day_failure_closures", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      closure_date: { type: Sequelize.DATEONLY, allowNull: false },
      technician_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      failure_order_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'failure_orders', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      affected_ins_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_machine_qr_codes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      ins_id: { 
        type: Sequelize.INTEGER, 
        unique: true, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      qr_code: { type: Sequelize.STRING, unique: true, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { 
        type: Sequelize.INTEGER, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    await queryInterface.createTable("maintenance_qr_scans", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      qr_code: { type: Sequelize.STRING, allowNull: false },
      ins_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'inspectables', key: 'ins_id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' 
      },
      technician_id: { 
        type: Sequelize.INTEGER, 
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL' 
      },
      scanned_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), allowNull: false }
    });

    // Add nullable maintenance_session_id to requisitions
    await queryInterface.addColumn("requisitions", "maintenance_session_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'maintenance_sessions', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL'
    });

    await queryInterface.addIndex("requisitions", {
      name: "idx_requisitions_maintenance_session",
      fields: ["maintenance_session_id"]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("requisitions", "idx_requisitions_maintenance_session");
    await queryInterface.removeColumn("requisitions", "maintenance_session_id");
    await queryInterface.dropTable("maintenance_qr_scans");
    await queryInterface.dropTable("maintenance_machine_qr_codes");
    await queryInterface.dropTable("maintenance_day_failure_closures");
    await queryInterface.dropTable("maintenance_session_parts");
    await queryInterface.dropTable("maintenance_session_evidences");
    await queryInterface.dropTable("maintenance_sessions");
    await queryInterface.dropTable("maintenance_schedule_slots");
    await queryInterface.dropTable("maintenance_schedule_plans");
    await queryInterface.dropTable("maintenance_machine_configs");
    await queryInterface.dropTable("maintenance_settings");
  }
};
