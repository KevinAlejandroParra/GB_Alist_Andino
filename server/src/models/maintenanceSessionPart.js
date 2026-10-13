"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceSessionPart extends Model {
        static associate(models) {
            MaintenanceSessionPart.belongsTo(models.MaintenanceSession, {
                foreignKey: 'session_id',
                as: 'session'
            });
            MaintenanceSessionPart.belongsTo(models.Inventory, {
                foreignKey: 'inventory_id',
                as: 'inventory'
            });
        }
    }
    MaintenanceSessionPart.init({
        session_id: { type: DataTypes.INTEGER, allowNull: false },
        inventory_id: { type: DataTypes.INTEGER, allowNull: false },
        quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    }, {
        sequelize,
        modelName: "MaintenanceSessionPart",
        tableName: "maintenance_session_parts",
        timestamps: true
    });
    return MaintenanceSessionPart;
};
