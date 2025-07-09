"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceAction extends Model {}
    MaintenanceAction.init(
        {
            action_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            failure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            action_taken: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            completed_by: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.UUID,
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
        }
    );
    return MaintenanceAction;
};
