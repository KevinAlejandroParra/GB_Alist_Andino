"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Inventory extends Model {}
    Inventory.init(
        {
            part_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            quantity_available: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            location_id: {
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
            modelName: "Inventory",
            timestamps: true,
        }
    );
    return Inventory;
};
