"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Failure extends Model {
        static associate(models) {
            // Una falla pertenece a una respuesta de checklist
            Failure.belongsTo(models.ChecklistResponse, {
                foreignKey: 'response_id',
                as: 'response'
            });

            // Una falla es reportada por un usuario
            Failure.belongsTo(models.User, {
                foreignKey: 'responded_by',
                as: 'failureReporter'
            });

            // Una falla puede ser cerrada por un usuario
            Failure.belongsTo(models.User, {
                foreignKey: 'closed_by',
                as: 'failureCloser'
            });

            // Una falla puede tener muchas acciones de mantenimiento
            Failure.hasMany(models.MaintenanceAction, {
                foreignKey: 'failure_id',
                as: 'maintenanceActions'
            });
        }
    }
    Failure.init(
        {
            failure_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            response_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            solution_text: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
                evidence_solution_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            responsible_area: {
                type: DataTypes.ENUM('Técnico', 'Operación', 'Mixto'),
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('pendiente', 'en_proceso', 'resuelto', 'cerrado'),
                defaultValue: 'pendiente',
                allowNull: false,
            },
            work_order_number: {
                type: DataTypes.STRING,
                allowNull: true,
                unique: true,
            },
            first_reported_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            last_updated_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            recurrence_count: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false,
            },
            severity: {
                type: DataTypes.ENUM('leve', 'crítica'),
                allowNull: true,
            },
            reported_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            closed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            responded_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            closed_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
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
            modelName: "Failure",
            timestamps: true,
            tableName: "failures",
        }
    );
    return Failure;
};
