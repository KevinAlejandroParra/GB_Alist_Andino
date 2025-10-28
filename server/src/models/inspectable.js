"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Inspectable extends Model {
        static associate(models) {
            // Un inspectable pertenece a un premise
            Inspectable.belongsTo(models.Premise, {
                foreignKey: 'premise_id',
                as: 'premise'
            });

            // Un inspectable puede tener muchos checklists
            Inspectable.hasMany(models.Checklist, {
                foreignKey: 'inspectable_id',
                as: 'checklists'
            });

            // Un inspectable puede estar relacionado con muchos tipos de checklist específicos
            Inspectable.belongsToMany(models.ChecklistType, {
                through: 'ChecklistTypeInspectables',
                foreignKey: 'ins_id',
                otherKey: 'checklist_type_id',
                as: 'specificChecklistTypes'
            });

            // Asociaciones para herencia (Single Table Inheritance)
            Inspectable.hasOne(models.Device, {
                foreignKey: 'ins_id',
                as: 'deviceData',
                constraints: false,
            });

            Inspectable.hasOne(models.Attraction, {
                foreignKey: 'ins_id',
                as: 'attractionData',
                constraints: false,
            });
        }
    }
    Inspectable.init(
        {
            ins_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            photo_url: {
                type: DataTypes.STRING, 
                allowNull: true, 
            },
            type_code: {
                type: DataTypes.ENUM("device", "attraction", "other"),
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
            modelName: "Inspectable",
            timestamps: true,
            tableName: "inspectables",
        }
    );
    return Inspectable;
};
