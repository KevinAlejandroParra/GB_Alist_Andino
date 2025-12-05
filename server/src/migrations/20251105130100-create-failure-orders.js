'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('failure_orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      failure_order_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Identificador único de la orden de falla'
      },
      
      // Información básica de la falla
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Descripción detallada de la falla reportada'
      },
      evidence_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL de la evidencia (imagen) de la falla'
      },
      
      is_recurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la falla es recurrente'
      },
      recurrence_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Número de veces que se ha reportado esta falla recurrente'
      },
      closure_signature: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'Firma digital para cierre de la falla'
      },
      
      // Asignación y categorización
      assigned_to: {
        type: Sequelize.ENUM('TECNICA', 'OPERATIVA'),
        allowNull: true,
        defaultValue: null,
        comment: 'Área asignada para atender la falla'
      },
      type_maintenance: {
        type: Sequelize.ENUM('TECNICA', 'LOCATIVA', 'OPERATIVA', 'SST'),
        allowNull: false,
        defaultValue: 'TECNICA',
        comment: 'Tipo de mantenimiento: técnica, locativa, operativa o SST'
      },
      severity: {
        type: Sequelize.ENUM('LEVE', 'MODERADA', 'CRITICA'),
        allowNull: false,
        defaultValue: 'LEVE',
        comment: 'Nivel de severidad/urgencia de la falla'
      },
      
      // Relaciones
      reported_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'ID del usuario que reportó la falla'
      },
      affected_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'inspectables',
          key: 'ins_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID del inspectable (atracción/dispositivo/área) que sufrió el daño. NULL si no aplica.'
      },
      checklist_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID del ítem del checklist donde se reportó la falla. NULL si fue reporte independiente.'
      },
      
      // Campos de auditoría
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Fecha de reporte de la falla'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para optimizar consultas
    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_reported_by',
      fields: ['reported_by_id']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_assigned_to',
      fields: ['assigned_to']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_severity',
      fields: ['severity']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_type_maintenance',
      fields: ['type_maintenance']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_affected_id',
      fields: ['affected_id']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_checklist_item_id',
      fields: ['checklist_item_id']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_created_at',
      fields: ['createdAt']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_is_recurring',
      fields: ['is_recurring']
    });

    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_recurring_count',
      fields: ['recurrence_count']
    });

   

    // Índices compuestos para consultas frecuentes
    await queryInterface.addIndex('failure_orders', {
      name: 'idx_failure_orders_assigned_severity',
      fields: ['assigned_to', 'severity']
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      // Eliminar foreign key constraints primero si existen
      await queryInterface.removeConstraint('failure_orders', 'failure_orders_ibfk_1');
    } catch (error) {
      console.log('Foreign key constraint already removed or not found');
    }
    
    try {
      await queryInterface.removeConstraint('failure_orders', 'failure_orders_ibfk_2');
    } catch (error) {
      console.log('Foreign key constraint already removed or not found');
    }
    
    try {
      await queryInterface.removeConstraint('failure_orders', 'failure_orders_ibfk_3');
    } catch (error) {
      console.log('Foreign key constraint already removed or not found');
    }

    // Eliminar índices con manejo de errores
    const indices = [
      'idx_failure_orders_reported_by',
      'idx_failure_orders_assigned_to',
      'idx_failure_orders_severity',
      'idx_failure_orders_type_maintenance',
      'idx_failure_orders_affected_id',
      'idx_failure_orders_checklist_item_id',
      'idx_failure_orders_created_at',
      'idx_failure_orders_is_recurring',
      'idx_failure_orders_recurring_count',
      'idx_failure_orders_assigned_severity',
      'idx_failure_orders_type_severity',
      'idx_failure_orders_recurring_status'
    ];
    
    for (const indexName of indices) {
      try {
        await queryInterface.removeIndex('failure_orders', indexName);
      } catch (error) {
        console.log(`Índice ${indexName} no existe o ya fue eliminado`);
      }
    }
    
    // Eliminar la tabla failure_orders al final
    await queryInterface.dropTable('failure_orders');
  }
};