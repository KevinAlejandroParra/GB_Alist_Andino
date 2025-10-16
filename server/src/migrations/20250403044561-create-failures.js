"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("failures", {
            failure_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            response_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            description: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            solution_text: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            evidence_solution_url: {
                type: Sequelize.STRING,
            },
            responsible_area: {
                type: Sequelize.ENUM('Técnico', 'Operación', 'Mixto'),
                allowNull: true,
            },
            status: {
                type: Sequelize.ENUM('pendiente', 'resuelto'),
                defaultValue: 'pendiente',
                allowNull: false,
            },
            severity: {
                type: Sequelize.ENUM('leve', 'crítica'),
                allowNull: true,
            },
            reported_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            closed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            responded_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
              closed_by: {
                  type: DataTypes.INTEGER,
                  allowNull: true,
              },
              work_order_number: {
                  type: DataTypes.STRING,
                  allowNull: true,
              },
              first_reported_date: {
                  type: DataTypes.DATE,
                  allowNull: true,
              },
              last_updated_date: {
                  type: DataTypes.DATE,
                  allowNull: true,
              },
              recurrence_count: {
                  type: DataTypes.INTEGER,
                  allowNull: true,
                  defaultValue: 1,
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
        await queryInterface.dropTable("failures");
    },
};
