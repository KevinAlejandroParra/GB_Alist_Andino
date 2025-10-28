"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Device extends Model {
        static associate(models) {
            // Un device pertenece a un inspectable (herencia)
            Device.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'parentInspectable',
                constraints: false,
            });

            // Un device pertenece a una familia
            Device.belongsTo(models.Family, {
                foreignKey: 'family_id',
                as: 'family'
            });
        }
    }
    Device.init(
        {
            ins_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
            },
            family_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            public_flag: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            arrival_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            brand: {
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
            modelName: "Device",
            timestamps: true,
            tableName: "devices",
        }
    );
    return Device;
};
