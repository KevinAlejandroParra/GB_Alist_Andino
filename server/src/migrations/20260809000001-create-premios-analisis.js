'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('premios_analisis', {
      analisis_id: {
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
      week_identifier: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Identificador de la semana operativa (ej: "2026-W32")',
      },
      fecha: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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
        comment: 'Bloque del checklist al que pertenece el análisis (ej: "TOY BOX - SECCION 1")',
      },
      item_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      jugadas_lectura: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Lectura cruda del contador de jugadas',
      },
      premios_lectura: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Lectura cruda del contador de premios',
      },
      jugadas_anterior: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_anterior: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      jugadas_desde_ultima: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_desde_ultima: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      ratio_usado: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Ratio de configuración usado en el cálculo (1 premio cada N jugadas)',
      },
      premios_esperados: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      eficiencia_pct: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      contador_reseteado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      estado: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'ok | baja_entrega | sobre_entrega | sin_movimiento | contador_reseteado | sin_config | primer_registro',
      },
      config_section: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Texto de configuración confirmado por el técnico en el checklist',
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
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
      revisado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      revisado_en: {
        type: Sequelize.DATEONLY,
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
    });

    await queryInterface.addIndex('premios_analisis', ['checklist_id', 'section_key'], {
      name: 'uq_premios_analisis_checklist_section',
      unique: true,
    });

    await queryInterface.addIndex('premios_analisis', ['checklist_type_id', 'week_identifier'], {
      name: 'idx_premios_analisis_type_week',
    });

    await queryInterface.addIndex('premios_analisis', ['inspectable_id'], {
      name: 'idx_premios_analisis_inspectable',
    });

    await queryInterface.addIndex('premios_analisis', ['section_key'], {
      name: 'idx_premios_analisis_section',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('premios_analisis');
  }
};
