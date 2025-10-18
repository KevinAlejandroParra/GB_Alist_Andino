"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Checklist extends Model {
        static associate(models) {
            // Un checklist pertenece a un tipo de checklist
            Checklist.belongsTo(models.ChecklistType, {
                foreignKey: 'checklist_type_id',
                as: 'type'
            });

            // Un checklist pertenece a un premise
            Checklist.belongsTo(models.Premise, {
                foreignKey: 'premise_id',
                as: 'premise'
            });

            // Un checklist pertenece a un inspectable
            Checklist.belongsTo(models.Inspectable, {
                foreignKey: 'inspectable_id',
                as: 'inspectable'
            });

            // Un checklist es creado por un usuario
            Checklist.belongsTo(models.User, {
                foreignKey: 'created_by',
                as: 'creator'
            });


            // Un checklist puede tener muchas respuestas
            Checklist.hasMany(models.ChecklistResponse, {
                foreignKey: 'checklist_id',
                as: 'responses'
            });

            // Un checklist puede tener muchas firmas
            Checklist.hasMany(models.ChecklistSignature, {
                foreignKey: 'checklist_id',
                as: 'signatures'
            });
        }
    }
    Checklist.init(
        {
            checklist_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            premise_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            inspectable_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            checklist_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            version_label: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: "users",
                    key: "user_id",
                },
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Checklist",
            timestamps: true,
            tableName: "checklists",
        }
    );
    return Checklist;
};
