"use strict";
/** @type {import('sequelize-cli').Migration} */
// Fase: preventivos quincenales (BIWEEKLY) — migración 100% aditiva.
// - Añade BIWEEKLY a los ENUM slot_type / type (MySQL: ALTER MODIFY no destructivo).
// - Añade columnas biweekly a maintenance_machine_configs.
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Nuevas columnas en configs de máquina
    await queryInterface.addColumn("maintenance_machine_configs", "biweekly_enabled", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    await queryInterface.addColumn("maintenance_machine_configs", "biweekly_weekday", {
      type: Sequelize.INTEGER,
      allowNull: true // 0-6 (0=Domingo)
    });
    await queryInterface.addColumn("maintenance_machine_configs", "biweekly_pattern", {
      type: Sequelize.ENUM('FIRST_THIRD', 'SECOND_FOURTH'),
      allowNull: true,
      defaultValue: 'FIRST_THIRD'
    });

    // 2) Extender ENUM slot_type en maintenance_schedule_slots (WEEKLY, SCHEDULED -> + BIWEEKLY)
    const slotsTable = await queryInterface.describeTable("maintenance_schedule_slots");
    if (slotsTable.slot_type) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `maintenance_schedule_slots` MODIFY COLUMN `slot_type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY') NOT NULL"
      );
    }

    // 3) Extender ENUM type en maintenance_sessions
    const sessionsTable = await queryInterface.describeTable("maintenance_sessions");
    if (sessionsTable.type) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `maintenance_sessions` MODIFY COLUMN `type` ENUM('WEEKLY','SCHEDULED','BIWEEKLY') NOT NULL"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Quitar columnas biweekly
    await queryInterface.removeColumn("maintenance_machine_configs", "biweekly_pattern");
    await queryInterface.removeColumn("maintenance_machine_configs", "biweekly_weekday");
    await queryInterface.removeColumn("maintenance_machine_configs", "biweekly_enabled");

    // Regresar ENUM a valores originales (solo seguro si no existen filas BIWEEKLY;
    // en producción se recomienda borrar/mover esos slots/sesiones antes de hacer down)
    await queryInterface.sequelize.query(
      "UPDATE `maintenance_schedule_slots` SET `slot_type`='SCHEDULED' WHERE `slot_type`='BIWEEKLY'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `maintenance_schedule_slots` MODIFY COLUMN `slot_type` ENUM('WEEKLY','SCHEDULED') NOT NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE `maintenance_sessions` SET `type`='SCHEDULED' WHERE `type`='BIWEEKLY'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `maintenance_sessions` MODIFY COLUMN `type` ENUM('WEEKLY','SCHEDULED') NOT NULL"
    );
  }
};
