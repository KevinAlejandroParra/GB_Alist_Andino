"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Part extends Model {
        static associate(models) {
            // Una parte puede estar en muchos ítems de requisición
            Part.hasMany(models.RequisitionItem, {
                foreignKey: 'part_id',
                as: 'requisitionItems'
            });

            // Una parte puede estar en muchos inventarios
            Part.hasMany(models.Inventory, {
                foreignKey: 'part_id',
                as: 'inventories'
            });
        }
    }
    Part.init(
        {
            part_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            part_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            unit: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
            },
            supplier: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            price: {
                type: DataTypes.FLOAT,
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
            modelName: "Part",
            timestamps: true,
            tableName: "parts",
        }
    );
    return Part;
};
