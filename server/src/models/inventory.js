"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Inventory extends Model {
        static associate(models) {
            // Relación N:N con WorkOrder a través de work_order_parts
            Inventory.belongsToMany(models.WorkOrder, {
                through: models.WorkOrderPart,
                foreignKey: 'inventory_id',
                otherKey: 'work_order_id',
                as: 'workOrdersUsed'
            });
        }
    }
    Inventory.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            part_name: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Nombre del repuesto'
            },
            details: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Detalles adicionales del repuesto'
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Cantidad disponible'
            },
            location: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Ubicación (ej: bodega)'
            },
            status: {
                type: DataTypes.ENUM('disponible', 'agotado'),
                allowNull: false,
                defaultValue: 'disponible',
                comment: 'Estado del repuesto'
            },
            category: {
                type: DataTypes.ENUM('locativo', 'dispositivos', 'familias', 'herramientas'),
                allowNull: false,
                comment: 'Categoría del repuesto'
            },
            image_url: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'URL de la imagen del repuesto'
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
            modelName: "Inventory",
            timestamps: true,
            tableName: "inventories",
            indexes: [
                { fields: ['location'] },
                { fields: ['category'] },
                { fields: ['status'] },
                { fields: ['category', 'location'] }
            ]
        }
    );
    return Inventory;
};
