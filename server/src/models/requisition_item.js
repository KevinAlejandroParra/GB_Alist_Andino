"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class RequisitionItem extends Model {}
    RequisitionItem.init(
        {      requisition_item_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            requisition_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            part_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            quantity_requested: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            quantity_approved: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            quantity_delivered: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "RequisitionItem",
            timestamps: true,
            tableName: "requisition_items",
        }
    );
    return RequisitionItem;
};
