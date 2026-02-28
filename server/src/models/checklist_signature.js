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
                foreignKey: 'role_id',
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
                comment: 'ID del usuario que firma'
            },
            checklist_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'ID del checklist que se está firmando'
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'ID del rol del usuario al momento de firmar'
            },
            signed_at: {
                type: DataTypes.DATE,
                allowNull: false,
                comment: 'Fecha y hora de la firma'
            },
            signed_by_name: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Nombre del firmante'
            },
            signature_image: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
                comment: 'Imagen de la firma digital'
            },
            digital_token: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
                comment: 'Token único de verificación de la firma'
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
            comment: 'Tabla para firmas de checklists completados'
        }
    );
    return ChecklistSignature;
};
