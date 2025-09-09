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
      console.log('No checklist definitions found to seed.');
      return;
    }

    try {
      for (const definition of checklistDefinitions) {
        // Buscar la atracción por nombre y local para obtener su ID
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
          console.error(`Attraction '${definition.attraction_name}' not found for premise ${definition.premise_id}. Skipping this checklist type.`);
          continue; // Saltar al siguiente
        }

        // Crear o actualizar el tipo de checklist
        await queryInterface.bulkInsert('checklist_types', [{
          name: definition.name,
          description: definition.description,
          frequency: definition.frequency,
          version_label: definition.version_label,
          attraction_id: attraction.ins_id,
          role_id: definition.role_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }], {});
      }
      console.log(`${checklistDefinitions.length} checklist types seeded successfully.`);
    } catch (error) {
      console.error('Error seeding checklist types:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar todos los tipos de checklist que están en las definiciones
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