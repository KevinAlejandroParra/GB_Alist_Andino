'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Iniciando población de linked_failure_ids para WorkOrders existentes...');

    // Obtener todas las WorkOrders que tienen linked_failure_ids en NULL
    const [workOrders] = await queryInterface.sequelize.query(
      `SELECT id, failure_order_id, linked_failure_ids FROM work_orders WHERE linked_failure_ids IS NULL`
    );

    console.log(`📊 Encontradas ${workOrders.length} WorkOrders con linked_failure_ids NULL`);

    let updatedCount = 0;

    // Actualizar cada WorkOrder para inicializar linked_failure_ids con su propia failure_order_id
    for (const wo of workOrders) {
      const linkedIds = JSON.stringify([wo.failure_order_id]);
      
      await queryInterface.sequelize.query(
        `UPDATE work_orders SET linked_failure_ids = ? WHERE id = ?`,
        {
          replacements: [linkedIds, wo.id],
          type: Sequelize.QueryTypes.UPDATE
        }
      );
      
      updatedCount++;
    }

    console.log(`✅ ${updatedCount} WorkOrders actualizadas con linked_failure_ids inicializado`);
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⏪ Revirtiendo población de linked_failure_ids...');
    
    // Opcional: Revertir a NULL si es necesario
    await queryInterface.sequelize.query(
      `UPDATE work_orders SET linked_failure_ids = NULL`
    );
    
    console.log('✅ linked_failure_ids revertido a NULL');
  }
};
