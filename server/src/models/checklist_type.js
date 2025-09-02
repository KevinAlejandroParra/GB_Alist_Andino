"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ChecklistType extends Model {}
    ChecklistType.init(
        {
            checklist_type_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            frequency: {
                type: DataTypes.STRING,
            },
            version_label: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            attraction_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'attractions',
                    key: 'ins_id',
                },
                onDelete: 'CASCADE',
            },
            role_id: {
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
            modelName: "ChecklistType",
            timestamps: true,
            tableName: "checklist_types",
        }
    );
    return ChecklistType;
};
