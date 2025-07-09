"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistSignature extends Model {}
    ChecklistSignature.init(
        {
            signature_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            checklist_id: {
                type: DataTypes.UUID,
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
            modelName: "ChecklistSignature",
            timestamps: true,
        }
    );
    return ChecklistSignature;
};
