"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Failure extends Model {
        
    }
    Failure.init(
        {
            failure_id: {
                type: DataTypes.INTEGER,
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
            responsible_area: {
                type: DataTypes.ENUM('Técnico', 'Operación', 'Mixto'),
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('pendiente', 'resuelto'),
                defaultValue: 'pendiente',
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
