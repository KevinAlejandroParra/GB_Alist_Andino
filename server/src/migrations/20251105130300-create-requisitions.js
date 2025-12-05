"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Estructura simplificada y optimizada para el sistema OF/OT
    await queryInterface.createTable("requisitions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      
      // Estado simple
      status: {
        type: Sequelize.ENUM('SOLICITADO', 'PENDIENTE', 'RECIBIDO', 'CANCELADO'),
        allowNull: false,
        defaultValue: 'SOLICITADO',
        comment: 'Estado simple de la requisición'
      },
      
      // Campos esenciales para gestión de repuestos
      part_reference: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nombre del repuesto solicitado'
      },
      quantity_requested: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Cantidad solicitada'
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL de la imagen del repuesto'
      },
      
      // Notas adicionales
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre la requisición'
      },
      
      // Relación con la orden de trabajo (OT)
      work_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID de la orden de trabajo (OT) asociada',
        references: {
          model: 'work_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Usuarios involucrados
      requested_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'ID del usuario que solicitó la requisición'
      },
      approved_by_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID del usuario que aprobó la requisición'
      },
      
      // Campos de auditoría
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false
      },
    });

    // Índices para optimizar consultas frecuentes
    await queryInterface.addIndex('requisitions', {
      name: 'idx_requisitions_status',
      fields: ['status']
    });

    // Índice para búsqueda por usuario solicitante
    await queryInterface.addIndex('requisitions', {
      name: 'idx_requisitions_requested_by',
      fields: ['requested_by_id']
    });

    // Índice para órdenes de trabajo
    await queryInterface.addIndex('requisitions', {
      name: 'idx_requisitions_work_order_id',
      fields: ['work_order_id']
    });
  },
  
  async down(queryInterface, Sequelize) {
    // Primero eliminar foreign key constraints si existen
    try {
      await queryInterface.removeConstraint('requisitions', 'requisitions_work_order_id_fkey');
    } catch (error) {
      console.log('Foreign key work_order_id no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeConstraint('requisitions', 'requisitions_requested_by_id_fkey');
    } catch (error) {
      console.log('Foreign key requested_by_id no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeConstraint('requisitions', 'requisitions_approved_by_id_fkey');
    } catch (error) {
      console.log('Foreign key approved_by_id no existe o ya fue eliminado');
    }
    
    // Luego eliminar índices con manejo de errores
    try {
      await queryInterface.removeIndex('requisitions', 'idx_requisitions_status');
    } catch (error) {
      console.log('Índice idx_requisitions_status no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeIndex('requisitions', 'idx_requisitions_requested_by');
    } catch (error) {
      console.log('Índice idx_requisitions_requested_by no existe o ya fue eliminado');
    }
    
    try {
      await queryInterface.removeIndex('requisitions', 'idx_requisitions_work_order_id');
    } catch (error) {
      console.log('Índice idx_requisitions_work_order_id no existe o ya fue eliminado');
    }
    
    // Finalmente eliminar tabla
    await queryInterface.dropTable("requisitions");
  },
};