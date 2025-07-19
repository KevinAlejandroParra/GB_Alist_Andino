"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Premise extends Model {}
    Premise.init(
        {
            premise_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            premise_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            premise_address: {
                type: DataTypes.STRING,
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
            modelName: "Premise",
            timestamps: true,
            tableName: "premises",
        }
    );
    return Premise;
};
