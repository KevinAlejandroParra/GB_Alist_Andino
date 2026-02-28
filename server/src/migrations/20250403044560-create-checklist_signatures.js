"use strict";
const { DataTypes } = require("sequelize"); 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_signatures", {
            signature_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                unique: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID del usuario que firma'
            },
            checklist_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'checklists',
                    key: 'checklist_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID del checklist que se está firmando'
            },
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'roles',
                    key: 'role_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
                comment: 'ID del rol del usuario al momento de firmar'
            },
            signed_at: {
                type: Sequelize.DATE,
                allowNull: false,
                comment: 'Fecha y hora de la firma'
            },
            signed_by_name: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nombre del firmante'
            },
            signature_image: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
                comment: 'Imagen de la firma digital'
            },
            digital_token: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
                comment: 'Token único de verificación de la firma'
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

        // Índices para optimizar consultas
        await queryInterface.addIndex("checklist_signatures", {
            name: 'idx_checklist_signatures_checklist_id',
            fields: ['checklist_id']
        });

        await queryInterface.addIndex("checklist_signatures", {
            name: 'idx_checklist_signatures_user_id',
            fields: ['user_id']
        });

        await queryInterface.addIndex("checklist_signatures", {
            name: 'idx_checklist_signatures_role_id',
            fields: ['role_id']
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("checklist_signatures");
    },
};
