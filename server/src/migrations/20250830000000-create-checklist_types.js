"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_types", {
            checklist_type_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            name: {
                type: Sequelize.STRING,
            },
            description: {
                type: Sequelize.STRING,
            },
            frequency: {
                type: Sequelize.STRING,
            },
            version_label: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            attraction_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'attractions',
                    key: 'ins_id',
                },
                onDelete: 'CASCADE',
            },
            family_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'families',
                    key: 'family_id',
                },
                onDelete: 'CASCADE',
            },
            role_id: {
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
        await queryInterface.dropTable("checklist_types");
    },
};