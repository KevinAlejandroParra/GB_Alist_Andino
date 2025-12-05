'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Eliminar tabla si existe (para manejar migraciones parciales)
    try {
      await queryInterface.dropTable('work_orders');
    } catch (error) {
      // Tabla no existe, continuar
    }
    
    await queryInterface.createTable('work_orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      work_order_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Identificador único de la orden de trabajo'
      },

      // Estado del proceso de reparación
      status: {
        type: Sequelize.ENUM('EN_PROCESO', 'EN_PRUEBAS', 'RESUELTA', 'CANCELADO', 'PAUSADO'),
        allowNull: false,
        defaultValue: 'EN_PROCESO',
        comment: 'Estado actual del trabajo de reparación'
      },

      // Información del trabajo realizado
      requiere_replacement: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si se usaron repuestos en la reparación'
      },
      activity_performed: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción detallada del trabajo realizado'
      },
      evidence_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL de la evidencia (imagen) de la solución'
      },
      closure_signature: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'Firma digital para cierre de la orden de trabajo'
      },

      // Tiempos de trabajo (registrados manualmente)
      start_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Momento en que se inició el trabajo (marcado manualmente)'
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Momento en que finalizó el trabajo (marcado manualmente)'
      },

      // Relaciones principales
      failure_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'failure_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID de la orden de falla asociada (relación 1:1)'
      },
      resolved_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID del técnico/usuario que resolvió la falla'
      },

      // Campos de auditoría
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Fecha de creación de la orden de trabajo'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para optimizar consultas
    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_status',
      fields: ['status']
    });

    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_failure_order_id',
      fields: ['failure_order_id']
    });

    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_resolved_by_id',
      fields: ['resolved_by_id']
    });

    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_requiere_replacement',
      fields: ['requiere_replacement']
    });

    // Índice compuesto para consultas frecuentes
    await queryInterface.addIndex('work_orders', {
      name: 'idx_work_orders_status_resolved_by',
      fields: ['status', 'resolved_by_id']
    });

  },

  async down(queryInterface, Sequelize) {
    try {
      // Eliminar foreign key constraints primero
      await queryInterface.removeConstraint('work_orders', 'work_orders_ibfk_1');
    } catch (error) {
      console.log('Foreign key constraint already removed or not found');
    }
    
    try {
      await queryInterface.removeConstraint('work_orders', 'work_orders_ibfk_2');
    } catch (error) {
      console.log('Foreign key constraint already removed or not found');
    }

    // Eliminar índices con manejo de errores
    const indices = [
      'idx_work_orders_status',
      'idx_work_orders_failure_order_id',
      'idx_work_orders_resolved_by_id',
      'idx_work_orders_requiere_replacement',
      'idx_work_orders_status_resolved_by'
    ];

    for (const indexName of indices) {
      try {
        await queryInterface.removeIndex('work_orders', indexName);
      } catch (error) {
        console.log(`Índice ${indexName} no existe o ya fue eliminado`);
      }
    }

    // Eliminar tabla
    await queryInterface.dropTable('work_orders');
  }
};