"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistItem extends Model {}
    ChecklistItem.init(
        {
            checklist_item_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
            },
            checklist_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            item_number: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            question_text: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            guidance_text: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            input_type: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            allow_comment: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: true, 
                references: {
                    model: 'roles',
                    key: 'role_id',
                },
                onDelete: 'SET NULL',
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
            tableName: "checklist_items",
        }
    );
    return ChecklistItem;
};
