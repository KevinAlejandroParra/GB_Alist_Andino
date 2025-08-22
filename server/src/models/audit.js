"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Audit extends Model {}
    Audit.init(
        {
            audit_id: {
                type: DataTypes.INTEGER,
                defaultValue: DataTypes.INTEGER,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            premise_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            audit_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            audit_category: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            audit_description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Audit", 
            timestamps: true,
            tableName: "audits",
        }
    );
    return Audit;
};
