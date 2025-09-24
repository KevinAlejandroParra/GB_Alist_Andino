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
                allowNull: true, // Cambiado a true
            },
            inspectable_id: {
                type: Sequelize.INTEGER,
                allowNull: true, // Cambiado a true
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
        // Se elimina la restricción unique_checklist_per_type_inspectable_and_date
        // para permitir múltiples entradas con inspectable_id NULL para checklists de tipo 'specific' o 'static'.
        // La unicidad se gestionará a nivel de aplicación en ensureChecklistInstance.
        // await queryInterface.addConstraint('checklists', {
        //     fields: ['checklist_type_id', 'inspectable_id', 'date'],
        //     type: 'unique',
        //     name: 'unique_checklist_per_type_inspectable_and_date'
        // });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("checklists");
    },
};
