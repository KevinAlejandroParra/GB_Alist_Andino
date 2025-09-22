"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_responses", {
            response_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,   
            },
            checklist_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            checklist_item_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            response_compliance: {
                type: DataTypes.ENUM("cumple", "observación", "no cumple"),
                allowNull: true, 
            },
            response_numeric: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            response_text: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            comment: {
                type: Sequelize.STRING,
            },
            evidence_url: {
                type: Sequelize.STRING,
            },
            responded_by: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            inspectable_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'inspectables',
                    key: 'ins_id',
                },
                onUpdate: 'CASCADE',
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
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("checklist_responses");
    },
};
