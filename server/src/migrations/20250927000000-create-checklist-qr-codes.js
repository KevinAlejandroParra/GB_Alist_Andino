'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_qr_codes', {
      qr_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      checklist_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_types',
          key: 'checklist_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      qr_code: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      attraction_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
      group_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Número del grupo de items padre que valida este QR'
      },
      parent_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID del item padre específico asociado a este QR (para QRs de partición específica)',
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id'
        }
      }
    });

    // Índices adicionales
    await queryInterface.addIndex('checklist_qr_codes', ['qr_code'], {
      unique: true,
      name: 'idx_checklist_qr_codes_qr_code_unique'
    });

    await queryInterface.addIndex('checklist_qr_codes', ['checklist_type_id'], {
      name: 'idx_checklist_qr_codes_checklist_type_id'
    });

    await queryInterface.addIndex('checklist_qr_codes', ['is_active'], {
      name: 'idx_checklist_qr_codes_is_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('checklist_qr_codes');
  }
};