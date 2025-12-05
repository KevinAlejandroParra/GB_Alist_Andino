"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistSignature extends Model {
        static associate(models) {
            // Una firma pertenece a un checklist (opcional)
            ChecklistSignature.belongsTo(models.Checklist, {
                foreignKey: 'checklist_id',
                as: 'checklist'
            });

            // Una firma puede pertenecer a una orden de falla (opcional)
            ChecklistSignature.belongsTo(models.FailureOrder, {
                foreignKey: 'failure_order_id',
                as: 'failureOrder'
            });

            // Una firma pertenece a un usuario
            ChecklistSignature.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user'
            });

            // Una firma puede pertenecer a un rol
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
                allowNull: true, // Puede ser null para firmas de fallas
            },
            failure_order_id: {
                type: DataTypes.INTEGER,
                allowNull: true, // Para firmas de fallas
            },
            signature_type: {
                type: DataTypes.ENUM('REPORT', 'RESOLUTION', 'CLOSE'),
                allowNull: true, // Tipo de firma para fallas
            },
            signed_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            signed_by_name: {
                type: DataTypes.STRING,
                allowNull: false, // Nombre del firmante
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
