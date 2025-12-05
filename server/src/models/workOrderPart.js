'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkOrderPart extends Model {
    static associate(models) {
      // Relación con WorkOrder
      WorkOrderPart.belongsTo(models.WorkOrder, {
        foreignKey: 'work_order_id',
        as: 'workOrder'
      });

      // Relación con Inventory
      WorkOrderPart.belongsTo(models.Inventory, {
        foreignKey: 'inventory_id',
        as: 'inventory'
      });
       
      // Agregar asociación inversa con alias diferente para evitar conflictos
      models.WorkOrder.hasMany(models.WorkOrderPart, {
        foreignKey: 'work_order_id',
        as: 'parts'
      });
    }
  }

  WorkOrderPart.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    work_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la orden de trabajo'
    },
    inventory_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del repuesto del inventario'
    },
    quantity_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Cantidad de repuesto utilizado'
    }
  }, {
    sequelize,
    modelName: 'WorkOrderPart',
    tableName: 'work_order_parts',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return WorkOrderPart;
};