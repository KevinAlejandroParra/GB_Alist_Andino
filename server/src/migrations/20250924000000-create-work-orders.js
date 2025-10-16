
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WorkOrders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      work_order_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'),
        allowNull: false,
        defaultValue: 'PENDIENTE'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolution_details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      recurrence_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reported_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        }
      },
      inspectable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'inspectables',
          key: 'ins_id'
        }
      },
      initial_response_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true, // Una respuesta solo puede generar una OT
        references: {
          model: 'checklist_responses',
          key: 'response_id'
        }
      },
      closing_response_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true, // Una respuesta solo puede cerrar una OT
        references: {
          model: 'checklist_responses',
          key: 'response_id'
        }
      },
      checklist_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('WorkOrders');
  }
};
