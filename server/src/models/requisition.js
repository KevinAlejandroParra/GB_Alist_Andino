"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Requisition extends Model {}
    Requisition.init(
        {
            requisition_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            failure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            requested_by: {
                type: DataTypes.UUID,
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
        }
    );
    return Requisition;
};
