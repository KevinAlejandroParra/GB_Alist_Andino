"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Attraction extends Model {
        static associate(models) {
            // Una atracción pertenece a un inspectable (herencia)
            Attraction.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'parentInspectable',
                constraints: false,
            });
        }
    }
    Attraction.init(
        {
            ins_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
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
