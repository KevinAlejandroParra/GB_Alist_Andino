"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistResponse extends Model {}
    ChecklistResponse.init(
        {
            response_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
            },
            checklist_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            checklist_item_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            value: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
            comment: {
                type: DataTypes.STRING,
            },
            evidence_url: {
                type: DataTypes.STRING,
            },
            responded_by: {
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
            modelName: "ChecklistResponse",
            timestamps: true,
            tableName: "checklist_responses",
        }
    );
    return ChecklistResponse;
};
