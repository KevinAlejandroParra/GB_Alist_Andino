"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Attraction extends Model {}
    Attraction.init(
        {
            ins_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            public_flag: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            capacity: {
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
            modelName: "Attraction",
            timestamps: true,
            tableName: "attractions",
        }
    );
    return Attraction;
};
