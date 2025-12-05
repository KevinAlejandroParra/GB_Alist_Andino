'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkOrder extends Model {
    static associate(models) {
      // Relación con la orden de falla (1:1)
      WorkOrder.belongsTo(models.FailureOrder, {
        foreignKey: 'failure_order_id',
        as: 'failureOrder'
      });

      // Relación con el usuario que resolvió
      WorkOrder.belongsTo(models.User, {
        foreignKey: 'resolved_by_id',
        as: 'resolver'
      });

      // Relación con repuestos utilizados (N:N a través de tabla intermedia)
      WorkOrder.belongsToMany(models.Inventory, {
        through: models.WorkOrderPart,
        foreignKey: 'work_order_id',
        otherKey: 'inventory_id',
        as: 'workOrderParts'
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
      unique: true,
      comment: 'Identificador único de la orden de trabajo'
    },

    // Estado del proceso de reparación
    status: {
      type: DataTypes.ENUM('EN_PROCESO', 'EN_PRUEBAS', 'RESUELTA', 'CANCELADO', 'PAUSADO'),
      allowNull: false,
      defaultValue: 'EN_PROCESO',
      comment: 'Estado actual del trabajo de reparación'
    },

    // Información del trabajo realizado
    requiere_replacement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si se usaron repuestos en la reparación'
    },
    activity_performed: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del trabajo realizado'
    },
    evidence_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de la evidencia (imagen) de la solución'
    },
    closure_signature: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'Firma digital para cierre de la orden de trabajo'
    },

    // Tiempos de trabajo (registrados manualmente)
    start_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Momento en que se inició el trabajo (marcado manualmente)'
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Momento en que finalizó el trabajo (marcado manualmente)'
    },

    // Relaciones principales
    failure_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'ID de la orden de falla asociada (relación 1:1)'
    },
    resolved_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del técnico/usuario que resolvió la falla'
    },
  }, {
    sequelize,
    modelName: 'WorkOrder',
    tableName: 'work_orders',
    comment: 'Tabla para órdenes de trabajo - proceso de reparación',
    indexes: [
      { fields: ['status'] },
      { fields: ['failure_order_id'] },
      { fields: ['resolved_by_id'] },
      { fields: ['requiere_replacement'] },
      { fields: ['closure_signature'] },
      { fields: ['status', 'resolved_by_id'] }
    ]
  });

  return WorkOrder;
};
