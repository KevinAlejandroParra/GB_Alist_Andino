'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla para asociar QR codes con items específicos del checklist
    await queryInterface.createTable('checklist_qr_item_associations', {
      association_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      qr_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_qr_codes',
          key: 'qr_id',
        },
        onDelete: 'CASCADE',
        comment: 'ID del código QR que desbloquea este item',
      },
      checklist_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id',
        },
        onDelete: 'CASCADE',
        comment: 'ID del item del checklist que se desbloquea con este QR',
      },
      is_unlocked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el item está desbloqueado por el QR',
      },
      unlocked_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se desbloqueó el item',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Crear índices para optimizar consultas
    await queryInterface.addIndex('checklist_qr_item_associations', ['qr_id'], {
      name: 'idx_qr_item_associations_qr_id',
    });

    await queryInterface.addIndex('checklist_qr_item_associations', ['checklist_item_id'], {
      name: 'idx_qr_item_associations_checklist_item_id',
    });

    await queryInterface.addIndex('checklist_qr_item_associations', ['qr_id', 'checklist_item_id'], {
      name: 'idx_qr_item_associations_qr_item_unique',
      unique: true,
    });

    await queryInterface.addIndex('checklist_qr_item_associations', ['is_unlocked'], {
      name: 'idx_qr_item_associations_is_unlocked',
    });

    // Eliminar campos defectuosos de checklist_qr_codes
    await queryInterface.removeColumn('checklist_qr_codes', 'parent_item_id');

    // Limpiar campos duplicados y defectuosos de checklist_qr_scans
    await queryInterface.removeColumn('checklist_qr_scans', 'item_count_at_scan');
    await queryInterface.removeColumn('checklist_qr_scans', 'parent_items_completed');
    await queryInterface.removeColumn('checklist_qr_scans', 'current_partition_validated');
    await queryInterface.removeColumn('checklist_qr_scans', 'next_partition_required');

    // Mantener solo campos esenciales en checklist_qr_scans
    // (scan_id, checklist_id, qr_id, scanned_by, scanned_at, checklist_status, createdAt, updatedAt)

    // Actualizar comentario del campo checklist_status para mayor claridad
    await queryInterface.changeColumn('checklist_qr_scans', 'checklist_status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'in_progress',
      comment: 'Estado del checklist al momento del escaneo (in_progress, completed, etc.)'
    });
  },

  async down(queryInterface, Sequelize) {
    // Restaurar campos eliminados en checklist_qr_scans
    await queryInterface.addColumn('checklist_qr_scans', 'item_count_at_scan', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número total de ítems completados (padre e hijo) hasta este escaneo',
    });

    await queryInterface.addColumn('checklist_qr_scans', 'parent_items_completed', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de ítems padre completados hasta este escaneo',
    });

    await queryInterface.addColumn('checklist_qr_scans', 'current_partition_validated', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de partición que se está validando con este escaneo',
    });

    await queryInterface.addColumn('checklist_qr_scans', 'next_partition_required', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de partición que se requerirá después de este escaneo',
    });

    // Eliminar tabla de asociaciones
    await queryInterface.dropTable('checklist_qr_item_associations');

    // Restaurar parent_item_id en checklist_qr_codes
    await queryInterface.addColumn('checklist_qr_codes', 'parent_item_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID del item padre específico asociado a este QR (para QRs de partición específica)',
      references: {
        model: 'checklist_items',
        key: 'checklist_item_id',
      },
    });
  },
};