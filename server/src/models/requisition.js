'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Requisition extends Model {
    static associate(models) {
      // Relación con el usuario que solicitó
      Requisition.belongsTo(models.User, {
        foreignKey: 'requested_by_id',
        as: 'requester'
      });

      // Relación con el usuario que aprobó
      Requisition.belongsTo(models.User, {
        foreignKey: 'approved_by_id',
        as: 'approver'
      });

      // Relación con la orden de trabajo (OT)
      Requisition.belongsTo(models.WorkOrder, {
        foreignKey: 'work_order_id',
        as: 'workOrder'
      });
    }
  }

  Requisition.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    
    // Estado simple
    status: {
      type: DataTypes.ENUM('SOLICITADO', 'PENDIENTE', 'RECIBIDO', 'CANCELADO'),
      allowNull: false,
      defaultValue: 'SOLICITADO',
      comment: 'Estado simple de la requisición'
    },
    
    // Información de la solicitud
    part_reference: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del repuesto solicitado'
    },
    quantity_requested: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Cantidad solicitada'
    },
    
    // Imagen del repuesto
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de la imagen del repuesto'
    },
    
    // Notas adicionales
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la requisición'
    },
    
    // Relación con la orden de trabajo (OT)
    work_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la orden de trabajo (OT) asociada'
    },
    
    // Usuarios involucrados
    requested_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del usuario que solicitó la requisición'
    },
    approved_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del usuario que aprobó la requisición'
    }
  }, {
    sequelize,
    modelName: 'Requisition',
    tableName: 'requisitions',
    comment: 'Tabla para requisiciones simplificadas - una por repuesto, sin RequisitionItem',
    indexes: [
      { fields: ['status'] },
      { fields: ['requested_by_id'] },
      { fields: ['approved_by_id'] },
      { fields: ['work_order_id'] },
      { fields: ['status', 'createdAt'] }
    ]
  });

  return Requisition;
};
