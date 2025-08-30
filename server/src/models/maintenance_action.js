"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceAction extends Model {}
    MaintenanceAction.init(
        {
            action_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
            },
            failure_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            action_taken: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            completed_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                onUpdate: DataTypes.NOW,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "MaintenanceAction",
            timestamps: true,
            tableName: "maintenance_actions",
        }
    );
    return MaintenanceAction;
};
