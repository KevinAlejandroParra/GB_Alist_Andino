"use strict";
/** @type {import('sequelize-cli').Migration} */
// Fase: preventivos cuatrimestrales (QUARTERLY, cada 4 meses) — migración 100% aditiva.
// - Añade QUARTERLY a los ENUM slot_type / type (MySQL: ALTER MODIFY no destructivo).
// - Añade columnas quarterly a maintenance_machine_configs.
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Nuevas columnas en configs de máquina
    await queryInterface.addColumn("maintenance_machine_configs", "quarterly_enabled", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    await queryInterface.addColumn("maintenance_machine_configs", "quarterly_start_month", {
      type: Sequelize.INTEGER,
      allowNull: true // 1-12: mes de la primera ocurrencia
    });
    await queryInterface.addColumn("maintenance_machine_configs", "quarterly_day_of_month", {
      type: Sequelize.INTEGER,
      allowNull: true // 1-28: día del mes en que se ejecuta
    });

    // 2) Extender ENUM slot_type en maintenance_schedule_slots
    const slotsTable = await queryInterface.describeTable("maintenance_schedule_slots");
    if (slotsTable.slot_type) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `maintenance_schedule_slots` MODIFY COLUMN `slot_type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY','QUARTERLY') NOT NULL"
      );
    }

    // 3) Extender ENUM type en maintenance_sessions
    const sessionsTable = await queryInterface.describeTable("maintenance_sessions");
    if (sessionsTable.type) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `maintenance_sessions` MODIFY COLUMN `type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY','QUARTERLY') NOT NULL"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Quitar columnas quarterly
    await queryInterface.removeColumn("maintenance_machine_configs", "quarterly_day_of_month");
    await queryInterface.removeColumn("maintenance_machine_configs", "quarterly_start_month");
    await queryInterface.removeColumn("maintenance_machine_configs", "quarterly_enabled");

    // Regresar ENUM a valores previos (solo seguro si no existen filas QUARTERLY)
    await queryInterface.sequelize.query(
      "UPDATE `maintenance_schedule_slots` SET `slot_type`='SCHEDULED' WHERE `slot_type`='QUARTERLY'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `maintenance_schedule_slots` MODIFY COLUMN `slot_type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY') NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE `maintenance_sessions` SET `type`='SCHEDULED' WHERE `type`='QUARTERLY'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `maintenance_sessions` MODIFY COLUMN `type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY') NOT NULL"
    );
  }
};
