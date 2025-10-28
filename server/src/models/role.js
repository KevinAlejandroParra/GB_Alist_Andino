"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            // Un rol puede tener muchos usuarios
            Role.hasMany(models.User, {
                foreignKey: 'role_id',
                as: 'users'
            });

            // Un rol puede tener muchos tipos de checklist
            Role.hasMany(models.ChecklistType, {
                foreignKey: 'role_id',
                as: 'checklistTypes'
            });

            // Un rol puede tener muchas firmas de checklist
            Role.hasMany(models.ChecklistSignature, {
                foreignKey: 'role_at_signature',
                as: 'signatures'
            });
        }
    }
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
