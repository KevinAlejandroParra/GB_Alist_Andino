'use strict';
const fs = require('fs');
const path = require('path');

const definitionsDir = path.join(__dirname, 'checklist-definitions');
const checklistDefinitions = [];

// Cargar todas las definiciones de checklist del directorio
fs.readdirSync(definitionsDir).forEach(file => {
  if (file.endsWith('.js')) {
    const definition = require(path.join(definitionsDir, file));
    checklistDefinitions.push(definition);
  }
});

module.exports = {
  async up(queryInterface, Sequelize) {
    if (checklistDefinitions.length === 0) {
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
          continue;
        }
        const checklistTypeId = checklistType.checklist_type_id;

        // 3. Procesar y crear los ítems (lógica de Upsert)
        if (definition.dynamic_items) {
          // Para checklists dinámicos, los 'items' son plantillas para los sub-ítems.
          for (const itemDef of definition.items) {
            const [existingItem] = await queryInterface.sequelize.query(
              `SELECT checklist_item_id FROM checklist_items 
               WHERE checklist_type_id = :checklist_type_id AND item_number = :item_number LIMIT 1;`,
              {
                replacements: { checklist_type_id: checklistTypeId, item_number: itemDef.item_number },
                type: Sequelize.QueryTypes.SELECT
              }
            );

            if (existingItem) {
              await queryInterface.sequelize.query(
                `UPDATE checklist_items SET 
                  question_text = :question_text, 
                  guidance_text = :guidance_text, 
                  input_type = :input_type, 
                  allow_comment = :allow_comment, 
                  updatedAt = :updatedAt 
                 WHERE checklist_item_id = :item_id;`,
                {
                  replacements: {
                    item_id: existingItem.checklist_item_id,
                    question_text: itemDef.question_text,
                    guidance_text: itemDef.guidance_text || null,
                    input_type: 'radio',
                    allow_comment: true,
                    updatedAt: new Date(),
                  },
                  type: Sequelize.QueryTypes.UPDATE
                }
              );
            } else {
              await queryInterface.bulkInsert('checklist_items', [{
                ...itemDef,
                checklist_type_id: checklistTypeId,
                parent_item_id: null,
                input_type: 'radio',
                allow_comment: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }], {});
            }
          }
        } else {
          // Para checklists estáticos, procesar la jerarquía (lógica de Upsert)
          for (const parentItemDef of definition.items) {
            // Buscar si el ítem padre ya existe
            const [existingParent] = await queryInterface.sequelize.query(
              `SELECT checklist_item_id FROM checklist_items 
               WHERE checklist_type_id = :checklist_type_id AND item_number = :item_number AND parent_item_id IS NULL LIMIT 1;`,
              {
                replacements: { checklist_type_id: checklistTypeId, item_number: parentItemDef.item_number },
                type: Sequelize.QueryTypes.SELECT
              }
            );

            let parentItemId;
            if (existingParent) {
              parentItemId = existingParent.checklist_item_id;
              await queryInterface.sequelize.query(
                `UPDATE checklist_items SET 
                  question_text = :question_text, 
                  guidance_text = :guidance_text, 
                  input_type = :input_type, 
                  allow_comment = :allow_comment, 
                  updatedAt = :updatedAt 
                 WHERE checklist_item_id = :parent_item_id;`,
                {
                  replacements: {
                    parent_item_id: parentItemId,
                    question_text: parentItemDef.question_text,
                    guidance_text: parentItemDef.guidance_text || null,
                    input_type: 'section',
                    allow_comment: false,
                    updatedAt: new Date(),
                  },
                  type: Sequelize.QueryTypes.UPDATE
                }
              );
            } else {
              await queryInterface.bulkInsert('checklist_items', [{
                item_number: parentItemDef.item_number,
                question_text: parentItemDef.question_text,
                input_type: 'section',
                allow_comment: false,
                checklist_type_id: checklistTypeId,
                parent_item_id: null,
                createdAt: new Date(),
                updatedAt: new Date()
              }], {});

              const [insertedParent] = await queryInterface.sequelize.query(
                `SELECT checklist_item_id FROM checklist_items WHERE item_number = :item_number AND checklist_type_id = :checklist_type_id AND parent_item_id IS NULL LIMIT 1;`,
                {
                  replacements: { item_number: parentItemDef.item_number, checklist_type_id: checklistTypeId },
                  type: Sequelize.QueryTypes.SELECT
                }
              );
              parentItemId = insertedParent.checklist_item_id;
            }

            // Preparar e insertar los ítems hijos
            if (parentItemDef.children && parentItemDef.children.length > 0) {
              for (const childDef of parentItemDef.children) {
                const [existingSub] = await queryInterface.sequelize.query(
                  `SELECT checklist_item_id FROM checklist_items 
                   WHERE checklist_type_id = :checklist_type_id AND item_number = :item_number AND parent_item_id = :parent_item_id LIMIT 1;`,
                  {
                    replacements: { 
                      checklist_type_id: checklistTypeId, 
                      item_number: childDef.item_number,
                      parent_item_id: parentItemId
                    },
                    type: Sequelize.QueryTypes.SELECT
                  }
                );

                if (existingSub) {
                  await queryInterface.sequelize.query(
                    `UPDATE checklist_items SET 
                      question_text = :question_text, 
                      guidance_text = :guidance_text, 
                      input_type = :input_type, 
                      allow_comment = :allow_comment, 
                      updatedAt = :updatedAt 
                     WHERE checklist_item_id = :sub_item_id;`,
                    {
                      replacements: {
                        sub_item_id: existingSub.checklist_item_id,
                        question_text: childDef.question_text,
                        guidance_text: childDef.guidance_text || null,
                        input_type: childDef.input_type || 'radio',
                        allow_comment: childDef.allow_comment !== undefined ? childDef.allow_comment : true,
                        updatedAt: new Date(),
                      },
                      type: Sequelize.QueryTypes.UPDATE
                    }
                  );
                } else {
                  await queryInterface.bulkInsert('checklist_items', [{
                    ...childDef,
                    checklist_type_id: checklistTypeId,
                    parent_item_id: parentItemId,
                    input_type: childDef.input_type || 'radio',
                    allow_comment: childDef.allow_comment !== undefined ? childDef.allow_comment : true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }], {});
                }
              }
            }
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
