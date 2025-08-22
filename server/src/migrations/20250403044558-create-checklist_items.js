"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_items", {
            checklist_item_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            checklist_type_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            checklist_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            question_text: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            input_type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            responded_by: {
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
        await queryInterface.dropTable("checklist_items");
    },
};
