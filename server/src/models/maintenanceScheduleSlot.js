"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceScheduleSlot extends Model {
        static associate(models) {
            MaintenanceScheduleSlot.belongsTo(models.MaintenanceSchedulePlan, {
                foreignKey: 'plan_id',
                as: 'plan'
            });
            MaintenanceScheduleSlot.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'inspectable'
            });
            MaintenanceScheduleSlot.belongsTo(models.User, {
                foreignKey: 'assigned_user_id',
                as: 'assignedUser'
            });
            MaintenanceScheduleSlot.hasMany(models.MaintenanceSession, {
                foreignKey: 'slot_id',
                as: 'sessions'
            });
            MaintenanceScheduleSlot.hasOne(models.MaintenanceSession, {
                foreignKey: 'slot_id',
                as: 'session'
            });
        }
    }
    MaintenanceScheduleSlot.init({
        plan_id: { type: DataTypes.INTEGER, allowNull: false },
        scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
        ins_id: { type: DataTypes.INTEGER, allowNull: false },
        slot_type: { type: DataTypes.ENUM('WEEKLY', 'SCHEDULED', 'BIWEEKLY'), allowNull: false },
        sort_priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_manual_override: { type: DataTypes.BOOLEAN, defaultValue: false },
        assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        sequelize,
        modelName: "MaintenanceScheduleSlot",
        tableName: "maintenance_schedule_slots",
        timestamps: true
    });
    return MaintenanceScheduleSlot;
};
