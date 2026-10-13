"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("maintenance_schedule_plans");
    if (!tableDescription.premise_id) {
      await queryInterface.addColumn("maintenance_schedule_plans", "premise_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'premises', key: 'premise_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("maintenance_schedule_plans");
    if (tableDescription.premise_id) {
      await queryInterface.removeColumn("maintenance_schedule_plans", "premise_id");
    }
  }
};
