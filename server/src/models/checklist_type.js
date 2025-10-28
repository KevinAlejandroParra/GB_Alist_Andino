"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistType extends Model {
        static associate(models) {
            // Un tipo de checklist pertenece a un rol
            ChecklistType.belongsTo(models.Role, {
                foreignKey: 'role_id',
                as: 'role'
            });

            // Un tipo de checklist puede tener muchos checklists
            ChecklistType.hasMany(models.Checklist, {
                foreignKey: 'checklist_type_id',
                as: 'checklists'
            });

            // Un tipo de checklist puede tener muchos ítems
            ChecklistType.hasMany(models.ChecklistItem, {
                foreignKey: 'checklist_type_id',
                as: 'items'
            });

            // Un tipo de checklist puede estar asociado a muchos inspectables específicos
            ChecklistType.belongsToMany(models.Inspectable, {
                through: 'ChecklistTypeInspectables',
                foreignKey: 'checklist_type_id',
                otherKey: 'ins_id',
                as: 'specificInspectables'
            });
        }
    }
    ChecklistType.init(
        {
            checklist_type_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            frequency: {
                type: DataTypes.STRING,
            },
            version_label: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            type_category: {
                type: DataTypes.ENUM('family', 'attraction', 'specific', 'static'),
                allowNull: false,
                defaultValue: 'static',
            },
            associated_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            role_id: {
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
            modelName: "ChecklistType",
            timestamps: true,
            tableName: "checklist_types",
            
        }
    );
    return ChecklistType;
};
