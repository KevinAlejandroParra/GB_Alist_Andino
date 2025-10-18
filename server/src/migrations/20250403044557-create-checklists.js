"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklists", {
            checklist_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            premise_id: {
                type: Sequelize.INTEGER,
                allowNull: true, 
            },
            inspectable_id: {
                type: Sequelize.INTEGER,
                allowNull: true, 
                references: {
                    model: 'inspectables',
                    key: 'ins_id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            checklist_type_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            version_label: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: "users",
                    key: "user_id",
                },
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
        await queryInterface.dropTable("checklists");
    },
};
