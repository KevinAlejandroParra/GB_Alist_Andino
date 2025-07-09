"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Failure extends Model {}
    Failure.init(
        {
            failure_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            response_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            severity: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            reported_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            resolved_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            responded_by: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Failure",
            timestamps: true,
        }
    );
    return Failure;
};
