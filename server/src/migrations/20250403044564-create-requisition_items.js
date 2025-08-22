"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("requisition_items", {
            requisition_item_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            requisition_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            part_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            quantity_requested: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            quantity_approved: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            quantity_delivered: {
                type: Sequelize.INTEGER,
                allowNull: false,
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
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("requisition_items");
    },
};
