'use strict';

const { Model } = require('sequelize');

/** Acta de Reparación (AR) — reparaciones sobre fallas sin repuestos */
module.exports = (sequelize, DataTypes) => {
  class RepairExecution extends Model {
    static associate(models) {
      RepairExecution.belongsTo(models.FailureOrder, {
        foreignKey: 'failure_order_id',
        as: 'failureOrder'
      });

      RepairExecution.belongsTo(models.User, {
        foreignKey: 'resolved_by_id',
        as: 'resolver'
      });

      RepairExecution.belongsTo(models.User, {
        foreignKey: 'cancelled_by_id',
        as: 'cancelledBy'
      });

      RepairExecution.hasOne(models.WorkOrder, {
        foreignKey: 'repair_execution_id',
        as: 'formalWorkOrder'
      });
    }
  }

  RepairExecution.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    repair_execution_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    failure_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('EN_PROCESO', 'EN_PRUEBAS', 'RESUELTA', 'CANCELADO', 'PAUSADO'),
      allowNull: false,
      defaultValue: 'EN_PROCESO'
    },
    activity_performed: DataTypes.TEXT,
    evidence_url: DataTypes.STRING,
    evidence_public_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID público de la evidencia en Cloudinary'
    },
    closure_signature: DataTypes.TEXT('long'),
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,
    resolved_by_id: DataTypes.INTEGER,
    linked_failure_ids: DataTypes.TEXT,
    cancellation_reason: DataTypes.TEXT,
    cancelled_at: DataTypes.DATE,
    cancelled_by_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'RepairExecution',
    tableName: 'repair_executions',
    indexes: [
      { fields: ['failure_order_id'] },
      { fields: ['status'] }
    ]
  });

  return RepairExecution;
};
