"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Device extends Model {}
    Device.init(
        {
            ins_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            family_id: {
                type: DataTypes.UUID,
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
        }
    );
    return Device;
};
