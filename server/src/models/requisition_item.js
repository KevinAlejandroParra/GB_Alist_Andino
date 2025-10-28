"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class RequisitionItem extends Model {
        static associate(models) {
            // Un ítem de requisición pertenece a una requisición
            RequisitionItem.belongsTo(models.Requisition, {
                foreignKey: 'requisition_id',
                as: 'requisition'
            });

            // Un ítem de requisición pertenece a una parte
            RequisitionItem.belongsTo(models.Part, {
                foreignKey: 'part_id',
                as: 'part'
            });
        }
    }
    RequisitionItem.init(
        {
            requisition_item_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            requisition_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            part_id: {
                type: DataTypes.INTEGER,
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
