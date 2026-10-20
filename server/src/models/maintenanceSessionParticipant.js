'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MaintenanceSessionParticipant extends Model {
    static associate(models) {
      MaintenanceSessionParticipant.belongsTo(models.MaintenanceSession, {
        foreignKey: 'session_id',
        as: 'session'
      });
      MaintenanceSessionParticipant.belongsTo(models.User, {
        foreignKey: 'technician_id',
        as: 'technician'
      });
    }
  }

  MaintenanceSessionParticipant.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_id: { type: DataTypes.INTEGER, allowNull: false },
    technician_id: { type: DataTypes.INTEGER, allowNull: false },
    joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    sequelize,
    modelName: 'MaintenanceSessionParticipant',
    tableName: 'maintenance_session_participants',
    timestamps: true,
    indexes: [{ unique: true, fields: ['session_id', 'technician_id'] }]
  });

  return MaintenanceSessionParticipant;
};
