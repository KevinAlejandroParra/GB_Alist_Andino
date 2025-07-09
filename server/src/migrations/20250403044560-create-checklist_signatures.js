"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_signatures", {
            signature_id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
                unique: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            checklist_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            signed_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            role_at_signature: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            digital_token: {
                type: Sequelize.STRING,
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
        await queryInterface.dropTable("checklist_signatures");
    },
};
