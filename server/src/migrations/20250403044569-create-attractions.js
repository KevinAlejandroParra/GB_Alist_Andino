"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("attractions", {
            ins_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                unique: true,
                references: {
                    model: 'inspectables',
                    key: 'ins_id',
                },
                onDelete: 'CASCADE',
            },
            public_flag: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            capacity: {
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
        await queryInterface.dropTable("attractions");
    },
};
