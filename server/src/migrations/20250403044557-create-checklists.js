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
                allowNull: false,
            },
            attraction_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            checklist_type_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            version_label: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            signed_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'user_id',
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
        await queryInterface.addConstraint('checklists', {
            fields: ['checklist_type_id', 'attraction_id', 'date'],
            type: 'unique',
            name: 'unique_checklist_per_type_attraction_and_date'
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("checklists");
    },
};
