
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkOrder extends Model {
    static associate(models) {
      // Una orden de trabajo es reportada por un usuario.
      WorkOrder.belongsTo(models.User, { 
        foreignKey: 'reported_by_id', 
        as: 'reporter' 
      });

      // Una orden de trabajo pertenece a un ítem inspeccionable específico.
      WorkOrder.belongsTo(models.Inspectable, {
        foreignKey: 'inspectable_id',
        as: 'inspectable'
      });

      // Una orden de trabajo está ligada a un ítem específico del checklist.
      WorkOrder.belongsTo(models.ChecklistItem, {
        foreignKey: 'checklist_item_id',
        as: 'checklistItem'
      });

      // Una orden de trabajo es generada por una única respuesta de checklist.
      WorkOrder.belongsTo(models.ChecklistResponse, { 
        foreignKey: 'initial_response_id', 
        as: 'initialResponse' 
      });

      // Una orden de trabajo puede ser cerrada por una respuesta de checklist.
      WorkOrder.belongsTo(models.ChecklistResponse, { 
        foreignKey: 'closing_response_id', 
        as: 'closingResponse' 
      });

      // Una orden de trabajo puede tener muchas requisiciones de partes.
      WorkOrder.hasMany(models.Requisition, {
        foreignKey: 'work_order_id',
        as: 'requisitions'
      });

      // Una orden de trabajo pertenece a una requisición (si aplica)
      WorkOrder.belongsTo(models.Requisition, {
        foreignKey: 'work_order_id',
        as: 'requisition'
      });
    }
  }

  WorkOrder.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    work_order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'),
      allowNull: false,
      defaultValue: 'PENDIENTE'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolution_details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recurrence_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    reported_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    inspectable_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    initial_response_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    closing_response_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    checklist_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'WorkOrder',
    tableName: 'WorkOrders',
  });

  return WorkOrder;
};
