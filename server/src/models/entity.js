"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Entity extends Model {
        static associate(models) {
            // Una entidad pertenece a un premise
            Entity.belongsTo(models.Premise, {
                foreignKey: 'premise_id',
                as: 'premise'
            });

            // Una entidad puede tener muchos usuarios
            Entity.hasMany(models.User, {
                foreignKey: 'entity_id',
                as: 'users'
            });
        }
    }
    Entity.init(
        {
            entity_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
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
            modelName: "Entity",
            timestamps: true,
            tableName: "entities",
        }
    );
    return Entity;
};
