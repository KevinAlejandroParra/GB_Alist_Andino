"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class AttractionDevice extends Model {}
    AttractionDevice.init(
        {
            attraction_device_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            attraction_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "attractions",
                    key: "ins_id",
                },
            },
            device_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "devices",
                    key: "ins_id",
                },
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
            modelName: "AttractionDevice",
            timestamps: true,
            tableName: "attraction_devices",
        }
    );
    return AttractionDevice;
};
