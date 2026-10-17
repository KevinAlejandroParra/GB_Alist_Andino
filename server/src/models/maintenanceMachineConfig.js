"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceMachineConfig extends Model {
        static associate(models) {
            MaintenanceMachineConfig.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'inspectable'
            });
        }
    }
    MaintenanceMachineConfig.init({
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        ins_id: { type: DataTypes.INTEGER, unique: true, allowNull: false },
        weekly_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        weekly_weekday: { type: DataTypes.INTEGER, allowNull: true },
        biweekly_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        biweekly_weekday: { type: DataTypes.INTEGER, allowNull: true },
        biweekly_pattern: { type: DataTypes.ENUM('FIRST_THIRD', 'SECOND_FOURTH'), allowNull: true, defaultValue: 'FIRST_THIRD' },
        quarterly_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        quarterly_start_month: { type: DataTypes.INTEGER, allowNull: true }, // 1-12: mes de la primera ocurrencia
        quarterly_day_of_month: { type: DataTypes.INTEGER, allowNull: true }, // 1-28: día del mes de ejecución
        scheduled_exempt: { type: DataTypes.BOOLEAN, defaultValue: false },
        last_scheduled_at: { type: DataTypes.DATE, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, {
        sequelize,
        modelName: "MaintenanceMachineConfig",
        tableName: "maintenance_machine_configs",
        timestamps: true
    });
    return MaintenanceMachineConfig;
};
