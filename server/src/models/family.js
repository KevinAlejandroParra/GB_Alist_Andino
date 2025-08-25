"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Family extends Model {}
    Family.init(
        {
            family_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
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
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Family",
            timestamps: true,
            tableName: "families",
        }
    );
    return Family;
};
