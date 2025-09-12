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
            parent_item_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'checklist_items',
                    key: 'checklist_item_id',
                },
                onDelete: 'CASCADE',
            },
            checklist_type_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            item_number: {
                type: DataTypes.STRING, 
                allowNull: false,
            },
            question_text: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            guidance_text: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            input_type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            allow_comment: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
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
