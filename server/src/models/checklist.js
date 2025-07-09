"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Checklist extends Model {}
    Checklist.init(
        {
            checklist_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            premise_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            checklist_type_id: {
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
            modelName: "Checklist",
            timestamps: true,
        }
    );
    return Checklist;
};
