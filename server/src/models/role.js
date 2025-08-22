"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {}
    Role.init(
        {
            role_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            role_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            role_description: {
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
            modelName: "Role",
            timestamps: true,
            tableName: "roles",
        }
    );
    return Role;
};
