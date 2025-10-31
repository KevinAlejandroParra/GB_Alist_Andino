"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceAction extends Model {
        static associate(models) {
            // Una acción de mantenimiento pertenece a una orden de trabajo
            MaintenanceAction.belongsTo(models.WorkOrder, {
                foreignKey: 'work_order_id',
                as: 'workOrder'
            });

            // Una acción de mantenimiento es completada por un usuario
            MaintenanceAction.belongsTo(models.User, {
                foreignKey: 'completed_by',
                as: 'completedBy'
            });
        }
    }
    MaintenanceAction.init(
        {
            action_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            work_order_id: {
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
