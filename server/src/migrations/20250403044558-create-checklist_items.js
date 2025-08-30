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
            item_number: {
                type: DataTypes.INTEGER,
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
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'roles',
                    key: 'role_id',
                },
                onDelete: 'SET NULL',
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
        await queryInterface.addConstraint('checklist_items', {
            fields: ['checklist_type_id', 'item_number'],
            type: 'unique',
            name: 'unique_checklist_item_per_type_and_number'
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("checklist_items");
    },
};
