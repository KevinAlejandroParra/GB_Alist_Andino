"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceSchedulePlan extends Model {
        static associate(models) {
            MaintenanceSchedulePlan.hasMany(models.MaintenanceScheduleSlot, {
                foreignKey: 'plan_id',
                as: 'slots'
            });
            MaintenanceSchedulePlan.belongsTo(models.User, {
                foreignKey: 'published_by',
                as: 'publisher'
            });
        }
    }
    MaintenanceSchedulePlan.init({
        year_month: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.ENUM('DRAFT', 'PUBLISHED'), defaultValue: 'DRAFT' },
        generated_at: { type: DataTypes.DATE, allowNull: true },
        published_by: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        sequelize,
        modelName: "MaintenanceSchedulePlan",
        tableName: "maintenance_schedule_plans",
        timestamps: true
    });
    return MaintenanceSchedulePlan;
};
