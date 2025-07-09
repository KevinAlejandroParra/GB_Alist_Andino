"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Family extends Model {}
    Family.init(
        {
            family_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            family_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            family_description: {
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
            modelName: "Family",
            timestamps: true,
        }
    );
    return Family;
};
