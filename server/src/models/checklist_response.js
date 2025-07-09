"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistResponse extends Model {}
    ChecklistResponse.init(
        {
            response_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            checklist_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            checklist_item_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            value: {
                type: DataTypes.STRING,
            },
            comment: {
                type: DataTypes.STRING,
            },
            evidence_url: {
                type: DataTypes.STRING,
            },
            responded_by: {
                type: DataTypes.UUID,
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
            modelName: "ChecklistResponse",
            timestamps: true,
        }
    );
    return ChecklistResponse;
};
