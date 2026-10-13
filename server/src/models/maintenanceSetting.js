"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceSetting extends Model {
        static associate(models) {
            MaintenanceSetting.belongsTo(models.Premise, {
                foreignKey: 'premise_id',
                as: 'premise'
            });
        }
    }
    MaintenanceSetting.init({
        premise_id: { type: DataTypes.INTEGER, allowNull: false },
        strategy: { type: DataTypes.ENUM('LAST_SCHEDULED', 'FAILURE_COUNT', 'HYBRID'), defaultValue: 'HYBRID' },
        max_scheduled_per_day: { type: DataTypes.INTEGER, defaultValue: 5 },
        working_days: { type: DataTypes.STRING, defaultValue: '1,2,3,4,5' },
        hybrid_weights: { type: DataTypes.JSON, defaultValue: { failure_count: 0.6, days_since_last: 0.4 } },
    }, {
        sequelize,
        modelName: "MaintenanceSetting",
        tableName: "maintenance_settings",
        timestamps: true
    });
    return MaintenanceSetting;
};
