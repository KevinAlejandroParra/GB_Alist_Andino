"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Premise extends Model {
        static associate(models) {
            // Un premise puede tener muchos usuarios
            Premise.hasMany(models.User, {
                foreignKey: 'premise_id',
                as: 'users'
            });

            // Un premise puede tener muchos inventarios
            Premise.hasMany(models.Inventory, {
                foreignKey: 'location_id',
                as: 'inventories'
            });

            // Un premise puede tener muchas entidades
            Premise.hasMany(models.Entity, {
                foreignKey: 'premise_id',
                as: 'entities'
            });

            // Un premise puede tener muchos inspectables
            Premise.hasMany(models.Inspectable, {
                foreignKey: 'premise_id',
                as: 'inspectables'
            });
        }
    }
    Premise.init(
        {
            premise_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            premise_name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            premise_address: {
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
            modelName: "Premise",
            timestamps: true,
            tableName: "premises",
        }
    );
    return Premise;
};
