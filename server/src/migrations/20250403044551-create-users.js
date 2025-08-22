"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("users", {
            user_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_name: {
                type: Sequelize.STRING,
                allowNull: false,
            },  
            user_email: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            user_password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            user_document_type: {
                type: Sequelize.ENUM("TI", "CC", "CE"),
                allowNull: false,
            },
            user_document: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            user_phone: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            user_image: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            user_state: {
                type: Sequelize.ENUM("activo", "inactivo"),
                defaultValue: "activo",
                allowNull: false,
            },
            premise_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            entity_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
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
        await queryInterface.dropTable("users");
    },
};
