'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_qr_scans', {
      scan_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      checklist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklists',
          key: 'checklist_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      qr_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_qr_codes',
          key: 'qr_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scanned_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scanned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      item_count_at_scan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número total de ítems completados (padre e hijo) hasta este escaneo - mantenido por compatibilidad'
      },
      parent_items_completed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de ítems padre completados hasta este escaneo'
      },
      current_partition_validated: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Número de partición que se está validando con este escaneo'
      },
      next_partition_required: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Número de partición que se requerirá después de este escaneo'
      },
      checklist_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'in_progress',
        comment: 'Estado del checklist al momento del escaneo',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Índices para optimizar consultas frecuentes
    await queryInterface.addIndex('checklist_qr_scans', ['checklist_id'], {
      name: 'idx_checklist_qr_scans_checklist_id'
    });

    await queryInterface.addIndex('checklist_qr_scans', ['qr_id'], {
      name: 'idx_checklist_qr_scans_qr_id'
    });

    await queryInterface.addIndex('checklist_qr_scans', ['scanned_by'], {
      name: 'idx_checklist_qr_scans_scanned_by'
    });

    await queryInterface.addIndex('checklist_qr_scans', ['scanned_at'], {
      name: 'idx_checklist_qr_scans_scanned_at'
    });

    // Índice compuesto para consultas por checklist y fecha
    await queryInterface.addIndex('checklist_qr_scans', ['checklist_id', 'scanned_at'], {
      name: 'idx_checklist_qr_scans_checklist_scanned_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('checklist_qr_scans');
  }
};