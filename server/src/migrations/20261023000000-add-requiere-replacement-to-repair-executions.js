"use strict";
/** @type {import('sequelize-cli').Migration} */
// Fase: persistir en la AR la decisión de repuestos.
// Antes la bandera sólo existía en work_orders; si la AR no tenía OT (o la OT se cancelaba),
// al recargar el modal se volvía a preguntar "¿Requiere repuestos?" y ofrecía crear otra OT.
// Migración 100% aditiva e idempotente.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("repair_executions");

    if (!table.requiere_replacement) {
      await queryInterface.addColumn("repair_executions", "requiere_replacement", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Backfill: las AR que ya tienen OT vinculada claramente sí requieren repuestos
    await queryInterface.sequelize.query(
      "UPDATE `repair_executions` re SET `requiere_replacement` = 1 WHERE EXISTS (SELECT 1 FROM `work_orders` wo WHERE wo.`repair_execution_id` = re.`id`)"
    );
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("repair_executions");
    if (table.requiere_replacement) {
      await queryInterface.removeColumn("repair_executions", "requiere_replacement");
    }
  }
};
