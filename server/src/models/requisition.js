"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Requisition extends Model {
        static associate(models) {
            // Una requisición pertenece a una orden de trabajo
            Requisition.belongsTo(models.WorkOrder, {
                foreignKey: 'work_order_id',
                as: 'workOrder'
            });

            // Una requisición puede tener muchos ítems
            Requisition.hasMany(models.RequisitionItem, {
                foreignKey: 'requisition_id',
                as: 'items'
            });
        }
    }
    Requisition.init(
        {
            requisition_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            requested_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            work_order_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA', 'COMPLETADA'),
                allowNull: false,
                defaultValue: 'PENDIENTE',
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
