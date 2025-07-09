"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("checklist_items", {
            checklist_item_id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
                unique: true,
            },
            checklist_type_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            checklist_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            question_text: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            input_type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            responded_by: {
                type: Sequelize.UUID,
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
        await queryInterface.dropTable("checklist_items");
    },
};
