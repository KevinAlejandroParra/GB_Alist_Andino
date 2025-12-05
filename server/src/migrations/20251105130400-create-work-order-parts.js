'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla intermedia para relación N:N entre work_orders e inventories
    await queryInterface.createTable('work_order_parts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      // Relación con work order
      work_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'work_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID de la orden de trabajo'
      },

      // Relación con inventario
      inventory_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'inventories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID del repuesto utilizado'
      },

      // Cantidad utilizada
      quantity_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Cantidad del repuesto utilizada en esta orden'
      },

      // Campos de auditoría
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para optimizar consultas
    await queryInterface.addIndex('work_order_parts', {
      name: 'idx_work_order_parts_work_order_id',
      fields: ['work_order_id']
    });

    await queryInterface.addIndex('work_order_parts', {
      name: 'idx_work_order_parts_inventory_id',
      fields: ['inventory_id']
    });

    // Índice único compuesto para evitar duplicados
    await queryInterface.addIndex('work_order_parts', {
      name: 'idx_work_order_parts_unique',
      fields: ['work_order_id', 'inventory_id'],
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices si existen (con manejo de errores)
    try {
      await queryInterface.removeIndex('work_order_parts', 'idx_work_order_parts_work_order_id');
    } catch (error) {
      console.log('Índice idx_work_order_parts_work_order_id no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeIndex('work_order_parts', 'idx_work_order_parts_inventory_id');
    } catch (error) {
      console.log('Índice idx_work_order_parts_inventory_id no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeIndex('work_order_parts', 'idx_work_order_parts_unique');
    } catch (error) {
      console.log('Índice idx_work_order_parts_unique no existe o ya fue eliminado');
    }

    // Eliminar tabla
    await queryInterface.dropTable('work_order_parts');
  }
};