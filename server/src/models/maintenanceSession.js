"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceSession extends Model {
        static associate(models) {
            MaintenanceSession.belongsTo(models.MaintenanceScheduleSlot, {
                foreignKey: 'slot_id',
                as: 'slot'
            });
            MaintenanceSession.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'inspectable'
            });
            MaintenanceSession.belongsTo(models.User, {
                foreignKey: 'technician_id',
                as: 'technician'
            });
            MaintenanceSession.hasMany(models.MaintenanceSessionEvidence, {
                foreignKey: 'session_id',
                as: 'evidences'
            });
            MaintenanceSession.hasMany(models.MaintenanceSessionParticipant, {
                foreignKey: 'session_id',
                as: 'participants'
            });
            MaintenanceSession.hasOne(models.WorkOrder, {
                foreignKey: 'maintenance_session_id',
                as: 'workOrder'
            });
        }
    }
    MaintenanceSession.init({
        slot_id: { type: DataTypes.INTEGER, allowNull: true },
        ins_id: { type: DataTypes.INTEGER, allowNull: false },
        type: { type: DataTypes.ENUM('WEEKLY', 'SCHEDULED', 'BIWEEKLY', 'QUARTERLY'), allowNull: false },
        status: { type: DataTypes.ENUM('DRAFT', 'COMPLETED'), defaultValue: 'DRAFT' },
        technician_id: { type: DataTypes.INTEGER, allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        started_at: { type: DataTypes.DATE, allowNull: true },
        completed_at: { type: DataTypes.DATE, allowNull: true },
        duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        sequelize,
        modelName: "MaintenanceSession",
        tableName: "maintenance_sessions",
        timestamps: true
    });
    return MaintenanceSession;
};
