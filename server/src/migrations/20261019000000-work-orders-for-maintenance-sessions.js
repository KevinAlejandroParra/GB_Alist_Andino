"use strict";
/** @type {import('sequelize-cli').Migration} */
// Etapa 3 — OT autogenerada por sesión de mantenimiento (lazy creation).
// - Permite OTs sin orden de falla (failure_order_id nullable).
// - Vincula la OT con la sesión de mantenimiento vía maintenance_session_id.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("work_orders");

    if (table.failure_order_id && table.failure_order_id.allowNull === false) {
      await queryInterface.changeColumn("work_orders", "failure_order_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "ID de la orden de falla (null para OTs de mantenimiento preventivo)"
      });
    }

    if (!table.maintenance_session_id) {
      await queryInterface.addColumn("work_orders", "maintenance_session_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "maintenance_sessions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Sesión de mantenimiento que generó esta OT (preventivo)"
      });
      await queryInterface.addIndex("work_orders", ["maintenance_session_id"], {
        name: "idx_work_orders_maintenance_session"
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("work_orders");
    if (table.maintenance_session_id) {
      await queryInterface.removeIndex("work_orders", "idx_work_orders_maintenance_session").catch(() => { });
      await queryInterface.removeColumn("work_orders", "maintenance_session_id");
    }
    // Nota: no se restaura el NOT NULL de failure_order_id porque puede haber
    // OTs de mantenimiento creadas mientras tanto.
  }
};
