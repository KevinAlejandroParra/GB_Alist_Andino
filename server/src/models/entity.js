"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Entity extends Model {}
    Entity.init(
        {
            entity_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
            },
            entity_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            entity_description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            premise_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
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
            modelName: "Entity",
            timestamps: true,
            tableName: "entities",
        }
    );
    return Entity;
};
