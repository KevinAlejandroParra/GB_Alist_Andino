"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistItem extends Model {}
    ChecklistItem.init(
        {
            checklist_item_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            checklist_type_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            checklist_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            question_text: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            input_type: {
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
            modelName: "ChecklistItem",
            timestamps: true,
        }
    );
    return ChecklistItem;
};
