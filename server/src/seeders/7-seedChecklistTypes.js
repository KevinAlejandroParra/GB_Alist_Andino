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
        let association = {};

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
            continue;
          }
          association.attraction_id = attraction.ins_id;

        } else if (definition.family_name) {
          const [family] = await queryInterface.sequelize.query(
            `SELECT family_id FROM families WHERE family_name = :family_name LIMIT 1;`,
            {
              replacements: { family_name: definition.family_name },
              type: Sequelize.QueryTypes.SELECT
            }
          );

          if (!family) {
            continue;
          }
          association.family_id = family.family_id;

        } else {
          continue;
        }

        // Limpiar para evitar duplicados por nombre
        await queryInterface.bulkDelete('checklist_types', { name: definition.name }, {});

        // Crear el tipo de checklist
        await queryInterface.bulkInsert('checklist_types', [{
          name: definition.name,
          description: definition.description,
          frequency: definition.frequency,
          version_label: definition.version_label,
          role_id: definition.role_id,
          ...association,
          createdAt: new Date(),
          updatedAt: new Date(),
        }], {});
      }
    } catch (error) {
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
