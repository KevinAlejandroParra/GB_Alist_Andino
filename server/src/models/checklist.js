"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Checklist extends Model {}
    Checklist.init(
        {
            checklist_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            premise_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            inspectable_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            checklist_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            version_label: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
                get() {
                    const rawValue = this.getDataValue('date');
                    if (!rawValue || rawValue === 'Invalid date') {
                        // Return today's date or null, depending on needs
                        const today = new Date();
                        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                        return dateStr;
                    }
                    return rawValue;
                }
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            signed_by: {
                type: DataTypes.INTEGER,
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
            modelName: "Checklist",
            timestamps: true,
            tableName: "checklists",
        }
    );
    return Checklist;
};
