'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('premios_config', {
      config_id: {
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
      inspectable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'inspectables',
          key: 'ins_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      section_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nombre del bloque en el checklist (ej: "TOY BOX - SECCION 1", "WORK ZONE")',
      },
      ratio_premios: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'La máquina debe entregar 1 premio cada N jugadas',
      },
      precio_juego: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      tipo_premio: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('premios_config', ['checklist_type_id', 'section_key'], {
      name: 'uq_premios_config_type_section',
      unique: true,
    });

    await queryInterface.addIndex('premios_config', ['inspectable_id'], {
      name: 'idx_premios_config_inspectable',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('premios_config');
  }
};
