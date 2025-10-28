"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistSignature extends Model {
        static associate(models) {
            // Una firma pertenece a un checklist
            ChecklistSignature.belongsTo(models.Checklist, {
                foreignKey: 'checklist_id',
                as: 'checklist'
            });

            // Una firma pertenece a un usuario
            ChecklistSignature.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user'
            });

            // Una firma pertenece a un rol
            ChecklistSignature.belongsTo(models.Role, {
                foreignKey: 'role_at_signature',
                as: 'role'
            });
        }
    }
    ChecklistSignature.init(
        {
            signature_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            checklist_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            signed_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            role_at_signature: {
                type: DataTypes.STRING,
                allowNull: false,
            },
                digital_token: {
                type: DataTypes.TEXT('long'),
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
            modelName: "ChecklistSignature",
            timestamps: true,
            tableName: "checklist_signatures",
        }
    );
    return ChecklistSignature;
};
