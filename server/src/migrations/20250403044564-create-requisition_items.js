"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("requisition_items", {
            requisition_item_id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
                unique: true,
            },
            requisition_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            part_id: {
                type: Sequelize.UUID,
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
