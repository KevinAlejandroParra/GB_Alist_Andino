"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Inspectable extends Model {}
    Inspectable.init(
        {
            ins_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            type_code: {
                type: DataTypes.ENUM("device", "attraction", "other"),
            },
            premise_id: {
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
            modelName: "Inspectable",
            timestamps: true,
            tableName: "inspectables",
        }
    );
    return Inspectable;
};
