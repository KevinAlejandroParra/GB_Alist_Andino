'use strict';
const fs = require('fs');
const path = require('path');

const definitionsDir = path.join(__dirname, 'checklist-definitions');
const checklistDefinitions = [];

// Cargar todas las definiciones de checklist del directorio
fs.readdirSync(definitionsDir).forEach(file => {
  if (file.endsWith('.js')) {
    checklistDefinitions.push(require(path.join(definitionsDir, file)));
  }
});

module.exports = {
  async up(queryInterface, Sequelize) {
    if (checklistDefinitions.length === 0) {
      console.log('No checklist definitions found, so no items to seed.');
      return;
    }

    try {
      for (const definition of checklistDefinitions) {
        // 1. Buscar el tipo de checklist por su nombre único
        const [checklistType] = await queryInterface.sequelize.query(
          `SELECT checklist_type_id FROM checklist_types WHERE name = :name LIMIT 1;`,
          {
            replacements: { name: definition.name },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (!checklistType) {
          console.error(`ChecklistType '${definition.name}' not found. Run the types seeder first. Skipping items for this type.`);
          continue;
        }
        const checklistTypeId = checklistType.checklist_type_id;

        // 2. Limpiar items existentes para este tipo de checklist para evitar duplicados
        await queryInterface.bulkDelete('checklist_items', { checklist_type_id: checklistTypeId }, {});

        // 3. Procesar y crear los ítems de forma jerárquica
        for (const parentItemDef of definition.items) {
          // Crear el ítem padre (sección)
          await queryInterface.bulkInsert('checklist_items', [{
            item_number: parentItemDef.item_number,
            question_text: parentItemDef.question_text,
            input_type: 'section',
            allow_comment: false,
            checklist_type_id: checklistTypeId,
            parent_item_id: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }], { returning: true });
          
          // bulkInsert con MySQL no devuelve el ID, así que lo buscamos
          const [insertedParent] = await queryInterface.sequelize.query(
            `SELECT checklist_item_id FROM checklist_items WHERE item_number = :item_number AND checklist_type_id = :checklist_type_id LIMIT 1;`,
            {
              replacements: { item_number: parentItemDef.item_number, checklist_type_id: checklistTypeId },
              type: Sequelize.QueryTypes.SELECT
            }
          );

          if (!insertedParent) {
            console.error(`Failed to retrieve parent item ${parentItemDef.item_number}.`);
            continue;
          }
          const parentItemId = insertedParent.checklist_item_id;

          // Preparar los ítems hijos (preguntas)
          if (parentItemDef.children && parentItemDef.children.length > 0) {
            const childItems = parentItemDef.children.map(childDef => ({
              ...childDef,
              checklist_type_id: checklistTypeId,
              parent_item_id: parentItemId,
              createdAt: new Date(),
              updatedAt: new Date()
            }));
            // Insertar los ítems hijos
            await queryInterface.bulkInsert('checklist_items', childItems, {});
          }
        }
      }
      console.log('Checklist items seeded successfully.');
    } catch (error) {
      console.error('Error seeding checklist items:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar todos los ítems de los checklists definidos
    const typeNames = checklistDefinitions.map(def => def.name);
    if (typeNames.length > 0) {
        const checklistTypes = await queryInterface.sequelize.query(
            `SELECT checklist_type_id FROM checklist_types WHERE name IN (:typeNames);`,
            {
                replacements: { typeNames },
                type: Sequelize.QueryTypes.SELECT
            }
        );
        const typeIds = checklistTypes.map(t => t.checklist_type_id);
        if (typeIds.length > 0) {
            await queryInterface.bulkDelete('checklist_items', {
                checklist_type_id: {
                    [Sequelize.Op.in]: typeIds
                }
            }, {});
        }
    }
  }
};
