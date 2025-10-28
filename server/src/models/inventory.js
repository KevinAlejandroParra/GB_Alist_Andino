"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Inventory extends Model {
        static associate(models) {
            // Un inventario pertenece a una parte
            Inventory.belongsTo(models.Part, {
                foreignKey: 'part_id',
                as: 'part'
            });

            // Un inventario pertenece a una ubicación (Premise)
            Inventory.belongsTo(models.Premise, {
                foreignKey: 'location_id',
                as: 'location'
            });
        }
    }
    Inventory.init(
        {
            inventory_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            part_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            quantity_available: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            location_id: {
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
            modelName: "Inventory",
            timestamps: true,
            tableName: "inventories",
        }
    );
    return Inventory;
};
