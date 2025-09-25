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
        let type_category = null;
        let associated_id = null;

        if (definition.attraction_name && definition.premise_id) {
          const [attraction] = await queryInterface.sequelize.query(
            `SELECT a.ins_id FROM attractions a
             INNER JOIN inspectables i ON a.ins_id = i.ins_id
             WHERE i.name = :attraction_name AND i.premise_id = :premise_id LIMIT 1;`,
            {
              replacements: {
                attraction_name: definition.attraction_name,
                premise_id: definition.premise_id
              },
              type: Sequelize.QueryTypes.SELECT
            }
          );

          if (!attraction) {
            console.log(`Skipping checklist type "${definition.name}" because attraction "${definition.attraction_name}" was not found.`);
            continue;
          }
          type_category = 'attraction';
          associated_id = attraction.ins_id;

        } else if (definition.family_name) {
          const [family] = await queryInterface.sequelize.query(
            `SELECT family_id FROM families WHERE family_name = :family_name LIMIT 1;`,
            {
              replacements: { family_name: definition.family_name },
              type: Sequelize.QueryTypes.SELECT
            }
          );

          if (!family) {
            console.log(`Skipping checklist type "${definition.name}" because family "${definition.family_name}" was not found.`);
            continue;
          }
          type_category = 'family';
          associated_id = family.family_id;
        
        } else if (definition.specific_inspectable_names && definition.specific_inspectable_names.length > 0) {
            type_category = 'specific';
            // Los inspectables específicos se manejarán en la tabla de unión
        } else {
          console.log(`Skipping checklist type "${definition.name}" because it has no valid association (attraction, family, or specific inspectables).`);
          continue;
        }

        // Limpiar para evitar duplicados por nombre
        await queryInterface.bulkDelete('checklist_types', { name: definition.name }, {});

        // Crear el tipo de checklist usando una inserción cruda para obtener el ID
        const [newChecklistTypeId] = await queryInterface.sequelize.query(
          `INSERT INTO checklist_types (name, description, frequency, version_label, role_id, type_category, associated_id, createdAt, updatedAt)
           VALUES (:name, :description, :frequency, :version_label, :role_id, :type_category, :associated_id, :createdAt, :updatedAt);`,
          {
            replacements: {
              name: definition.name,
              description: definition.description,
              frequency: definition.frequency,
              version_label: definition.version_label,
              role_id: definition.role_id,
              type_category: type_category,
              associated_id: associated_id,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            type: Sequelize.QueryTypes.INSERT
          }
        );

        // Si es un checklist específico, poblar la tabla de unión
        if (type_category === 'specific' && newChecklistTypeId) {
          const inspectables = await queryInterface.sequelize.query(
            `SELECT ins_id FROM inspectables WHERE name IN (:names);`,
            {
              replacements: { names: definition.specific_inspectable_names },
              type: Sequelize.QueryTypes.SELECT
            }
          );

          if (inspectables && inspectables.length > 0) {
            const joinTableEntries = inspectables.map(inspectable => ({
              checklist_type_id: newChecklistTypeId,
              ins_id: inspectable.ins_id,
              createdAt: new Date(),
              updatedAt: new Date()
            }));
            await queryInterface.bulkInsert('ChecklistTypeInspectables', joinTableEntries, {});
          }
        }
        
        // Insertar los ítems del checklist si están definidos
        if (definition.items && definition.items.length > 0 && newChecklistTypeId) {
          const itemEntries = [];
          for (const item of definition.items) {
            const [parentItemId] = await queryInterface.sequelize.query(
              `INSERT INTO checklist_items (checklist_type_id, item_number, question_text, guidance_text, input_type, allow_comment, createdAt, updatedAt)
               VALUES (:checklist_type_id, :item_number, :question_text, :guidance_text, :input_type, :allow_comment, :createdAt, :updatedAt);`,
              {
                replacements: {
                  checklist_type_id: newChecklistTypeId,
                  item_number: item.item_number,
                  question_text: item.question_text,
                  guidance_text: item.guidance_text || null,
                  input_type: item.input_type || 'section', // Por defecto a 'section' para ítems principales
                  allow_comment: item.allow_comment || false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                type: Sequelize.QueryTypes.INSERT
              }
            );

            if (item.children && item.children.length > 0) {
              for (const subItem of item.children) {
                itemEntries.push({
                  checklist_type_id: newChecklistTypeId,
                  parent_item_id: parentItemId,
                  item_number: subItem.item_number,
                  question_text: subItem.question_text,
                  guidance_text: subItem.guidance_text || null,
                  input_type: subItem.input_type || 'radio',
                  allow_comment: subItem.allow_comment || false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
          }
          if (itemEntries.length > 0) {
            await queryInterface.bulkInsert('checklist_items', itemEntries, {});
          }
        }
      }
    } catch (error) {
      console.error("Error in checklist type seeder:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const typeNames = checklistDefinitions.map(def => def.name);
    if (typeNames.length > 0) {
      await queryInterface.bulkDelete('checklist_types', {
        name: {
          [Sequelize.Op.in]: typeNames
        }
      }, {});
    }
  }
};
