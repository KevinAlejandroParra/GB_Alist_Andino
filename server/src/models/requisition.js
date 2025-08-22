"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Requisition extends Model {}
    Requisition.init(
        {
            requisition_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            failure_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            requested_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            status: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Requisition",
            timestamps: true,
            tableName: "requisitions",
        }
    );
    return Requisition;
};
