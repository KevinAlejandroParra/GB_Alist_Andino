"use strict";
const { DataTypes } = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("inventories", {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            part_name: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nombre del repuesto'
            },
            details: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Detalles adicionales del repuesto'
            },
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Cantidad disponible'
            },
            location: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Ubicación (ej: bodega)'
            },
            status: {
                type: Sequelize.ENUM('disponible', 'agotado'),
                allowNull: false,
                defaultValue: 'disponible',
                comment: 'Estado del repuesto'
            },
            category: {
                type: Sequelize.ENUM('locativo', 'dispositivos', 'familias', 'herramientas'),
                allowNull: false,
                comment: 'Categoría del repuesto'
            },
            image_url: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'URL de la imagen del repuesto'
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                onUpdate: Sequelize.NOW,
                allowNull: false,
            },
        });

        // Índices para optimizar consultas
        await queryInterface.addIndex('inventories', {
            name: 'idx_inventories_location',
            fields: ['location']
        });

        await queryInterface.addIndex('inventories', {
            name: 'idx_inventories_category',
            fields: ['category']
        });

        await queryInterface.addIndex('inventories', {
            name: 'idx_inventories_status',
            fields: ['status']
        });

        await queryInterface.addIndex('inventories', {
            name: 'idx_inventories_category_location',
            fields: ['category', 'location']
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('inventories', 'idx_inventories_location');
        await queryInterface.removeIndex('inventories', 'idx_inventories_category');
        await queryInterface.removeIndex('inventories', 'idx_inventories_status');
        await queryInterface.removeIndex('inventories', 'idx_inventories_category_location');
        await queryInterface.dropTable("inventories");
    },
};
